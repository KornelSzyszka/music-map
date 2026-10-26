"""Feature preparation signatures."""

from collections.abc import Mapping

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

# TODO: define feature selection fields once source features are known.
type FeatureSpec = Mapping[str, object]


def build_matrix(df: pd.DataFrame, spec: FeatureSpec) -> np.ndarray:
    """Build a numeric feature matrix from a track table."""
    raise NotImplementedError


def standardize(X: np.ndarray) -> tuple[np.ndarray, StandardScaler]:
    """Standardize transformed features and return the fitted scaler."""
    raise NotImplementedError
