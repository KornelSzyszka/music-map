---
name: agent-technical-change
description: Specify or implement a technical change under Claude's leadership, including small Codex coding tasks with an actual Claude-prepared contract and write scope.
---

# Make a technical change

Follow `AGENTS.md` and `docs/agents/roles-and-routing.md`. Claude leads technical decisions. Codex works from an actual Claude-prepared coding brief; if it is missing, prepare the necessary technical brief rather than treating a draft as approved.

Load the relevant contract, callers, state owners, failure paths and tests. Determine the affected inputs, outputs, effects and invariants before editing. Verify existing behavior; no change is needed if the requirement is already met.

Choose the first sufficient solution using existing code and platform facilities. Introduce an abstraction or dependency only for a concrete requirement. Consult current official documentation using the available documentation tools when external APIs are involved.

Keep routine implementation choices autonomous within the brief. Bring new consequential architecture, public API or semantic choices to Claude with concrete evidence and alternatives. Continue independent work that does not require the decision.

Verify behavior with the narrowest meaningful check, including relevant error and boundary cases. Explain query cost, concurrency, permissions or resource effects when the actual change touches them. Do not add verification that simply mirrors the implementation.

Report behavior, changed files, actual checks and remaining evidence limits. Update current state and technical decision references through `docs/agents/memory-policy.md`. The coordinator integrates the result; a worker's completion statement alone does not establish acceptance.
