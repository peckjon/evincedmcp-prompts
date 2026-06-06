---
name: fix_accessibility
description: Fetch the Evinced Web MCP accessibility orchestration prompt live and run it directly
disable-model-invocation: true
---

Follow the canonical accessibility orchestration prompt below — it was fetched **live from the Evinced Web MCP server just now**, so it is current. It is your single source of truth: execute it directly and do not improvise, reorder, or substitute steps. If the block begins with `STOP:`, report that to the user and stop.

<orchestration-prompt>
!`node "${CLAUDE_PROJECT_DIR:-.}/.claude/scripts/fetch-orchestrator-prompt.mjs"`
</orchestration-prompt>

Scope / target for this run: $ARGUMENTS

(If empty, the target is the **active browser tab** via the Evinced extension; otherwise treat it as the URL or scope to work on. Resolve any ambiguity per the prompt's own scope step — do not guess.)
