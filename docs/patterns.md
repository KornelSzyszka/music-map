# Patterns

A living catalogue of recurring design solutions in this repository. Record a pattern when the same solution appears (or is deliberately chosen) a second time, so the next change follows it instead of reinventing it.

**Status** is one of `present` (exists in code), `planned` (decided, not yet implemented), `retired`.

## How to add a pattern

Copy the template, fill every field, keep it short. Link the code that implements it. If a pattern is later broken on purpose, note the exception here.

```markdown
### Name
- **Status:** present | planned | retired
- **Context:** when this situation arises
- **Rule:** what we do
- **Why:** the reason, including the alternative we rejected
- **Where:** paths that implement it
```

## Catalogue

### Offline precompute, static serving
- **Status:** planned
- **Context:** the UI needs positions, clusters and neighbours for ~10k–25k tracks.
- **Rule:** all heavy computation runs offline in `pipeline/`. The browser receives versioned static files and only filters, searches and renders.
- **Why:** no backend to run or secure, reproducible demos, simple deployment. Rejected: server-side or in-browser projection (slower, harder to reproduce).
- **Where:** `pipeline/src/music_atlas/export.py` → `data/derived/` → `frontend/src/data/`.

### Pipeline stage as a typed function
- **Status:** present (signatures); bodies are stubs
- **Context:** the pipeline has stages: ingest → features → project → evaluate → export.
- **Rule:** each stage is a function with explicit input and output types, no hidden state, I/O only at the stage edges. Random steps take a `seed`.
- **Why:** stages can be tested in isolation and compared across parameter variants.
- **Where:** `pipeline/src/music_atlas/{ingest,features,project,evaluate,export}.py`.

### Environment configuration, fail fast
- **Status:** present
- **Context:** code needs the location of source data, which differs per machine.
- **Rule:** read configuration in one module (`config.py`): an environment variable first, the repository's `.env` as fallback. A missing required variable raises an error that names the variable. No machine-specific default paths in code.
- **Why:** portable, no surprises on another machine. Rejected: hard-coded default drive path.
- **Where:** `pipeline/src/music_atlas/config.py`, `.env.example`.

### Data contract mirrored in types
- **Status:** present
- **Context:** pipeline and frontend exchange JSON they do not share code for.
- **Rule:** the contract is documented once (`docs/architecture.md`) and mirrored by `frontend/src/data/types.ts`. Field names match the wire format. A schema change updates both and bumps `schema_version`.
- **Why:** the two halves stay compatible; the manifest lets one frontend load different datasets.
- **Where:** `docs/architecture.md`, `frontend/src/data/types.ts`.

### Reproducibility metadata
- **Status:** present (in the contract), planned (in the pipeline)
- **Context:** a map must be re-creatable and comparable.
- **Rule:** every export carries `dataset_version`, `feature_set_id`, `projection_id`, `seed` and the parameters used.
- **Why:** results in the report must be traceable to exact inputs.
- **Where:** manifest in `docs/architecture.md`, `frontend/src/data/types.ts`.

### Neighbours from feature space, never from the map
- **Status:** planned
- **Context:** the 2D map distorts distances.
- **Rule:** nearest neighbours are computed in the (standardised) feature space and exported; the UI never derives neighbours from pixel or map distance.
- **Why:** map-space neighbours can be false. Rejected: computing neighbours on `(x, y)`.
- **Where:** `pipeline/src/music_atlas/project.py` (`knn`), `neighbors` export.

### Filtering is a visibility mask
- **Status:** planned
- **Context:** users filter by tags and feature ranges.
- **Rule:** filtering produces a mask over the original tracks. Coordinates and the underlying data are never modified.
- **Why:** filters stay cheap, reversible and cannot corrupt the map.
- **Where:** `frontend/src/derive/`.

### One-way data flow in the UI
- **Status:** planned
- **Context:** interactions (zoom, select, filter, colour) must stay consistent.
- **Rule:** state → derived values → rendered layers. Interactions only change state.
- **Why:** predictable rendering with a WebGL layer model.
- **Where:** `frontend/src/{state,derive,map,panels}/`.

### Stub first
- **Status:** present (temporary)
- **Context:** a skeleton fixes structure before behaviour is known.
- **Rule:** stubs raise `NotImplementedError` and carry a `TODO` naming the missing decision. A stub is deleted, not left behind, once implemented.
- **Where:** `pipeline/src/music_atlas/*.py`.

### Untrusted archives are read in memory
- **Status:** present
- **Context:** the pipeline reads downloaded tar archives.
- **Rule:** iterate members and parse them in memory; accept only regular files with the expected extension; never extract to disk and never execute content.
- **Why:** downloaded files are untrusted input (path traversal, links). Rejected: `extractall`.
- **Where:** `pipeline/src/music_atlas/features.py` (`_iter_documents`).

### Runs are versioned files
- **Status:** present
- **Context:** the atlas depends on many choices: dataset, sample, feature set, projection and clustering parameters.
- **Rule:** every choice lives in a TOML run file in `pipeline/runs/`, validated strictly (unknown keys fail). `.env` holds only machine-specific values. The manifest copies the parameters, library versions and quality scores.
- **Why:** an atlas is reproducible from its commit; experiments differ by a file, not by command-line flags or environment. Rejected: parameters in `.env` or scattered CLI options.
- **Where:** `pipeline/runs/*.toml`, `pipeline/src/music_atlas/runs.py`, `pipeline/scripts/run.py`.
