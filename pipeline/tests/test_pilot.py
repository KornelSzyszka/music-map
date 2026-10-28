import gzip
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from music_atlas.export import (
    CLUSTERS_FILE,
    MANIFEST_FILE,
    NEIGHBORS_FILE,
    TRACKS_FILE,
)
from music_atlas.features import FeatureSpec
from music_atlas.pilot import PilotParams, build_atlas, write_atlas

PARAMS = PilotParams(
    sample_size=120,
    pca_components=5,
    umap_neighbors=10,
    min_cluster_size=10,
    min_samples=None,
    cluster_selection="eom",
    cluster_dims=3,
    knn_k=5,
    quality_sample=80,
    quality_ks=(5, 10),
)
SPEC = FeatureSpec(
    "test-v1",
    (
        "rhythm.bpm",
        "lowlevel.average_loudness",
        "tonal.f2",
        "tonal.f3",
        "tonal.f4",
        "tonal.f5",
    ),
)


@pytest.fixture
def features(blobs, tracks) -> pd.DataFrame:
    X, _ = blobs
    frame = pd.DataFrame(X[:, : len(SPEC.paths)], columns=list(SPEC.paths))
    frame.insert(0, "id", tracks["id"].to_numpy())
    return frame


def read_gzip_json(path: Path):
    return json.loads(gzip.decompress(path.read_bytes()))


def test_build_aligns_every_output_with_the_tracks(tracks, features):
    build = build_atlas(tracks, features, SPEC, PARAMS, "test-v1")
    n = len(tracks)
    assert len(build.tracks) == build.Y.shape[0] == len(build.labels) == n
    assert build.neighbor_index.shape == (n, PARAMS.knn_k)
    assert not (build.neighbor_index == np.arange(n)[:, None]).any()
    assert list(build.tracks["id"]) == list(tracks["id"])


def test_a_cluster_never_mixes_known_groups(tracks, features, blobs):
    _, groups = blobs
    build = build_atlas(tracks, features, SPEC, PARAMS, "test-v1")
    clustered = build.labels >= 0
    assert clustered.mean() > 0.8
    for label in set(build.labels[clustered].tolist()):
        assert len(set(groups[build.labels == label].tolist())) == 1


def test_the_same_seed_gives_the_same_atlas(tracks, features):
    first = build_atlas(tracks, features, SPEC, PARAMS, "test-v1")
    second = build_atlas(tracks, features, SPEC, PARAMS, "test-v1")
    np.testing.assert_allclose(first.Y, second.Y)
    np.testing.assert_array_equal(first.labels, second.labels)


def test_tracks_without_features_are_dropped_and_counted(tracks, features):
    build = build_atlas(tracks, features.iloc[10:], SPEC, PARAMS, "test-v1")
    assert len(build.tracks) == len(tracks) - 10
    assert build.manifest["summary"]["dropped_without_features"] == 10


def test_quality_is_reported_for_the_map_and_the_baseline(tracks, features):
    quality = build_atlas(tracks, features, SPEC, PARAMS, "test-v1").quality
    assert set(quality) == {"umap", "pca"}
    for method in quality.values():
        assert set(method) == {"5", "10"}
        for scores in method.values():
            assert all(0.0 <= value <= 1.0 for value in scores.values())
    assert quality["umap"]["5"]["trustworthiness"] > 0.85


def test_manifest_records_parameters_versions_and_metric(tracks, features):
    manifest = build_atlas(tracks, features, SPEC, PARAMS, "test-v1").manifest
    assert manifest["schema_version"] == "0.2"
    assert manifest["parameters"]["min_cluster_size"] == 10
    assert set(manifest["library_versions"]) == {
        "numpy",
        "pandas",
        "scikit-learn",
        "umap-learn",
    }
    assert "standardised" in manifest["distance_metric"]
    assert manifest["track_count"] == len(tracks)


def test_headline_features_are_exported_with_each_track(tracks, features):
    build = build_atlas(tracks, features, SPEC, PARAMS, "test-v1")
    assert set(build.tracks.loc[0, "features"]) == {"bpm", "loudness"}


def test_too_few_tracks_fail_clearly(tracks, features):
    with pytest.raises(ValueError, match="too few tracks"):
        build_atlas(tracks.iloc[:8], features, SPEC, PARAMS, "test-v1")


def test_write_atlas_creates_the_four_contract_files(tracks, features, tmp_path):
    build = build_atlas(tracks, features, SPEC, PARAMS, "test-v1")
    write_atlas(tmp_path, build)
    manifest = json.loads((tmp_path / MANIFEST_FILE).read_text(encoding="utf-8"))
    assert manifest["track_count"] == len(tracks)
    assert len(read_gzip_json(tmp_path / TRACKS_FILE)) == len(tracks)
    assert len(read_gzip_json(tmp_path / NEIGHBORS_FILE)) == len(tracks)
    clusters = read_gzip_json(tmp_path / CLUSTERS_FILE)
    assert clusters and all(c["top_tags"] for c in clusters)
