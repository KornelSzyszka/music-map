# Glass data-analyst style and the permanent selection panel

- Status: accepted (the user decided this on 2026-10-29)
- Owner: User
- Date: 2026-10-29

## Context

ADR 0008 chose a flat neutral style and rejected glass effects. After seeing the interface the user asked for a "glass data-analyst" look, leaning towards a dense monospaced tool style, with a permanent panel for the selected track on the right and the filters and settings in a bar above or below.

## Decision

- Glass panels frame the data: translucent fill, 1 px rim, a faint inner highlight along the top edge, a background blur of about 14 px over a very soft page gradient. The map and the feature graph sit on a solid surface and are never covered by glass. No glow and no outer shadows.
- Monospace for section labels (small uppercase), values, counts and identifiers; system sans for text.
- The Map tab has three zones: the map on the left; a permanent selected-track panel on the right that keeps its shape (labels with em dashes) when nothing is selected; the legend and an always-visible control bar under the map. The search field and the visible count sit above the map. The Features tab follows the same shape.
- Details are in `docs/design.md`, which this decision supersedes where it differs from ADR 0008 (glass, panel radius, layout of the side panel).

## Alternatives and rationale

- Keep the flat style: rejected by the user's choice.
- Put the control bar above the map: possible; under the map keeps the search and count next to it and the selection panel level with the toolbar.
- A glass legend or controls floating over the map: rejected so that nothing hides points.

## Participants and acceptance evidence

User decision; Claude implemented it and checked it in headless Edge in light and dark. An earlier independent review by Codex (2026-10-28) advised against glass over data, which is why glass stays on the chrome only.

## Consequences

Contrast is measured against the effective background of a panel. A solid fallback is used where `backdrop-filter` is not supported. The page is slightly taller because the control bar is always visible; it can be collapsed with Settings.
