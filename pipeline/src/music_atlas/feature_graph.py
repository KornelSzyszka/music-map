"""Feature graph: per-feature distributions and the correlation structure.

Nodes are features, edges are strong correlations, and node positions come from
classical MDS of the correlation distance, so related features sit close together.
"""

import re
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from sklearn.manifold import MDS

from music_atlas.features import DEFAULT_CLIP_PERCENTILES, FeatureSpec

HISTOGRAM_BINS = 40
EDGE_MIN_ABS_CORRELATION = 0.7
GENRE_QUANTILES = (10, 25, 50, 75, 90)
MIN_GENRE_SAMPLES = 30
COORDINATE_DECIMALS = 4
MIN_NODE_DISTANCE = 0.07
TAG_MIN_COUNT = 300
TAG_TOP = 5
TAG_SEPARATOR = "---"
SAMPLE_SIZE = 2500
SAMPLE_SIGNIFICANT_DIGITS = 4
DECLUTTER_ITERATIONS = 300
STAT_DECIMALS = 6

FAMILIES = ("timbre", "mfcc", "contrast_bands", "dynamics", "rhythm", "tonal")
_FAMILY_PATTERNS = (
    ("mfcc", re.compile(r"\.mfcc\.")),
    (
        "contrast_bands",
        re.compile(r"spectral_contrast|energyband|melbands|barkbands"),
    ),
    ("dynamics", re.compile(r"average_loudness|dynamic_complexity|silence_rate")),
    ("rhythm", re.compile(r"^rhythm\.")),
    ("tonal", re.compile(r"^tonal\.")),
)


@dataclass(frozen=True)
class GraphParams:
    """Parameters of the feature graph."""

    bins: int = HISTOGRAM_BINS
    min_abs_correlation: float = EDGE_MIN_ABS_CORRELATION
    clip_percentiles: tuple[float, float] = DEFAULT_CLIP_PERCENTILES
    min_node_distance: float = MIN_NODE_DISTANCE
    tag_min_count: int = TAG_MIN_COUNT
    seed: int = 0


def family_of(path: str) -> str:
    """Return the feature family for a feature path."""
    for family, pattern in _FAMILY_PATTERNS:
        if pattern.search(path):
            return family
    return "timbre"


def label_of(path: str) -> str:
    """Return a short human-readable label for a feature path."""
    if path.endswith("==major"):
        return "key is major"
    body = path.split(".", 1)[1]
    index = re.search(r"\[(\d+)\]$", body)
    body = re.sub(r"\[\d+\]$", "", body)
    name, _, stat = body.partition(".")
    name = name.replace("_", " ")
    suffix = f" {index.group(1)}" if index else ""
    return f"{name}{suffix} ({stat})" if stat else f"{name}{suffix}"


def declutter(
    points: np.ndarray, min_distance: float, iterations: int = DECLUTTER_ITERATIONS
) -> np.ndarray:
    """Push apart points closer than min_distance; deterministic.

    Strongly correlated features land almost on top of each other in the MDS
    layout. This keeps them readable without reordering the wider layout.
    """
    moved = points.copy()
    order = np.sign(np.arange(len(points))[:, None] - np.arange(len(points))[None, :])
    for _ in range(iterations):
        delta = moved[:, None, :] - moved[None, :, :]
        distance = np.linalg.norm(delta, axis=2)
        np.fill_diagonal(distance, np.inf)
        overlap = np.clip(min_distance - distance, 0.0, None)
        if not overlap.any():
            break
        direction = delta / np.where(distance > 0, distance, 1.0)[..., None]
        # Coincident points have no direction; split them along x by index.
        direction[distance == 0, 0] = order[distance == 0]
        # Each point of a pair moves half of the overlap away from the other.
        moved += 0.5 * (overlap[..., None] * direction).sum(axis=1)
    return moved


