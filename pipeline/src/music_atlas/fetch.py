"""Download and verify the MTG-Jamendo source data.

The metadata repository is cloned with git; its checksum list is the trust anchor
for the feature archives, which are downloaded from the MTG CDN and kept only
when their SHA-256 matches.
"""

import hashlib
import os
import re
import subprocess
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from music_atlas.datasets import (
    ARCHIVE_URL,
    CHECKSUM_FILE,
    JAMENDO_REPO_URL,
    META_FILE,
    TRACKS_FILE,
    features_dir,
    repo_dir,
)

CHUNK_BYTES = 1 << 20
DOWNLOAD_ATTEMPTS = 3
TIMEOUT_SECONDS = 60
_SHA256 = re.compile(r"[0-9a-f]{64}")
_ARCHIVE_NAME = re.compile(r"[A-Za-z0-9_.-]+\.tar\.gz")

type Log = Callable[[str], None]


@dataclass
class FetchReport:
    """Outcome of a fetch or check run."""

    ok: list[str] = field(default_factory=list)
    downloaded: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    corrupt: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)

    @property
    def complete(self) -> bool:
        return not (self.missing or self.corrupt or self.failed)


def parse_checksums(text: str) -> dict[str, str]:
    """Parse ``<sha256> <name>`` lines; accepts LF and CRLF line endings."""
    checksums: dict[str, str] = {}
    for number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        parts = line.split()
        if (
            len(parts) != 2
            or not _SHA256.fullmatch(parts[0])
            or not _ARCHIVE_NAME.fullmatch(parts[1])
        ):
            raise ValueError(f"malformed checksum line {number}: {line!r}")
        checksums[parts[1]] = parts[0]
    if not checksums:
        raise ValueError("checksum list is empty")
    return checksums


def sha256_file(path: Path) -> str:
    """Return the SHA-256 of a file, read in chunks."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(CHUNK_BYTES):
            digest.update(chunk)
    return digest.hexdigest()


def archive_state(path: Path, expected: str) -> str:
    """Return ``ok``, ``missing`` or ``corrupt`` for one archive."""
    if not path.is_file():
        return "missing"
    return "ok" if sha256_file(path) == expected else "corrupt"


def download_archive(url: str, destination: Path, expected: str) -> None:
    """Download to a temporary file and move it into place only if the hash matches."""
    partial = destination.with_name(destination.name + ".part")
    digest = hashlib.sha256()
    try:
        with (
            urllib.request.urlopen(url, timeout=TIMEOUT_SECONDS) as response,
            partial.open("wb") as out,
        ):
            while chunk := response.read(CHUNK_BYTES):
                digest.update(chunk)
                out.write(chunk)
        if digest.hexdigest() != expected:
            raise ValueError(f"checksum mismatch for {destination.name}")
        os.replace(partial, destination)
    finally:
        partial.unlink(missing_ok=True)


def ensure_metadata_repo(data_dir: Path, log: Log = print) -> None:
    """Clone the metadata repository unless it is already there."""
    target = repo_dir(data_dir)
    if (target / TRACKS_FILE).is_file() and (target / META_FILE).is_file():
        log(f"metadata repository present: {target}")
        return
    if target.exists() and any(target.iterdir()):
        raise RuntimeError(
            f"{target} exists but lacks the metadata files; remove or fix it"
        )
    log(f"cloning {JAMENDO_REPO_URL} into {target}")
    data_dir.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            ["git", "clone", "--depth", "1", JAMENDO_REPO_URL, str(target)], check=True
        )
    except FileNotFoundError as error:
        raise RuntimeError(
            "git is required to clone the metadata repository"
        ) from error


def fetch_archives(
    data_dir: Path,
    *,
    check_only: bool = False,
    base_url: str = ARCHIVE_URL,
    log: Log = print,
) -> FetchReport:
    """Verify every feature archive and download the missing or corrupt ones."""
    checksum_path = repo_dir(data_dir) / CHECKSUM_FILE
    if not checksum_path.is_file():
        raise FileNotFoundError(
            f"{checksum_path} not found; "
            "run without --check to clone the metadata first"
        )
    checksums = parse_checksums(checksum_path.read_text(encoding="utf-8"))
    directory = features_dir(data_dir)
    report = FetchReport()
    for index, (name, expected) in enumerate(sorted(checksums.items()), start=1):
        state = archive_state(directory / name, expected)
        if state == "ok":
            report.ok.append(name)
            continue
        if check_only:
            (report.missing if state == "missing" else report.corrupt).append(name)
            continue
        directory.mkdir(parents=True, exist_ok=True)
        log(f"[{index}/{len(checksums)}] {name} ({state}), downloading")
        for attempt in range(1, DOWNLOAD_ATTEMPTS + 1):
            try:
                download_archive(f"{base_url}/{name}", directory / name, expected)
            except (urllib.error.URLError, OSError, ValueError) as error:
                log(f"  attempt {attempt} failed: {error}")
            else:
                report.downloaded.append(name)
                break
        else:
            report.failed.append(name)
    return report
