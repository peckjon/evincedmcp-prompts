---
description: Run Evinced's canonical accessibility analyze-and-remediate orchestration prompt, fetched live from the Evinced Web MCP
argument-hint: [url or scope — optional]
allowed-tools: Bash(node:*), mcp__evinced-web-mcp
---

The block below is the **canonical orchestration prompt**, retrieved live from the Evinced Web MCP server (the `evinced_fix_webpage_issues` prompt). It is the **single source of truth** — follow it exactly as your instructions. Do not skip, reorder, or substitute steps, and do **not** improvise a local workflow or make assumptions beyond what it says.

<orchestration-prompt>
!`node "${CLAUDE_PROJECT_DIR:-.}/.claude/scripts/fetch-orchestrator-prompt.mjs"`
</orchestration-prompt>

Scope / target for this run: $ARGUMENTS

(If the scope above is empty, the target is the **active browser tab** via the Evinced extension; otherwise treat it as the URL or scope to work on. Resolve any ambiguity per the prompt's own scope step — do not guess.)
