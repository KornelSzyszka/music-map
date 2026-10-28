"""Build the feature graph export from the Jamendo metadata and feature archives.

Usage (from pipeline/, with MUSIC_MAP_DATA_DIR set):
    python scripts/build_feature_graph.py ../data/derived
"""

import argparse
import sys
from collections import Counter
from pathlib import Path

import numpy as np

# Scripts must work from any checkout path, including ones with non-ASCII
# characters where Python 3.12 ignores the editable install's .pth file.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from music_atlas.config import get_data_dir
from music_atlas.datasets import features_dir
from music_atlas.export import write_feature_graph, write_feature_sample
from music_atlas.feature_graph import (
    build_feature_graph,
    build_feature_sample,
)
from music_atlas.features import (
    ACOUSTIC_V1,
    build_matrix,
    read_features,
    standardize,
)
from music_atlas.ingest import SubsetSpec, load_tracks

TOP_GENRES = 12


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("out", type=Path, help="output directory")
    out = parser.parse_args().out

    data_dir = get_data_dir()
    tracks = load_tracks(data_dir, SubsetSpec()).set_index("id")
    frame = read_features(features_dir(data_dir), ACOUSTIC_V1)
    frame = frame[frame["id"].isin(tracks.index)].reset_index(drop=True)

    X = build_matrix(frame, ACOUSTIC_V1)
    Z, _ = standardize(X)

    # Only tracks with exactly one genre get a label; the rest stay unlabelled.
    single = [
        genres[0] if len(genres) == 1 else None
        for genres in tracks.loc[frame["id"], "genres"]
    ]
    counts = Counter(g for g in single if g)
    top = {genre for genre, _ in counts.most_common(TOP_GENRES)}
    groups = np.array([g if g in top else None for g in single], dtype=object)

    labelled = tracks.loc[frame["id"]]
    tags = [
        [
            *(f"genre---{tag}" for tag in genres),
            *(f"instrument---{tag}" for tag in instruments),
            *(f"mood/theme---{tag}" for tag in moods),
        ]
        for genres, instruments, moods in zip(
            labelled["genres"], labelled["instruments"], labelled["moods"], strict=True
        )
    ]
    graph = build_feature_graph(X, Z, ACOUSTIC_V1, groups, tags=tags)
    write_feature_graph(out, graph)
    # Scatter plots colour by the first top genre of any track (not only single-genre).
    first_top = np.array(
        [next((g for g in genres if g in top), None) for genres in labelled["genres"]],
        dtype=object,
    )
    write_feature_sample(out, build_feature_sample(X, ACOUSTIC_V1, first_top))
    print(
        f"{len(graph['features'])} features, {len(graph['edges'])} edges, "
        f"{graph['track_count']} tracks, {len(top)} genres -> {out}"
    )


if __name__ == "__main__":
    main()
