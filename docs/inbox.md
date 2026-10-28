# Inbox

Unaccepted ideas and open questions. Promote an item to a decision (`docs/decisions/`) or a task (`docs/tasks/`) only after the user accepts it.

| Item | Type | Evidence / source | Needed from |
|---|---|---|---|
| Vector database for similarity search | proposal | Not needed at 10k-25k tracks; see ADR 0004 | revisit if the dataset grows past ~1M tracks |
| Second dataset (FMA) for comparison | proposal | 518 librosa features, no BPM; availability not checked | user |
| Course formal requirements, deadline, grading rubric | question | Timetable suggests the presentation on 2027-02-02 (unconfirmed) | user asks the lecturer |
| Offline/desktop use | question | User: "probably not" | user |
| Handling tracks with incomplete features | question | Not yet observed in the data | pipeline owner |
| Search index format and export chunking | question | Depends on measured size | after the pilot export |
| Artists are cohesive but not tight | finding | Pilot, artists with at least 5 tracks: mean distance 10.63 inside an artist vs 13.29 to random tracks; 5.1% of the 10 nearest neighbours share the artist, 28.1% of tracks have at least one same-artist neighbour | optional exclusion of same-artist neighbours; artist view (see the artist-level decision) |
| Only 39% of tracks fall in a cluster | finding | acoustic-v1 forms a continuum (ADR 0007) | accept, or try other features |
| Low neighbour recall (0.13 at k=10) | finding | expected for a 96-D to 2-D projection; UMAP beats the PCA baseline (0.06) | discuss in the report |
