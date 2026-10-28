import numpy as np
import pytest

from music_atlas.evaluate import (
    MethodSpec,
    compare_methods,
    continuity_k,
    neighbor_recall,
    trustworthiness_k,
)
from music_atlas.project import knn

K = 5


def test_perfect_projection_scores_one(blobs):
    X, _ = blobs
    assert trustworthiness_k(X, X, K) == pytest.approx(1.0)
    assert continuity_k(X, X, K) == pytest.approx(1.0)


def test_shuffled_projection_scores_clearly_lower(blobs):
    X, _ = blobs
    rng = np.random.default_rng(0)
    Y = rng.permutation(X[:, :2])
    assert trustworthiness_k(X, Y, K) < 0.8
    assert continuity_k(X, Y, K) < 0.8


def test_recall_is_one_for_identical_neighbours(blobs):
    X, _ = blobs
    idx, _ = knn(X, K)
    assert neighbor_recall(idx, idx, K) == 1.0


def test_recall_is_zero_for_disjoint_neighbours():
    nn_hi = np.array([[1, 2], [0, 2], [0, 1]])
    nn_2d = np.array([[3, 4], [3, 4], [3, 4]])
    assert neighbor_recall(nn_hi, nn_2d, 2) == 0.0


def test_recall_rejects_mismatched_shapes():
    with pytest.raises(ValueError, match="shape"):
        neighbor_recall(np.zeros((3, 2), int), np.zeros((3, 3), int), 2)


def test_compare_methods_returns_one_row_per_method_and_k(blobs):
    X, _ = blobs
    methods = [
        MethodSpec("pca", "pca"),
        MethodSpec("umap", "umap", {"n_neighbors": 10}, seed=1),
    ]
    result = compare_methods(X, methods, ks=[5, 10])
    assert len(result) == 4
    assert set(result["method"]) == {"pca", "umap"}
    scores = result[["trustworthiness", "continuity", "recall"]]
    assert ((scores >= 0) & (scores <= 1)).all().all()


@pytest.mark.parametrize("k", [0, -1])
def test_recall_rejects_non_positive_k(k):
    nn = np.array([[1, 2]])
    with pytest.raises(ValueError, match="k must be positive"):
        neighbor_recall(nn, nn, k)


def test_recall_rejects_empty_input():
    empty = np.zeros((0, 2), dtype=int)
    with pytest.raises(ValueError, match="empty"):
        neighbor_recall(empty, empty, 1)


def test_unsupported_method_parameters_are_rejected_not_ignored(blobs):
    X, _ = blobs
    spec = MethodSpec("mds", "mds", {"max_iters": 1})
    with pytest.raises(ValueError, match="unsupported mds parameters"):
        compare_methods(X, [spec], ks=[5])


def test_mds_and_tsne_run_and_honour_their_parameters(blobs):
    X, _ = blobs
    methods = [
        MethodSpec("mds", "mds", {"max_iter": 20}, seed=1),
        MethodSpec("tsne", "tsne", {"perplexity": 10.0, "max_iter": 250}, seed=1),
    ]
    result = compare_methods(X, methods, ks=[5])
    assert set(result["method"]) == {"mds", "tsne"}
    assert (result["trustworthiness"] > 0.5).all()
