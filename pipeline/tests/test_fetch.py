import hashlib
import urllib.error
from pathlib import Path

import pytest

from music_atlas.datasets import (
    CHECKSUM_FILE,
    META_FILE,
    TRACKS_FILE,
    features_dir,
    repo_dir,
)
from music_atlas.fetch import (
    archive_state,
    download_archive,
    ensure_metadata_repo,
    fetch_archives,
    parse_checksums,
    sha256_file,
)

GOOD = b"feature archive bytes"
GOOD_SHA = hashlib.sha256(GOOD).hexdigest()
OTHER_SHA = hashlib.sha256(b"something else").hexdigest()


def quiet(_: str) -> None:
    return None


@pytest.fixture
def server(tmp_path: Path) -> Path:
    """A directory that plays the CDN, addressed through file:// URLs."""
    directory = tmp_path / "cdn"
    directory.mkdir()
    (directory / "a.tar.gz").write_bytes(GOOD)
    return directory


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    root = tmp_path / "data"
    checksums = repo_dir(root) / CHECKSUM_FILE
    checksums.parent.mkdir(parents=True)
    # The real file has CRLF line endings.
    checksums.write_bytes(f"{GOOD_SHA} a.tar.gz\r\n".encode())
    return root


def test_parse_checksums_accepts_lf_and_crlf():
    text = f"{GOOD_SHA} a.tar.gz\r\n{OTHER_SHA} b.tar.gz\n\n"
    assert parse_checksums(text) == {"a.tar.gz": GOOD_SHA, "b.tar.gz": OTHER_SHA}


@pytest.mark.parametrize(
    "line",
    [
        "",
        "nothex a.tar.gz",
        f"{GOOD_SHA}",
        f"{GOOD_SHA} ../evil.tar.gz",
        f"{GOOD_SHA} a.zip",
    ],
)
def test_parse_checksums_rejects_malformed_lines(line):
    with pytest.raises(ValueError):
        parse_checksums(line)


def test_archive_state_distinguishes_ok_missing_and_corrupt(tmp_path):
    path = tmp_path / "a.tar.gz"
    assert archive_state(path, GOOD_SHA) == "missing"
    path.write_bytes(GOOD)
    assert archive_state(path, GOOD_SHA) == "ok"
    path.write_bytes(b"damaged")
    assert archive_state(path, GOOD_SHA) == "corrupt"
    assert sha256_file(path) == hashlib.sha256(b"damaged").hexdigest()


def test_download_keeps_the_file_only_when_the_hash_matches(tmp_path, server):
    destination = tmp_path / "out" / "a.tar.gz"
    destination.parent.mkdir()
    download_archive((server / "a.tar.gz").as_uri(), destination, GOOD_SHA)
    assert destination.read_bytes() == GOOD

    bad = tmp_path / "out" / "b.tar.gz"
    with pytest.raises(ValueError, match="checksum mismatch"):
        download_archive((server / "a.tar.gz").as_uri(), bad, OTHER_SHA)
    assert not bad.exists()
    assert not list(bad.parent.glob("*.part"))


def test_fetch_downloads_missing_archives_and_skips_verified_ones(data_dir, server):
    first = fetch_archives(data_dir, base_url=server.as_uri(), log=quiet)
    assert first.downloaded == ["a.tar.gz"] and first.complete
    assert (features_dir(data_dir) / "a.tar.gz").read_bytes() == GOOD
    second = fetch_archives(data_dir, base_url=server.as_uri(), log=quiet)
    assert second.ok == ["a.tar.gz"] and second.downloaded == []


def test_fetch_replaces_a_corrupt_archive(data_dir, server):
    target = features_dir(data_dir) / "a.tar.gz"
    target.parent.mkdir(parents=True)
    target.write_bytes(b"truncated")
    report = fetch_archives(data_dir, base_url=server.as_uri(), log=quiet)
    assert report.downloaded == ["a.tar.gz"]
    assert target.read_bytes() == GOOD


def test_check_only_reports_without_downloading(data_dir, server):
    report = fetch_archives(
        data_dir, check_only=True, base_url=server.as_uri(), log=quiet
    )
    assert report.missing == ["a.tar.gz"] and not report.complete
    assert not features_dir(data_dir).exists()


def test_failed_downloads_are_reported_not_hidden(data_dir, tmp_path):
    report = fetch_archives(
        data_dir, base_url=(tmp_path / "nowhere").as_uri(), log=quiet
    )
    assert report.failed == ["a.tar.gz"] and not report.complete


def test_fetch_without_the_metadata_repo_explains_what_to_do(tmp_path):
    with pytest.raises(FileNotFoundError, match="clone the metadata"):
        fetch_archives(tmp_path, log=quiet)


def test_existing_metadata_repo_is_not_cloned_again(tmp_path):
    for relative in (TRACKS_FILE, META_FILE):
        path = repo_dir(tmp_path) / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("x", encoding="utf-8")
    messages: list[str] = []
    ensure_metadata_repo(tmp_path, log=messages.append)
    assert "present" in messages[0]


def test_a_half_filled_repo_directory_is_refused(tmp_path):
    (repo_dir(tmp_path)).mkdir()
    (repo_dir(tmp_path) / "stray.txt").write_text("x", encoding="utf-8")
    with pytest.raises(RuntimeError, match="lacks the metadata files"):
        ensure_metadata_repo(tmp_path, log=quiet)


def test_url_errors_are_retried_then_reported(monkeypatch, data_dir):
    calls: list[str] = []

    def boom(url, timeout):
        calls.append(url)
        raise urllib.error.URLError("offline")

    monkeypatch.setattr("music_atlas.fetch.urllib.request.urlopen", boom)
    report = fetch_archives(data_dir, base_url="http://example.invalid", log=quiet)
    assert report.failed == ["a.tar.gz"] and len(calls) == 3
