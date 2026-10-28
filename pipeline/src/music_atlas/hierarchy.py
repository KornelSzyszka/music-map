"""Hierarchical layout: place clusters first, then arrange tracks inside each cluster.

Level 1 places one disc per cluster so that distances between discs follow the
distances between cluster centroids in feature space. Level 2 arranges the tracks
of a cluster inside its disc, keeping the arrangement of a given 2-D map (the
local neighbourhoods) and only moving and rescaling it. Tracks without a cluster
join the cluster they are closest to, so every track has a home disc.
"""

from dataclasses import dataclass

import numpy as np
from scipy.spatial import ConvexHull
from scipy.stats import spearmanr
from sklearn.manifold import MDS
from sklearn.neighbors import NearestNeighbors

from music_atlas.project import NOISE_LABEL

MDS_RESTARTS = 4
SEPARATION_ITERATIONS = 400
LOCAL_QUANTILE = 0.95
LOCAL_CLIP = 1.15


@dataclass(frozen=True)
class HierarchyParams:
    """Parameters of the hierarchical layout."""

    assign_k: int = 15
    gap: float = 0.12
    # Share of the area spanned by the cluster centres that the discs may cover.
    fill: float = 0.35
    seed: int = 0


@dataclass
class Hierarchy:
    """Result of the layout; ``assignment`` and ``is_core`` describe every track."""

    positions: np.ndarray
    assignment: np.ndarray
    is_core: np.ndarray
    cluster_ids: np.ndarray
    centres: np.ndarray
    radii: np.ndarray


def assign_to_clusters(Z: np.ndarray, labels: np.ndarray, k: int) -> np.ndarray:
    """Give every track a cluster: its own, or that of its nearest clustered tracks."""
    assignment = labels.copy()
    clustered = np.flatnonzero(labels != NOISE_LABEL)
    loose = np.flatnonzero(labels == NOISE_LABEL)
    if len(clustered) == 0 or len(loose) == 0:
        return assignment
    k = min(k, len(clustered))
    _, neighbours = (
        NearestNeighbors(n_neighbors=k).fit(Z[clustered]).kneighbors(Z[loose])
    )
    for row, track in enumerate(loose):
        votes = labels[clustered[neighbours[row]]]
        values, counts = np.unique(votes, return_counts=True)
        # np.unique sorts values, so ties go to the lowest cluster id (deterministic).
        assignment[track] = values[counts.argmax()]
    return assignment


def separate_discs(
    points: np.ndarray,
    radii: np.ndarray,
    gap: float,
    iterations: int = SEPARATION_ITERATIONS,
) -> np.ndarray:
    """Push discs apart until none overlaps (with a relative gap); deterministic."""
    moved = points.copy()
    need = (radii[:, None] + radii[None, :]) * (1.0 + gap)
    order = np.sign(np.arange(len(points))[:, None] - np.arange(len(points))[None, :])
    for _ in range(iterations):
        delta = moved[:, None, :] - moved[None, :, :]
        distance = np.linalg.norm(delta, axis=2)
        np.fill_diagonal(distance, np.inf)
        overlap = np.clip(need - distance, 0.0, None)
        if not overlap.any():
            break
        direction = delta / np.where(distance > 0, distance, 1.0)[..., None]
        direction[distance == 0, 0] = order[distance == 0]
        moved += 0.5 * (overlap[..., None] * direction).sum(axis=1)
    return moved


def place_clusters(
    Z: np.ndarray, assignment: np.ndarray, params: HierarchyParams
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return cluster ids, disc centres and radii (disc area proportional to size)."""
    ids = np.unique(assignment[assignment != NOISE_LABEL])
    centroids = np.array([Z[assignment == i].mean(axis=0) for i in ids])
    sizes = np.array([(assignment == i).sum() for i in ids], dtype=float)
    if len(ids) == 1:
        return ids, np.zeros((1, 2)), np.sqrt(sizes)
    distance = np.linalg.norm(centroids[:, None] - centroids[None, :], axis=2)
    layout = MDS(
        n_components=2,
        metric="precomputed",
        init="random",
        n_init=MDS_RESTARTS,
        random_state=params.seed,
    ).fit_transform(distance)
    # Discs cover `fill` of the area the centres span, so that cluster distances stay
    # meaningful (centroids are often closer than the clusters are wide).
    hull_area = ConvexHull(layout).volume if len(ids) >= 3 else float(np.ptp(layout))
    radii = np.sqrt(sizes) * np.sqrt(params.fill * hull_area / (np.pi * sizes.sum()))
    centres = separate_discs(layout, radii, params.gap)
    return ids, centres, radii


def fit_to_disc(local: np.ndarray, radius: float) -> np.ndarray:
    """Centre a local layout and scale it so that most of it fits inside a disc."""
    if len(local) == 1:
        return np.zeros((1, 2))
    centred = local - np.median(local, axis=0)
    lengths = np.linalg.norm(centred, axis=1)
    reach = max(float(np.quantile(lengths, LOCAL_QUANTILE)), 1e-9)
    fitted = centred * (radius / reach)
    # Outliers may not leave the neighbourhood of the disc.
    longest = np.linalg.norm(fitted, axis=1)
    limit = radius * LOCAL_CLIP
    shrink = np.where(longest > limit, limit / np.maximum(longest, 1e-9), 1.0)
    return fitted * shrink[:, None]


def hierarchical_layout(
    Z: np.ndarray,
    labels: np.ndarray,
    map_positions: np.ndarray,
    params: HierarchyParams | None = None,
) -> Hierarchy:
    """Lay out clusters by feature-space distance, then tracks inside each cluster.

    ``map_positions`` is a 2-D map (for example UMAP); inside a cluster its relative
    arrangement is kept, only centred and rescaled into the cluster's disc.
    """
    params = params or HierarchyParams()
    if not (len(Z) == len(labels) == len(map_positions)):
        raise ValueError("Z, labels and map_positions must describe the same tracks")
    assignment = assign_to_clusters(Z, labels, params.assign_k)
    cluster_ids, centres, radii = place_clusters(Z, assignment, params)
    positions = np.zeros((len(Z), 2))
    for row, cluster_id in enumerate(cluster_ids):
        members = np.flatnonzero(assignment == cluster_id)
        positions[members] = centres[row] + fit_to_disc(
            map_positions[members], radii[row]
        )
    return Hierarchy(
        positions=positions,
        assignment=assignment,
        is_core=labels != NOISE_LABEL,
        cluster_ids=cluster_ids,
        centres=centres,
        radii=radii,
    )


def centroid_rank_agreement(
    Z: np.ndarray, assignment: np.ndarray, positions: np.ndarray
) -> float:
    """Spearman correlation of cluster-centre distances in feature space and on the map.

    1.0 means the map orders cluster distances exactly as the features do.
    """
    ids = np.unique(assignment[assignment != NOISE_LABEL])
    feature_centres = np.array([Z[assignment == i].mean(axis=0) for i in ids])
    map_centres = np.array([np.median(positions[assignment == i], axis=0) for i in ids])
    upper = np.triu_indices(len(ids), 1)
    feature_distance = np.linalg.norm(
        feature_centres[:, None] - feature_centres[None, :], axis=2
    )[upper]
    map_distance = np.linalg.norm(map_centres[:, None] - map_centres[None, :], axis=2)[
        upper
    ]
    return float(spearmanr(feature_distance, map_distance).statistic)
