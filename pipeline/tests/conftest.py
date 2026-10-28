import numpy as np
import pandas as pd
import pytest

BLOB_COUNT = 3
BLOB_SIZE = 40
FEATURE_COUNT = 12
BLOB_SPREAD = 0.3
BLOB_DISTANCE = 8.0
SEED = 7


@pytest.fixture
def blobs() -> tuple[np.ndarray, np.ndarray]:
    """Well-separated Gaussian blobs and their true group ids."""
    rng = np.random.default_rng(SEED)
    centers = rng.normal(scale=BLOB_DISTANCE, size=(BLOB_COUNT, FEATURE_COUNT))
    X = np.vstack(
        [
            center + rng.normal(scale=BLOB_SPREAD, size=(BLOB_SIZE, FEATURE_COUNT))
            for center in centers
        ]
    )
    groups = np.repeat(np.arange(BLOB_COUNT), BLOB_SIZE)
    return X, groups


@pytest.fixture
def tracks(blobs: tuple[np.ndarray, np.ndarray]) -> pd.DataFrame:
    """Track table in the shape produced by ingest, tagged by blob."""
    _, groups = blobs
    genres = ["rock", "jazz", "ambient"]
    return pd.DataFrame(
        {
            "id": [f"test:{i}" for i in range(len(groups))],
            "title": [f"Track {i}" for i in range(len(groups))],
            "artist": ["Artist"] * len(groups),
            "genres": [[genres[g]] for g in groups],
            "instruments": [["guitar"] for _ in groups],
            "moods": [[] for _ in groups],
            "source_url": [None] * len(groups),
        }
    )
