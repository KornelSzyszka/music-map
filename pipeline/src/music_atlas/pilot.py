"""Compose the stages into one atlas: features -> PCA -> UMAP, HDBSCAN, kNN, quality.

Pure composition: inputs are tables and a parameter bundle, the result is an
``AtlasBuild``. Reading source data and writing files stay at the edges
(``scripts/build_atlas.py`` and ``write_atlas``).
"""

from dataclasses import asdict, dataclass, field
from importlib.metadata import version
from pathlib import Path

import numpy as np
import pandas as pd

from music_atlas.evaluate import (
    MethodSpec,
    continuity_k,
    embed,
    neighbor_recall,
    trustworthiness_k,
)
from music_atlas.export import (
    AtlasMeta,
    write_clusters,
    write_manifest,
    write_neighbors,
    write_tracks,
)
from music_atlas.features import FeatureSpec, build_matrix, standardize
from music_atlas.hierarchy import (
    HierarchyParams,
    assign_to_clusters,
    centroid_rank_agreement,
    hierarchical_layout,
)
from music_atlas.project import (
    NOISE_LABEL,
    cluster_hdbscan,
    knn,
    project_umap,
    reduce_pca,
)

SCHEMA_VERSION = "0.5"
DISTANCE_METRIC = "euclidean on clipped, standardised features"
LIBRARIES = ("numpy", "pandas", "scikit-learn", "umap-learn")
# Raw values exported with every track for the details panel.
DISPLAY_FEATURES = {
    "bpm": "rhythm.bpm",
    "danceability": "rhythm.danceability",
    "onset_rate": "rhythm.onset_rate",
    "loudness": "lowlevel.average_loudness",
    "dynamic_complexity": "lowlevel.dynamic_complexity",
    "key_strength": "tonal.key_strength",
}
FEATURE_DECIMALS = 4
LAYOUTS = ("umap", "hierarchical")


@dataclass(frozen=True)
class PilotParams:
    """Every parameter that shapes the atlas; recorded in the manifest."""

    sample_size: int = 10_000
    seed: int = 42
    pca_components: int = 40
    umap_neighbors: int = 15
    umap_min_dist: float = 0.1
    # "umap": the global map. "hierarchical": clusters first, then their tracks.
    layout: str = "umap"
    # A second layout exported next to the first (alt_x, alt_y); None for none.
    alternate_layout: str | None = None
    hierarchy_fill: float = 0.2
    cluster_dims: int = 10
    cluster_neighbors: int = 15
    cluster_min_dist: float = 0.0
    assign_k: int = 15
    min_cluster_size: int = 40
    min_samples: int | None = 5
    cluster_selection: str = "leaf"
    knn_k: int = 15
    quality_sample: int = 3_000
    quality_ks: tuple[int, ...] = (10, 30)


@dataclass
class AtlasBuild:
    """Everything the exporter needs."""

    tracks: pd.DataFrame
    Y: np.ndarray
    labels: np.ndarray
    neighbor_index: np.ndarray
    neighbor_distance: np.ndarray
    manifest: AtlasMeta
    quality: dict = field(default_factory=dict)
    alt: np.ndarray | None = None


def _quality(
    Z: np.ndarray, maps: dict[str, np.ndarray], params: PilotParams
) -> dict[str, dict[str, dict[str, float]]]:
    """Neighbourhood preservation of each map versus a plain 2-D PCA baseline.

    Measured on a seeded subsample because trustworthiness needs all pairwise
    distances; both methods are scored on the same points.
    """
    rng = np.random.default_rng(params.seed)
    rows = np.sort(
        rng.choice(len(Z), size=min(params.quality_sample, len(Z)), replace=False)
    )
    baseline = embed(Z, MethodSpec("pca", "pca"))
    sub_z = Z[rows]
    nn_hi, _ = knn(sub_z, max(params.quality_ks))
    result: dict[str, dict[str, dict[str, float]]] = {}
    for name, projection in (*maps.items(), ("pca", baseline)):
        sub_y = projection[rows]
        nn_2d, _ = knn(sub_y, max(params.quality_ks))
        result[name] = {
            str(k): {
                "trustworthiness": round(trustworthiness_k(sub_z, sub_y, k), 4),
                "continuity": round(continuity_k(sub_z, sub_y, k), 4),
                "recall": round(neighbor_recall(nn_hi, nn_2d, k), 4),
            }
            for k in params.quality_ks
        }
    return result


