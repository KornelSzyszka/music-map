import copy
import tomllib

import pytest

from music_atlas.runs import RUNS_DIR, load_run, parse_run, resolve_run


@pytest.fixture
def document() -> dict:
    with (RUNS_DIR / "pilot.toml").open("rb") as handle:
        return tomllib.load(handle)


def test_the_pilot_run_file_is_valid():
    run = load_run("pilot")
    assert run.name == "pilot" and run.dataset == "jamendo"
    assert run.params.sample_size == 10_000 and run.params.seed == 42
    assert run.params.cluster_selection == "leaf" and run.params.min_cluster_size == 40
    assert run.params.quality_ks == (10, 30)
    assert run.stratify_by == "genres"
    assert run.feature_spec.feature_set_id == "acoustic-v1"


def test_every_run_file_in_the_directory_parses():
    for path in RUNS_DIR.glob("*.toml"):
        assert load_run(str(path)).name


def test_unknown_keys_are_rejected_instead_of_ignored(document):
    document["clusters"]["min_cluster_sise"] = 10
    with pytest.raises(ValueError, match=r"unknown key\(s\) in \[clusters\]"):
        parse_run(document)


def test_unknown_top_level_section_is_rejected(document):
    document["extras"] = {}
    with pytest.raises(ValueError, match="top level"):
        parse_run(document)


@pytest.mark.parametrize("key", ["name", "dataset", "sample", "features"])
def test_required_parts_must_be_present(document, key):
    broken = copy.deepcopy(document)
    del broken[key]
    with pytest.raises(ValueError, match=r"missing|unknown"):
        parse_run(broken)


def test_unsupported_dataset_and_feature_set_are_rejected(document):
    broken = copy.deepcopy(document)
    broken["dataset"]["name"] = "fma"
    with pytest.raises(ValueError, match="unsupported dataset"):
        parse_run(broken)
    broken = copy.deepcopy(document)
    broken["features"]["set"] = "acoustic-v9"
    with pytest.raises(ValueError, match="unknown feature set"):
        parse_run(broken)


def test_missing_optional_keys_fall_back_to_the_defaults(document):
    minimal = {
        "name": "tiny",
        "dataset": {"name": "jamendo"},
        "sample": {"size": 500},
        "features": {"set": "acoustic-v1"},
    }
    run = parse_run(minimal)
    assert run.params.sample_size == 500
    assert run.params.seed == 42 and run.stratify_by is None


def test_an_unknown_run_name_lists_the_available_ones():
    with pytest.raises(FileNotFoundError, match=r"available runs: .*pilot"):
        resolve_run("does-not-exist")
