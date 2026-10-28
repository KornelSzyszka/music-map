import gzip
import json
from pathlib import Path

import numpy as np
import pytest

from music_atlas.export import (
    CLUSTERS_FILE,
    MANIFEST_FILE,
    NEIGHBORS_FILE,
    TRACKS_FILE,
    AtlasMeta,
    write_clusters,
    write_manifest,
    write_neighbors,
    write_tracks,
)
from music_atlas.project import NOISE_LABEL, knn


def read_gzip_json(path: Path):
    return json.loads(gzip.decompress(path.read_bytes()))


@pytest.fixture
def exported(blobs, tracks, tmp_path):
    X, groups = blobs
    Y = X[:, :2]
    labels = groups.copy()
    labels[0] = NOISE_LABEL
    write_tracks(tmp_path, tracks, Y, labels)
    write_clusters(tmp_path, tracks, Y, labels)
    idx, dist = knn(X, 3)
    write_neighbors(tmp_path, list(tracks["id"]), idx, dist)
    return tmp_path, labels


def test_manifest_round_trips(tmp_path):
    meta: AtlasMeta = {
        "schema_version": "0.1",
        "dataset_version": "test",
        "projection_id": "p",
        "feature_set_id": "f",
        "track_count": 3,
        "seed": 42,
    }
    write_manifest(tmp_path, meta)
    assert json.loads((tmp_path / MANIFEST_FILE).read_text()) == meta


def test_tracks_follow_the_contract(exported, tracks):
    out, _ = exported
    records = read_gzip_json(out / TRACKS_FILE)
    assert len(records) == len(tracks)
    assert set(records[1]) == {
        "id", "title", "artist", "artist_id", "x", "y", "cluster_id",
        "genres", "instruments", "moods", "features", "source_url",
    }  # fmt: skip
    assert records[1]["genres"] == ["rock"]


def test_noise_is_exported_as_null_cluster(exported):
    out, _ = exported
    records = read_gzip_json(out / TRACKS_FILE)
    assert records[0]["cluster_id"] is None
    assert records[1]["cluster_id"] == 0


def test_clusters_exclude_noise_and_report_sizes(exported):
    out, labels = exported
    clusters = read_gzip_json(out / CLUSTERS_FILE)
    assert [c["id"] for c in clusters] == [0, 1, 2]
    assert clusters[0]["size"] == int((labels == 0).sum())
    assert clusters[0]["top_tags"][0] in {"rock", "guitar"}
    assert {"rock", "jazz", "ambient"} & set(clusters[1]["top_tags"])


def test_neighbors_reference_existing_tracks(exported, tracks):
    out, _ = exported
    records = read_gzip_json(out / NEIGHBORS_FILE)
    known = set(tracks["id"])
    assert len(records) == len(tracks)
    for record in records:
        assert record["track_id"] not in {n["id"] for n in record["neighbors"]}
        assert {n["id"] for n in record["neighbors"]} <= known


def test_export_is_byte_identical_for_identical_input(blobs, tracks, tmp_path):
    X, groups = blobs
    first, second = tmp_path / "a", tmp_path / "b"
    for out in (first, second):
        write_tracks(out, tracks, X[:, :2], groups)
    assert (first / TRACKS_FILE).read_bytes() == (second / TRACKS_FILE).read_bytes()


def test_length_mismatch_fails_fast(blobs, tracks, tmp_path):
    X, groups = blobs
    with pytest.raises(ValueError, match="length mismatch"):
        write_tracks(tmp_path, tracks, X[:10, :2], groups)


def test_neighbors_reject_mismatched_ids(blobs, tmp_path):
    X, _ = blobs
    idx, dist = knn(X, 3)
    with pytest.raises(ValueError, match="length mismatch"):
        write_neighbors(tmp_path, ["only-one"], idx, dist)


def test_coordinates_are_rounded(blobs, tracks, tmp_path):
    _, groups = blobs
    write_tracks(tmp_path, tracks, np.full((len(tracks), 2), 1 / 3), groups)
    assert read_gzip_json(tmp_path / TRACKS_FILE)[0]["x"] == 0.3333


@pytest.mark.parametrize("bad", [float("nan"), float("inf")])
def test_non_finite_coordinates_are_rejected(blobs, tracks, tmp_path, bad):
    _, groups = blobs
    Y = np.zeros((len(tracks), 2))
    Y[3, 0] = bad
    with pytest.raises(ValueError, match="non-finite"):
        write_tracks(tmp_path, tracks, Y, groups)


def test_non_finite_distance_is_rejected(blobs, tracks, tmp_path):
    X, _ = blobs
    idx, dist = knn(X, 3)
    dist[0, 0] = float("inf")
    with pytest.raises(ValueError, match="non-finite"):
        write_neighbors(tmp_path, list(tracks["id"]), idx, dist)


@pytest.mark.parametrize("bad_index", [-1, 10_000])
def test_out_of_range_neighbour_index_is_rejected(blobs, tracks, tmp_path, bad_index):
    X, _ = blobs
    idx, dist = knn(X, 3)
    idx[0, 0] = bad_index
    with pytest.raises(ValueError, match="neighbour indices"):
        write_neighbors(tmp_path, list(tracks["id"]), idx, dist)
