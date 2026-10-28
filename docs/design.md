# Design rules

Music Atlas is an analysis tool. The interface serves reading and exploring data: minimal, quiet, functional. These rules apply to every screen; change this file in the same change that needs an exception.

## 1. Text

Allowed: control labels, units, axis and legend labels needed to decode a colour or a size, data values, loading and error states.

Not allowed: instructions ("click to select", "scroll to zoom"), explanations of how something is computed, captions that restate a chart, decorative headings, placeholder prose. Put the information in an accessible name (`aria-label`, `title` for a value) when a user needs it, not in visible copy. An empty state is a short label or nothing.

## 2. Colour roles

- Neutral surfaces dominate, panels and lines come second, the accent is rare. The accent marks only the primary action, the active control and the selection. Roughly 60 : 30 : 10 as hierarchy, not as a pixel quota.
- The interface chrome is neutral. Colour on screen means data. The accent never reuses a data hue, and error red is reserved for errors.
- Both a dark and a light theme exist, as CSS variables on `:root`. The default follows the system setting; a theme switch overrides it.
- Text contrast at least 4.5:1, non-text marks and control borders at least 3:1, in both themes.

| Token | Dark | Light |
|---|---|---|
| `--canvas` (page, map background) | `#14171a` | `#f7f6f2` |
| `--surface` (panels) | `#1c1f24` | `#ffffff` |
| `--raised` (controls, hover) | `#262b31` | `#ecebe6` |
| `--line` | `#3a4047` | `#cfcdc6` |
| `--text` | `#e6e7ea` | `#16181b` |
| `--muted` | `#a8adb5` | `#555a61` |
| `--accent` | `--text` | `--text` |

The accent is the text colour itself (focus ring, selection ring, active control border). This keeps the data hues free, and a coloured accent would fail on the light surface (a gold accent measures 1.8:1 there).

Token contrast does not prove that 10 000 points are readable. Check every colour mode in both themes, with a colour-vision-deficiency simulation, before it ships.

## 3. Colouring data

The Map has four colour modes. The default is **None**: every track has the same neutral colour, so the map does not suggest a partition that the data does not have (only 39% of tracks belong to a cluster). Cluster labels are always drawn; they carry the structure without colour.

| Mode | Encoding | Rules |
|---|---|---|
| None (default) | one neutral colour | Selection and neighbours use the outline, not colour. |
| Cluster | categorical | The 7 largest clusters get the first 7 series hues in a fixed order; all other clusters and unclustered tracks are grey. The legend lists the coloured clusters with their size. |
| Feature | sequential, one hue light to dark | One acoustic feature. The domain is fixed for the whole data set (the clipped 0.5 to 99.5 percentile range), the legend shows the unit and the end values, missing values are grey. |
| Artist | emphasis | The chosen artists (at most 3) in the first series hues with an outline, everything else grey. |

- Categorical colours: at most 8 hues, fixed order, never cycled; one entity keeps one colour in every theme and filter state. No hashing of ids into colours.
- Genres (95) are never coloured; they are a filter. A genre grouping needs an explicit dictionary and a rule for tracks with several genres before it can become a mode.
- Sequential scales use one hue, not a rainbow. Signed values use a blue to red pair with a neutral middle.
- Grey means "not in focus": unclustered, missing or not highlighted. It is always the same grey.
- Colour never carries meaning alone: pair it with a label, an outline or a legend. A legend names the values, their counts or ends, and appears only for the active mode.

## 4. Shape, type, motion

- Straight, quiet geometry: 6 px radius for controls, 8 px for panels, 1 px lines. No shadows, glow, blur, gradients or glass effects.
- System sans for labels; tabular numerals for values; monospace only for identifiers. Three sizes: 12, 14, 16 px.
- Motion only where it carries information: panning and zooming the map, the spring settling of the feature graph. Nothing decorative. `prefers-reduced-motion` removes the animation and keeps the final state.

## 5. Layout and controls

- The map is the main area. One side panel at most; settings live in a collapsible panel inside the Map tab, never in a separate page.
- The Map toolbar is one row: search, Settings, visible count. Settings holds colour mode, tags (match all or any), cluster (all, clustered, unclustered, or chosen clusters), artist, a range of one feature, and Clear.
- Combination: AND between different filters, OR inside a list of artists or clusters, tags all-of by default.
- A filter hides points through a visibility mask. Cluster labels, neighbour lines and counts follow the same mask, so nothing is drawn for hidden tracks. Highlight emphasises visible points only. Neither changes positions or data.
- Every pointer action has a keyboard equivalent; focus is always visible (2 px ring in `--accent`); targets are at least 28 px.

## 6. Repository hygiene

This file is self-contained. Do not reference files, paths or projects that exist only on a contributor's machine.
