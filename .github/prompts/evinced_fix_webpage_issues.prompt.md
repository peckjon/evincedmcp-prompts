---
mode: agent
description: 'Run Evinced''s canonical accessibility analyze-and-remediate orchestration prompt, fetched live from the Evinced Web MCP'
tools: ['evinced-web-mcp/*', 'runInTerminal']
---

Do **not** improvise an accessibility workflow or make local assumptions. The canonical workflow lives in the Evinced Web MCP server and must be fetched and followed verbatim.

1. Run this command in the terminal to retrieve the canonical orchestration prompt:

   ```
   node "${workspaceFolder}/.github/scripts/fetch-orchestrator-prompt.mjs"
   ```

2. Treat the command's printed output as your **single source of truth** instructions. Follow it exactly — do not skip, reorder, or substitute steps. If the output begins with `STOP:`, report it to me and stop.

Scope / target for this run: `${input:url:active browser tab}` — if left as the active tab, the target is the currently open browser tab via the Evinced extension; otherwise treat it as the URL or scope to work on. Resolve any ambiguity per the fetched prompt's own scope step — do not guess.
