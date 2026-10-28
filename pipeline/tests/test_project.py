import numpy as np
import pytest

from music_atlas.project import (
    NOISE_LABEL,
    cluster_hdbscan,
    knn,
    project_umap,
    reduce_pca,
)

UMAP_PARAMS = {"n_neighbors": 10, "min_dist": 0.1}


def test_pca_returns_requested_components(blobs):
    X, _ = blobs
    assert reduce_pca(X, 5).shape == (len(X), 5)


def test_pca_rejects_too_many_components(blobs):
    X, _ = blobs
    with pytest.raises(ValueError, match="n_components"):
        reduce_pca(X, X.shape[1] + 1)


def test_umap_is_reproducible_for_the_same_seed(blobs):
    X, _ = blobs
    first = project_umap(X, seed=1, **UMAP_PARAMS)
    second = project_umap(X, seed=1, **UMAP_PARAMS)
    np.testing.assert_allclose(first, second)


def test_umap_changes_with_the_seed(blobs):
    X, _ = blobs
    first = project_umap(X, seed=1, **UMAP_PARAMS)
    second = project_umap(X, seed=2, **UMAP_PARAMS)
    assert not np.allclose(first, second)


def test_hdbscan_recovers_known_groups(blobs):
    X, groups = blobs
    labels = cluster_hdbscan(X, min_cluster_size=10)
    found = set(labels) - {NOISE_LABEL}
    assert len(found) == len(set(groups))
    for group in set(groups):
        # Every true group maps onto exactly one cluster.
        assert len(set(labels[groups == group])) == 1


def test_knn_excludes_self(blobs):
    X, _ = blobs
    idx, _ = knn(X, 5)
    assert idx.shape == (len(X), 5)
    assert not (idx == np.arange(len(X))[:, None]).any()


def test_knn_distances_are_sorted_and_non_negative(blobs):
    X, _ = blobs
    _, dist = knn(X, 5)
    assert (dist >= 0).all()
    assert (np.diff(dist, axis=1) >= 0).all()


def test_knn_handles_duplicate_points():
    X = np.array([[0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [5.0, 5.0], [6.0, 5.0]])
    idx, _ = knn(X, 2)
    assert idx.shape == (5, 2)
    assert not (idx == np.arange(5)[:, None]).any()


def test_knn_excludes_self_when_many_points_are_identical():
    # With ties the point itself may fall outside the first k+1 results.
    X = np.vstack([np.zeros((8, 2)), [[9.0, 9.0]]])
    idx, _ = knn(X, 2)
    assert idx.shape == (9, 2)
    assert not (idx == np.arange(9)[:, None]).any()


def test_knn_rejects_k_not_smaller_than_sample_count(blobs):
    X, _ = blobs
    with pytest.raises(ValueError, match="k must be"):
        knn(X, len(X))
