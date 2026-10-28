# Local data

`derived/` holds the static atlas export consumed by the frontend (`features.json.gz`, `feature_sample.json.gz`, later `manifest.json`, `tracks.json.gz`, ...). It is git-ignored and produced by the pipeline.

The source datasets are not stored here. They live in the directory named by `MUSIC_MAP_DATA_DIR` (see the README, "Source data").
