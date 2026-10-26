"""Evaluation signatures for the offline pipeline stage (see docs/architecture.md)."""

from collections.abc import Mapping

import numpy as np
import pandas as pd

# TODO: Define method comparison fields after evaluation is specified.
type MethodSpec = Mapping[str, object]


def trustworthiness_k(X: np.ndarray, Y: np.ndarray, k: int) -> float:
    """Measure local trustworthiness of the projection at k neighbors."""
    raise NotImplementedError


def continuity_k(X: np.ndarray, Y: np.ndarray, k: int) -> float:
    """Measure local continuity of the projection at k neighbors."""
    raise NotImplementedError


def neighbor_recall(nn_hi: np.ndarray, nn_2d: np.ndarray, k: int) -> float:
    """Measure overlap between feature-space and projected neighbors."""
    raise NotImplementedError


def compare_methods(
    X: np.ndarray, methods: list[MethodSpec], ks: list[int]
) -> pd.DataFrame:
    """Compare planned projection methods across neighborhood sizes."""
    raise NotImplementedError
