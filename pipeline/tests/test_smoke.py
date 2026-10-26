"""Smoke checks for the package and local configuration."""

from pathlib import Path

import pytest

import music_atlas
from music_atlas.config import DATA_DIR_VARIABLE, get_data_dir


def test_package_import() -> None:
    assert music_atlas.__name__ == "music_atlas"


def test_data_dir_is_read_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(DATA_DIR_VARIABLE, "test-data")
    assert get_data_dir() == Path("test-data")


def test_missing_data_dir_fails_with_variable_name(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv(DATA_DIR_VARIABLE, raising=False)
    with pytest.raises(RuntimeError, match=DATA_DIR_VARIABLE):
        get_data_dir()
