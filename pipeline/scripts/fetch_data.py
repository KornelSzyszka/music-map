"""Fetch the MTG-Jamendo source data into MUSIC_MAP_DATA_DIR.

Usage (from pipeline/):
    uv run python scripts/fetch_data.py            # clone metadata, download features
    uv run python scripts/fetch_data.py --check    # only report what is present

The data directory comes from MUSIC_MAP_DATA_DIR (environment or the repository's
.env file). Downloads are resumable: verified archives are skipped.
"""

import argparse
import sys
from pathlib import Path

# Scripts must work from any checkout path, including ones with non-ASCII
# characters where Python 3.12 ignores the editable install's .pth file.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from music_atlas.config import get_data_dir
from music_atlas.datasets import features_dir
from music_atlas.fetch import ensure_metadata_repo, fetch_archives


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--check",
        action="store_true",
        help="report the state of the data, download nothing",
    )
    check_only = parser.parse_args().check

    data_dir = get_data_dir()
    print(f"data directory: {data_dir}")
    if not check_only:
        ensure_metadata_repo(data_dir)
    try:
        report = fetch_archives(data_dir, check_only=check_only)
    except FileNotFoundError as error:
        # With --check and an empty directory there is nothing to verify yet.
        print(f"nothing to check: {error}")
        return 1

    print(
        f"feature archives in {features_dir(data_dir)}: {len(report.ok)} ok, "
        f"{len(report.downloaded)} downloaded, {len(report.missing)} missing, "
        f"{len(report.corrupt)} corrupt, {len(report.failed)} failed"
    )
    if not report.complete:
        print("incomplete: rerun without --check to download what is missing")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
