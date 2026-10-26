# Local data

- `raw/`: downloaded source metadata and features.
- `processed/`: cleaned and intermediate tabular data.
- `derived/`: static atlas export consumed by the frontend.

The contents of these directories are git-ignored. The pipeline locates source data through the `MUSIC_MAP_DATA_DIR` environment variable (see `.env.example`).
