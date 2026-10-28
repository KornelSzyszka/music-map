"""Where the MTG-Jamendo source data lives and where it comes from.

Everything sits under ``MUSIC_MAP_DATA_DIR``:

    <MUSIC_MAP_DATA_DIR>/
      mtg-jamendo-dataset/                  clone of the MTG metadata repository
        data/raw_30s_cleantags_50artists.tsv
        data/raw.meta.tsv
        data/download/raw_30s_acousticbrainz_sha256_tars.txt
      mtg-jamendo/acousticbrainz/           feature archives (about 1.3 GB)
        raw_30s_acousticbrainz-00.tar.gz ... -99.tar.gz
"""

from pathlib import Path

JAMENDO_REPO_URL = "https://github.com/MTG/mtg-jamendo-dataset.git"
JAMENDO_REPO_DIR = "mtg-jamendo-dataset"
FEATURES_DIR = Path("mtg-jamendo") / "acousticbrainz"

# Paths inside the cloned metadata repository.
TRACKS_FILE = Path("data") / "raw_30s_cleantags_50artists.tsv"
META_FILE = Path("data") / "raw.meta.tsv"
CHECKSUM_FILE = Path("data") / "download" / "raw_30s_acousticbrainz_sha256_tars.txt"

# The feature archives are not part of the repository; the MTG CDN serves them.
ARCHIVE_URL = "https://cdn.freesound.org/mtg-jamendo/raw_30s/acousticbrainz"


def repo_dir(data_dir: Path) -> Path:
    """Return the directory of the cloned metadata repository."""
    return data_dir / JAMENDO_REPO_DIR


def features_dir(data_dir: Path) -> Path:
    """Return the directory that holds the feature archives."""
    return data_dir / FEATURES_DIR
