import { useMemo } from 'react'
import type { ColourMode } from '../derive/colouring'
import { EMPTY_FILTERS, hasActiveFilters, setRangeBound, type ClusterScope, type Filters, type TagMatch } from '../derive/filters'
import { featureExtent, featureLabel } from '../derive/options'
import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'
import ChipInput from './ChipInput'
import NumberField from './NumberField'

const COLOUR_MODES: ReadonlyArray<{ value: ColourMode; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'feature', label: 'Feature' },
  { value: 'artist', label: 'Artist' },
]

function isColourMode(value: string): value is ColourMode {
  return COLOUR_MODES.some((mode) => mode.value === value)
}

export default function AtlasSettings({ store }: { store: AtlasStore }) {
  const { atlas, filters, colourMode, colourFeature, derived } = useAtlasStore(store)
  const tracks = atlas?.tracks
  const tagOptions = useMemo(() => derived.tags.map((tag) => ({ value: tag, label: tag })), [derived.tags])
  const extent = useMemo(
    () => (tracks && filters.range ? featureExtent(tracks, filters.range.feature) : null),
    [tracks, filters.range],
  )
  const set = (patch: Partial<Filters>): void => store.setFilters({ ...filters, ...patch })
  const hasFeatures = derived.features.length > 0
  const hasArtists = derived.artists.length > 0
  const { range } = filters

  function chooseRangeFeature(feature: string): void {
    const bounds = tracks && feature ? featureExtent(tracks, feature) : null
    set({ range: feature && bounds ? { feature, min: bounds.min, max: bounds.max } : null })
  }

  function changeBound(side: 'min' | 'max', raw: string): void {
    if (range && extent) set({ range: setRangeBound(range, side, raw, extent) })
  }

  return (
    <section id="atlas-settings" className="settings glass" aria-label="Settings">
      <div className="setting">
        <span className="setting-label">Colour</span>
        <select aria-label="Colour by" value={colourMode}
          onChange={(event) => { if (isColourMode(event.target.value)) store.setColourMode(event.target.value) }}>
          {COLOUR_MODES.map(({ value, label }) => (
            <option key={value} value={value}
              disabled={(value === 'feature' && !hasFeatures) || (value === 'artist' && !hasArtists)}>
              {label}
            </option>
          ))}
        </select>
        {colourMode === 'feature' && hasFeatures ? (
          <select aria-label="Colour feature" value={colourFeature ?? ''}
            onChange={(event) => store.setColourFeature(event.target.value || null)}>
            {derived.features.map((feature) => <option key={feature} value={feature}>{featureLabel(feature)}</option>)}
          </select>
        ) : null}
      </div>

      <div className="setting">
        <span className="setting-label">Tags</span>
        <select aria-label="Tag match" value={filters.tagMatch}
          onChange={(event) => set({ tagMatch: event.target.value === 'any' ? 'any' : ('all' satisfies TagMatch) })}>
          <option value="all">All of</option>
          <option value="any">Any of</option>
        </select>
        <ChipInput label="Add tag" options={tagOptions} selected={filters.tags} onChange={(tags) => set({ tags })} />
      </div>

      <div className="setting">
        <span className="setting-label">Cluster</span>
        <select aria-label="Cluster scope" value={filters.scope}
          onChange={(event) => {
            const value = event.target.value
            set({ scope: value === 'clustered' || value === 'unclustered' ? value : ('all' satisfies ClusterScope) })
          }}>
          <option value="all">All</option>
          <option value="clustered">Clustered</option>
          <option value="unclustered">Unclustered</option>
        </select>
        <ChipInput label="Add cluster" options={derived.clusters} selected={filters.clusterIds.map(String)}
          onChange={(ids) => set({ clusterIds: ids.map(Number) })} />
      </div>

      {hasArtists ? (
        <div className="setting">
          <span className="setting-label">Artist</span>
          <ChipInput label="Add artist" options={derived.artists} selected={filters.artists}
            onChange={(artists) => set({ artists })} />
          <label className="check">
            <input type="checkbox" checked={filters.hideOtherArtists}
              onChange={(event) => set({ hideOtherArtists: event.target.checked })} />
            Hide others
          </label>
        </div>
      ) : null}

      {hasFeatures ? (
        <div className="setting">
          <span className="setting-label">Range</span>
          <select aria-label="Range feature" value={range?.feature ?? ''} onChange={(event) => chooseRangeFeature(event.target.value)}>
            <option value="">None</option>
            {derived.features.map((feature) => <option key={feature} value={feature}>{featureLabel(feature)}</option>)}
          </select>
          {range && extent ? (
            <div className="range">
              <NumberField label="Minimum" value={range.min} onCommit={(raw) => changeBound('min', raw)} />
              <NumberField label="Maximum" value={range.max} onCommit={(raw) => changeBound('max', raw)} />
            </div>
          ) : null}
        </div>
      ) : null}

      <button type="button" className="button" disabled={!hasActiveFilters(filters)}
        onClick={() => store.setFilters(EMPTY_FILTERS)}>
        Clear
      </button>
    </section>
  )
}
