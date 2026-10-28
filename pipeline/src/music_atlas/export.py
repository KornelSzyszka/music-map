"""Static export of the atlas files described in docs/architecture.md."""

import gzip
import json
from collections import Counter
from collections.abc import Sequence
from pathlib import Path
from typing import Any, NotRequired, TypedDict

import numpy as np
import pandas as pd

from music_atlas.project import NOISE_LABEL

MANIFEST_FILE = "manifest.json"
TRACKS_FILE = "tracks.json.gz"
CLUSTERS_FILE = "clusters.json.gz"
NEIGHBORS_FILE = "neighbors.json.gz"
FEATURES_FILE = "features.json.gz"
FEATURE_SAMPLE_FILE = "feature_sample.json.gz"

COORDINATE_DECIMALS = 4
TOP_TAG_COUNT = 3
LABEL_TAG_COUNT = 2
TAG_COLUMNS = ("genres", "instruments", "moods")
# A cluster tag must cover this share of the cluster (and at least MIN_TAG_MEMBERS).
MIN_TAG_SHARE = 0.08
MIN_TAG_MEMBERS = 3


class AtlasMeta(TypedDict):
    """Manifest fields specified in docs/architecture.md."""

    schema_version: str
    dataset_version: str
    projection_id: str
    feature_set_id: str
    track_count: int
    seed: int
    run: NotRequired[str]
    distance_metric: NotRequired[str]
    parameters: NotRequired[dict[str, Any]]
    library_versions: NotRequired[dict[str, str]]
    quality: NotRequired[dict[str, Any]]
    summary: NotRequired[dict[str, Any]]


def _dumps(payload: object, **options: Any) -> str:
    # allow_nan=False: JSON.parse in the browser rejects NaN and Infinity.
    try:
        return json.dumps(payload, allow_nan=False, **options)
    except ValueError as error:
        raise ValueError(f"export contains a non-finite number: {error}") from error


def _write_gzip_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    body = _dumps(payload, separators=(",", ":")).encode("utf-8")
    # mtime=0 keeps the bytes identical across runs with identical content.
    with path.open("wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as gz:
        gz.write(body)


def _check_lengths(**lengths: int) -> None:
    if len(set(lengths.values())) != 1:
        raise ValueError(f"length mismatch: {lengths}")


def write_manifest(out: Path, meta: AtlasMeta) -> None:
    """Write the versioned atlas manifest into the output directory."""
    out.mkdir(parents=True, exist_ok=True)
    (out / MANIFEST_FILE).write_text(_dumps(meta, indent=2), encoding="utf-8")


def write_tracks(
    out: Path, df: pd.DataFrame, Y: np.ndarray, labels: np.ndarray
) -> None:
    """Write track records with projected positions and cluster ids."""
    _check_lengths(tracks=len(df), positions=len(Y), labels=len(labels))
    tracks = [
        {
            "id": row.id,
            "title": row.title,
            "artist": row.artist,
            "artist_id": getattr(row, "artist_id", None),
            "x": round(float(x), COORDINATE_DECIMALS),
            "y": round(float(y), COORDINATE_DECIMALS),
            "cluster_id": None if label == NOISE_LABEL else int(label),
            "genres": list(row.genres),
            "instruments": list(row.instruments),
            "moods": list(row.moods),
            "features": dict(getattr(row, "features", None) or {}),
            "source_url": getattr(row, "source_url", None),
        }
        for row, (x, y), label in zip(
            df.itertuples(index=False), Y, labels, strict=True
        )
    ]
    _write_gzip_json(out / TRACKS_FILE, tracks)


def _tag_counts(df: pd.DataFrame, rows: np.ndarray | None = None) -> Counter:
    frame = df if rows is None else df.iloc[rows]
    return Counter(
        tag for column in TAG_COLUMNS for tags in frame[column] for tag in tags
    )


def _describing_tags(
    members: Counter, size: int, overall: Counter, total: int
) -> list[str]:
    """Tags over-represented in a cluster (lift over the whole data set)."""
    scored = []
    for tag, count in members.items():
        if count < max(MIN_TAG_MEMBERS, MIN_TAG_SHARE * size):
            continue
        lift = (count / size) / (overall[tag] / total)
        scored.append((-lift, -count, tag))
    scored.sort()
    if not scored:
        return [tag for tag, _ in members.most_common(TOP_TAG_COUNT)]
    return [tag for _, _, tag in scored[:TOP_TAG_COUNT]]


def write_clusters(
    out: Path, df: pd.DataFrame, Y: np.ndarray, labels: np.ndarray
) -> None:
    """Write one record per cluster (noise excluded) with centroid and top tags.

    Tags are ranked by lift, so a label names what is distinctive about the
    cluster instead of the tags that are common everywhere.
    """
    _check_lengths(tracks=len(df), positions=len(Y), labels=len(labels))
    overall = _tag_counts(df)
    clusters = []
    for cluster_id in sorted(set(labels.tolist()) - {NOISE_LABEL}):
        members = np.flatnonzero(labels == cluster_id)
        top_tags = _describing_tags(
            _tag_counts(df, members), len(members), overall, len(df)
        )
        label = " / ".join(top_tags[:LABEL_TAG_COUNT]) or f"Cluster {cluster_id}"
        centroid = Y[members].mean(axis=0)
        clusters.append(
            {
                "id": int(cluster_id),
                "label": label,
                "size": len(members),
                "x": round(float(centroid[0]), COORDINATE_DECIMALS),
                "y": round(float(centroid[1]), COORDINATE_DECIMALS),
                "top_tags": top_tags,
            }
        )
    _write_gzip_json(out / CLUSTERS_FILE, clusters)


def write_neighbors(
    out: Path, ids: Sequence[str], idx: np.ndarray, dist: np.ndarray
) -> None:
    """Write neighbour ids and feature-space distances per track."""
    _check_lengths(ids=len(ids), indices=len(idx), distances=len(dist))
    if idx.size and (idx.min() < 0 or idx.max() >= len(ids)):
        raise ValueError("neighbour indices must be in [0, len(ids))")
    records = [
        {
            "track_id": ids[i],
            "neighbors": [
                {"id": ids[j], "distance": round(float(d), COORDINATE_DECIMALS)}
                for j, d in zip(idx[i], dist[i], strict=True)
            ],
        }
        for i in range(len(ids))
    ]
    _write_gzip_json(out / NEIGHBORS_FILE, records)


def write_feature_graph(out: Path, graph: dict) -> None:
    """Write the feature graph (per-feature distributions and correlations)."""
    _write_gzip_json(out / FEATURES_FILE, graph)


def write_feature_sample(out: Path, sample: dict) -> None:
    """Write the sampled raw feature values used for pairwise scatter plots."""
    _write_gzip_json(out / FEATURE_SAMPLE_FILE, sample)
