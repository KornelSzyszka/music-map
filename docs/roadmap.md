# Roadmap

Status: proposed until the user accepts it. Dates are not committed; the presentation is likely 2027-02-02 (unconfirmed).

| Stage | Result | Owner → reviewer | Depends on |
|---|---|---|---|
| M0 Process | Agent workflow, state, decisions, briefs in the repo | Claude (coordinator) | — |
| M1 Core | `project` (PCA → UMAP, HDBSCAN, kNN), `evaluate`, `export` on synthetic data, per the data contract | Claude → Codex | M0 |
| M2 Ingest | Jamendo metadata: parse tags by category, validate, deduplicate, seeded stratified sample | Codex (Claude brief) → Claude | M0 |
| M3 Frontend base | Loader with contract validation, `state`, `derive` (filter mask, search, colour) on a fixture | Codex (Claude brief) → Claude | M0 |
| M4 Render spike | deck.gl vs Canvas 2D, frame rate at 10k points, ADR | Codex → Claude | M3 |
| M5 Features | Feature extraction from the JSON archives, selection, standardisation, `feature_set_id` | Claude → Codex | M2, feature download |
| M6 Pilot | About 10k real tracks through the whole pipeline, shown in the browser | Claude → Codex | M1–M5 |
| M7 Evaluation | PCA/MDS/t-SNE/UMAP comparison, parameters, results for the report | Claude → Codex | M6 |
| M8 UI | Search, filters, details, cluster labels, neighbours, visual design | Codex (Claude brief) → Claude | M6 |
| M9 Delivery | Report, local demo, presentation | User + Claude | M7, M8 |

Each stage ends with the Definition of done from `docs/code-style.md`, a review stating its independence, and an update of `docs/state.md`. M2 and M3 may run in parallel with M1 (disjoint scopes: `pipeline/.../ingest.py` vs `frontend/`).
