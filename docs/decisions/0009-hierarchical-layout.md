# Hierarchical layout and tinted unclustered tracks

- Status: proposed (the user suggested the idea and asked to try it; the choice of the default is open)
- Owner: User (decides the default); Claude (implementation and measurements)
- Date: 2026-10-29

## Context

The user proposed: place the clusters first by their mutual distances, then arrange the tracks inside each cluster, and give tracks without a cluster the colour of the nearest cluster. 61% of the pilot tracks have no cluster.

## What was built

- `pipeline/src/music_atlas/hierarchy.py`: clusters are placed by classical MDS of the centroid distances in feature space; each cluster gets a disc whose area is proportional to its size, covering a fraction `fill` of the area the centres span; discs that still overlap are pushed apart. Inside a disc the tracks keep the arrangement of the global UMAP map, only centred and rescaled.
- Every track gets a home cluster: its own, or the majority among its 15 nearest clustered tracks in feature space. The export carries it as `home_cluster_id` (schema 0.4).
- In the Cluster colour mode a track without a cluster takes a faint version of its home cluster's colour when that cluster has a colour (one of the 7 largest), otherwise grey. This works with either layout.
- A run selects the layout: `pipeline/runs/pilot.toml` keeps `umap`, `pilot-hier.toml` uses `hierarchical`.

## Measurements (10 000 tracks, seed 42, k = 10, 3 000 point subsample)

| | Global UMAP | Hierarchical, fill 0.2 |
|---|---|---|
| Rank agreement of cluster distances with feature space (Spearman) | 0.77 | **0.93** |
| Trustworthiness | 0.86 | **0.90** |
| Recall of feature-space neighbours | 0.13 | **0.15** |
| Continuity | **0.93** | 0.88 |

Larger discs hurt the main goal: with `fill` 0.9 the cluster-distance agreement falls to 0.73, because cluster centres are closer to each other than the clusters are wide (the data form a continuum). With `fill` 0.1 to 0.35 it stays between 0.90 and 0.94.

About 45% of the 10 nearest neighbours of a track lie in a different cluster after the assignment, so the hierarchical layout cuts those links across disc borders; that is the cost seen in continuity.

## Decision

Keep the global UMAP map as the default. The hierarchical layout stays available as a run. The tint for unclustered tracks is part of the Cluster colour mode for every layout.

## Alternatives and open question

- Showing both layouts in one export with a Layout switch in Settings (two position pairs per track) would let the user compare without rebuilding. Not done; it changes the contract and needs the user's decision.
- Larger or size-weighted discs, or laying out unclustered tracks separately from their home cluster, were not tried.

## Participants and acceptance evidence

Idea: the user. Implementation and numbers: Claude. No independent review by Codex yet.

## Consequences

The manifest records `summary.cluster_distance_rank_agreement` per layout, and the quality block gains a `hierarchical` entry when that layout is used.
