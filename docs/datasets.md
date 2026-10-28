# Datasets

Facts here were checked against files on disk unless marked **unverified**. Raw data lives under `MUSIC_MAP_DATA_DIR` and is never committed.

## What is used and where it comes from

| Data | Source | Used for | Obtained by |
|---|---|---|---|
| Track metadata and tags (TSV) | clone of `github.com/MTG/mtg-jamendo-dataset` | `ingest`: ids, titles, artists, genre/instrument/mood tags | `npm run data` (git clone) |
| Feature archives (100 x `.tar.gz`, ~1.3 GB) | MTG CDN `cdn.freesound.org/mtg-jamendo/raw_30s/acousticbrainz/` | `features`: the 96 acoustic features | `npm run data` (SHA-256 verified against the list in the clone) |

Both sit under `MUSIC_MAP_DATA_DIR` (set in `.env`), in `mtg-jamendo-dataset/` and `mtg-jamendo/acousticbrainz/`. The layout is defined once in `pipeline/src/music_atlas/datasets.py` and downloaded by `pipeline/src/music_atlas/fetch.py`. Not used: audio, mel-spectrograms, other datasets (FMA is only an alternative, see [first-dataset decision](decisions/0003-first-dataset.md)).

## MTG-Jamendo (first dataset, [why it was chosen](decisions/0003-first-dataset.md))

Source: https://github.com/MTG/mtg-jamendo-dataset (full clone). Metadata CC BY-NC-SA 4.0; audio has per-file licences; non-commercial academic use.

### Metadata (`data/raw_30s_cleantags_50artists.tsv`, also `data/autotagging.tsv`)

55 609 tracks. Columns: `TRACK_ID` (`track_1002000`), `ARTIST_ID`, `ALBUM_ID`, `PATH` (`00/1002000.mp3`), `DURATION`, `TAGS` (tab-separated, `category---tag`). `data/raw.meta.tsv` adds `TRACK_NAME`, `ARTIST_NAME`, `ALBUM_NAME`, `RELEASEDATE`, `URL`.

195 tags: 95 genre, 41 instrument, 59 mood/theme (183 appear in the official splits). Tags are labels: use them for colouring, filtering and evaluation, never as projection input (label leakage).

### Acoustic features (Essentia, AcousticBrainz format)

Archives `raw_30s_acousticbrainz-NN.tar.gz` (100 files, SHA-256 in `data/download/raw_30s_acousticbrainz_sha256_tars.txt`) from `https://cdn.freesound.org/mtg-jamendo/raw_30s/acousticbrainz/`. One JSON per track, named after `PATH` (`00/1002000.json`). Top level: `lowlevel`, `rhythm`, `tonal`, `metadata`. There is **no** `highlevel` section.

Checked on `00/1002000.json`:

| Section | Content | Numeric values |
|---|---|---|
| `lowlevel` | spectral shape, bark/erb/mel bands, MFCC and GFCC (`mean`, `cov`, `icov`), spectral contrast, loudness, dynamic complexity, dissonance, pitch salience, silence rate, ZCR, HFC | 2117 |
| `rhythm` | `bpm`, `beats_count`, `onset_rate`, `danceability`, beats loudness, BPM histogram peaks (+ `beats_position` list, 156 values here) | 277 incl. beat positions |
| `tonal` | `key_key/scale/strength`, chords (key, scale, rate, strength, 24-bin histogram), HPCP and its entropy, tuning (frequency, deviation, diatonic strength) | 409 |

Most descriptors are summary statistics over frames: `mean`, `var`, `min`, `max`, `median` and first/second-difference stats (`dmean`, `dmean2`, `dvar`, `dvar2`). Features are per-track summaries, not time series. The proposed selection of 96 features is in [feature-set decision](decisions/0006-feature-set-acoustic-v1.md). The feature archives hold 55 699 tracks, of which 55 607 are in the 50-artist metadata file.

### Not used

Mel-spectrograms (large, need a neural model) and audio (licences, size). `music-classification-annotations` (15 taxonomies) covers only the split-0 test set.
