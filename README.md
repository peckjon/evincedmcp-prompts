# evincedmcp-prompts

Clean, prefix-free **`/a11y`** shortcut over the
[Evinced Web MCP](https://www.npmjs.com/package/@evinced/mcp-server-web), working
in **both** Claude Code and GitHub Copilot — with zero install. Open the folder in
either tool and `/a11y` appears in the `/` menu.

It gives you a short, memorable command instead of the verbose, prefixed native form
(`/mcp.evinced-web-mcp.evinced_fix_webpage_issues`). The command carries **no workflow
of its own** — its body is **generated from** the Evinced server's canonical
`evinced_fix_webpage_issues` orchestration prompt, so the "scan → diagnose → fix
one-at-a-time → validate" guidance stays in sync with the server and the repo makes no
local assumptions.

## Why generate, instead of just aliasing the MCP prompt?

Native MCP prompts always carry the `/mcp.<server>.` (Copilot) / `/mcp__<server>__`
(Claude) prefix — there's no way to remove it. The *only* source of a prefix-free
slash command is a client-side file (a Claude Code command or a Copilot prompt file),
but those inject a **static** body. To get a prefix-free name **and** keep the body
current, we generate that file from the MCP server and refresh it automatically:

- **Generate-on-open** keeps the committed file tracking the server.
- The generated body is injected **natively** as the prompt, so you get the full rich
  experience (e.g. Copilot's interactive scope picker), not a degraded terminal dump.

## How it works

Everything is repo-native and committed — no marketplace, no install script, nothing
written to system folders:

| | Claude Code | GitHub Copilot |
|---|---|---|
| MCP server config | [`.mcp.json`](.mcp.json) (`mcpServers`) | [`.vscode/mcp.json`](.vscode/mcp.json) (`servers`, `type: stdio`) |
| Generated shortcut | [`.claude/commands/a11y.md`](.claude/commands/a11y.md) | [`.github/prompts/a11y.prompt.md`](.github/prompts/a11y.prompt.md) |
| Auto-refresh trigger | `SessionStart` hook in [`.claude/settings.json`](.claude/settings.json) | `folderOpen` task in [`.vscode/tasks.json`](.vscode/tasks.json) |
| Arg syntax | `$ARGUMENTS` | `${input:url}` |

Both triggers run the shared generator
[`scripts/sync-prompt.mjs`](scripts/sync-prompt.mjs), which queries the MCP server over
JSON-RPC (`prompts/get`) and rewrites the `/a11y` file with the current canonical text.
If the server is unreachable it **leaves the committed file untouched** (so an offline
open never breaks the command) and exits cleanly.

> The `.md`/`.prompt.md` files are **AUTO-GENERATED — do not hand-edit them.** Change
> the wording on the server (or in `sync-prompt.mjs`), not in the generated output.

The two MCP config files are needed because the IDEs intentionally differ: Claude reads
`.mcp.json` with a top-level `mcpServers` key, while VS Code/Copilot reads
`.vscode/mcp.json` with a top-level `servers` key (and requires `type: "stdio"`). The
Evinced server itself is **referenced, not vendored** — pulled on demand via
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
2. Approve the auto-run trigger when prompted (Claude reviews project hooks; VS Code
   asks for workspace trust). This lets the `/a11y` file refresh on open.
3. Approve / start the `evinced-web-mcp` server when the IDE prompts.
4. In the chat box, type `/a11y` (optionally followed by a URL; omit it to scan the
   active tab).

`/a11y` runs Evinced's canonical workflow: scope → scan → per-issue remediation
instructions → fix one at a time (most severe first, using ARIA APG patterns) →
validate.

To refresh the generated files by hand at any time:

```sh
node scripts/sync-prompt.mjs            # both IDEs
node scripts/sync-prompt.mjs --target=claude   # or copilot
```

## Notes

- **Auto-run trust:** the `SessionStart` hook and `folderOpen` task each run
  `node scripts/sync-prompt.mjs` automatically — behind a one-time per-machine IDE
  trust prompt. Cloners inherit this behavior. If you prefer no auto-run, delete the
  hook / task and refresh manually with the command above.
- **Copilot setting:** prompt files require `"chat.promptFiles": true` — the default in
  current VS Code; enable it if `/a11y` doesn't appear.
- **Server config differences** between the two IDEs are deliberate (see table above);
  keep both files in sync if you change the launch command.
