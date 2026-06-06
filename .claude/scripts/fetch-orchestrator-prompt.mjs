#!/usr/bin/env node
// Retrieves the canonical `evinced_fix_webpage_issues` orchestration prompt from
// the Evinced Web MCP server via JSON-RPC (prompts/get) and prints its text to
// stdout. This keeps the local /evinced_fix_webpage_issues command a thin shim:
// the workflow lives in the MCP server and is never duplicated or assumed here.
//
// On any failure it prints a STOP directive instead of guidance, so the agent
// does not fall back to an improvised local workflow.
//
// NOTE: an intentional duplicate lives at .github/scripts/fetch-orchestrator-prompt.mjs
// for Copilot/VS Code users who may clone only the .github folder. Keep the two in sync.

import { spawn } from 'node:child_process';

const PROMPT_NAME = 'evinced_fix_webpage_issues';
const TIMEOUT_MS = 60000;

function fail(reason) {
  process.stdout.write(
    `STOP: could not retrieve the canonical "${PROMPT_NAME}" prompt from the ` +
    `Evinced Web MCP server (${reason}). Do NOT improvise a local accessibility ` +
    `workflow. Report this to the user and ask them to verify the ` +
    `evinced-web-mcp server is running.\n`
  );
  process.exit(0); // exit 0 so the directive is injected, not swallowed as an error
}

// `npx` (no --extension) is enough for prompts/get; it needs no browser.
const srv = spawn('npx', ['-y', '@evinced/mcp-server-web'], {
  stdio: ['pipe', 'pipe', 'ignore'],
});
srv.on('error', (e) => fail(e.message));

const send = (o) => srv.stdin.write(JSON.stringify(o) + '\n');
let buf = '';

const timer = setTimeout(() => { srv.kill(); fail('timed out'); }, TIMEOUT_MS);

srv.stdout.on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id === 1) {
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });
      send({ jsonrpc: '2.0', id: 2, method: 'prompts/get', params: { name: PROMPT_NAME, arguments: {} } });
    } else if (msg.id === 2) {
      clearTimeout(timer);
      if (msg.error) { srv.kill(); fail(msg.error.message || 'prompts/get error'); }
      const text = (msg.result?.messages ?? [])
        .map((m) => m?.content?.text)
        .filter(Boolean)
        .join('\n\n');
      srv.kill();
      if (!text) fail('empty prompt');
      process.stdout.write(text + '\n');
      process.exit(0);
    }
  }
});

send({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'evinced-prompt-shim', version: '1' } },
});
