# Music Atlas

An interactive 2D map of music tracks. Each track is a point; its position comes from projecting high-dimensional audio features (PCA → UMAP). Clusters and nearest neighbours are computed offline, so the browser only renders, searches and filters.

Course project for *Visualization of Large Datasets* (Wrocław University of Science and Technology).

> **Status:** project skeleton. Pipeline stages are typed stubs and the frontend shows a placeholder screen. Nothing is deployed.

## Repository layout

| Path | Contents |
|---|---|
| `pipeline/` | Offline Python pipeline (`music_atlas` package): ingest, features, projection, evaluation, export |
| `frontend/` | React + TypeScript + Vite app rendering the map with deck.gl |
| `experiments/` | Notebooks and projection-comparison results (optional) |
| `data/` | Local data layout notes; contents are git-ignored |
| `docs/` | Architecture, code style, design patterns |

## Quick start

Requirements: Python 3.12, [uv](https://docs.astral.sh/uv/), Node 24 with npm.

```bash
# pipeline
cd pipeline
uv sync
uv run pytest

# frontend
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env` and set `MUSIC_MAP_DATA_DIR` to the directory holding the source dataset. The pipeline reads the variable from the environment; the `.env` file is not loaded automatically.

## Documentation

- [docs/architecture.md](docs/architecture.md): stack, data flow, data contract
- [docs/code-style.md](docs/code-style.md): how code is written and checked
- [docs/patterns.md](docs/patterns.md): recurring design solutions
- [docs/state.md](docs/state.md) and [docs/roadmap.md](docs/roadmap.md): where the project stands and the staged plan
- [docs/datasets.md](docs/datasets.md): verified dataset facts
- [docs/decisions/](docs/decisions/) and [docs/tasks/](docs/tasks/): decisions and task briefs
- [docs/agents/](docs/agents/): how Claude, Codex and the user work together
- [CONTRIBUTING.md](CONTRIBUTING.md): workflow and checks
- [AGENTS.md](AGENTS.md): rules for AI coding agents

## Data and licences

The first dataset is [MTG-Jamendo](https://github.com/MTG/mtg-jamendo-dataset). Its metadata is CC BY-NC-SA 4.0 and audio licences are per file, so the data is for non-commercial academic use and is never committed to this repository.
