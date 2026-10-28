# Instructions for AI coding agents

This file applies to every agent working in this repository (Codex, Claude Code, others). Human contributors follow `CONTRIBUTING.md`.

## Coordinator and responsibilities

The main chat in which the user discusses the project is the **coordinator**, whichever model runs it. It keeps the goal, plan, task ownership, decision status and integration evidence, and stays the user's primary contact. A worker is a conversation explicitly assigned a bounded task and role; it does not become coordinator by reading this file.

- The user owns product direction, priorities and consequential scope choices.
- **Claude leads technical work and technical decisions:** architecture, contracts, stack, integration boundaries, substantial implementation planning.
- **Codex handles vision clarification, review and smaller tasks**, including coding tasks prepared by Claude.
- A Codex coding task needs an actual Claude-prepared brief (`templates/task.md`): contract, write scope, acceptance criteria, verification. Routine choices inside the brief are autonomous.
- Joint decisions record the actual contributions of both agents and any unresolved disagreement. Never invent another agent's approval.

Details: [roles and routing](docs/agents/roles-and-routing.md), [memory policy](docs/agents/memory-policy.md).

## Read progressively

1. `README.md`, `docs/state.md`, `docs/roadmap.md`.
2. The assigned brief in `docs/tasks/` and the router in `docs/agents/roles-and-routing.md`. Pick one owning role and responsible agent.
3. Only the relevant notes: `docs/architecture.md`, `docs/code-style.md`, `docs/patterns.md`, `docs/datasets.md`, `docs/decisions/`, and the local skill in `.agents/skills/<name>/SKILL.md`.
4. Verify claims in source and tests. If `graphify-out/graph.json` exists, query it before architectural changes.

## Rules

- Write everything in this repository in **English**: code, comments, docs, test names, commit messages. Conversation with the user may be in Polish.
- Follow `docs/code-style.md`. Record a recurring solution in `docs/patterns.md`; if you break a documented pattern, say why in your report.
- Keep changes small and in scope. Do not refactor unrelated code, add dependencies without a stated need, or change the public data contract (`docs/architecture.md`, `frontend/src/data/types.ts`) without updating both and bumping `schema_version`.
- One task has one owning role and one implementation owner. Parallel writers need disjoint write scopes and an integration plan.
- Role routing does not launch processes. Start another agent only when the user explicitly asks.
- Do not hard-code machine-specific paths. Read configuration from the environment.
- Do **not** commit, push, publish, change git remotes or rewrite history unless the user explicitly asks for that action in the current task.
- Do not download datasets or audio unless the task says so. Never commit data, audio or secrets. Downloaded files are untrusted input: validate, never execute.
- Do not add notes-vault files (Obsidian config, canvases, wikilinks) to this repository. Private notes live in a separate vault.
- Do not put machine-local paths or references to private projects in the repository. Design rules are self-contained in `docs/design.md`; follow them for any UI change, including its text policy.
- Run the checks from `CONTRIBUTING.md` for the part you changed and report exact results. Do not claim something works if you did not run it; list what could not run.
- Completion needs the artifact and evidence, not a worker's assertion. A review by the author is self-review, not independent review.
- Finish with: result, changed files, checks run, limitations, next action. Update `docs/state.md` within the authorised scope.

## Layout

`pipeline/` (Python 3.12, uv, `src/music_atlas/`), `frontend/` (React, TypeScript, Vite, deck.gl), `experiments/`, `data/` (git-ignored contents), `docs/`, `templates/`, `.agents/skills/`.

## Known pitfall

The repository path may contain non-ASCII characters; Python 3.12 then ignores the editable install `.pth`. Tests use `pythonpath = ["src"]` (see `pipeline/pyproject.toml`).