def _histogram(values: np.ndarray, lower: float, upper: float, bins: int) -> dict:
    if upper <= lower:
        counts = np.array([len(values)] + [0] * (bins - 1))
        edges = np.linspace(lower, lower + 1.0, bins + 1)
    else:
        edges = np.linspace(lower, upper, bins + 1)
        counts, _ = np.histogram(np.clip(values, lower, upper), bins=edges)
    return {
        "edges": np.round(edges, STAT_DECIMALS).tolist(),
        "counts": counts.astype(int).tolist(),
        "below": int((values < lower).sum()),
        "above": int((values > upper).sum()),
    }


def _genre_histograms(
    column: np.ndarray, masks: dict[str, np.ndarray], edges: Sequence[float]
) -> dict[str, list[float]]:
    """Share of each genre's tracks per histogram bin (rows sum to 1)."""
    lower, upper = edges[0], edges[-1]
    out: dict[str, list[float]] = {}
    for genre, mask in masks.items():
        values = np.clip(column[mask], lower, upper)
        counts, _ = np.histogram(values, bins=np.asarray(edges))
        out[genre] = np.round(counts / max(1, mask.sum()), 5).tolist()
    return out


def tag_profiles(
    Z: np.ndarray, tags: Sequence[Sequence[str]], min_count: int, top: int
) -> list[list[dict]]:
    """For each column, the tags with the highest and lowest mean standardised value.

    ``tags`` holds ``category---name`` strings per track. A tag needs at least
    ``min_count`` tracks, so rare tags cannot produce extreme but noisy means.
    """
    if len(tags) != len(Z):
        raise ValueError("tags must have one entry per track")
    names = sorted({tag for per_track in tags for tag in per_track})
    index = {name: i for i, name in enumerate(names)}
    membership = np.zeros((len(Z), len(names)), dtype=bool)
    for row, per_track in enumerate(tags):
        for tag in per_track:
            membership[row, index[tag]] = True
    counts = membership.sum(axis=0)
    keep = np.flatnonzero(counts >= min_count)
    means = (membership[:, keep].T.astype(float) @ Z) / counts[keep][:, None]
    profiles: list[list[dict]] = []
    for column in range(Z.shape[1]):
        order = np.argsort(means[:, column])
        picked = [*order[::-1][:top], *order[:top]] if len(order) > 2 * top else order
        entries = []
        for position in dict.fromkeys(int(i) for i in picked):
            category, _, name = names[keep[position]].partition(TAG_SEPARATOR)
            entries.append(
                {
                    "tag": name,
                    "category": category,
                    "mean_z": round(float(means[position, column]), 3),
                    "n": int(counts[keep[position]]),
                }
            )
        entries.sort(key=lambda entry: -entry["mean_z"])
        profiles.append(entries)
    return profiles


def build_feature_sample(
    X: np.ndarray,
    spec: FeatureSpec,
    groups: np.ndarray,
    size: int = SAMPLE_SIZE,
    seed: int = 0,
) -> dict:
    """A seeded random sample of raw feature values, for pairwise scatter plots."""
    if X.shape[1] != len(spec.paths) or len(groups) != len(X):
        raise ValueError(
            "X, spec and groups must describe the same tracks and features"
        )
    rng = np.random.default_rng(seed)
    rows = np.sort(rng.choice(len(X), size=min(size, len(X)), replace=False))
    digits = SAMPLE_SIGNIFICANT_DIGITS
    return {
        "feature_set_id": spec.feature_set_id,
        "features": list(spec.paths),
        "genres": [groups[i] for i in rows],
        "values": [[float(f"{v:.{digits}g}") for v in X[i]] for i in rows],
    }


def _skewness(values: np.ndarray) -> float:
    std = values.std()
    return 0.0 if std == 0 else float((((values - values.mean()) / std) ** 3).mean())


def _eta_squared(z: np.ndarray, groups: np.ndarray) -> np.ndarray:
    """Share of each column's variance explained by the group labels."""
    mask = np.array([g is not None for g in groups])
    z, labels = z[mask], groups[mask]
    total = ((z - z.mean(axis=0)) ** 2).sum(axis=0)
    between = np.zeros(z.shape[1])
    for label in np.unique(labels):
        member = z[labels == label]
        between += len(member) * (member.mean(axis=0) - z.mean(axis=0)) ** 2
    return np.divide(between, total, out=np.zeros_like(between), where=total > 0)


