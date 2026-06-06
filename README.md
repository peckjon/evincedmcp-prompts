# evincedmcp-prompts

Clean, prefix-free **`/evinced_fix_webpage_issues`** shortcut over the
[Evinced Web MCP](https://www.npmjs.com/package/@evinced/mcp-server-web), working
in **both** Claude Code and GitHub Copilot — with zero install. Open the folder in
either tool and the shortcut appears in the `/` menu.

It replaces the verbose, prefixed `mcp.evinced-web-mcp.evinced_fix_webpage_issues`
form with a memorable command that drives the full Evinced "scan → diagnose → fix
one-at-a-time → validate" accessibility workflow.

## How it works

Everything is repo-native and committed to version control — no marketplace, no
install script, nothing written to system folders:

| | Claude Code | GitHub Copilot |
|---|---|---|
| MCP server config | [`.mcp.json`](.mcp.json) (`mcpServers`) | [`.vscode/mcp.json`](.vscode/mcp.json) (`servers`, `type: stdio`) |
| Clean shortcut | [`.claude/commands/evinced_fix_webpage_issues.md`](.claude/commands/evinced_fix_webpage_issues.md) | [`.github/prompts/evinced_fix_webpage_issues.prompt.md`](.github/prompts/evinced_fix_webpage_issues.prompt.md) |
| Arg syntax | `$ARGUMENTS` | `${input:url}` |
| Tool binding | `allowed-tools: mcp__evinced-web-mcp` | `tools: ['evinced-web-mcp/*']` |

The two config files are needed because the IDEs intentionally differ: Claude reads
`.mcp.json` with a top-level `mcpServers` key, while VS Code/Copilot reads
`.vscode/mcp.json` with a top-level `servers` key (and requires `type: "stdio"`).
The Evinced server itself is **referenced, not vendored** — it's pulled on demand via
`npx -y @evinced/mcp-server-web --extension`.

## Prerequisites

- **Node.js ≥ 18** (for `npx`).
- **Evinced Chrome extension** installed, and a **running browser** — the server is
  launched with `--extension`, which scans the *active browser tab*.
- **Authentication:** interactive Evinced web login on first use (no configuration
  needed for IDE/development use).
  - For CI/headless instead, set `EVINCED_SERVICE_ID` and `EVINCED_API_KEY` as
    environment variables. **Never commit credentials** to this repo.

## Usage

1. Open this folder in Claude Code or VS Code (Copilot).
2. Approve / start the `evinced-web-mcp` server when the IDE prompts.
3. In the chat box, type `/evinced_fix_webpage_issues` (optionally followed by a URL;
   omit it to scan the active tab).

The shortcut will scan the page, fetch Evinced's per-issue remediation instructions,
fix issues one at a time (most severe first, using ARIA APG patterns), and re-validate
after each critical fix.

## Notes

- **Copilot setting:** prompt files require `"chat.promptFiles": true` — this is the
  default in current VS Code; enable it if the command doesn't appear.
- **Server config differences** between the two IDEs are deliberate (see table above);
  keep both files in sync if you change the launch command.
