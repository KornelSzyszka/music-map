"""Acoustic feature extraction and normalisation (see docs/datasets.md).

A feature is addressed by a dotted path into an Essentia/AcousticBrainz JSON
document, for example ``lowlevel.spectral_centroid.mean`` or ``lowlevel.mfcc.mean[3]``.
"""

import json
import tarfile
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

ID_PREFIX = "jamendo:"
ARCHIVE_GLOB = "raw_30s_acousticbrainz-*.tar.gz"
ID_COLUMN = "id"
DEFAULT_CLIP_PERCENTILES = (0.5, 99.5)

# Descriptors summarised by their per-frame mean and variance.
_TIMBRE_DESCRIPTORS = (
    "spectral_centroid",
    "spectral_spread",
    "spectral_skewness",
    "spectral_kurtosis",
    "spectral_rolloff",
    "spectral_flux",
    "spectral_entropy",
    "spectral_complexity",
    "spectral_decrease",
    "spectral_rms",
    "spectral_strongpeak",
    "zerocrossingrate",
    "hfc",
    "dissonance",
    "pitch_salience",
)
_BAND_ENERGIES = (
    "spectral_energyband_low",
    "spectral_energyband_middle_low",
    "spectral_energyband_middle_high",
    "spectral_energyband_high",
)
# Derived binary feature: 1.0 for a major key, 0.0 for minor.
MAJOR_MODE_PATH = "tonal.key_scale==major"
MFCC_COEFFICIENTS = 13
CONTRAST_BANDS = 6


def _acoustic_v1_paths() -> tuple[str, ...]:
    paths: list[str] = []
    for name in _TIMBRE_DESCRIPTORS:
        paths += [f"lowlevel.{name}.mean", f"lowlevel.{name}.var"]
    paths += [f"lowlevel.{name}.mean" for name in _BAND_ENERGIES]
    for i in range(MFCC_COEFFICIENTS):
        paths += [f"lowlevel.mfcc.mean[{i}]", f"lowlevel.mfcc.var[{i}]"]
    for i in range(CONTRAST_BANDS):
        paths += [
            f"lowlevel.spectral_contrast_coeffs.mean[{i}]",
            f"lowlevel.spectral_contrast_valleys.mean[{i}]",
        ]
    paths += [
        "lowlevel.melbands_flatness_db.mean",
        "lowlevel.melbands_crest.mean",
        "lowlevel.barkbands_flatness_db.mean",
        "lowlevel.average_loudness",
        "lowlevel.dynamic_complexity",
        "lowlevel.silence_rate_30dB.mean",
        "rhythm.bpm",
        "rhythm.danceability",
        "rhythm.onset_rate",
        "rhythm.beats_loudness.mean",
        "rhythm.beats_loudness.var",
        "rhythm.bpm_histogram_first_peak_bpm.mean",
        "rhythm.bpm_histogram_first_peak_weight.mean",
        "rhythm.bpm_histogram_first_peak_spread.mean",
        "rhythm.bpm_histogram_second_peak_weight.mean",
        "tonal.key_strength",
        "tonal.chords_changes_rate",
        "tonal.chords_number_rate",
        "tonal.chords_strength.mean",
        "tonal.hpcp_entropy.mean",
        "tonal.tuning_diatonic_strength",
        "tonal.tuning_equal_tempered_deviation",
        "tonal.tuning_nontempered_energy_ratio",
        MAJOR_MODE_PATH,
    ]
    return tuple(paths)


@dataclass(frozen=True)
class FeatureSpec:
    """An ordered, versioned list of feature paths."""

    feature_set_id: str
    paths: tuple[str, ...]


ACOUSTIC_V1 = FeatureSpec("acoustic-v1", _acoustic_v1_paths())


