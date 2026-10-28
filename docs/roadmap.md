# Roadmap

Status: proposed until the user accepts it. Dates are not committed; the presentation is likely 2027-02-02 (unconfirmed).

| Stage | Result | Owner → reviewer | Depends on |
|---|---|---|---|
| Process | Agent workflow, state, decisions, briefs in the repo | Claude (coordinator) | — |
| Projection core | `project` (PCA → UMAP, HDBSCAN, kNN), `evaluate`, `export` on synthetic data, per the data contract | Claude → Codex | Process |
| Jamendo ingest | Jamendo metadata: parse tags by category, validate, deduplicate, seeded stratified sample | Codex (Claude brief) → Claude | Process |
| Frontend base | Loader with contract validation, `state`, `derive` (filter mask, search, colour) on a fixture | Codex (Claude brief) → Claude | Process |
| Render spike | deck.gl vs Canvas 2D, frame rate at 10k points, ADR | Codex → Claude | Frontend base |
| Feature extraction | Feature extraction from the JSON archives, selection, standardisation, `feature_set_id` | Claude → Codex | Jamendo ingest, feature download |
| Pilot | About 10k real tracks through the whole pipeline, shown in the browser | Claude → Codex | Projection core, Jamendo ingest, Frontend base, Render spike, Feature extraction |
| Evaluation | PCA/MDS/t-SNE/UMAP comparison, parameters, results for the report | Claude → Codex | Pilot |
| UI | Search, filters, details, cluster labels, neighbours, visual design | Codex (Claude brief) → Claude | Pilot |
| Delivery | Report, local demo, presentation | User + Claude | Evaluation, UI |

Each stage ends with the Definition of done from `docs/code-style.md`, a review stating its independence, and an update of `docs/state.md`. Jamendo ingest and Frontend base may run in parallel with Projection core (disjoint scopes: `pipeline/.../ingest.py` vs `frontend/`).
