# Technology stack

- Status: accepted
- Owner: User
- Date: 2026-10-27

## Context

Interactive map of ~10k-25k tracks, student project, no server to operate.

## Decision

Pipeline: Python 3.12 + uv, pandas, NumPy, PyArrow, scikit-learn (PCA, MDS, t-SNE, HDBSCAN, kNN, trustworthiness), umap-learn. Frontend: React, TypeScript, Vite, deck.gl (Orthographic view), Vitest. No backend; static export. Details in `docs/architecture.md`.

## Alternatives and rationale

Server-side or in-browser projection rejected (harder to reproduce). Python pinned to 3.12 until numba support for newer versions is verified. Render library final choice depends on the M4 spike (deck.gl vs Canvas 2D + d3-zoom).

## Participants and acceptance evidence

User confirmed stack on 2026-10-14 (D-06, D-07 in the private notes). Claude proposed and verified installation; Codex created the skeleton.

## Consequences

Pins live in `pipeline/pyproject.toml` and `frontend/package.json`.
