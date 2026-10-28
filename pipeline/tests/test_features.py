import io
import json
import tarfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from music_atlas.features import (
    ACOUSTIC_V1,
    FeatureSpec,
    build_matrix,
    extract_value,
    extract_vector,
    read_features,
    standardize,
)

SPEC = FeatureSpec(
    "test-v1",
    (
        "rhythm.bpm",
        "lowlevel.spectral_centroid.mean",
        "lowlevel.mfcc.mean[1]",
        "lowlevel.mfcc.var[1]",
        "tonal.key_scale==major",
    ),
)


def make_doc(bpm: float = 120.0, scale: str = "major") -> dict:
    return {
        "rhythm": {"bpm": bpm},
        "lowlevel": {
            "spectral_centroid": {"mean": 1500.0, "var": 9.0},
            "mfcc": {"mean": [1.0, 2.0], "cov": [[4.0, 0.0], [0.0, 7.0]]},
        },
        "tonal": {"key_scale": scale},
    }


def write_archive(path: Path, documents: dict[str, dict]) -> None:
    with tarfile.open(path, "w:gz") as tar:
        for name, doc in documents.items():
            payload = json.dumps(doc).encode()
            info = tarfile.TarInfo(name)
            info.size = len(payload)
            tar.addfile(info, io.BytesIO(payload))


def test_extract_scalar_stat_and_indexed_values():
    doc = make_doc()
    assert extract_value(doc, "rhythm.bpm") == 120.0
    assert extract_value(doc, "lowlevel.spectral_centroid.mean") == 1500.0
    assert extract_value(doc, "lowlevel.mfcc.mean[1]") == 2.0


def test_mfcc_variance_comes_from_the_covariance_diagonal():
    assert extract_value(make_doc(), "lowlevel.mfcc.var[1]") == 7.0


@pytest.mark.parametrize(("scale", "expected"), [("major", 1.0), ("minor", 0.0)])
def test_key_scale_becomes_a_binary_feature(scale, expected):
    assert extract_value(make_doc(scale=scale), "tonal.key_scale==major") == expected


def test_missing_path_raises_key_error():
    with pytest.raises(KeyError):
        extract_value(make_doc(), "rhythm.danceability")


def test_non_finite_value_is_rejected():
    with pytest.raises(ValueError, match="non-finite"):
        extract_vector(make_doc(bpm=float("nan")), SPEC)


def test_acoustic_v1_paths_are_unique():
    assert len(set(ACOUSTIC_V1.paths)) == len(ACOUSTIC_V1.paths) == 96


def test_read_features_selects_requested_tracks_in_memory(tmp_path):
    write_archive(
        tmp_path / "raw_30s_acousticbrainz-00.tar.gz",
        {
            "00/100.json": make_doc(bpm=100.0),
            "00/101.json": make_doc(bpm=110.0),
            "00/notes.txt": {"ignored": True},
        },
    )
    frame = read_features(tmp_path, SPEC, track_ids={"jamendo:101"})
    assert list(frame["id"]) == ["jamendo:101"]
    assert frame.loc[0, "rhythm.bpm"] == 110.0
    # Nothing is extracted next to the archive.
    assert sorted(p.name for p in tmp_path.iterdir()) == [
        "raw_30s_acousticbrainz-00.tar.gz"
    ]


def test_read_features_without_archives_fails_clearly(tmp_path):
    with pytest.raises(FileNotFoundError, match="no feature archives"):
        read_features(tmp_path, SPEC)


def test_build_matrix_follows_spec_order_and_rejects_missing_columns():
    frame = pd.DataFrame({path: [float(i)] for i, path in enumerate(SPEC.paths)})
    assert build_matrix(frame, SPEC).tolist() == [[0.0, 1.0, 2.0, 3.0, 4.0]]
    with pytest.raises(KeyError, match="missing feature columns"):
        build_matrix(frame.drop(columns=["rhythm.bpm"]), SPEC)


def test_standardize_bounds_outliers_and_centres_the_bulk():
    rng = np.random.default_rng(0)
    X = rng.normal(size=(1000, 3))
    X[0, 0] = 1e6
    Z, _ = standardize(X)
    assert np.abs(Z).max() < 10
    np.testing.assert_allclose(np.median(Z[1:, 1]), 0, atol=0.2)


def test_standardize_keeps_constant_columns_at_zero():
    X = np.column_stack([np.ones(50), np.arange(50.0)])
    Z, _ = standardize(X)
    assert (Z[:, 0] == 0).all()


def test_fitted_transform_applies_training_parameters_to_new_data():
    X = np.arange(100.0).reshape(-1, 1)
    _, transform = standardize(X)
    assert transform.apply(np.array([[1e6]]))[0, 0] == pytest.approx(
        transform.apply(np.array([[transform.upper[0]]]))[0, 0]
    )
