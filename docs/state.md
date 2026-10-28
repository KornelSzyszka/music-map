# Current state

Updated: 2026-10-27

## Phase

Skeleton with verified tooling; projection core reviewed by Codex (5 findings, 4 fixed; manifest reproducibility metadata deferred to the pilot). Agent workflow adopted (ADR 0001).

## Verified

- `pipeline/`: pytest 3/3, ruff clean. `frontend/`: typecheck, lint, test, build pass.
- Jamendo metadata and a first feature archive are on disk and match the repository checksums; JSON structure checked (see `docs/datasets.md`).
- Nothing is committed; the remote `origin` is empty.

- Features tab: `pipeline/scripts/build_feature_graph.py` exports `features.json.gz` and `feature_sample.json.gz`. The frontend shows a spring graph of 96 features (drag, zoom, family filter) and, per feature, five views: distribution, genre ridgeline, quartiles, tag bars and a scatter against another feature. Checked in headless Edge in light and dark mode: settling, drag pulls neighbours, tabs, zoom, no console errors.

## Not done / limits

- `project`, `evaluate`, `export` are implemented and tested on synthetic data (27 tests); `features` is implemented (96-feature set `acoustic-v1`, ADR 0006 proposed); `ingest` is implemented (Codex) and verified on the real files (55 609 tracks).
- Feature selection for the map is undecided. Full feature download status: see the latest task note.
- Course formal requirements and design tokens are unknown (`docs/inbox.md`).

## Next action

Independent review of the projection core, then Jamendo ingest and Frontend base (briefs in `docs/tasks/`) for Codex (disjoint write scopes). Launching Codex needs the user's explicit go.

## Handoff

Read `AGENTS.md`, this file, `docs/roadmap.md`, then the assigned brief. Machine-specific paths are in `.env`/`.env.example`.
