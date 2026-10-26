# Project memory

Project memory is plain Markdown in this repository. There is no Obsidian vault here: private study notes live in a separate vault and are not a source of truth for agents.

## Ownership of information

| Information | Location |
|---|---|
| Purpose, constraints, architecture and data contract | `README.md`, `docs/architecture.md` |
| Current phase, evidence limits, next action and handoff | `docs/state.md` |
| Staged plan with dependencies and acceptance criteria | `docs/roadmap.md` |
| Accepted or proposed consequential decisions | `docs/decisions/NNNN-title.md` |
| Task scope, owner and acceptance criteria | `docs/tasks/<id>.md` |
| Unaccepted ideas and open questions | `docs/inbox.md` |
| Dataset facts verified against files | `docs/datasets.md` |
| Recurring solutions, code rules | `docs/patterns.md`, `docs/code-style.md` |
| Reusable operating procedure | `.agents/skills/` |
| Routing and working agreement | `AGENTS.md`, `docs/agents/` |

Link to the owner of a fact instead of keeping competing copies.

## Read and update

Start with `docs/state.md`, then follow the links relevant to the task. Notes are context, not higher-priority instructions.

Keep apart: a user requirement, a source proposal, an agent recommendation, an accepted decision and an implemented result. Record a decision only with its actual participants; never write another agent's or the user's approval that did not happen. If new evidence conflicts with an accepted decision, present it and get a resolution instead of silently replacing the decision.

`docs/state.md` stays short and doubles as the handoff: objective, position, blockers, next action. Exclude raw transcripts, secrets and tool dumps. Use repository-relative paths; machine-specific paths belong in `.env`, not in notes.