def build_feature_graph(
    X: np.ndarray,
    Z: np.ndarray,
    spec: FeatureSpec,
    groups: np.ndarray,
    params: GraphParams | None = None,
    tags: Sequence[Sequence[str]] | None = None,
) -> dict:
    """Build the feature graph from raw (X) and normalised (Z) feature matrices.

    ``groups`` holds one label per track (or None); it only colours the profiles
    and never feeds the layout, so no label information leaks into the geometry.
    """
    params = params or GraphParams()
    if X.shape != Z.shape or X.shape[1] != len(spec.paths):
        raise ValueError("X, Z and spec must describe the same features")
    if len(groups) != len(X):
        raise ValueError("groups must have one entry per track")

    # A constant column has undefined correlation; treat it as uncorrelated.
    with np.errstate(invalid="ignore", divide="ignore"):
        correlation = np.nan_to_num(np.corrcoef(Z, rowvar=False), nan=0.0)
    distance = 1.0 - np.abs(correlation)
    np.fill_diagonal(distance, 0.0)
    layout = MDS(
        n_components=2,
        metric="precomputed",
        init="random",
        n_init=1,
        random_state=params.seed,
    ).fit_transform(distance)
    layout = layout / np.abs(layout).max()
    layout = declutter(layout, params.min_node_distance)
    layout = layout / np.abs(layout).max()

    power = _eta_squared(Z, groups)
    labelled = {g for g in groups if g is not None}
    genre_masks = {
        g: np.array([x == g for x in groups])
        for g in sorted(labelled)
        if sum(x == g for x in groups) >= MIN_GENRE_SAMPLES
    }

    lows, highs = np.percentile(X, params.clip_percentiles, axis=0)
    tag_rows = (
        tag_profiles(Z, tags, params.tag_min_count, TAG_TOP)
        if tags is not None
        else [[] for _ in spec.paths]
    )
    features = []
    for i, path in enumerate(spec.paths):
        column = X[:, i]
        q = np.percentile(column, [25, 50, 75])
        histogram = _histogram(column, float(lows[i]), float(highs[i]), params.bins)
        features.append(
            {
                "id": path,
                "label": label_of(path),
                "family": family_of(path),
                "x": round(float(layout[i, 0]), COORDINATE_DECIMALS),
                "y": round(float(layout[i, 1]), COORDINATE_DECIMALS),
                "power": round(float(power[i]), COORDINATE_DECIMALS),
                "stats": {
                    "min": round(float(column.min()), STAT_DECIMALS),
                    "p25": round(float(q[0]), STAT_DECIMALS),
                    "median": round(float(q[1]), STAT_DECIMALS),
                    "p75": round(float(q[2]), STAT_DECIMALS),
                    "max": round(float(column.max()), STAT_DECIMALS),
                    "mean": round(float(column.mean()), STAT_DECIMALS),
                    "std": round(float(column.std()), STAT_DECIMALS),
                    "skew": round(_skewness(column), 3),
                },
                "histogram": histogram,
                "genre_histogram": _genre_histograms(
                    column, genre_masks, histogram["edges"]
                ),
                "tag_profile": tag_rows[i],
                "genre_profile": {
                    g: np.round(
                        np.percentile(column[mask], GENRE_QUANTILES), STAT_DECIMALS
                    ).tolist()
                    for g, mask in genre_masks.items()
                },
            }
        )

    rows, cols = np.triu_indices(len(spec.paths), k=1)
    strong = np.abs(correlation[rows, cols]) >= params.min_abs_correlation
    edges = [
        {
            "source": spec.paths[a],
            "target": spec.paths[b],
            "r": round(float(correlation[a, b]), 3),
        }
        for a, b in zip(rows[strong], cols[strong], strict=True)
    ]
    return {
        "feature_set_id": spec.feature_set_id,
        "genre_quantiles": list(GENRE_QUANTILES),
        "min_abs_correlation": params.min_abs_correlation,
        "track_count": len(X),
        "features": features,
        "edges": edges,
    }
