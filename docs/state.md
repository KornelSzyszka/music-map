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

- Map interface (ADR 0008, `docs/design.md`): Settings panel with colour modes (None, Cluster, Feature, Artist) and a legend, filters by tags (all or any), cluster, artist (highlight or hide others) and a feature range, a neutral dark and light theme with a switch, and no instructional text. Checked in headless Edge in both themes. Artist selection needs `artist_id` in the export (schema 0.3).

- Hierarchical layout (ADR 0009, proposed): `pipeline/runs/pilot-hier.toml` places clusters by feature-space distance (Spearman 0.93 vs 0.77) and arranges tracks inside; continuity drops from 0.93 to 0.88. The global UMAP stays the default. Unclustered tracks are tinted with their nearest cluster in the Cluster colour mode.

- Style (ADR 0010, `docs/design.md`): glass panels around the data, monospaced labels and values, permanent selected-track panel on the right, legend and control bar under the map; the Features tab has the same shape.

## Not done / limits

- `project`, `evaluate`, `export` are implemented and tested on synthetic data (27 tests); `features` is implemented (96-feature set `acoustic-v1`, ADR 0006 proposed); `ingest` is implemented (Codex) and verified on the real files (55 609 tracks).
- Feature selection for the map is undecided. Full feature download status: see the latest task note.
- Course formal requirements and design tokens are unknown (`docs/inbox.md`).

- Data profile: `experiments/profile_dataset.py` writes `data/derived/eda/profile.json` (reviewed independently by Codex, 2026-10-28). Visualisation sets 1 (projection fidelity) and 2 (artist and album effect) are chosen to be built first; the pipeline side (`docs/tasks/analysis-exports.md`) is implemented by Codex and verified by Claude: 182 pytest pass, ruff clean, full-data run in 381 s writes eight files into `data/derived/analysis/` (largest 6.3 MB). Numbers agree with the profile except `vote_accuracy` (0.6246 vs 0.6281, explained by the documented vote tie-break). Key readings: excluding the same artist lowers 15-NN genre agreement from 0.483 to 0.401; UMAP beats PCA on trustworthiness (0.86 vs 0.82) but not on continuity (0.91-0.93 vs 0.94). Not yet independently reviewed.

## Next action

Independent review of `fidelity.py`, `artist_effect.py` and `analysis_export.py` (Codex reviewing Claude's brief, or the user's choice), then the frontend brief for the views of sets 1 and 2 (`docs/tasks/`, needs the user's go to launch).

## Handoff

Read `AGENTS.md`, this file, `docs/roadmap.md`, then the assigned brief. Machine-specific paths are in `.env`/`.env.example`.
