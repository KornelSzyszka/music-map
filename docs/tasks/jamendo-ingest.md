# Task brief: Jamendo ingest

- Task ID: jamendo-ingest
- Status: proposed
- Goal and user-visible outcome: `ingest` turns the Jamendo metadata into a validated, reproducibly sampled tracks table.
- Owning role: implementer
- Responsible agent: Codex
- Prepared by: Claude, 2026-10-27 (evidence: this brief; decisions in [first-dataset decision](../decisions/0003-first-dataset.md))
- Context: `docs/datasets.md` (verified columns and tag format), `docs/code-style.md`, `docs/patterns.md`
- Relevant skill: `agent-technical-change`

## Contract

- `load_tracks(data_dir, subset)` reads `mtg-jamendo-dataset/data/raw_30s_cleantags_50artists.tsv` and `raw.meta.tsv` under `data_dir`. Replace the loose `SubsetSpec` mapping with a frozen dataclass.
- Output DataFrame: `id` (`jamendo:<numeric id>`), `track_id`, `artist_id`, `album_id`, `path`, `duration`, `title`, `artist`, `genres`, `instruments`, `moods` (lists, prefix `genre---`/`instrument---`/`mood/theme---` stripped), `source_url`.
- Rows with a `TAGS` field have a variable number of tab-separated columns: parse with the csv module or manual split, not a fixed-width reader.
- Validation raises a specific error: missing file, missing column, duplicate `TRACK_ID`, unknown tag category. No silent defaults.
- `sample_subset(df, n, seed, stratify_by)`: reproducible, stratified by the first genre when requested; same seed gives the same ids.

## Write scope

`pipeline/src/music_atlas/ingest.py`, `pipeline/tests/test_ingest.py`, test fixtures under `pipeline/tests/`. Not other modules, not `data/`.

## Acceptance criteria

- Tests on a tiny synthetic TSV written in the real format (including a row with several tags and a row with a single tag): parsing, category split, duplicate detection, missing column, sampling reproducibility and stratification.
- One manual run against the real file reports 55 609 rows and the 95/41/59 tag-category counts (report the output; do not commit data).
- `uv run pytest`, `uv run ruff check .`, `uv run ruff format --check .` pass.

## Out of scope

Acoustic features, projection, export, downloading data.

## Open decisions and escalation

Choice between pandas and plain Python for parsing is routine. A change to the output column names that affects the contract returns to Claude.

## Completion

To be filled when done.
