# No vector database in the MVP

- Status: proposed
- Owner: Claude
- Date: 2026-10-27

## Context

Nearest neighbours of a track are needed in the UI.

## Decision

Compute kNN offline in the standardised feature space and export it. Do not add a vector database now.

## Alternatives and rationale

Exact kNN over ~25k vectors takes seconds offline, so an approximate-search index or database adds operations without benefit. Revisit above ~1M tracks or for live audio queries.

## Participants and acceptance evidence

Raised by the user's question; Claude's recommendation. Not yet accepted by the user.

## Consequences

If accepted, the static export stays the only data path.
