"""Configuration: environment variables, with the repository's .env as a fallback."""

import os
from pathlib import Path

DATA_DIR_VARIABLE = "MUSIC_MAP_DATA_DIR"
# pipeline/src/music_atlas/config.py -> repository root.
DEFAULT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


def read_env_file(path: Path) -> dict[str, str]:
    """Parse ``KEY=VALUE`` lines of a .env file; a missing file gives no values."""
    if not path.is_file():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, raw = stripped.partition("=")
        values[key.strip()] = raw.strip().strip("\"'")
    return values


def get_data_dir(env_file: Path | None = DEFAULT_ENV_FILE) -> Path:
    """Return the source data directory.

    An environment variable wins over the ``.env`` file; the file is read only
    when the variable is unset. Pass ``env_file=None`` to ignore the file.

    Raises:
        RuntimeError: If ``MUSIC_MAP_DATA_DIR`` is set in neither place.
    """
    value = os.environ.get(DATA_DIR_VARIABLE, "").strip()
    if not value and env_file is not None:
        value = read_env_file(env_file).get(DATA_DIR_VARIABLE, "").strip()
    if not value:
        raise RuntimeError(
            f"{DATA_DIR_VARIABLE} is not set; put it in .env or the environment "
            "(see .env.example)."
        )
    return Path(value)
