# Current state

Updated: 2026-10-27

## Phase

Skeleton with verified tooling; no feature implemented. Agent workflow adopted (ADR 0001).

## Verified

- `pipeline/`: pytest 3/3, ruff clean. `frontend/`: typecheck, lint, test, build pass.
- Jamendo metadata and a first feature archive are on disk and match the repository checksums; JSON structure checked (see `docs/datasets.md`).
- Nothing is committed; the remote `origin` is empty.

## Not done / limits

- Pipeline stages (`ingest`, `features`, `project`, `evaluate`, `export`) are stubs.
- Feature selection for the map is undecided. Full feature download status: see the latest task note.
- Course formal requirements and design tokens are unknown (`docs/inbox.md`).

## Next action

Review the brief set (`docs/tasks/`), then start M1 (Claude, pipeline) while M2 and M3 are briefed for Codex (disjoint write scopes). Launching Codex needs the user's explicit go.

## Handoff

Read `AGENTS.md`, this file, `docs/roadmap.md`, then the assigned brief. Machine-specific paths are in `.env`/`.env.example`.
