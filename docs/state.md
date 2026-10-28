# Current state

Updated: 2026-10-27

## Phase

Skeleton with verified tooling; projection core reviewed by Codex (5 findings, 4 fixed; manifest reproducibility metadata deferred to the pilot). Agent workflow adopted (ADR 0001).

## Verified

- `pipeline/`: pytest 3/3, ruff clean. `frontend/`: typecheck, lint, test, build pass.
- Jamendo metadata and a first feature archive are on disk and match the repository checksums; JSON structure checked (see `docs/datasets.md`).
- Nothing is committed; the remote `origin` is empty.

- Features tab: `pipeline/scripts/build_feature_graph.py` exports `features.json.gz` and `feature_sample.json.gz`. The frontend shows a spring graph of 96 features (drag, zoom, family filter) and, per feature, five views: distribution, genre ridgeline, quartiles, tag bars and a scatter against another feature. Checked in headless Edge in light and dark mode: settling, drag pulls neighbours, tabs, zoom, no console errors.

- Map tab (pilot atlas): 10 000 tracks, 41 clusters covering 39% of them (ADR 0007), UMAP trustworthiness 0.86 vs 0.82 for a 2-D PCA baseline at k=10. Zoom, pan, click, search, cluster labels and a nearest-neighbour panel work in headless Edge (light and dark), no console errors. Load time to first paint about 2.5 s.

## Not done / limits

- `project`, `evaluate`, `export` are implemented and tested on synthetic data (27 tests); `features` is implemented (96-feature set `acoustic-v1`, ADR 0006 proposed); `ingest` is implemented (Codex) and verified on the real files (55 609 tracks).
- Feature selection for the map is undecided. Full feature download status: see the latest task note.
- Course formal requirements and design tokens are unknown (`docs/inbox.md`).

- Data profile: `experiments/profile_dataset.py` writes `data/derived/eda/profile.json` (reviewed independently by Codex, 2026-10-28). Visualisation sets 1 (projection fidelity) and 2 (artist and album effect) are chosen to be built first; the pipeline side is briefed in `docs/tasks/analysis-exports.md` (proposed, not yet launched).

## Next action

Accept or change the contract in `docs/tasks/analysis-exports.md`, then launch Codex on it (explicit user go needed). The frontend views for sets 1 and 2 get their own brief after the export contract is accepted.

## Handoff

Read `AGENTS.md`, this file, `docs/roadmap.md`, then the assigned brief. Machine-specific paths are in `.env`/`.env.example`.
