# Design rules

Music Atlas is an analysis tool. The style is a quiet, precise "glass data analyst" look: dark graphite or soft paper, translucent glass panels around the data, thin lines, monospaced numbers. The interface serves reading and exploring data. These rules apply to every screen; change this file in the same change that needs an exception.

## 1. Text

Allowed: control labels, units, axis and legend labels needed to decode a colour or a size, data values, loading and error states.

Not allowed: instructions ("click to select", "scroll to zoom"), explanations of how something is computed, captions that restate a chart, decorative headings, placeholder prose. Put the information in an accessible name (`aria-label`, `title` for a value) when a user needs it, not in visible copy. An empty field shows an em dash, not a sentence.

## 2. Colour roles

- Neutral surfaces dominate, glass panels and lines come second, the accent is rare. The accent marks only the active control, the focus ring and the selection. Roughly 60 : 30 : 10 as hierarchy, not as a pixel quota.
- The interface chrome is neutral. Colour on screen means data. The accent never reuses a data hue, and error red is reserved for errors.
- Both a dark and a light theme exist, as CSS variables on `:root`. The default follows the system setting; a theme switch overrides it.
- Text contrast at least 4.5:1 and non-text marks and control borders at least 3:1, measured against the effective background of a glass panel (the page behind it), in both themes.

| Token | Dark | Light |
|---|---|---|
| `--canvas` (page) | `#0e1114` | `#eceae4` |
| `--surface` (data frames: map, graph) | `#151a1f` | `#fbfaf7` |
| `--glass` (panel fill) | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.62)` |
| `--glass-strong` (controls, hover) | `rgba(255,255,255,0.09)` | `rgba(255,255,255,0.9)` |
| `--rim` (1 px panel edge) | `rgba(255,255,255,0.12)` | `rgba(20,24,28,0.12)` |
| `--line` | `#2f353c` | `#cfcdc6` |
| `--text` | `#e6e7ea` | `#16181b` |
| `--muted` | `#a3a9b1` | `#50555c` |
| `--accent` | `--text` | `--text` |

The accent is the text colour itself (focus ring, selection ring, active control border). This keeps the data hues free, and a coloured accent would fail on the light surface.

Token contrast does not prove that 10 000 points are readable. Check every colour mode in both themes, with a colour-vision-deficiency simulation, before it ships.

## 3. Colouring data

The Map has four colour modes. The default is **None**: every track has the same neutral colour, so the map does not suggest a partition that the data does not have (only 39% of tracks belong to a cluster). Cluster labels are always drawn; they carry the structure without colour.

| Mode | Encoding | Rules |
|---|---|---|
| None (default) | one neutral colour | Selection and neighbours use the outline, not colour. |
| Cluster | categorical | The 7 largest clusters get the first 7 series hues in a fixed order; all other clusters and unclustered tracks are grey. Tracks without a cluster take a faint tint of the colour of their nearest coloured cluster. The legend lists the coloured clusters with their size. |
| Feature | sequential, one hue light to dark | One acoustic feature. The domain is fixed for the whole data set (the clipped 0.5 to 99.5 percentile range), the legend shows the end values, missing values are grey. |
| Artist | emphasis | The chosen artists (at most 3) in the first series hues with an outline, everything else grey. |

- Categorical colours: at most 8 hues, fixed order, never cycled; one entity keeps one colour in every theme and filter state. No hashing of ids into colours.
- Genres (95) are never coloured; they are a filter. A genre grouping needs an explicit dictionary and a rule for tracks with several genres before it can become a mode.
- Sequential scales use one hue, not a rainbow. Signed values use a blue to red pair with a neutral middle.
- Grey means "not in focus": unclustered, missing or not highlighted. It is always the same grey.
- Colour never carries meaning alone: pair it with a label, an outline or a legend. A legend names the values, their counts or ends, and appears only for the active mode.

## 4. Glass, type, motion

- **Glass is chrome, never data.** Panels that frame the data (the selected-track panel, the control bar, legends, the feature detail) are glass: a translucent `--glass` fill, a 1 px `--rim`, a faint inner highlight along the top edge and a background blur of about 14 px over the ambient background below. The map and graph themselves sit on a solid `--surface` and are never covered by glass. No glow; the only outer shadow is the soft one under an open dropdown list.
- Where `backdrop-filter` is not supported the panel falls back to a solid `--surface`.
- Radius 6 px for controls, 10 px for panels, 1 px lines. Controls are `--glass-strong` fields with a `--rim` edge.
- **One face for the chrome.** Every control (buttons, tabs, chips, inputs, dropdown triggers and lists, legends, counts) is monospace at 12 px. The system sans is used only for content: track titles, artist names, neighbour titles and the page text. Section labels are small caps in monospace (10 px, uppercase, wide letter-spacing, `--muted`); values, distances and identifiers use tabular numerals. No control may fall back to the browser's default font.
- **Dropdowns are ours.** Native `select` and `datalist` are not used. A dropdown is a glass trigger with a chevron and a glass list (`role="listbox"`, keyboard: arrows, Home, End, Enter, Escape); a long list is a typeahead input with suggestions (up to 40) and removable chips. A list opens upward when there is no room below, and may carry a soft shadow to separate it from the content behind it.
- **Ambient background.** The page is a solid colour with three very soft tinted shapes that drift slowly behind the glass (50 to 85 s per cycle, transform only). It is the one decorative motion; it never moves under `prefers-reduced-motion`, and the data frames are never transparent.
- Other motion only where it carries information: panning and zooming the map, the spring settling of the feature graph.

## 5. Layout and controls

- **Map tab, three zones.** The map fills the left. On the right a permanent panel shows the selected track and keeps its shape when nothing is selected (labels with em dashes). Under the map, in this order: the legend of the active colour mode and a control bar.
- **Control bar** (always visible, collapsible) has two aligned sections. Colour (left): the colour mode and, for Feature, the feature. Filters (right, with Clear at the top): one row per filter, a small label and a line of controls: Tags (match all or any, then the typeahead), Cluster (all, clustered, unclustered, then the typeahead), Artist (typeahead and hide others), Range (feature and the two bounds). The search field and the visible count sit in a row above the map.
- Combination: AND between different filters, OR inside a list of artists or clusters, tags all-of by default.
- A filter hides points through a visibility mask. Cluster labels, neighbour lines, the neighbour list and counts follow the same mask, so nothing is shown for hidden tracks. Highlight emphasises visible points only. Neither changes positions or data.
- **Features tab** follows the same shape: the graph on the left with its legend below, the feature detail as the permanent glass panel on the right.
- Every pointer action has a keyboard equivalent; focus is always visible (2 px ring in `--accent`); targets are at least 28 px.

## 6. Repository hygiene

This file is self-contained. Do not reference files, paths or projects that exist only on a contributor's machine.
