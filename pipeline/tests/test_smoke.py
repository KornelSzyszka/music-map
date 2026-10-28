"""Smoke checks for the package and local configuration."""

from pathlib import Path

import pytest

import music_atlas
from music_atlas.config import DATA_DIR_VARIABLE, get_data_dir, read_env_file


def test_package_import() -> None:
    assert music_atlas.__name__ == "music_atlas"


def test_data_dir_is_read_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(DATA_DIR_VARIABLE, "test-data")
    assert get_data_dir(env_file=None) == Path("test-data")


def test_missing_data_dir_fails_with_variable_name(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv(DATA_DIR_VARIABLE, raising=False)
    with pytest.raises(RuntimeError, match=DATA_DIR_VARIABLE):
        get_data_dir(env_file=None)


def test_env_file_is_used_when_the_variable_is_unset(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.delenv(DATA_DIR_VARIABLE, raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text(
        f'# comment\n{DATA_DIR_VARIABLE}="from-file"\n', encoding="utf-8"
    )
    assert get_data_dir(env_file=env_file) == Path("from-file")


def test_environment_variable_wins_over_the_env_file(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv(DATA_DIR_VARIABLE, "from-environment")
    env_file = tmp_path / ".env"
    env_file.write_text(f"{DATA_DIR_VARIABLE}=from-file\n", encoding="utf-8")
    assert get_data_dir(env_file=env_file) == Path("from-environment")


def test_missing_env_file_is_not_an_error_by_itself(tmp_path: Path) -> None:
    assert read_env_file(tmp_path / "absent.env") == {}


def test_env_file_ignores_comments_blanks_and_other_keys(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n# note\nOTHER=1\nMUSIC_MAP_DATA_DIR = spaced \n", encoding="utf-8"
    )
    assert read_env_file(env_file) == {"OTHER": "1", "MUSIC_MAP_DATA_DIR": "spaced"}
