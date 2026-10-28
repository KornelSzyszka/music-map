# Task brief: M3 frontend base

- Task ID: M3
- Status: proposed
- Goal and user-visible outcome: the frontend loads an atlas, validates it against the contract, and exposes filtered and coloured data through state and pure derive functions, shown as plain points on a canvas.
- Owning role: implementer
- Responsible agent: Codex
- Prepared by: Claude, 2026-10-27 (evidence: this brief; contract in `docs/architecture.md`)
- Context: `frontend/src/data/types.ts`, `docs/code-style.md` (TypeScript), `docs/patterns.md` (filter mask, one-way flow)
- Relevant skill: `agent-technical-change`

## Contract

- `src/data/loader.ts`: fetch manifest, tracks, clusters, neighbors from a base URL; validate shapes at runtime and throw descriptive errors; the only place that converts wire types to UI shapes.
- `src/state/`: one store for view, selection, filters (tags, text), colour mode.
- `src/derive/`: pure functions for visibility mask (never mutates tracks), search over title/artist, colour by cluster or tag, nearest point to a coordinate.
- A synthetic fixture atlas (about 2 000 points) in the contract format lives in `frontend/public/fixtures/` and is generated or checked by a test.
- Rendering in this task is a minimal Canvas 2D view; the final renderer is decided by the M4 spike.

## Write scope

`frontend/src/{data,state,derive,map,panels}`, `frontend/public/fixtures/`, `frontend/package.json` only if a dependency is justified in the report. Not `pipeline/`, not `docs/architecture.md`.

## Acceptance criteria

- Vitest tests for loader validation (valid and invalid atlas), mask, search and colouring behaviour.
- `npm run typecheck && npm run lint && npm run test && npm run build` pass; no `any`.
- Report which checks ran and anything not verified in a browser.

## Out of scope

deck.gl, panels' visual design, real data.

## Open decisions and escalation

Choice of state library (or none) is routine, keep dependencies minimal. Any contract change returns to Claude.

## Completion

To be filled when done.
