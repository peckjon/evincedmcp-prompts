---
description: Find and fix web accessibility issues on a page using the Evinced Web MCP
argument-hint: [url]
allowed-tools: mcp__evinced-web-mcp
---

Use the **Evinced Web MCP** server to find and remediate accessibility issues, then fix them.

Target: `$ARGUMENTS` — if empty, scan the **active browser tab** via the Evinced extension; if a URL is given, scan that page in a new tab.

Follow this workflow strictly:

1. **Scan.** Call `evinced_analyze_webpage`. In extension mode use `tabMode: "active_tab"` by default, or `tabMode: "new_tab"` with `url: $ARGUMENTS` when a URL was provided. Report the issue summary grouped by severity (Critical, Serious, Moderate, Minor).
2. **Get guidance.** For each unique issue type, call `evinced_get_webpage_issue_details` and use its `remediation_instructions` as the **single source of truth** for the fix.
3. **Fix one at a time.** Remediate a single issue, most-severe-first (Critical → Serious → Moderate → Minor). Apply ARIA Authoring Practices Guide (APG) patterns. Do **not** batch-fix — batching can introduce new violations.
4. **Validate.** After each Critical or Serious fix, re-run `evinced_analyze_webpage` to confirm the issue is resolved and nothing regressed before moving to the next.
5. **Summarize.** Report what was fixed, what remains, and any issues that need human judgment.

If the server requires authentication, complete the Evinced web login when prompted. Extension mode requires the Evinced Chrome extension installed and a browser running.
