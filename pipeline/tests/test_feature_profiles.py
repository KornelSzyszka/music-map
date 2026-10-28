import numpy as np
import pytest

from music_atlas.feature_graph import (
    GraphParams,
    build_feature_graph,
    build_feature_sample,
    tag_profiles,
)
from music_atlas.features import FeatureSpec, standardize

N = 400
SPEC = FeatureSpec(
    "test-v1", ("rhythm.bpm", "tonal.key_strength", "lowlevel.average_loudness")
)


@pytest.fixture
def data():
    rng = np.random.default_rng(5)
    groups = np.where(rng.random(N) < 0.5, "a", "b").astype(object)
    X = np.column_stack(
        [
            (groups == "b") * 4.0 + rng.normal(size=N),
            rng.normal(size=N),
            rng.normal(size=N),
        ]
    )
    tags = [
        ["genre---b", "mood/theme---fast"]
        if g == "b"
        else ["genre---a", "instrument---piano"]
        for g in groups
    ]
    return X, groups, tags


def test_tag_profile_ranks_tags_by_mean_standardised_value(data):
    X, _, tags = data
    Z, _ = standardize(X)
    profiles = tag_profiles(Z, tags, min_count=50, top=1)
    first = profiles[0]
    assert first[0]["tag"] in {"b", "fast"} and first[0]["mean_z"] > 0.5
    assert first[-1]["tag"] in {"a", "piano"} and first[-1]["mean_z"] < -0.5
    assert {entry["category"] for entry in first} <= {
        "genre",
        "mood/theme",
        "instrument",
    }
    assert all(entry["n"] >= 50 for entry in first)


def test_tag_profile_ignores_rare_tags(data):
    X, _, tags = data
    tags = [
        [*per_track, "genre---rare"] if i == 0 else per_track
        for i, per_track in enumerate(tags)
    ]
    Z, _ = standardize(X)
    names = {entry["tag"] for entry in tag_profiles(Z, tags, min_count=50, top=5)[0]}
    assert "rare" not in names


def test_tag_profile_requires_one_entry_per_track(data):
    X, _, tags = data
    Z, _ = standardize(X)
    with pytest.raises(ValueError, match="one entry per track"):
        tag_profiles(Z, tags[:5], min_count=1, top=1)


def test_graph_carries_genre_histograms_and_tag_profiles(data):
    X, groups, tags = data
    Z, _ = standardize(X)
    graph = build_feature_graph(
        X, Z, SPEC, groups, GraphParams(bins=20, tag_min_count=50), tags=tags
    )
    bpm = graph["features"][0]
    assert set(bpm["genre_histogram"]) == {"a", "b"}
    for shares in bpm["genre_histogram"].values():
        assert len(shares) == 20
        assert sum(shares) == pytest.approx(1.0, abs=1e-3)
    assert bpm["tag_profile"][0]["mean_z"] > 0


def test_graph_without_tags_has_empty_tag_profiles(data):
    X, groups, _ = data
    Z, _ = standardize(X)
    graph = build_feature_graph(X, Z, SPEC, groups)
    assert all(feature["tag_profile"] == [] for feature in graph["features"])


def test_sample_is_seeded_and_aligned_with_the_features(data):
    X, groups, _ = data
    first = build_feature_sample(X, SPEC, groups, size=50, seed=1)
    second = build_feature_sample(X, SPEC, groups, size=50, seed=1)
    other = build_feature_sample(X, SPEC, groups, size=50, seed=2)
    assert first == second
    assert first != other
    assert first["features"] == list(SPEC.paths)
    assert len(first["values"]) == len(first["genres"]) == 50
    assert all(len(row) == len(SPEC.paths) for row in first["values"])


def test_sample_never_exceeds_the_track_count(data):
    X, groups, _ = data
    assert len(build_feature_sample(X, SPEC, groups, size=10_000)["values"]) == N


def test_sample_rejects_misaligned_inputs(data):
    X, groups, _ = data
    with pytest.raises(ValueError, match="same tracks and features"):
        build_feature_sample(X, SPEC, groups[:10])
