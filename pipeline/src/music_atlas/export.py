"""Static export signatures."""

from pathlib import Path
from typing import TypedDict

import numpy as np
import pandas as pd


class AtlasMeta(TypedDict):
    """Manifest fields currently specified in docs/architecture.md."""

    schema_version: str
    dataset_version: str
    projection_id: str
    feature_set_id: str
    track_count: int
    seed: int


def write_manifest(out: Path, meta: AtlasMeta) -> None:
    """Write the versioned atlas manifest."""
    raise NotImplementedError


def write_tracks(
    out: Path, df: pd.DataFrame, Y: np.ndarray, labels: np.ndarray
) -> None:
    """Write track records with projected positions and cluster labels."""
    raise NotImplementedError


def write_neighbors(out: Path, idx: np.ndarray, dist: np.ndarray) -> None:
    """Write neighbor identifiers and feature-space distances."""
    raise NotImplementedError
