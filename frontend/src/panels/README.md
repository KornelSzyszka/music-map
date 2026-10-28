# Panels

`AtlasView.tsx` loads a static atlas, owns one store instance, and connects the
minimal controls to the Canvas 2D map. Mount it from the application entry point:

```tsx
import AtlasView from './panels/AtlasView'

// Default: the bundled synthetic atlas at ./fixtures.
<AtlasView />

// Alternative: a directory containing the pipeline export's four files.
<AtlasView baseUrl="/atlas" />
```

The frontend-base brief excludes `src/App.tsx`; its existing placeholder is left
for the coordinator to replace when integrating this component.

Search combines case-insensitive terms over title and artist. Selected tags use
AND across genres, instruments and moods, combined with the search mask. Colour
mode uses the cluster or the alphabetically first normalised tag; grey means no
cluster/tag. Palette collisions are possible. Filtering retains the selected
track's details even when its point is hidden.

Loading cancels on unmount or base URL changes. Loading and validation failures
are shown in an alert. These controls establish behaviour only; visual design
and the final renderer remain outside this task.
