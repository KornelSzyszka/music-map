"""Exercise Jamendo ingestion with tiny, offline TSV files."""

from dataclasses import FrozenInstanceError
from pathlib import Path

import pandas as pd
import pytest

from music_atlas.ingest import SubsetSpec, load_tracks, sample_subset

TRACKS_FILE = "raw_30s_cleantags_50artists.tsv"
META_FILE = "raw.meta.tsv"


@pytest.fixture
def jamendo_dir(tmp_path: Path) -> Path:
    """Write synthetic metadata with the real headers and variable tag counts."""
    source = tmp_path / "mtg-jamendo-dataset" / "data"
    source.mkdir(parents=True)
    (source / TRACKS_FILE).write_text(
        "TRACK_ID\tARTIST_ID\tALBUM_ID\tPATH\tDURATION\tTAGS\n"
        "track_0000214\tartist_000014\talbum_000031\t14/214.mp3\t124.6\t"
        "genre---rock\tgenre---alternative\tinstrument---guitar\t"
        "mood/theme---energetic\tmood/theme---happy\n"
        "track_0000215\tartist_000015\talbum_000032\t15/215.mp3\t151.4\t"
        "genre---jazz\n"
        "track_0000216\tartist_000014\talbum_000031\t16/216.mp3\t90\t"
        "instrument---piano\n",
        encoding="utf-8",
    )
    (source / META_FILE).write_text(
        "TRACK_ID\tARTIST_ID\tALBUM_ID\tTRACK_NAME\tARTIST_NAME\tALBUM_NAME\t"
        "RELEASEDATE\tURL\n"
        "track_0000216\tartist_000014\talbum_000031\tThird\tArtist One\tAlbum\t"
        "2004-12-28\thttps://www.jamendo.com/track/216\n"
        'track_0000214\tartist_000014\talbum_000031\t"Écho"\tArtist One\tAlbum\t'
        "2004-12-28\thttps://www.jamendo.com/track/214\n"
        "track_0000215\tartist_000015\talbum_000032\tSecond\tArtist Two\tAlbum\t"
        "2004-12-28\thttps://www.jamendo.com/track/215\n",
        encoding="utf-8",
    )
    return tmp_path


def _source_path(data_dir: Path, filename: str) -> Path:
    return data_dir / "mtg-jamendo-dataset" / "data" / filename


def _replace(data_dir: Path, filename: str, old: str, new: str) -> None:
    path = _source_path(data_dir, filename)
    path.write_text(
        path.read_text(encoding="utf-8").replace(old, new), encoding="utf-8"
    )


def test_loads_contract_columns_and_joins_by_track_id(jamendo_dir: Path) -> None:
    tracks = load_tracks(jamendo_dir, SubsetSpec())
    assert tracks.columns.tolist() == [
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
    ]
    assert tracks["id"].tolist() == ["jamendo:214", "jamendo:215", "jamendo:216"]
    assert tracks.iloc[0].to_dict() == {
        "id": "jamendo:214",
        "track_id": "track_0000214",
        "artist_id": "artist_000014",
        "album_id": "album_000031",
        "path": "14/214.mp3",
        "duration": 124.6,
        "title": '"Écho"',
        "artist": "Artist One",
        "genres": ["rock", "alternative"],
        "instruments": ["guitar"],
        "moods": ["energetic", "happy"],
        "source_url": "https://www.jamendo.com/track/214",
    }
    assert tracks["title"].tolist() == ['"Écho"', "Second", "Third"]
    assert pd.api.types.is_float_dtype(tracks["duration"])


def test_single_tag_and_absent_categories_are_lists(jamendo_dir: Path) -> None:
    tracks = load_tracks(jamendo_dir, SubsetSpec())
    assert tracks.iloc[1][["genres", "instruments", "moods"]].tolist() == [
        ["jazz"],
        [],
        [],
    ]
    assert tracks.iloc[2][["genres", "instruments", "moods"]].tolist() == [
        [],
        ["piano"],
        [],
    ]


def test_subset_spec_is_immutable() -> None:
    subset = SubsetSpec(n=2, seed=7, stratify_by="genres")
    with pytest.raises(FrozenInstanceError):
        subset.n = 1


def test_load_applies_the_requested_subset(jamendo_dir: Path) -> None:
    full = load_tracks(jamendo_dir, SubsetSpec())
    subset = load_tracks(jamendo_dir, SubsetSpec(n=2, seed=7, stratify_by="genres"))
    pd.testing.assert_frame_equal(subset, sample_subset(full, 2, 7, "genres"))


