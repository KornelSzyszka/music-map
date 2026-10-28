import { fitView } from '../map/geometry'
import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'

export default function AtlasControls({ store }: { store: AtlasStore }) {
  const { atlas, filters, colourMode, derived, view } = useAtlasStore(store)
  const selected = derived.selectedTrack
  return (
    <section aria-label="Atlas controls">
      <label>
        Search title or artist{' '}
        <input type="search" value={filters.text}
          onChange={(event) => store.setFilters({ ...filters, text: event.target.value })} />
      </label>{' '}
      <label>
        Tags (all selected tags must match){' '}
        <select multiple value={[...filters.tags]}
          onChange={(event) => store.setFilters({ ...filters,
            tags: Array.from(event.target.selectedOptions, (option) => option.value) })}>
          {derived.tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
      </label>{' '}
      <label>
        Colour by{' '}
        <select value={colourMode} onChange={(event) => {
          const value = event.target.value
          if (value === 'cluster' || value === 'tag') store.setColourMode(value)
        }}>
          <option value="cluster">Cluster</option>
          <option value="tag">Tag (alphabetically first)</option>
        </select>
      </label>{' '}
      <button onClick={() => store.setFilters({ text: '', tags: [] })}>Clear filters</button>{' '}
      <button onClick={() => store.setView({ ...view, scale: Math.min(10000, view.scale * 1.2) })}>Zoom in</button>{' '}
      <button onClick={() => store.setView({ ...view, scale: Math.max(0.01, view.scale / 1.2) })}>Zoom out</button>{' '}
      <button onClick={() => store.setView(fitView(atlas?.tracks ?? []))}>Fit all points</button>
      <p role="status">{derived.visibleCount} of {atlas?.tracks.length ?? 0} tracks visible.</p>
      <p className="muted">Grey points belong to no cluster. Scroll to zoom, drag to pan, click a point to select it; arrow keys and +/- also work on the map.</p>
      <p aria-live="polite">{selected ? `Selected: ${selected.title} — ${selected.artist}` : 'No track selected.'}</p>
    </section>
  )
}
