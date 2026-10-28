# Task brief: analysis exports (visualisation sets 1 and 2)

- Task ID: analysis-exports
- Status: accepted by the user 2026-10-28 (the two decisions under "Open decisions"); launched for Codex via `codex exec` in workspace-write mode
- Goal and user-visible outcome: the pipeline writes the static data files that two visualisation sets need, so the frontend can later draw them without computing anything: **set 1, projection fidelity** (do apparent neighbourhoods survive the reduction to 2D?) and **set 2, artist and album effect** (how much of the neighbourhood structure follows artists?).
- Owning role: implementer
- Responsible agent: Codex (small, bounded Claude-prepared task, one implementation owner)
- Prepared by: Claude, 2026-10-28. Inputs: `experiments/profile_dataset.py` and its output `data/derived/eda/profile.json`; Codex's independent review of that profile (corrections 2-5 are built into this contract). Codex has not reviewed this brief.
- Context and source references: `AGENTS.md`, `docs/state.md`, `docs/architecture.md` (data contract, feature-graph precedent for optional files), `docs/code-style.md`, `docs/patterns.md`, `docs/datasets.md`, ADR 0006. Reference implementation of every metric: `experiments/profile_dataset.py` (read it, do not import from `experiments/`).
- Relevant skill: `.agents/skills/agent-technical-change/SKILL.md`

## Contract

### Population and preprocessing

- Tracks: `load_tracks(data_dir, SubsetSpec(n=..., seed=...))` joined to `read_features` on `id`, as in `pipeline/scripts/build_feature_graph.py`. Default is **all 55 607 tracks with features**; `--n-tracks` takes a seeded subset. Feature matrix: `ACOUSTIC_V1`, `standardize` (clip 0.5-99.5 percent). Tags never enter any matrix that is projected or used for neighbours (label leakage).
- Map pipeline is the documented one: `Z40 = reduce_pca(Z, 40)` then `project_umap`. Neighbours in the original space are computed on `Z` (all 96 standardised features), as in `profile_dataset.py`.
- Single-genre cohort (labels for set 2): tracks with exactly one genre tag that is among the 12 most common single-genre tags (9 156 tracks on the full data).

### New module and script

- `pipeline/src/music_atlas/fidelity.py` (set 1), `pipeline/src/music_atlas/artist_effect.py` (set 2), writers in a **new** module `pipeline/src/music_atlas/analysis_export.py` (it may import `_write_gzip_json` from `export.py`, read-only use; `export.py` itself is not edited, see Write scope), entry point `pipeline/scripts/build_analysis_exports.py <out_dir>` (output dir argument; data dir from `MUSIC_MAP_DATA_DIR`). Pure functions in the modules; I/O only in the script and writers.
- Frozen dataclasses for parameter bundles (`code-style.md`). Every random step takes `seed`.

### Output files (all gzip JSON written with `_write_gzip_json`, `allow_nan=False`, byte-identical for identical input)

Large per-track data is **columnar** (one array per field, all aligned with `ids`), never a list of records. Floats are rounded to 4 decimals (`COORDINATE_DECIMALS`).

