"""Configuration read from the environment."""

import os
from pathlib import Path

DATA_DIR_VARIABLE = "MUSIC_MAP_DATA_DIR"


def get_data_dir() -> Path:
    """Return the source data directory from ``MUSIC_MAP_DATA_DIR``.

    Raises:
        RuntimeError: If the variable is unset or empty.
    """
    value = os.environ.get(DATA_DIR_VARIABLE, "").strip()
    if not value:
        raise RuntimeError(
            f"{DATA_DIR_VARIABLE} is not set; point it at the source dataset "
            "directory (see .env.example)."
        )
    return Path(value)
