#!/usr/bin/env node
// Auto-syncs the prefix-free /fix_accessibility slash command from the Evinced Web MCP server.
//
// WHY: native MCP prompts always carry the `/mcp.<server>.` (Copilot) or
// `/mcp__<server>__` (Claude) prefix. The only prefix-free slash commands are
// client-side files (.claude/commands/*.md, .github/prompts/*.prompt.md), but
// those inject a STATIC body. So we keep the body fresh by GENERATING it from the
// MCP server's canonical `evinced_fix_webpage_issues` prompt:
//   - VS Code: a folderOpen task runs this with --target=copilot
//   - Claude Code: a SessionStart hook runs this with --target=claude
// The generated files are committed (so /fix_accessibility exists on clone) and overwritten on
// each open/start (so they track the server). Never hand-edit them.
//
// On fetch failure it leaves existing files UNTOUCHED (preserving the committed
// snapshot) and exits 0, so an offline open never clobbers a good command.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const UPSTREAM_PROMPT = 'evinced_fix_webpage_issues'; // canonical prompt on the server
const COMMAND = 'fix_accessibility';                  // prefix-free name users type: /fix_accessibility
const DESCRIPTION =
  'Analyze & remediate web accessibility issues (Evinced) — canonical workflow, auto-synced from the MCP';
const TIMEOUT_MS = 60000;

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const targetArg = (args.find((a) => a.startsWith('--target=')) ?? '--target=both').split('=')[1];
const targets = targetArg === 'both' ? ['claude', 'copilot'] : [targetArg];

const GEN_NOTE =
  `<!-- AUTO-GENERATED from the evinced-web-mcp "${UPSTREAM_PROMPT}" prompt by ` +
  `scripts/sync-prompt.mjs. Do not edit by hand — overwritten on folder-open ` +
  `(VS Code) / session-start (Claude Code). -->`;

function warn(msg) {
  process.stderr.write(`[sync-prompt] ${msg}\n`);
}

// --- fetch the canonical prompt text over JSON-RPC (no browser / --extension needed) ---
function fetchCanonicalText() {
  return new Promise((resolve) => {
    const srv = spawn('npx', ['-y', '@evinced/mcp-server-web'], { stdio: ['pipe', 'pipe', 'ignore'] });
    let buf = '';
    let done = false;
    const finish = (text) => { if (done) return; done = true; clearTimeout(timer); srv.kill(); resolve(text); };
    const send = (o) => srv.stdin.write(JSON.stringify(o) + '\n');
    const timer = setTimeout(() => finish(null), TIMEOUT_MS);

    srv.on('error', (e) => { warn(`could not launch MCP server: ${e.message}`); finish(null); });
    srv.stdout.on('data', (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        let msg; try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === 1) {
          send({ jsonrpc: '2.0', method: 'notifications/initialized' });
          send({ jsonrpc: '2.0', id: 2, method: 'prompts/get', params: { name: UPSTREAM_PROMPT, arguments: {} } });
        } else if (msg.id === 2) {
          if (msg.error) { warn(`prompts/get error: ${msg.error.message}`); return finish(null); }
          const msgs = msg.result?.messages ?? [];
          // Prefer the assistant orchestrator guidance; fall back to all message text.
          const assistant = msgs.filter((m) => m?.role === 'assistant').map((m) => m?.content?.text).filter(Boolean);
          const text = (assistant.length ? assistant : msgs.map((m) => m?.content?.text).filter(Boolean)).join('\n\n');
          finish(text || null);
        }
      }
    });
    send({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'sync-prompt', version: '1' } },
    });
  });
}

function claudeFile(body) {
  return `---
description: ${DESCRIPTION}
argument-hint: [url or scope — optional]
allowed-tools: mcp__evinced-web-mcp
---
${GEN_NOTE}

${body}

---

Scope / target for this run: $ARGUMENTS

(If empty, the target is the **active browser tab** via the Evinced extension; otherwise treat it as the URL or scope to work on. Resolve any ambiguity per the scope step above — do not guess.)
`;
}

function copilotFile(body) {
  return `---
mode: agent
description: '${DESCRIPTION.replace(/'/g, "''")}'
tools: ['evinced-web-mcp/*']
---
${GEN_NOTE}

${body}

---

Scope / target for this run: \`\${input:url:active browser tab}\` — if left as the active tab, the target is the currently open browser tab via the Evinced extension; otherwise treat it as the URL or scope to work on. Resolve any ambiguity per the scope step above — do not guess.
`;
}

const OUTPUTS = {
  claude: { path: join(REPO_ROOT, '.claude', 'commands', `${COMMAND}.md`), render: claudeFile },
  copilot: { path: join(REPO_ROOT, '.github', 'prompts', `${COMMAND}.prompt.md`), render: copilotFile },
};

const body = await fetchCanonicalText();
if (!body) {
  warn(`could not retrieve "${UPSTREAM_PROMPT}" from evinced-web-mcp; leaving existing /${COMMAND} files untouched.`);
  process.exit(0);
}

for (const target of targets) {
  const out = OUTPUTS[target];
  if (!out) { warn(`unknown --target=${target} (use claude|copilot|both)`); continue; }
  mkdirSync(dirname(out.path), { recursive: true });
  writeFileSync(out.path, out.render(body));
  warn(`wrote ${out.path.replace(REPO_ROOT + '/', '')}`);
}