1. `analysis_manifest.json` (plain JSON, indent 2): `schema_version` of the manifest = `"0.1"`; `feature_set_id`; SHA-256 of the feature cache input and of the tracks TSV; library versions; preprocessing (`clip_percentiles` and fitted clip bounds); cohort definitions with counts; per run: `run_id`, method, parameters, `seed`, `fit_n`; metric settings (`k` values, `eval_n`, `candidate_n`); wall-clock seconds per stage. Anything needed to reproduce the files.
2. `track_attributes.json.gz`: `{"ids": [...], "artist_id": [...], "album_id": [...], "release_year": [...], "duration_s": [...]}`. Release year is parsed from `RELEASEDATE` (second-to-last column of `raw.meta.tsv`, see `release_years` in the reference script; keep the same tolerance for stray TABs).
3. `positions.json.gz` (set 1): `{"ids": [...], "runs": {"<run_id>": {"x": [...], "y": [...]}}}` for runs `pca2d` (PCA of `Z` to 2D), `umap_nn15` (`Z40` -> UMAP `n_neighbors=15`, `min_dist=0.1`), `umap_nn50` (`n_neighbors=50`, `min_dist=0.1`; only `n_neighbors` differs, so its effect can be attributed). Positions come from the first seed.
4. `local_quality.json.gz` (set 1): `{"k": 15, "ids": [...], "runs": {"<run_id>": {"recall": [...]}}}` where `recall[i]` = |true 15-NN(i) in `Z` intersect 15-NN(i) on the map| / 15, true neighbours exclude the track itself (`project.knn`).
5. `fidelity_metrics.json.gz` (set 1): rows `{run_id, seed, k, fit_n, eval_n, trustworthiness, continuity, recall}` for `k` in {5, 15, 50}, seeds {42, 43, 44} (one full refit per seed and run). `eval_n` = 5 000 tracks drawn with a fixed seed; each seed's fit is made on all tracks, then trustworthiness and continuity are computed on the `eval_n` tracks only (their map positions from that fit, true neighbours defined inside the evaluated set; `trustworthiness` needs an n x n distance matrix, so it cannot run on 55 607 tracks). `fit_n` and `eval_n` are recorded so the population of every number is explicit.
6. `neighbors.json.gz`: reuse `write_neighbors` (15 neighbours and distances in `Z`) for all tracks. Report the file size in the completion note; if it exceeds 15 MB, escalate rather than truncating.
7. `artist_summary.json.gz` (set 2): list of records `{artist_id, name, n_tracks, n_albums, rank, cumulative_share, same_artist_nn_share, expected_share}`. `rank` is by track count descending (ties by `artist_id`); `cumulative_share` is the share of all tracks held by artists of rank <= this one; `same_artist_nn_share` is the mean over the artist's tracks of the fraction of its 15 neighbours (in `Z`) that share the artist; `expected_share` = `(n_tracks - 1) / (N - 1)` for that artist (chance, self excluded).
8. `policy_metrics.json.gz` (set 2): rows `{policy, weighting, k, cohort, n, genre_agreement, vote_accuracy, macro_recall, majority_share, ci_low, ci_high, bootstrap}` for `policy` in `unrestricted`, `exclude_same_album`, `exclude_same_artist` and `weighting` in `track`, `artist` (artist-balanced = mean over artists of the artist's mean). `ci_low`/`ci_high` are the 2.5th/97.5th percentiles of `genre_agreement` over `B = 200` seeded bootstrap resamples **of artists** (cohort artists are the resampling unit). The CI field names which metric it describes; add `vote_accuracy_ci_low/high` the same way.
   - For each cohort track the 15 nearest neighbours are **searched again among eligible candidates inside the cohort** (not filtered from an unrestricted top-15). Use chunked brute-force distances in `Z` (about 1 000 rows at a time) with ineligible candidates and the track itself masked. Raise `ValueError` if any track has fewer than 15 eligible candidates.
   - `genre_agreement` = mean over tracks of the share of its 15 neighbours with the same genre label; `vote_accuracy` = share of tracks whose majority neighbour label equals their label (ties broken by the label order of `sorted(labels)`, documented); `macro_recall` = mean over genres of per-genre recall of that vote; `majority_share` = share of the largest genre.
   - Also export the population chance for the artist definition: `same_artist_by_chance = sum_a n_a (n_a - 1) / (N (N - 1))` in `analysis_manifest.json` (self pairs excluded, unlike the earlier profile's sum of squared shares).

### Invariants and failure behaviour

- Fail fast with a specific message on: missing data dir or files, non-finite values, length mismatches, unknown policy names, fewer than 15 eligible candidates.
- The `unrestricted` policy must equal the plain `knn` result on the cohort.
- Existing atlas files, `types.ts`, `loader.ts` and `schema_version "0.1"` are **not modified**: all files above are additive and optional, as `features.json.gz` was. If you find that an additive file breaks the loader or the contract tests, stop and escalate.

## Write scope

Allowed: `pipeline/src/music_atlas/{fidelity,artist_effect,analysis_export}.py` (new files), `pipeline/scripts/build_analysis_exports.py` (new), `pipeline/tests/test_{fidelity,artist_effect,analysis_export}.py` (new), the docstrings of `trustworthiness_k` and `continuity_k` in `pipeline/src/music_atlas/evaluate.py` (see below), `docs/architecture.md` (add one new section for the optional files, same style as the feature graph; re-read the file right before editing and touch nothing else), this brief's Completion section.

Not allowed: `frontend/`, `ingest.py`, `features.py`, `project.py`, `export.py`, `experiments/`, `docs/state.md` (Claude updates it), any other doc, git operations (no commit, push, branch, remote, stash, checkout, reset), downloads.

**Concurrent writers.** On 2026-10-28 other sessions had uncommitted edits in `export.py`, `project.py`, `frontend/`, `docs/state.md` and `package.json`. They are not yours: do not edit, format, stage or revert them. `project_umap` now takes an optional `n_components` (default 2), which does not affect your calls. Run `git status --short` before you start and after you finish, and list in Completion every path you created or changed; any path outside the allowed list is a defect.

`evaluate.py` docstring fix: trustworthiness is a rank-weighted penalty for neighbours that the map introduces, not "how many neighbours are retained"; continuity is the same for neighbours the map loses. Change wording only, no behaviour.

## Acceptance criteria

Synthetic, offline, deterministic tests (small blobs, fixed seeds):
- A projection equal to the input scores about 1.0 on recall, trustworthiness and continuity; a row-shuffled projection scores clearly lower. `local_quality` has one value in [0, 1] per track.
- Same seed gives the same positions, metrics and bytes. A different seed changes UMAP positions.
- Policy search: on data where every track's nearest neighbours are its own artist, `exclude_same_artist` returns 15 neighbours that all differ in artist (proving re-search, not post-filtering) and lowers `genre_agreement` relative to `unrestricted`; `unrestricted` equals `knn`. `exclude_same_album` keeps same-artist different-album neighbours.
- Chance formula: artist sizes `[2, 1, 1]` give `2 / 12`.
- `artist_summary`: `cumulative_share` is non-decreasing and ends at 1.0; ranks are 1..n_artists; `expected_share` for a one-track artist is 0.
- Bootstrap: seeded and reproducible, the interval contains the point estimate on a non-degenerate case.
- Writers: columnar arrays have equal lengths; `NaN` or `Infinity` is rejected; output is gzip JSON that parses with `json`.

Real-data run (needs `MUSIC_MAP_DATA_DIR`, the feature cache or archives, and a working `umap`): `build_analysis_exports.py` completes and its numbers agree with `data/derived/eda/profile.json` within 0.0005 for the unrestricted policy: `genre_agreement` 0.4833, `vote_accuracy` 0.6281, `majority_share` 0.2562, cohort `n` 9 156, and mean same-artist neighbour share 0.1000 / same-album 0.0470 over all tracks. Report the elapsed time per stage and the size of every file. If the run cannot be done in your environment, say so; do not substitute synthetic output for it.

## Verification

```
cd pipeline
uv run pytest --basetemp=.pytest_tmp
uv run ruff check .
uv run ruff format --check .
```

Machine notes: the repository path contains non-ASCII characters (tests already use `pythonpath = ["src"]`). A previous Codex run reported that `pipeline/.venv` points to a Python 3.12 interpreter it could not reach and fell back to Python 3.13; numba/UMAP on 3.13 is not verified here. Use whichever interpreter runs the tests, state exactly which one, and list every test or script that could not run. Never describe a skipped check as passing.

## Out of scope

Frontend views, `types.ts`, loader changes, render work, HDBSCAN clusters, sets 3 to 5 (feature heatmap, tag coverage, release years), mood and instrument colouring, hyper-parameter search beyond the two UMAP runs, a `schema_version` bump, committing or pushing.

## Open decisions and escalation

Autonomous within the contract: private helper names, chunk size, internal data structures, tie-breaking where documented, test data design.

Return to Claude (technical lead) with concrete alternatives if: a file exceeds 15 MB; the full run exceeds about 30 minutes for the whole script on this machine (do not silently reduce `eval_n`, seeds or the cohort); an additive file collides with the loader or contract tests; unrestricted numbers differ from the profile by more than 0.0005 and the cause is not a documented tie-break; any change outside the write scope seems necessary.

User decisions already made: sets 1 and 2 are the first to build (2026-10-28). Decisions I took and the user can overrule: the files are additive without a `schema_version` bump (feature-graph precedent); default population is the full 55 607 tracks, not the 10k pilot subset, because the same-artist effect depends on catalogue density.

## Completion

Not started.
