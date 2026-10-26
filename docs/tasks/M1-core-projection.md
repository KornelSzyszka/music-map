# Task brief: M1 core projection

- Task ID: M1
- Status: proposed
- Goal and user-visible outcome: the stages `project`, `evaluate` and `export` work on any feature matrix and produce the atlas files of the data contract, proven on synthetic data.
- Owning role: technical-lead / implementer
- Responsible agent: Claude (substantial technical work)
- Prepared by: Claude, 2026-10-27
- Context: `docs/architecture.md` (data flow, contract), `docs/code-style.md`, `docs/patterns.md`, ADR 0002
- Relevant skill: `agent-technical-change`

## Contract

- `project.py`: `reduce_pca`, `project_umap`, `cluster_hdbscan`, `knn` keep their current signatures. Random steps take `seed`; same seed gives the same output. `knn` excludes the point itself and works in the standardised feature space.
- `evaluate.py`: `trustworthiness_k`, `continuity_k`, `neighbor_recall`, `compare_methods` for PCA, MDS, t-SNE and UMAP. Values in [0, 1].
- `export.py`: writes manifest, tracks, clusters and neighbors exactly as the contract (snake_case, `cluster_id` null for noise); gzip JSON. `schema_version` unchanged unless the contract changes.
- Input is a NumPy matrix `X` and a tracks DataFrame; no dataset-specific code.

## Write scope

`pipeline/src/music_atlas/{project,evaluate,export}.py`, `pipeline/tests/`, `docs/patterns.md`, `docs/architecture.md` (only if the contract changes). Not `ingest.py`, `features.py`, `frontend/`.

## Acceptance criteria

- Tests on tiny synthetic blobs: same seed reproduces output; clusters recover known groups; identity-like projection scores about 1.0 on the metrics; shuffled projection scores clearly lower; `knn` excludes self; exported JSON validates against the documented shape.
- `cd pipeline && uv run pytest && uv run ruff check . && uv run ruff format --check .` pass.

## Out of scope

Real data, feature selection, frontend, plots.

## Open decisions and escalation

UMAP/HDBSCAN default parameters are routine (recorded in the manifest). A contract change goes to the user.

## Completion

To be filled when done.
