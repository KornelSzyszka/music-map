---
name: agent-task-brief
description: Turn an established project goal into a bounded role-owned task or decision brief, respecting Claude's technical leadership and Codex's review and small-task responsibilities.
---

# Prepare a task brief

Read `AGENTS.md`, `docs/state.md` and `docs/roadmap.md` and `docs/agents/roles-and-routing.md`. Load only context relevant to the goal. This workflow prepares a brief; it does not itself dispatch an agent.

Identify one useful outcome and one owning role. Specify the responsible agent separately from the coordinator conversation. Reuse `templates/task.md`: behavior, inputs, outputs, invariants, evidence, write scope, acceptance, verification, out of scope and escalation.

Claude owns technical decisions and prepares coding briefs for Codex. Preserve the actual source of the brief. If Codex prepares a technical proposal for Claude, label it proposed and identify the technical decisions still needed. Do not invent approval or force every routine implementation choice through another gate.

Split tasks only when they have independent results, clear interfaces and disjoint write scopes. If project-specific domain roles help ownership, add them to the router with their context and boundaries. Do not create worker processes or infrastructure merely because a task can be divided.

For joint decisions, provide the user need, alternatives, evidence, consequences and the precise question for Claude and Codex. Record agreement only after both have actually contributed.

Conclude with the concrete brief and the next executable step. Keep current state and proposed decisions consistent through `docs/agents/memory-policy.md`.