def build_atlas(
    tracks: pd.DataFrame,
    features: pd.DataFrame,
    spec: FeatureSpec,
    params: PilotParams,
    dataset_version: str,
    run: str = "",
) -> AtlasBuild:
    """Project tracks that have features; report how many had to be dropped."""
    joined = tracks.merge(features, on="id", how="inner", validate="one_to_one")
    dropped = len(tracks) - len(joined)
    joined = joined.reset_index(drop=True)
    if len(joined) <= max(params.knn_k, max(params.quality_ks)):
        raise ValueError(f"too few tracks with features: {len(joined)}")

    X = build_matrix(joined, spec)
    Z, _ = standardize(X)
    pca = reduce_pca(Z, min(params.pca_components, Z.shape[1]))
    umap = project_umap(pca, params.umap_neighbors, params.umap_min_dist, params.seed)
    # Clusters are found in a separate, higher-dimensional UMAP space: density in
    # the 40-D PCA space is too uniform for HDBSCAN (see docs/decisions/0007).
    cluster_space = project_umap(
        pca,
        params.cluster_neighbors,
        params.cluster_min_dist,
        params.seed,
        n_components=params.cluster_dims,
    )
    labels = cluster_hdbscan(
        cluster_space,
        params.min_cluster_size,
        params.min_samples,
        params.cluster_selection,
    )
    neighbor_index, neighbor_distance = knn(Z, params.knn_k)
    # Every track gets a home cluster: its own, or the one it is closest to.
    home = assign_to_clusters(Z, labels, params.assign_k)
    wanted = {params.layout, params.alternate_layout} - {None}
    unknown = wanted - set(LAYOUTS)
    if unknown:
        raise ValueError(f"unknown layout {sorted(unknown)!r}; known: {LAYOUTS}")
    if params.alternate_layout == params.layout:
        raise ValueError("alternate_layout must differ from layout")
    maps = {"umap": umap}
    if "hierarchical" in wanted:
        hierarchy = HierarchyParams(
            assign_k=params.assign_k, fill=params.hierarchy_fill, seed=params.seed
        )
        maps["hierarchical"] = hierarchical_layout(Z, labels, umap, hierarchy).positions
    Y = maps[params.layout]
    alt = maps[params.alternate_layout] if params.alternate_layout else None
    quality = _quality(Z, maps, params)
    joined["home_cluster_id"] = home

    present = {
        key: path for key, path in DISPLAY_FEATURES.items() if path in spec.paths
    }
    joined["features"] = [
        {
            key: round(float(row[path]), FEATURE_DECIMALS)
            for key, path in present.items()
        }
        for _, row in joined.iterrows()
    ]
    clustered = int((labels != NOISE_LABEL).sum())
    manifest: AtlasMeta = {
        "schema_version": SCHEMA_VERSION,
        "dataset_version": dataset_version,
        "projection_id": f"{spec.feature_set_id}-pca{params.pca_components}"
        f"-umap{params.umap_neighbors}-hdbscan{params.min_cluster_size}"
        f"{params.cluster_selection}",
        "feature_set_id": spec.feature_set_id,
        "track_count": len(joined),
        "seed": params.seed,
        "run": run,
        "distance_metric": DISTANCE_METRIC,
        "parameters": asdict(params),
        "library_versions": {name: version(name) for name in LIBRARIES},
        "quality": quality,
        "summary": {
            "requested": len(tracks),
            "dropped_without_features": dropped,
            "clusters": len(set(labels.tolist()) - {NOISE_LABEL}),
            "clustered_share": round(clustered / len(joined), 4),
            "cluster_distance_rank_agreement": {
                name: round(centroid_rank_agreement(Z, home, positions), 4)
                for name, positions in maps.items()
            },
            "layout": params.layout,
            "alternate_layout": params.alternate_layout,
        },
    }
    return AtlasBuild(
        tracks=joined,
        Y=Y,
        alt=alt,
        labels=labels,
        neighbor_index=neighbor_index,
        neighbor_distance=neighbor_distance,
        manifest=manifest,
        quality=quality,
    )


def write_atlas(out: Path, build: AtlasBuild) -> None:
    """Write manifest, tracks, clusters and neighbours of an atlas build."""
    write_tracks(out, build.tracks, build.Y, build.labels, build.alt)
    write_clusters(out, build.tracks, build.Y, build.labels, build.alt)
    write_neighbors(
        out, list(build.tracks["id"]), build.neighbor_index, build.neighbor_distance
    )
    write_manifest(out, build.manifest)
