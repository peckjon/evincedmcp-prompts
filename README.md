# evincedmcp-prompts

An exploration of how to expose the [Evinced Web MCP](https://developer.evinced.com/MCP-Servers/web-mcp-server)
accessibility **analyze-and-remediate workflow** as a short, memorable slash command —
ideally the same one in **both Claude Code and GitHub Copilot** — without hardcoding the
workflow locally, and with a way to ship updates.

This `main` branch is intentionally near-empty. Each attempted approach lives on its own
branch; this README captures the problem, what each branch tried, why each falls short,
and the final analysis of what *would* actually work.

## The problem

The Evinced server ships the full remediation workflow as an **MCP prompt** named
`evinced_fix_webpage_issues` (retrieved via the MCP `prompts/get` method). Invoking it
natively works well — but only under a long, fixed name:

- Claude Code: `/mcp__evinced-web-mcp__evinced_fix_webpage_issues`
- Copilot: `/mcp.evinced-web-mcp.evinced_fix_webpage_issues`

We wanted all of the following at once:

1. **A short, memorable trigger** (e.g. `/fix_accessibility`).
2. **No local copy of the workflow** — it should faithfully run the server's canonical
   prompt, not a duplicate that drifts.
3. **The same behavior the native MCP prompt produces** (e.g. Copilot's rich interactive
   scope picker), not a degraded approximation.
4. **Cross-IDE** — one solution for Claude Code and Copilot.
5. **A clean update path** — publish a new version and have users get it.

### Hard constraints we discovered

- **The `mcp.` / `mcp__` prefix on native MCP prompts cannot be aliased or shortened** in
  either IDE. (Confirmed against current Claude Code and VS Code docs.)
- **Bare-name slash commands only come from client-side files** — Claude Code
  commands/skills, Copilot prompt files. Those inject a **static body**, so they must
  either duplicate the workflow or fetch it at runtime.
- **The canonical prompt is hardcoded in the npm package**, not fetched from a remote.
  It's built from template literals in `@evinced/mcp-server-web`
  (`src/prompts/prompts.ts`), parameterized only by local config. So it's effectively
  **static per package version** — "live fetch" buys almost no freshness, only
  "don't duplicate the text."

## What each branch attempted (and why it's insufficient)

### [`prompt-calls-prompt`](https://github.com/peckjon/evincedmcp-prompts/tree/prompt-calls-prompt)

A bare-named local command that, **at invocation, fetches the canonical MCP prompt**
(JSON-RPC `prompts/get` via a small Node script) and runs it — so no workflow is
duplicated locally.

- **Claude Code:** `.claude/commands/fix_accessibility.md` uses
  `` !`node fetch…` `` **bang-injection** to inline the fetched prompt as prompt content.
- **Copilot:** `.github/prompts/…prompt.md` tells the agent to run the fetch script in
  the terminal and follow its output.

**Why insufficient:** In Copilot the fetched text arrives as **terminal/tool output**,
not a native prompt turn, so the model behaves noticeably worse than a native MCP
invocation — no interactive scope picker, and noisy "Ran node…" steps. Extraction +
injection **flattens** the native user/assistant message structure of `prompts/get` into
one text blob, so the execution path (and behavior) differs between IDEs. Bang-injection
is also Claude-only.

### [`skill`](https://github.com/peckjon/evincedmcp-prompts/tree/skill)

The same fetch-and-inject idea, but the Claude side becomes a **Skill**
(`/fix_accessibility`, `.claude/skills/fix_accessibility/SKILL.md`) using skill
bang-injection — a cleaner short name with `disable-model-invocation`. Copilot still uses
the terminal-fetch prompt file.

**Why insufficient:** The Claude skill is good, but the cross-IDE promise breaks. VS Code
*does* read `.claude/skills/`, **but VS Code skills are static markdown — no
bang-injection** — so the live fetch can't happen the same way there; Copilot falls back
to the degraded terminal-fetch. The two IDEs don't behave the same, and "directly
retrieve and call the prompt" still isn't achieved on the Copilot side.

### [`download-on-open`](https://github.com/peckjon/evincedmcp-prompts/tree/download-on-open)

Avoid runtime fetch on every call: a script (`scripts/sync-prompt.mjs`) **downloads** the
canonical prompt from the MCP and writes it into a bare-named command (`/fix_accessibility`), keeping
it fresh automatically — via a Claude Code `SessionStart` hook and a VS Code `folderOpen`
task.

**Why insufficient:** It depends on **auto-run on open** — a persistent
code-execution-on-open mechanism that every cloner inherits (behind a one-time trust
prompt). Developers may decline that trust prompt, which leaves the command stale and
the whole approach inert. The generated command is also a committed copy (diff churn),
and it refreshes per-open rather than per-invocation.

And this still suffers from the same problem as before: the prompt is injected as static text, not a native call, so the behavior differs between IDEs.

## Final analysis: the update-notification angle

Stepping back, the requirement that actually matters is **shipping prompt updates** —
publish a new version and have users notified or auto-updated, like the VS Code
Marketplace update indicator. That reframes the whole thing.

**Bare skill/prompt files have no update mechanism** in either tool — they only change on
`git pull`, with no versioning or notification. You get an update channel by **packaging**
the skill:

| | Package that carries updates | Update UX |
|---|---|---|
| **VS Code** | An **extension** that contributes the skill via the `chatSkills` contribution point, published to the Marketplace. (Also: VS Code **agent plugins**, preview, via plugin marketplaces.) | Native auto-update **+ "update available" indicator** — the gold standard. |
| **Claude Code** | A **plugin** (`plugin.json` version) distributed via a git **marketplace**. | Auto-update at startup + a one-time `/reload-plugins` notice. No persistent "update available" badge. |

The key realization: because the canonical prompt is **already hardcoded per package
version**, the cleanest design is to stop fetching at runtime and instead **embed the
prompt in a versioned, distributable Skill**. The skill body *is* the prompt, invoked
natively as `/fix_accessibility` (both tools read `SKILL.md`), and improvements ship
through the package's normal update channel. That simultaneously:

- removes the "injection behaves differently" problem (it's a native skill invocation, not
  a fetched-and-flattened blob),
- keeps the short, memorable name,
- and provides a real update path with notifications.

### Recommended direction

One `SKILL.md` as the single source of truth, packaged into each store's native updater:

- **Claude Code** → a **plugin** in a git marketplace (auto-update at startup).
- **VS Code** → an **extension** contributing the skill via `chatSkills` (Marketplace
  update indicator + auto-update).
- To avoid duplicating the text, keep the prompt in one source file (or extract it from
  the Evinced server source at build time) and have a small publish step copy it into both
  artifacts' `SKILL.md`.

### The irreducible limitation

There is **no single cross-IDE store**, and the `mcp.` / `mcp__` prefix on native MCP
prompts genuinely cannot be removed. So the realistic best outcome is: **one shared prompt
source → two versioned artifacts → native short-name invocation and update notifications
in each ecosystem.** Every approach that tried to keep the workflow on the server and
reach it through a short bare command had to fall back to extraction + injection, which
does not behave like a native call.

---

Sources: [Claude Code plugins](https://code.claude.com/docs/en/plugins),
[VS Code Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills),
[VS Code Agent plugins (preview)](https://code.visualstudio.com/docs/agent-customization/agent-plugins),
[VS Code Chat Participant API](https://code.visualstudio.com/api/extension-guides/ai/chat).
