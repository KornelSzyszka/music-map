"""Projection and neighborhood signatures."""

import numpy as np


def reduce_pca(X: np.ndarray, n_components: int) -> np.ndarray:
    """Reduce the feature matrix to intermediate PCA components."""
    raise NotImplementedError


def project_umap(
    Z: np.ndarray, n_neighbors: int, min_dist: float, seed: int
) -> np.ndarray:
    """Project intermediate features into two dimensions."""
    raise NotImplementedError


def cluster_hdbscan(Z: np.ndarray, min_cluster_size: int) -> np.ndarray:
    """Assign cluster labels in intermediate feature space."""
    raise NotImplementedError


def knn(X: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
    """Return neighbor indices and distances in feature space."""
    raise NotImplementedError
