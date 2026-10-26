# First dataset: MTG-Jamendo

- Status: working
- Owner: User
- Date: 2026-10-27

## Context

Course asks for a large dataset; several datasets are allowed behind a unified format.

## Decision

Start with MTG-Jamendo (metadata TSV + Essentia/AcousticBrainz JSON features). Keep the data contract dataset-independent so FMA or others can be added.

## Alternatives and rationale

FMA has 518 librosa features and a smaller download, but no BPM or tag taxonomy comparable to Jamendo. Mel-spectrograms rejected (size, need a neural model).

## Participants and acceptance evidence

User instruction on 2026-10-27: work on this dataset. Feature structure verified by Claude in `docs/datasets.md`.

## Consequences

Licences: metadata CC BY-NC-SA 4.0, audio per file; data never committed. Feature selection is a separate pending decision.