@pytest.mark.parametrize("filename", [TRACKS_FILE, META_FILE])
def test_missing_file_reports_its_path(tmp_path: Path, filename: str) -> None:
    source = _source_path(tmp_path, filename)
    source.parent.mkdir(parents=True)
    other_file = META_FILE if filename == TRACKS_FILE else TRACKS_FILE
    _source_path(tmp_path, other_file).touch()
    with pytest.raises(FileNotFoundError, match=filename):
        load_tracks(tmp_path, SubsetSpec())


@pytest.mark.parametrize(
    ("filename", "column"), [(TRACKS_FILE, "TAGS"), (META_FILE, "TRACK_NAME")]
)
def test_missing_column_is_reported(
    jamendo_dir: Path, filename: str, column: str
) -> None:
    _replace(jamendo_dir, filename, column, "UNEXPECTED_COLUMN")
    with pytest.raises(ValueError, match=f"missing column.*{column}"):
        load_tracks(jamendo_dir, SubsetSpec())


@pytest.mark.parametrize("filename", [TRACKS_FILE, META_FILE])
def test_duplicate_track_ids_are_rejected(jamendo_dir: Path, filename: str) -> None:
    path = _source_path(jamendo_dir, filename)
    text = path.read_text(encoding="utf-8")
    path.write_text(text + text.splitlines(keepends=True)[1], encoding="utf-8")
    with pytest.raises(ValueError, match="duplicate TRACK_ID"):
        load_tracks(jamendo_dir, SubsetSpec())


def test_duplicate_numeric_ids_are_rejected(jamendo_dir: Path) -> None:
    for filename in (TRACKS_FILE, META_FILE):
        _replace(jamendo_dir, filename, "track_0000215", "track_214")
    with pytest.raises(ValueError, match="duplicate numeric TRACK_ID"):
        load_tracks(jamendo_dir, SubsetSpec())


@pytest.mark.parametrize("tag", ["unknown---rock", "genre", "genre---", ""])
def test_unknown_or_malformed_tags_are_rejected(jamendo_dir: Path, tag: str) -> None:
    _replace(jamendo_dir, TRACKS_FILE, "genre---jazz", tag)
    with pytest.raises(ValueError, match=r"unknown tag category|malformed tag"):
        load_tracks(jamendo_dir, SubsetSpec())


def test_missing_metadata_does_not_silently_drop_tracks(jamendo_dir: Path) -> None:
    path = _source_path(jamendo_dir, META_FILE)
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    path.write_text("".join(lines[:-1]), encoding="utf-8")
    with pytest.raises(ValueError, match=r"missing metadata.*track_0000215"):
        load_tracks(jamendo_dir, SubsetSpec())


def test_artist_mismatch_between_files_is_rejected(jamendo_dir: Path) -> None:
    _replace(jamendo_dir, META_FILE, "artist_000015", "artist_999999")
    with pytest.raises(ValueError, match="inconsistent ARTIST_ID"):
        load_tracks(jamendo_dir, SubsetSpec())


@pytest.mark.parametrize("duration", ["not-a-number", "nan", "inf", "0", "-1"])
def test_invalid_duration_is_rejected(jamendo_dir: Path, duration: str) -> None:
    _replace(jamendo_dir, TRACKS_FILE, "151.4", duration)
    with pytest.raises(ValueError, match="DURATION"):
        load_tracks(jamendo_dir, SubsetSpec())


def test_short_row_is_rejected(jamendo_dir: Path) -> None:
    _replace(jamendo_dir, TRACKS_FILE, "151.4\tgenre---jazz", "151.4")
    with pytest.raises(ValueError, match="invalid column count"):
        load_tracks(jamendo_dir, SubsetSpec())


@pytest.mark.parametrize(
    ("raw_title", "expected"), [("Second	", "Second"), ("Sec	ond", "Sec ond")]
)
def test_stray_tab_in_a_title_is_folded_into_the_title(
    jamendo_dir: Path, raw_title: str, expected: str
) -> None:
    # Two real metadata records have a TAB character inside TRACK_NAME.
    _replace(
        jamendo_dir,
        META_FILE,
        "	Second	Artist Two",
        f"	{raw_title}	Artist Two",
    )
    tracks = load_tracks(jamendo_dir, SubsetSpec()).set_index("track_id")
    assert tracks.loc["track_0000215", "title"] == expected
    assert tracks.loc["track_0000215", "artist"] == "Artist Two"


def test_missing_metadata_field_is_still_rejected(jamendo_dir: Path) -> None:
    _replace(jamendo_dir, META_FILE, "	Second	Artist Two", "	Second")
    with pytest.raises(ValueError, match=r"raw.meta.tsv:4: invalid column count"):
        load_tracks(jamendo_dir, SubsetSpec())


