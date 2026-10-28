import numpy as np
import pytest

from music_atlas.hierarchy import (
    HierarchyParams,
    assign_to_clusters,
    centroid_rank_agreement,
    fit_to_disc,
    hierarchical_layout,
    separate_discs,
)
from music_atlas.project import NOISE_LABEL

SEED = 11


@pytest.fixture
def clouds():
    """Four Gaussian clouds in 6-D with centres on a line, so distances are known."""
    rng = np.random.default_rng(SEED)
    centres = np.zeros((4, 6))
    centres[:, 0] = [0.0, 6.0, 12.0, 30.0]
    Z = np.vstack([c + rng.normal(scale=0.6, size=(60, 6)) for c in centres])
    labels = np.repeat(np.arange(4), 60)
    # A quarter of every cloud has lost its label, as unclustered tracks do.
    loose = rng.random(len(Z)) < 0.25
    noisy = np.where(loose, NOISE_LABEL, labels)
    return Z, labels, noisy


def test_unclustered_tracks_join_the_cluster_of_their_neighbours(clouds):
    Z, truth, noisy = clouds
    assignment = assign_to_clusters(Z, noisy, k=10)
    assert (assignment == truth).mean() > 0.97
    assert (assignment[noisy != NOISE_LABEL] == noisy[noisy != NOISE_LABEL]).all()


def test_assignment_is_a_noop_without_noise_or_without_clusters():
    Z = np.random.default_rng(0).normal(size=(20, 3))
    labels = np.zeros(20, dtype=int)
    np.testing.assert_array_equal(assign_to_clusters(Z, labels, 5), labels)
    allnoise = np.full(20, NOISE_LABEL)
    np.testing.assert_array_equal(assign_to_clusters(Z, allnoise, 5), allnoise)


def test_discs_are_pushed_apart_and_far_ones_stay_put():
    points = np.array([[0.0, 0.0], [0.5, 0.0], [50.0, 50.0]])
    radii = np.array([2.0, 2.0, 1.0])
    moved = separate_discs(points, radii, gap=0.1)
    assert np.linalg.norm(moved[0] - moved[1]) >= (radii[0] + radii[1]) * 1.1 - 1e-2
    np.testing.assert_allclose(moved[2], points[2])


def test_a_local_layout_fits_the_disc_and_keeps_its_shape():
    rng = np.random.default_rng(0)
    local = rng.normal(size=(200, 2)) * [5.0, 1.0] + [40.0, -7.0]
    fitted = fit_to_disc(local, radius=3.0)
    lengths = np.linalg.norm(fitted, axis=1)
    assert lengths.max() <= 3.0 * 1.15 + 1e-9
    assert abs(np.median(fitted[:, 0])) < 0.3
    assert fitted[:, 0].std() > 3 * fitted[:, 1].std()
    assert fit_to_disc(np.array([[4.0, 4.0]]), 2.0).tolist() == [[0.0, 0.0]]


def test_layout_places_every_track_in_its_cluster_disc(clouds):
    Z, _, noisy = clouds
    map_positions = np.random.default_rng(1).normal(size=(len(Z), 2))
    result = hierarchical_layout(Z, noisy, map_positions, HierarchyParams(seed=SEED))
    assert np.isfinite(result.positions).all()
    for row, cluster_id in enumerate(result.cluster_ids):
        members = result.assignment == cluster_id
        offsets = np.linalg.norm(
            result.positions[members] - result.centres[row], axis=1
        )
        assert offsets.max() <= result.radii[row] * 1.15 + 1e-9
    assert (result.is_core == (noisy != NOISE_LABEL)).all()


def test_cluster_distances_on_the_map_follow_the_feature_distances(clouds):
    Z, _, noisy = clouds
    map_positions = np.random.default_rng(2).normal(size=(len(Z), 2))
    result = hierarchical_layout(Z, noisy, map_positions, HierarchyParams(seed=SEED))
    assert centroid_rank_agreement(Z, result.assignment, result.positions) > 0.9


def test_the_layout_is_deterministic(clouds):
    Z, _, noisy = clouds
    map_positions = np.random.default_rng(3).normal(size=(len(Z), 2))
    first = hierarchical_layout(Z, noisy, map_positions, HierarchyParams(seed=SEED))
    second = hierarchical_layout(Z, noisy, map_positions, HierarchyParams(seed=SEED))
    np.testing.assert_allclose(first.positions, second.positions)


def test_inputs_must_describe_the_same_tracks(clouds):
    Z, _, noisy = clouds
    with pytest.raises(ValueError, match="same tracks"):
        hierarchical_layout(Z, noisy[:10], np.zeros((len(Z), 2)))


def test_a_single_cluster_is_laid_out_without_error():
    rng = np.random.default_rng(0)
    Z = rng.normal(size=(50, 4))
    result = hierarchical_layout(Z, np.zeros(50, dtype=int), rng.normal(size=(50, 2)))
    assert np.isfinite(result.positions).all() and len(result.cluster_ids) == 1
