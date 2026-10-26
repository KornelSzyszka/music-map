# Contributing

Read [docs/code-style.md](docs/code-style.md) and [docs/patterns.md](docs/patterns.md) first. Everything in this repository is written in English.

## Setup

Requirements: Python 3.12, `uv`, Node 24 with npm. Copy `.env.example` to `.env` and set `MUSIC_MAP_DATA_DIR`; export it in your shell, because the pipeline reads the environment, not the file.

## Checks

```bash
cd pipeline && uv sync && uv run pytest && uv run ruff check .
cd frontend && npm install && npm run typecheck && npm run lint && npm run test && npm run build
```

Optional notebooks: `uv sync --group experiments` in `pipeline/`.

## Docker

Docker runs the same checks in a clean environment and avoids host path pitfalls (the Python 3.12 non-ASCII `.pth` issue).

```bash
cp .env.example .env            # set MUSIC_MAP_DATA_DIR to your dataset directory
docker compose run --rm pipeline    # pytest + ruff inside the image
docker compose up --build frontend  # serves the built frontend on http://localhost:8080
```

The dataset directory is mounted read-only at `/data`; exports go to `data/derived/` (git-ignored) and are served by the frontend container under `/atlas/`.

## Workflow

1. Make one logical change at a time, with tests.
2. Run the checks above; a change is not done while any of them fails.
3. Update `docs/` if behaviour, structure or a documented pattern changed; add new recurring solutions to `docs/patterns.md`.
4. Commit with a Conventional Commits message (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).

Pushing, publishing and history rewrites need an explicit decision. Raw data, audio and derived exports stay out of git.
