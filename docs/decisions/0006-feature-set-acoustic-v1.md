# Feature set acoustic-v1

- Status: proposed
- Owner: User (accepts); Claude (technical proposal)
- Date: 2026-10-27

## Context

The map needs a numeric feature vector per track. Jamendo provides ~2.8k Essentia numbers per track (`docs/datasets.md`), many of them redundant frame statistics. Tags must not enter the projection (label leakage).

## Decision

Use 96 features, defined in `pipeline/src/music_atlas/features.py` (`ACOUSTIC_V1`):

| Group | Features | Count |
|---|---|---|
| Timbre / spectral shape | mean and var of 15 descriptors (centroid, spread, skewness, kurtosis, rolloff, flux, entropy, complexity, decrease, rms, strong peak, ZCR, HFC, dissonance, pitch salience) | 30 |
| Band energies | mean of 4 energy bands | 4 |
| MFCC | 13 means and 13 variances (variance = covariance diagonal) | 26 |
| Spectral contrast | 6 coefficient means, 6 valley means | 12 |
| Band flatness / crest | 3 means | 3 |
| Loudness / dynamics | average loudness, dynamic complexity, silence rate | 3 |
| Rhythm | bpm, danceability, onset rate, beats loudness (mean, var), BPM-histogram peaks (4) | 9 |
| Tonal | key strength, chord change and number rates, chord strength, HPCP entropy, 3 tuning descriptors, major/minor | 9 |

Excluded on purpose: HPCP pitch-class profile and key tonic (depend on the key, not the sound), beat positions, raw band vectors, `cov`/`icov` matrices, tags.

Normalisation: clip each column to its 0.5th-99.5th percentile, then centre and scale (`standardize`). Parameters are returned so that new data can be transformed identically.

## Alternatives and rationale

- All 481 frame statistics: more redundancy, higher dimension, no evidence of benefit.
- Plain z-score without clipping: outliers dominate distances.
- Log or Yeo-Johnson transforms for skewed variance features: not tried; 9 `.var` columns remain skewed (>3) after clipping. Revisit in the Evaluation stage if it matters.

## Evidence (all 55 699 feature files, 2026-10-27)

- Every path exists and is finite in every file; reading all archives takes about 80 s.
- Clipping removes all |z| > 10 outliers (51 columns had them) and cuts strongly skewed columns from 27 to 9.
- PCA needs 17 / 29 / 42 components for 80 / 90 / 95 % of the variance; only 5 of 4 560 column pairs have |r| > 0.95.
- Sanity check, not a quality claim: 15-NN genre accuracy on 31 680 tracks with exactly one of 8 genres is 0.594 after normalisation, versus 0.353 for the majority class and 0.337 on unnormalised features.
- 55 607 of the 55 699 feature files match a track in `raw_30s_cleantags_50artists.tsv`.

## Participants and acceptance evidence

Proposed by Claude. Not yet accepted by the user. No Codex input.

## Consequences

The pipeline can build the matrix for the pilot. Changing the set means a new `feature_set_id` (manifest field). Perceptual claims about the map are limited to what these summary statistics encode (timbre, rhythm, loudness, rough tonality).
