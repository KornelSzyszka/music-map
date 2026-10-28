"""Run a named atlas build: pipeline/runs/<name>.toml -> data/derived/<name>/.

Usage (from pipeline/, after `npm run data`):
    uv run python scripts/run.py pilot
    uv run python scripts/run.py runs/my-experiment.toml --out ../data/derived/x

The run file says what to load and how to process it; the data directory comes
from MUSIC_MAP_DATA_DIR (.env). Output defaults to data/derived/<run name>/.
"""

import argparse
import json
import sys
from pathlib import Path

# Scripts must work from any checkout path, including ones with non-ASCII
# characters where Python 3.12 ignores the editable install's .pth file.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from music_atlas.config import get_data_dir
from music_atlas.datasets import features_dir
from music_atlas.features import read_features
from music_atlas.fetch import missing_archives
from music_atlas.ingest import SubsetSpec, load_tracks
from music_atlas.pilot import build_atlas, write_atlas
from music_atlas.runs import load_run

DEFAULT_OUT = Path(__file__).resolve().parents[2] / "data" / "derived"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "run", help="run name (pipeline/runs/<name>.toml) or a .toml path"
    )
    parser.add_argument("--out", type=Path, help="output directory")
    args = parser.parse_args()

    run = load_run(args.run)
    out = args.out or DEFAULT_OUT / run.name
    params = run.params
    print(f"run {run.name!r}: {run.description}")

    data_dir = get_data_dir()
    missing = missing_archives(data_dir)
    if missing:
        raise SystemExit(
            f"{len(missing)} feature archives are missing; run `npm run data` first"
        )

    print("reading metadata and sampling ...")
    subset = SubsetSpec(
        n=params.sample_size, seed=params.seed, stratify_by=run.stratify_by
    )
    tracks = load_tracks(data_dir, subset)
    print(f"sampled {len(tracks)} tracks; reading features ...")
    features = read_features(
        features_dir(data_dir), run.feature_spec, set(tracks["id"])
    )
    print(f"read {len(features)} feature vectors; projecting ...")
    version = f"{run.dataset}-{params.sample_size}-seed{params.seed}"
    build = build_atlas(tracks, features, run.feature_spec, params, version, run.name)
    write_atlas(out, build)
    summary = {"summary": build.manifest["summary"], "quality": build.quality}
    print(json.dumps(summary, indent=2))
    print(f"wrote atlas to {out}")


if __name__ == "__main__":
    main()
