# Roles and routing

## Coordination and agent ownership

The **main user chat is always the coordinator**, whether it runs Claude or Codex. The coordinator owns continuity, task routing and integration. Claude owns technical leadership. Codex handles vision, review and smaller tasks with Claude-prepared coding briefs. The user owns product priorities and consequential scope choices.

| Outcome | Owning role | Responsible agent | Procedure |
|---|---|---|---|
| Intake, vision, roadmap, task ownership and user communication | coordinator | Main chat; Codex leads vision work, Claude contributes technical planning | `agent-task-brief` |
| Architecture, contracts, stack, substantial technical planning | technical-lead | Claude | `agent-technical-change` |
| Bounded implementation with an established contract | implementer | Codex for small Claude-prepared tasks; Claude for substantial technical work | `agent-technical-change` |
| Review of code, specifications, experiment results or claims | reviewer | Codex by default; independent review needs someone other than the author | `agent-evidence-review` |
| Current state, accepted decisions, source provenance and conflicts | knowledge-curator | Agent completing the task, preserving decision ownership | [Memory policy](memory-policy.md) |

Domain roles can be added after intake identifies actual boundaries. A role is a responsibility, not automatically a separate model, process or service.

## Context routing

Everyone reads `AGENTS.md`, `README.md`, `docs/state.md` and the assigned brief. Then load only relevant material:

| Role | Additional context | Write scope |
|---|---|---|
| coordinator | Vision, roadmap, open questions and current tasks | Plans, briefs and navigation; technical suggestions stay proposals until actually decided by Claude |
| technical-lead | Relevant source, contracts, architecture decisions and official technical docs | Technical contracts, decisions, scoped briefs and implementation inside the assigned task |
| implementer | Claude's brief, touched contracts, callers and tests | Only assigned files and necessary tests; escalate consequential changes outside the brief |
| reviewer | Brief, diff or named artifact, relevant contracts and verification evidence | Findings; no edits to the reviewed artifact unless a fix is requested |
| knowledge-curator | Target note, existing decisions and evidence for the update | Relevant notes and derived indexes |

## Briefs and completion

Use [the task template](../../templates/task.md). A Codex coding brief identifies its actual Claude author or source, expected behavior, inputs, outputs, invariants, write scope, acceptance, verification and escalation boundary. A coordinator's draft must not be labeled Claude-approved without evidence.

The implementer completes routine choices inside the agreed contract. New stack choices, public contract changes or substantial semantic ambiguity go to Claude with concrete alternatives. Keep independent work moving.

Completion requires the artifact and relevant evidence, not simply a worker saying it finished. The coordinator checks the result against acceptance criteria and records remaining limits. The author may self-review but cannot call that independent review.

## Joint decisions

When a decision joins product needs with technical consequences, or the agents disagree materially:

1. Codex frames user value, constraints and the claim to challenge.
2. Claude supplies technical options, consequences and a recommendation.
3. Both test the reasoning against examples and record agreement or the precise unresolved difference.
4. The user resolves a consequential product priority when needed.

Use [the decision template](../../templates/decision.md). Record actual participants and evidence of agreement. A single agent may prepare a joint discussion brief; it cannot fabricate the discussion.

## Orca execution

Default to one active owner. This template prepares routing without launching agents. When the user explicitly requests a handoff, use the available `orca-cli` skill. When they request supervision, waits or coordination across workers, use `orchestration`. Read the installed skill before execution; if unavailable, report the limitation and supply a concrete brief instead.

Assign disjoint write scopes and one integration owner before parallel work. Do not inherit a remote, issue tracker, push consent, merge permission, credentials or model settings from another project.
