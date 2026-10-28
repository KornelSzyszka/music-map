"""Quality metrics and comparison of projection methods."""

from dataclasses import dataclass, field
from typing import Literal

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.manifold import MDS, TSNE, trustworthiness

from music_atlas.project import knn, project_umap

type MethodKind = Literal["pca", "mds", "tsne", "umap"]


@dataclass(frozen=True)
class MethodSpec:
    """A projection method with its parameters and seed."""

    name: str
    kind: MethodKind
    params: dict[str, float] = field(default_factory=dict)
    seed: int = 0


def trustworthiness_k(X: np.ndarray, Y: np.ndarray, k: int) -> float:
    """Return how many map neighbours are true neighbours (1.0 is best)."""
    return float(trustworthiness(X, Y, n_neighbors=k))


def continuity_k(X: np.ndarray, Y: np.ndarray, k: int) -> float:
    """Return how many true neighbours stay neighbours on the map (1.0 is best)."""
    # Continuity is trustworthiness with the roles of the two spaces swapped.
    return float(trustworthiness(Y, X, n_neighbors=k))


def neighbor_recall(nn_hi: np.ndarray, nn_2d: np.ndarray, k: int) -> float:
    """Return the mean overlap of the first k neighbours in both spaces."""
    if k < 1:
        raise ValueError(f"k must be positive, got {k}")
    if nn_hi.ndim != 2 or nn_hi.shape != nn_2d.shape or nn_hi.shape[1] < k:
        raise ValueError("neighbour arrays must share a shape with at least k columns")
    if len(nn_hi) == 0:
        raise ValueError("neighbour arrays must not be empty")
    hits = [
        len(np.intersect1d(a[:k], b[:k])) for a, b in zip(nn_hi, nn_2d, strict=True)
    ]
    return float(np.mean(hits) / k)


# Parameters each method accepts; anything else is rejected, never ignored.
SUPPORTED_PARAMS: dict[str, frozenset[str]] = {
    "pca": frozenset(),
    "mds": frozenset({"n_init", "max_iter"}),
    "tsne": frozenset({"perplexity", "max_iter"}),
    "umap": frozenset({"n_neighbors", "min_dist"}),
}


def embed(X: np.ndarray, spec: MethodSpec) -> np.ndarray:
    """Project X to two dimensions with the given method."""
    unknown = set(spec.params) - SUPPORTED_PARAMS[spec.kind]
    if unknown:
        raise ValueError(
            f"{spec.name}: unsupported {spec.kind} parameters {sorted(unknown)}"
        )
    p = spec.params
    match spec.kind:
        case "pca":
            return PCA(n_components=2, svd_solver="full").fit_transform(X)
        case "mds":
            return MDS(
                n_components=2,
                n_init=int(p.get("n_init", 1)),
                max_iter=int(p.get("max_iter", 300)),
                init="random",
                random_state=spec.seed,
            ).fit_transform(X)
        case "tsne":
            return TSNE(
                n_components=2,
                perplexity=p.get("perplexity", 30.0),
                max_iter=int(p.get("max_iter", 1000)),
                init="pca",
                random_state=spec.seed,
            ).fit_transform(X)
        case "umap":
            return project_umap(
                X,
                n_neighbors=int(p.get("n_neighbors", 15)),
                min_dist=p.get("min_dist", 0.1),
                seed=spec.seed,
            )


def compare_methods(
    X: np.ndarray, methods: list[MethodSpec], ks: list[int]
) -> pd.DataFrame:
    """Score each method at each neighbourhood size k."""
    nn_hi, _ = knn(X, max(ks))
    rows = []
    for spec in methods:
        Y = embed(X, spec)
        nn_2d, _ = knn(Y, max(ks))
        for k in ks:
            rows.append(
                {
                    "method": spec.name,
                    "k": k,
                    "trustworthiness": trustworthiness_k(X, Y, k),
                    "continuity": continuity_k(X, Y, k),
                    "recall": neighbor_recall(nn_hi, nn_2d, k),
                }
            )
    return pd.DataFrame(rows)
