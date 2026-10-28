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

Requirements: Python 3.12, [uv](https://docs.astral.sh/uv/), Node 24 with npm, git.

Run everything from the repository root. The apps live in `pipeline/` and `frontend/`; the root `package.json` only forwards to them.

```bash
cp .env.example .env     # then set MUSIC_MAP_DATA_DIR (see "Source data" below)
npm run setup            # installs frontend and pipeline dependencies
npm run data             # downloads the source data (about 1.4 GB, once)
npm run graph            # builds the feature graph export (about 2 minutes)
npm run atlas            # builds the 10k-track atlas from pipeline/runs/pilot.toml (about 2 minutes)
npm run dev              # starts the app on http://localhost:5173
```

`npm run dev` works without the data too: the Map tab falls back to a bundled synthetic atlas (with a notice), and the Features tab stays empty until `npm run graph` has run.

**What gets loaded** is decided by a run file, not by `.env`: edit `pipeline/runs/pilot.toml` (or copy it to a new name and run `uv run python scripts/run.py <name>` from `pipeline/`) to change the sample size, seed, feature set or any projection and clustering parameter. `ATLAS_RUN=<name> npm run dev` shows another run.

Environment: `scripts/build-atlas.ps1` (alias `music-atlas-build`) checks tools, creates `.env` and installs both sets of dependencies; `-Data` also fetches the data, `-Check` runs the gates afterwards. `music-atlas` starts the app.

On Linux/macOS the same two steps are `scripts/build-atlas.sh [--data] [--check]` and `scripts/music-atlas.sh [--fetch|--data|--check|--docker|--no-open|--port N]`.

### Shell aliases (optional)

Both scripts resolve paths from their own location, so an alias works from any directory. Replace `<repo>` with the absolute path of your checkout. Arguments pass through, e.g. `music-atlas -NoOpen` or `music-atlas --port 5174`.

PowerShell: add to your profile (`notepad $PROFILE`), then restart the shell or run `. $PROFILE`.

```powershell
function music-atlas { & '<repo>\scripts\music-atlas.ps1' @args }
function music-atlas-build { & '<repo>\scripts\build-atlas.ps1' @args }
```

bash / zsh: add to `~/.bashrc` or `~/.zshrc`, then run `source` on it. Make the scripts executable first with `chmod +x scripts/*.sh`.

```bash
alias music-atlas='<repo>/scripts/music-atlas.sh'
alias music-atlas-build='<repo>/scripts/build-atlas.sh'
```

Quote the path as shown; it may contain spaces or non-ASCII characters.

Checks: `npm run check` runs the pipeline and frontend gates. On Windows with PowerShell, `scripts/music-atlas.ps1` wraps the same steps (`-Fetch`, `-Data`, `-Check`, `-Docker`).

## Source data

All source data lives in one directory that you choose; it is never inside the repository. Put its path in `.env` as `MUSIC_MAP_DATA_DIR`. The pipeline reads that variable from the environment, or from `.env` when the variable is not set.

`npm run data` (`pipeline/scripts/fetch_data.py`) fills the directory:

```text
<MUSIC_MAP_DATA_DIR>/
  mtg-jamendo-dataset/                  git clone of github.com/MTG/mtg-jamendo-dataset (metadata, ~270 MB)
  mtg-jamendo/acousticbrainz/           100 feature archives, ~1.3 GB, SHA-256 verified
```

That is all the project uses: track metadata and tags from the repository, and the Essentia feature JSON files from the archives. No audio and no spectrograms. `npm run data:check` reports what is present without downloading.

## Documentation

- [docs/architecture.md](docs/architecture.md): stack, data flow, data contract
- [docs/code-style.md](docs/code-style.md): how code is written and checked
- [docs/patterns.md](docs/patterns.md): recurring design solutions
- [docs/state.md](docs/state.md) and [docs/roadmap.md](docs/roadmap.md): where the project stands and the staged plan
- [docs/design.md](docs/design.md): interface and colour rules
- [docs/datasets.md](docs/datasets.md): what data is used, where it comes from, verified facts
- [docs/decisions/](docs/decisions/) and [docs/tasks/](docs/tasks/): decisions and task briefs
- [docs/agents/](docs/agents/): how Claude, Codex and the user work together
- [CONTRIBUTING.md](CONTRIBUTING.md): workflow and checks
- [AGENTS.md](AGENTS.md): rules for AI coding agents

## Data and licences

The first dataset is [MTG-Jamendo](https://github.com/MTG/mtg-jamendo-dataset). Its metadata is CC BY-NC-SA 4.0 and audio licences are per file, so the data is for non-commercial academic use and is never committed to this repository.
