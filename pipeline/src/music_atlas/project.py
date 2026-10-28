"""Projection, clustering and neighbourhood computation."""

import numpy as np
from sklearn.cluster import HDBSCAN
from sklearn.decomposition import PCA
from sklearn.neighbors import NearestNeighbors
from umap import UMAP

NOISE_LABEL = -1


def reduce_pca(X: np.ndarray, n_components: int) -> np.ndarray:
    """Reduce the feature matrix to intermediate PCA components."""
    n_samples, n_features = X.shape
    if not 1 <= n_components <= min(n_samples, n_features):
        raise ValueError(
            f"n_components must be in [1, {min(n_samples, n_features)}], "
            f"got {n_components}"
        )
    # The full SVD solver is deterministic, so no seed is needed.
    return PCA(n_components=n_components, svd_solver="full").fit_transform(X)


def project_umap(
    Z: np.ndarray, n_neighbors: int, min_dist: float, seed: int
) -> np.ndarray:
    """Project intermediate features into two dimensions."""
    # A fixed random_state makes UMAP reproducible at the cost of parallelism.
    reducer = UMAP(
        n_components=2,
        n_neighbors=n_neighbors,
        min_dist=min_dist,
        random_state=seed,
    )
    return reducer.fit_transform(Z)


def cluster_hdbscan(Z: np.ndarray, min_cluster_size: int) -> np.ndarray:
    """Assign cluster labels in intermediate feature space; noise is -1."""
    return HDBSCAN(min_cluster_size=min_cluster_size, copy=True).fit_predict(Z)


def knn(X: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
    """Return neighbour indices and distances, excluding each point itself."""
    n_samples = X.shape[0]
    if not 1 <= k < n_samples:
        raise ValueError(f"k must be in [1, {n_samples - 1}], got {k}")
    distances, indices = NearestNeighbors(n_neighbors=k + 1).fit(X).kneighbors(X)
    # Duplicate points can push a point out of its own first slot, so drop the
    # self column by index and fall back to the farthest neighbour otherwise.
    is_self = indices == np.arange(n_samples)[:, None]
    no_self = ~is_self.any(axis=1)
    is_self[no_self, -1] = True
    keep = ~is_self
    return indices[keep].reshape(n_samples, k), distances[keep].reshape(n_samples, k)
