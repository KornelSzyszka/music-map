"""Load Jamendo metadata and select reproducible track subsets."""

import csv
import math
import re
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from music_atlas.datasets import META_FILE, TRACKS_FILE, repo_dir

TRACK_COLUMNS = ("TRACK_ID", "ARTIST_ID", "ALBUM_ID", "PATH", "DURATION", "TAGS")
META_COLUMNS = ("TRACK_ID", "ARTIST_ID", "ALBUM_ID", "TRACK_NAME", "ARTIST_NAME", "URL")
OUTPUT_COLUMNS = (
    "id",
    "track_id",
    "artist_id",
    "album_id",
    "path",
    "duration",
    "title",
    "artist",
    "genres",
    "instruments",
    "moods",
    "source_url",
)


@dataclass(frozen=True)
class SubsetSpec:
    """Describe sampling; n=None retains all validated tracks in source order."""

    n: int | None = None
    seed: int = 42
    stratify_by: str | None = None


def _merge_elastic_column(row: list[str], header: list[str], column: str) -> list[str]:
    """Fold surplus fields into one column (a title containing a TAB character)."""
    surplus = len(row) - len(header)
    if surplus <= 0:
        return row
    start = header.index(column)
    merged = " ".join(part.strip() for part in row[start : start + surplus + 1])
    return [*row[:start], merged.strip(), *row[start + surplus + 1 :]]


def _read_tsv(
    path: Path,
    required_columns: tuple[str, ...],
    *,
    variable_tags: bool = False,
    elastic_column: str | None = None,
) -> Iterator[tuple[dict[str, str], list[str]]]:
    """Read fixed fields and an optional variable-width trailing TAGS field.

    ``elastic_column`` names a free-text column that may contain stray TAB
    characters in the source (two rows of ``raw.meta.tsv`` do); surplus fields
    are folded back into it. Any other column-count mismatch is an error.
    """
    with path.open(encoding="utf-8", newline="") as source:
        # Quotes in Jamendo titles are literal text, not TSV quoting syntax.
        reader = csv.reader(source, delimiter="\t", quoting=csv.QUOTE_NONE)
        header = next(reader, [])
        missing = set(required_columns) - set(header)
        if missing:
            raise ValueError(f"{path}: missing column(s): {', '.join(sorted(missing))}")
        if len(header) != len(set(header)):
            raise ValueError(f"{path}: duplicate column names")
        if variable_tags and header[-1] != "TAGS":
            raise ValueError(f"{path}: TAGS must be the last column")
        fields = header[:-1] if variable_tags else header
        seen: set[str] = set()
        for line_number, row in enumerate(reader, start=2):
            if elastic_column is not None:
                row = _merge_elastic_column(row, header, elastic_column)
            if len(row) < len(header) or (
                not variable_tags and len(row) != len(header)
            ):
                raise ValueError(f"{path}:{line_number}: invalid column count")
            record = dict(zip(fields, row[: len(fields)], strict=True))
            track_id = record["TRACK_ID"]
            if re.fullmatch(r"track_[0-9]+", track_id) is None:
                raise ValueError(f"{path}:{line_number}: invalid TRACK_ID {track_id!r}")
            if track_id in seen:
                raise ValueError(f"{path}:{line_number}: duplicate TRACK_ID {track_id}")
            seen.add(track_id)
            yield record, row[len(fields) :] if variable_tags else []