def extract_value(doc: dict, path: str) -> float:
    """Return one feature from a parsed document; raise KeyError if absent."""
    if path == MAJOR_MODE_PATH:
        return 1.0 if doc["tonal"]["key_scale"] == "major" else 0.0
    index: int | None = None
    if path.endswith("]"):
        path, _, raw_index = path[:-1].rpartition("[")
        index = int(raw_index)
    node = doc
    parts = path.split(".")
    for part in parts[:-1]:
        node = node[part]
    leaf = parts[-1]
    if leaf == "var" and "var" not in node and "cov" in node:
        # MFCC/GFCC come with a covariance matrix instead of a variance vector.
        value = node["cov"][index][index]
    else:
        value = node[leaf]
        if index is not None:
            value = value[index]
    return float(value)


def extract_vector(doc: dict, spec: FeatureSpec) -> np.ndarray:
    """Return all features of the spec as one vector; fail on non-finite values."""
    vector = np.array([extract_value(doc, path) for path in spec.paths])
    if not np.isfinite(vector).all():
        bad = [p for p, v in zip(spec.paths, vector, strict=True) if not np.isfinite(v)]
        raise ValueError(f"non-finite feature values: {bad[:3]}")
    return vector


def _iter_documents(archive: Path) -> Iterator[tuple[str, dict]]:
    # Archives are untrusted: read members in memory, never extract to disk.
    with tarfile.open(archive, "r:gz") as tar:
        for member in tar:
            if not (member.isfile() and member.name.endswith(".json")):
                continue
            handle = tar.extractfile(member)
            if handle is None:
                continue
            track_number = Path(member.name).stem
            yield f"{ID_PREFIX}{int(track_number)}", json.load(handle)


def read_features(
    archive_dir: Path, spec: FeatureSpec, track_ids: set[str] | None = None
) -> pd.DataFrame:
    """Read features for the requested tracks (all when None) from the archives.

    Returns a table with an ``id`` column followed by one column per feature path.
    """
    archives = sorted(archive_dir.glob(ARCHIVE_GLOB))
    if not archives:
        raise FileNotFoundError(f"no feature archives in {archive_dir}")
    ids: list[str] = []
    rows: list[np.ndarray] = []
    for archive in archives:
        for track_id, doc in _iter_documents(archive):
            if track_ids is not None and track_id not in track_ids:
                continue
            ids.append(track_id)
            rows.append(extract_vector(doc, spec))
    frame = pd.DataFrame(np.vstack(rows), columns=list(spec.paths))
    frame.insert(0, ID_COLUMN, ids)
    return frame


def build_matrix(df: pd.DataFrame, spec: FeatureSpec) -> np.ndarray:
    """Return the feature matrix in spec order, failing on missing columns."""
    missing = [path for path in spec.paths if path not in df.columns]
    if missing:
        raise KeyError(f"missing feature columns: {missing[:3]}")
    return df[list(spec.paths)].to_numpy(dtype=float)


@dataclass(frozen=True)
class FittedTransform:
    """Winsorise to fitted bounds, then centre and scale (parameters per column)."""

    lower: np.ndarray
    upper: np.ndarray
    mean: np.ndarray
    scale: np.ndarray

    def apply(self, X: np.ndarray) -> np.ndarray:
        """Transform new data with the parameters fitted on the training data."""
        clipped = np.clip(X, self.lower, self.upper)
        return (clipped - self.mean) / self.scale


def standardize(
    X: np.ndarray, clip_percentiles: tuple[float, float] = DEFAULT_CLIP_PERCENTILES
) -> tuple[np.ndarray, FittedTransform]:
    """Clip heavy tails, then standardise; return the data and fitted parameters."""
    low, high = clip_percentiles
    lower, upper = np.percentile(X, [low, high], axis=0)
    clipped = np.clip(X, lower, upper)
    mean = clipped.mean(axis=0)
    scale = clipped.std(axis=0)
    # A column constant after clipping carries no information; keep it at zero.
    scale = np.where(scale == 0, 1.0, scale)
    transform = FittedTransform(lower, upper, mean, scale)
    return transform.apply(X), transform
