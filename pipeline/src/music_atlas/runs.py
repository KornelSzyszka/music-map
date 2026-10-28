"""Run configurations: which dataset and parameters produce an atlas.

A run is a TOML file in ``pipeline/runs/``. Unknown keys are errors, so a typo
cannot silently fall back to a default.
"""

import tomllib
from dataclasses import dataclass
from pathlib import Path

from music_atlas.features import ACOUSTIC_V1, FeatureSpec
from music_atlas.pilot import PilotParams

RUNS_DIR = Path(__file__).resolve().parents[2] / "runs"
SUPPORTED_DATASETS = ("jamendo",)
FEATURE_SETS: dict[str, FeatureSpec] = {ACOUSTIC_V1.feature_set_id: ACOUSTIC_V1}

# TOML section -> {TOML key: PilotParams field}
_PARAMETER_KEYS: dict[str, dict[str, str]] = {
    "sample": {"size": "sample_size", "seed": "seed"},
    "projection": {
        "pca_components": "pca_components",
        "umap_neighbors": "umap_neighbors",
        "umap_min_dist": "umap_min_dist",
        "layout": "layout",
        "alternate_layout": "alternate_layout",
        "hierarchy_fill": "hierarchy_fill",
    },
    "clusters": {
        "space_dims": "cluster_dims",
        "space_neighbors": "cluster_neighbors",
        "space_min_dist": "cluster_min_dist",
        "min_cluster_size": "min_cluster_size",
        "min_samples": "min_samples",
        "selection": "cluster_selection",
    },
    "neighbours": {"k": "knn_k"},
    "quality": {"sample": "quality_sample", "ks": "quality_ks"},
}
_SECTION_KEYS = {
    "dataset": {"name"},
    "sample": {"size", "seed", "stratify_by"},
    "features": {"set"},
    **{
        section: set(keys)
        for section, keys in _PARAMETER_KEYS.items()
        if section != "sample"
    },
}
_TOP_LEVEL = {"name", "description", *_SECTION_KEYS}


@dataclass(frozen=True)
class RunConfig:
    """A validated run."""

    name: str
    description: str
    dataset: str
    feature_spec: FeatureSpec
    stratify_by: str | None
    params: PilotParams


def resolve_run(reference: str) -> Path:
    """Return the TOML path for a run name (``pilot``) or an explicit file path."""
    candidate = Path(reference)
    path = candidate if candidate.suffix == ".toml" else RUNS_DIR / f"{reference}.toml"
    if not path.is_file():
        available = ", ".join(sorted(p.stem for p in RUNS_DIR.glob("*.toml"))) or "none"
        raise FileNotFoundError(
            f"run {reference!r} not found; available runs: {available}"
        )
    return path


def _check_keys(section: str, found: set[str], allowed: set[str]) -> None:
    unknown = found - allowed
    if unknown:
        raise ValueError(f"unknown key(s) in [{section}]: {sorted(unknown)}")


def parse_run(document: dict) -> RunConfig:
    """Validate a parsed TOML document and turn it into a ``RunConfig``."""
    _check_keys("top level", set(document), _TOP_LEVEL)
    for key in ("name", "dataset", "sample", "features"):
        if key not in document:
            raise ValueError(f"missing {key!r} in the run file")
    for section, allowed in _SECTION_KEYS.items():
        if section in document:
            _check_keys(section, set(document[section]), allowed)

    dataset = document["dataset"].get("name")
    if dataset not in SUPPORTED_DATASETS:
        raise ValueError(
            f"unsupported dataset {dataset!r}; supported: {SUPPORTED_DATASETS}"
        )
    feature_set = document["features"].get("set")
    if feature_set not in FEATURE_SETS:
        raise ValueError(
            f"unknown feature set {feature_set!r}; known: {sorted(FEATURE_SETS)}"
        )

    projection = document.get("projection", {})
    layout = projection.get("layout", "umap")
    alternate = projection.get("alternate_layout")
    for value in (layout, alternate):
        if value is not None and value not in ("umap", "hierarchical"):
            raise ValueError(
                f"unsupported layout {value!r}; supported: umap, hierarchical"
            )
    if alternate is not None and alternate == layout:
        raise ValueError("alternate_layout must differ from layout")
    values: dict[str, object] = {}
    for section, keys in _PARAMETER_KEYS.items():
        for key, field_name in keys.items():
            if key in document.get(section, {}):
                value = document[section][key]
                values[field_name] = tuple(value) if isinstance(value, list) else value
    return RunConfig(
        name=str(document["name"]),
        description=str(document.get("description", "")),
        dataset=dataset,
        feature_spec=FEATURE_SETS[feature_set],
        stratify_by=document["sample"].get("stratify_by"),
        params=PilotParams(**values),
    )


def load_run(reference: str) -> RunConfig:
    """Load a run by name or path."""
    with resolve_run(reference).open("rb") as handle:
        return parse_run(tomllib.load(handle))
