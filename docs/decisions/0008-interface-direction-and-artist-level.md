# Interface direction, colouring, filters and the artist level

- Status: accepted (the user asked for the first step to be implemented, 2026-10-28)
- Owner: User (accepts); Claude (technical proposal)
- Date: 2026-10-28

## Context

The Map tab shows tracks. The user asked how to see the data by artist, how to colour the map, to move filters into a settings area inside the Map tab, to choose a visual design, and to keep the interface minimal with no decorative text.

Measured on the data: 3 565 artists, median 7 tracks per artist, 2 188 artists with at least 5 tracks covering 94.9% of tracks. In the 10 000-track pilot an artist's tracks are cohesive but not tight (mean feature distance 10.63 inside an artist against 13.29 to random tracks); 5.1% of the 10 nearest neighbours share the artist.

## Decision

1. **Design.** Neutral surfaces, 1 px lines, 6 px radius, system sans, accent only for action and selection, dark and light themes, no glow, blur, shadows, glass or decorative motion. Details and tokens in `docs/design.md`.
2. **Artist level, first step.** Keep the track map and add an artist control: search an artist, then highlight or filter their tracks, with the count of their tracks and their spread on the map. This needs `artist_id` on every exported track (a contract change, to be bumped in the schema). A separate artist-level projection (mean of standardised feature vectors, artists with at least 5 tracks in the analysed population, point area by track count) comes later and is shown as its own view, not as a toggle of the same map. A centroid of 2-D positions is not used as a similarity representation, because a multi-style artist's centroid can fall between unrelated groups.
3. **Colouring.** Modes None (default), Cluster (7 largest clusters coloured, the rest grey), Feature (one-hue sequential, fixed domain) and Artist (emphasis). No genre colouring. The current hashing of cluster ids and the "alphabetically first tag" mode are removed.
4. **Filters.** A Settings panel inside the Map tab: tags (all or any), cluster, artist, a range of one feature, Clear. AND between filters, OR inside a list. A filter hides points together with their labels and neighbour lines; highlight acts on visible points only.
5. **Text.** Visible instructions, status prose and explanations are removed; accessible names carry what assistive technology needs.
6. **Ownership.** Claude: contracts (artist fields in the export), filter semantics, integration and the briefs. Codex: small bounded tasks (theme CSS, legend, controls, text cleanup) from Claude briefs, and independent review of Claude's changes. Each side's work is checked by the other; an author's own review is not independent review.

## Alternatives and rationale

- A mobile-style visual language with glass, organic blobs and glow was rejected: it works against reading 10 000 points and against the minimal brief.
- Centroid of map positions as the artist point: cheap, but misleading for multi-style artists.
- A gold accent: fails on the light surface and competes with the data hues.
- Default colouring by cluster: it implies that every track belongs to a cluster; only 39% do.

## Participants and acceptance evidence

- Claude: proposal, measurements, design rules.
- Codex (independent, read-only opinion on 2026-10-28, based on the repository and the measurements above): agreed with the design direction and the artist-first-step; recommended default colouring None, genre families only with an explicit dictionary, and that labels and neighbour lines respect the filter mask. Recommended a Viridis scale for the Feature mode; **Claude does not adopt it** and keeps a one-hue scale, to stay inside the neutral-chrome rule and the validated single-hue ramp. Unresolved; the user may decide.
- User: asked for highlight and filter by artist and for the first step to be implemented. The Feature colour mode keeps the one-hue scale (no Viridis); the user did not object.

## Consequences

- Export change: `artist_id` (and later artist aggregates) in the data contract, mirrored in `frontend/src/data/types.ts`.
- Existing UI text and the tag colour mode change; behaviour covered by tests must be updated with them.
- A visual check in both themes and with colour-vision simulation is part of acceptance.