def test_invalid_track_identifier_is_rejected(jamendo_dir: Path) -> None:
    _replace(jamendo_dir, TRACKS_FILE, "track_0000215", "invalid")
    with pytest.raises(ValueError, match="invalid TRACK_ID"):
        load_tracks(jamendo_dir, SubsetSpec())


def test_missing_path_is_rejected(jamendo_dir: Path) -> None:
    _replace(jamendo_dir, TRACKS_FILE, "15/215.mp3", "")
    with pytest.raises(ValueError, match="missing PATH"):
        load_tracks(jamendo_dir, SubsetSpec())


def test_all_rows_are_validated_before_sampling(jamendo_dir: Path) -> None:
    _replace(jamendo_dir, TRACKS_FILE, "instrument---piano", "unknown---piano")
    with pytest.raises(ValueError, match="unknown tag category"):
        load_tracks(jamendo_dir, SubsetSpec(n=0))


@pytest.fixture
def population() -> pd.DataFrame:
    """Return unequal first-genre strata with distracting secondary tags."""
    return pd.DataFrame(
        {
            "id": [f"jamendo:{i}" for i in range(100)],
            "genres": [["rock", "jazz"] for _ in range(80)]
            + [["jazz", "rock"] for _ in range(15)]
            + [[] for _ in range(5)],
        },
        index=[0] * 100,
    )


@pytest.mark.parametrize("stratify_by", [None, "genres"])
def test_sampling_is_reproducible_without_replacement(
    population: pd.DataFrame, stratify_by: str | None
) -> None:
    original = population.copy(deep=True)
    first = sample_subset(population, 20, seed=7, stratify_by=stratify_by)
    second = sample_subset(population, 20, seed=7, stratify_by=stratify_by)
    different = sample_subset(population, 20, seed=8, stratify_by=stratify_by)
    pd.testing.assert_frame_equal(first, second)
    assert first["id"].is_unique
    assert len(first) == 20
    assert first["id"].tolist() != different["id"].tolist()
    assert first.index.tolist() == list(range(20))
    pd.testing.assert_frame_equal(population, original)


def test_stratification_uses_first_genre_and_includes_empty_lists(
    population: pd.DataFrame,
) -> None:
    sample = sample_subset(population, 20, seed=7, stratify_by="genres")
    labels = [tags[0] if tags else "untagged" for tags in sample["genres"]]
    assert pd.Series(labels).value_counts().to_dict() == {
        "rock": 16,
        "jazz": 3,
        "untagged": 1,
    }


def test_stratum_rounding_preserves_exact_sample_size() -> None:
    frame = pd.DataFrame(
        {
            "id": list(range(10)),
            "genres": [["rock"] for _ in range(7)]
            + [["jazz"] for _ in range(2)]
            + [["ambient"]],
        }
    )
    sample = sample_subset(frame, 6, seed=7, stratify_by="genres")
    assert sample["genres"].map(lambda tags: tags[0]).value_counts().to_dict() == {
        "rock": 4,
        "jazz": 1,
        "ambient": 1,
    }
    assert len(sample_subset(frame, 1, seed=7, stratify_by="genres")) == 1


@pytest.mark.parametrize("stratify_by", [None, "genres"])
def test_sampling_zero_and_full_population(
    population: pd.DataFrame, stratify_by: str | None
) -> None:
    empty = sample_subset(population, 0, seed=7, stratify_by=stratify_by)
    assert empty.empty
    assert empty.columns.tolist() == population.columns.tolist()
    full = sample_subset(population, len(population), seed=7, stratify_by=stratify_by)
    assert set(full["id"]) == set(population["id"])
    pd.testing.assert_frame_equal(
        sample_subset(population.iloc[:0], 0, seed=7, stratify_by=stratify_by), empty
    )


@pytest.mark.parametrize("n", [-1, 101, 1.5, True])
def test_invalid_sample_size_is_rejected(population: pd.DataFrame, n: object) -> None:
    with pytest.raises(ValueError, match="n must be an integer"):
        sample_subset(population, n, seed=7)


def test_missing_stratification_column_is_rejected(population: pd.DataFrame) -> None:
    with pytest.raises(ValueError, match="Missing stratification column: absent"):
        sample_subset(population, 20, seed=7, stratify_by="absent")


@pytest.mark.parametrize("tags", [None, "rock", [1]])
def test_invalid_stratification_tags_are_rejected(tags: object) -> None:
    with pytest.raises(ValueError, match="lists of tag strings"):
        sample_subset(pd.DataFrame({"genres": [tags]}), 1, seed=7, stratify_by="genres")