def load_tracks(data_dir: Path, subset: SubsetSpec) -> pd.DataFrame:
    """Load and validate source tracks for a requested subset."""
    tracks_path = repo_dir(data_dir) / TRACKS_FILE
    metadata_path = repo_dir(data_dir) / META_FILE
    for path in (tracks_path, metadata_path):
        if not path.is_file():
            raise FileNotFoundError(f"Missing Jamendo metadata file: {path}")
    metadata = {
        row["TRACK_ID"]: row
        for row, _ in _read_tsv(
            metadata_path, META_COLUMNS, elastic_column="TRACK_NAME"
        )
    }
    records: list[dict[str, object]] = []
    for row, tags in _read_tsv(tracks_path, TRACK_COLUMNS, variable_tags=True):
        track_id = row["TRACK_ID"]
        if track_id not in metadata:
            raise ValueError(
                f"{metadata_path}: missing metadata for TRACK_ID {track_id}"
            )
        meta = metadata[track_id]
        for column in ("ARTIST_ID", "ALBUM_ID"):
            if not row[column] or row[column] != meta[column]:
                raise ValueError(f"{track_id}: inconsistent {column} between TSV files")
        if not row["PATH"]:
            raise ValueError(f"{track_id}: missing PATH")
        try:
            duration = float(row["DURATION"])
        except ValueError as exc:
            raise ValueError(
                f"{track_id}: invalid DURATION {row['DURATION']!r}"
            ) from exc
        if not math.isfinite(duration) or duration <= 0:
            raise ValueError(f"{track_id}: DURATION must be finite and positive")
        categories: dict[str, list[str]] = {
            "genre": [],
            "instrument": [],
            "mood/theme": [],
        }
        for tag in tags:
            category, separator, value = tag.partition("---")
            if category not in categories:
                raise ValueError(f"{track_id}: unknown tag category {category!r}")
            if not separator or not value:
                raise ValueError(f"{track_id}: malformed tag {tag!r}")
            categories[category].append(value)
        records.append(
            {
                "id": f"jamendo:{int(track_id.removeprefix('track_'))}",
                "track_id": track_id,
                "artist_id": row["ARTIST_ID"],
                "album_id": row["ALBUM_ID"],
                "path": row["PATH"],
                "duration": duration,
                "title": meta["TRACK_NAME"],
                "artist": meta["ARTIST_NAME"],
                "genres": categories["genre"],
                "instruments": categories["instrument"],
                "moods": categories["mood/theme"],
                "source_url": meta["URL"],
            }
        )
    tracks = pd.DataFrame.from_records(records, columns=OUTPUT_COLUMNS)
    if tracks["id"].duplicated().any():
        raise ValueError(f"{tracks_path}: duplicate numeric TRACK_ID")
    if subset.n is None:
        return tracks
    return sample_subset(tracks, subset.n, subset.seed, subset.stratify_by)


def sample_subset(
    df: pd.DataFrame, n: int, seed: int, stratify_by: str | None = None
) -> pd.DataFrame:
    """Sample without replacement, using proportional first-tag strata if requested.

    Allocate rounded-down quotas, then give remaining slots to the largest
    fractional remainders. Empty tag lists form their own stratum. Small samples
    may omit rare strata; equal remainders follow their first occurrence order.
    """
    if not isinstance(n, int) or isinstance(n, bool) or not 0 <= n <= len(df):
        raise ValueError(f"n must be an integer in [0, {len(df)}], got {n!r}")
    groups: dict[str | None, list[int]] = {}
    if stratify_by is not None:
        if stratify_by not in df.columns:
            raise ValueError(f"Missing stratification column: {stratify_by}")
        for position, tags in enumerate(df[stratify_by]):
            if not isinstance(tags, list) or any(not isinstance(t, str) for t in tags):
                raise ValueError(f"{stratify_by} must contain lists of tag strings")
            groups.setdefault(tags[0] if tags else None, []).append(position)
    rng = np.random.default_rng(seed)
    if n == 0:
        return df.iloc[:0].copy().reset_index(drop=True)
    if stratify_by is None:
        positions = rng.choice(len(df), size=n, replace=False)
    else:
        strata = list(groups.values())
        sizes = np.array([len(group) for group in strata])
        quotas = sizes * n // len(df)
        remainders = sizes * n % len(df)
        order = np.argsort(-remainders, kind="stable")
        quotas[order[: int(n - quotas.sum())]] += 1
        positions = np.concatenate(
            [
                rng.choice(group, size=int(quota), replace=False)
                for group, quota in zip(strata, quotas, strict=True)
            ]
        )
        positions = rng.permutation(positions)
    return df.iloc[positions].copy().reset_index(drop=True)
