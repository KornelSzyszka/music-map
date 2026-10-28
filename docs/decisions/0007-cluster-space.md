# Clusters are found in a separate 10-D UMAP space

- Status: accepted (technical decision by Claude; the user was informed, not asked)
- Owner: Claude
- Date: 2026-10-28

## Context

The first pilot run (10 000 tracks, HDBSCAN on the 40-D PCA space, `min_cluster_size` 30) found **no clusters**. The acoustic-v1 features form a continuum rather than separated groups, so density in PCA space is too uniform. The project still needs algorithmic clusters described by tags.

## Decision

Cluster in a **separate 10-D UMAP embedding** of the PCA space (`n_neighbors` 15, `min_dist` 0.0), using HDBSCAN with `cluster_selection_method="leaf"`, `min_cluster_size` 40 and `min_samples` 5. The 2-D map is a different UMAP (`min_dist` 0.1) and is not used for clustering. Parameters live in `pipeline/runs/pilot.toml`.

## Evidence (pilot sample, seed 42, same 10 000 tracks)

NMI is between cluster and first genre of the clustered tracks; it is a sanity check, not a target.

| Space | Selection | Clusters | Clustered share | NMI |
|---|---|---|---|---|
| PCA 40-D | eom, min size 20 | 2 | 19% | 0.03 |
| PCA 40-D | eom, min size 40 or more | 0 | 0% | - |
| UMAP 2-D (the map) | eom, min size 30-60 | 2 | 98-99% | 0.00 |
| UMAP 10-D | eom, min size 30-60 | 2 | 99% | 0.00 |
| UMAP 10-D | leaf, min size 30, default samples | 27 | 32% | 0.22 |
| **UMAP 10-D** | **leaf, min size 40, min_samples 5** | **41** | **39%** | **0.22** |
| UMAP 10-D | leaf, min size 15, min_samples 5 | 121 | 41% | 0.28 |

Chosen for a readable map: about 40 clusters of median size 87 (largest 241), distinct enough to label.

## Alternatives and rationale

- `eom` selection: one giant cluster plus one tiny one; useless for labelling.
- Clustering the 2-D map: UMAP 2-D has the same problem and loses information.
- Smaller `min_cluster_size`: more, smaller clusters with slightly higher NMI, but 100+ labels are unreadable.

## Participants and acceptance evidence

Claude proposed and measured it. The user has not reviewed the numbers.

## Consequences

- Only 39% of tracks belong to a cluster; the rest are drawn grey as "no dense group". This is an honest property of the data, not a bug.
- The extra UMAP costs about 20 seconds per run.
- Cluster labels are the tags with the highest lift in the cluster, so they describe what is distinctive.
