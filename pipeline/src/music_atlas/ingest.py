"""Ingestion signatures for the offline pipeline stage (see docs/architecture.md)."""

from collections.abc import Mapping
from pathlib import Path

import pandas as pd

# TODO: Define subset selection fields when the data contract is settled.
type SubsetSpec = Mapping[str, object]


def load_tracks(data_dir: Path, subset: SubsetSpec) -> pd.DataFrame:
    """Load and validate source tracks for a requested subset."""
    raise NotImplementedError


def sample_subset(
    df: pd.DataFrame, n: int, seed: int, stratify_by: str | None = None
) -> pd.DataFrame:
    """Select a reproducible subset, optionally stratified by a tag field."""
    raise NotImplementedError
