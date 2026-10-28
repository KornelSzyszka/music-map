import numpy as np
import pytest

from music_atlas.feature_graph import (
    GraphParams,
    build_feature_graph,
    declutter,
    family_of,
    label_of,
)
from music_atlas.features import FeatureSpec, standardize

N = 600
SPEC = FeatureSpec(
    "test-v1",
    (
        "lowlevel.spectral_centroid.mean",
        "lowlevel.mfcc.mean[0]",
        "rhythm.bpm",
        "tonal.key_strength",
        "tonal.tuning_diatonic_strength",
    ),
)


@pytest.fixture
def data() -> tuple[np.ndarray, np.ndarray]:
    """Columns 0 and 1 are strongly correlated; column 2 separates the groups."""
    rng = np.random.default_rng(3)
    groups = np.where(rng.random(N) < 0.5, "a", "b").astype(object)
    base = rng.normal(size=N)
    X = np.column_stack(
        [
            base,
            2.0 * base + rng.normal(scale=0.1, size=N),
            (groups == "b") * 3.0 + rng.normal(size=N),
            rng.normal(size=N),
            rng.normal(size=N),
        ]
    )
    return X, groups


def build(X, groups, **kwargs):
    Z, _ = standardize(X)
    return build_feature_graph(X, Z, SPEC, groups, GraphParams(**kwargs))


def test_family_and_label_helpers():
    assert family_of("lowlevel.mfcc.var[3]") == "mfcc"
    assert family_of("lowlevel.spectral_contrast_coeffs.mean[1]") == "contrast_bands"
    assert family_of("rhythm.bpm") == "rhythm"
    assert family_of("lowlevel.average_loudness") == "dynamics"
    assert family_of("lowlevel.spectral_centroid.mean") == "timbre"
    assert label_of("lowlevel.mfcc.var[3]") == "mfcc 3 (var)"
    assert label_of("rhythm.bpm") == "bpm"
    assert label_of("tonal.key_scale==major") == "key is major"


def test_strong_correlation_becomes_an_edge_and_independent_pairs_do_not(data):
    graph = build(*data)
    pairs = {(e["source"], e["target"]) for e in graph["edges"]}
    assert (SPEC.paths[0], SPEC.paths[1]) in pairs
    assert (SPEC.paths[3], SPEC.paths[4]) not in pairs
    assert graph["edges"][0]["r"] > 0.95


def test_correlated_features_are_placed_closer_than_unrelated_ones(data):
    graph = build(*data)
    pos = np.array([[f["x"], f["y"]] for f in graph["features"]])
    related = np.linalg.norm(pos[0] - pos[1])
    unrelated = np.linalg.norm(pos[0] - pos[3])
    assert related < unrelated


def test_group_separating_feature_has_the_highest_power(data):
    graph = build(*data)
    powers = [f["power"] for f in graph["features"]]
    assert int(np.argmax(powers)) == 2
    assert powers[2] > 0.4
    assert powers[3] < 0.05


def test_genre_profile_is_ordered_and_covers_each_group(data):
    graph = build(*data)
    profile = graph["features"][2]["genre_profile"]
    assert set(profile) == {"a", "b"}
    for quantiles in profile.values():
        assert quantiles == sorted(quantiles)
    assert profile["b"][2] > profile["a"][2]


def test_labels_do_not_influence_the_layout(data):
    X, groups = data
    shuffled = np.random.default_rng(0).permutation(groups)
    first, second = build(X, groups), build(X, shuffled)
    assert [(f["x"], f["y"]) for f in first["features"]] == [
        (f["x"], f["y"]) for f in second["features"]
    ]


def test_histogram_counts_add_up_to_the_track_count(data):
    graph = build(*data)
    for feature in graph["features"]:
        h = feature["histogram"]
        assert sum(h["counts"]) == N
        assert len(h["edges"]) == len(h["counts"]) + 1
        assert h["below"] + h["above"] > 0


def test_mismatched_inputs_are_rejected(data):
    X, groups = data
    Z, _ = standardize(X)
    with pytest.raises(ValueError, match="same features"):
        build_feature_graph(X[:, :3], Z[:, :3], SPEC, groups)
    with pytest.raises(ValueError, match="one entry per track"):
        build_feature_graph(X, Z, SPEC, groups[:10])


def test_constant_feature_does_not_break_the_graph(data):
    X, groups = data
    X = X.copy()
    X[:, 4] = 1.0
    graph = build(X, groups)
    assert graph["features"][4]["power"] == 0.0
    assert all(np.isfinite(f["x"]) for f in graph["features"])


def test_declutter_separates_overlapping_points_without_moving_distant_ones():
    points = np.array([[0.0, 0.0], [0.0, 0.0], [0.01, 0.0], [0.9, 0.9]])
    moved = declutter(points, 0.1)
    pairwise = np.linalg.norm(moved[:, None] - moved[None, :], axis=2)
    np.fill_diagonal(pairwise, np.inf)
    assert pairwise.min() >= 0.1 - 1e-3
    assert np.linalg.norm(moved[3] - points[3]) < 1e-9


def test_declutter_is_deterministic():
    points = np.random.default_rng(1).normal(scale=0.05, size=(30, 2))
    np.testing.assert_array_equal(declutter(points, 0.08), declutter(points, 0.08))
