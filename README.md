# evincedmcp-prompts

A short slash command that runs the [Evinced Web MCP](https://www.npmjs.com/package/@evinced/mcp-server-web)
accessibility analyze-and-remediate workflow — fetching the **canonical orchestration
prompt live from the server at invocation**. No hardcoded workflow, no local
assumptions, and **no auto-run**: nothing happens until you invoke the command.

## Claude Code — `/fix_accessibility`

[`.claude/skills/fix_accessibility/SKILL.md`](.claude/skills/fix_accessibility/SKILL.md) is a skill. When you type
`/fix_accessibility` (optionally `/fix_accessibility <url>`), skill **bang-injection** runs
[`.claude/scripts/fetch-orchestrator-prompt.mjs`](.claude/scripts/fetch-orchestrator-prompt.mjs)
*before Claude sees the content*: the script queries the MCP server over JSON-RPC
(`prompts/get`), and the returned canonical prompt is injected **as the prompt itself**
— which Claude then executes directly. It's always current, and it runs only when you
invoke `/fix_accessibility`.

If the server is unreachable, the script emits a `STOP:` directive instead of guidance,
so Claude reports the problem rather than improvising a workflow.

> Skills register at session start — after pulling this repo, reload/restart Claude
> Code once for `/fix_accessibility` to appear.

## GitHub Copilot — `/fix_accessibility`

Copilot has **no skills** and no way to alias/shorten an MCP prompt name, so there is no
`/fix_accessibility` equivalent. Two options, both no-auto-run and always-current:

- **Native (best experience):** invoke
  `/mcp.evinced-web-mcp.evinced_fix_webpage_issues`. VS Code fetches the prompt and
  injects it natively, giving the full interactive UX. Downside: the long, prefixed name.
- **Short name (this repo's prompt file):**
  [`.github/prompts/fix_accessibility.prompt.md`](.github/prompts/fix_accessibility.prompt.md)
  has the agent run [`.github/scripts/fetch-orchestrator-prompt.mjs`](.github/scripts/fetch-orchestrator-prompt.mjs)
  in the terminal and follow its output. Short name, but a less-native invocation than
  the command above.

The fetch script is duplicated under `.claude/` and `.github/` on purpose, so each tool
reads from a folder it is guaranteed to have; the two copies are identical except for a
header comment.

## MCP server config

The Evinced server is **referenced, not vendored** — pulled on demand via
`npx -y @evinced/mcp-server-web --extension`. The two IDEs read different files:

| | Claude Code | GitHub Copilot |
|---|---|---|
| Config file | [`.mcp.json`](.mcp.json) (`mcpServers`) | [`.vscode/mcp.json`](.vscode/mcp.json) (`servers`, `type: stdio`) |

Keep both in sync if you change the launch command.

## Prerequisites

- **Node.js ≥ 18** (for `npx`).
- **Evinced Chrome extension** installed, and a **running browser** — the server is
  launched with `--extension`, which scans the *active browser tab*.
- **Authentication:** interactive Evinced web login on first use (no configuration
  needed for IDE/development use).
  - For CI/headless instead, set `EVINCED_SERVICE_ID` and `EVINCED_API_KEY` as
    environment variables. **Never commit credentials** to this repo.

## Notes

- **Copilot setting:** prompt files require `"chat.promptFiles": true` — the default in
  current VS Code; enable it if the command doesn't appear.
