import { useMemo, type ReactNode } from 'react'
import type { ColourMode } from '../derive/colouring'
import { EMPTY_FILTERS, hasActiveFilters, setRangeBound, type ClusterScope, type Filters, type TagMatch } from '../derive/filters'
import { hasAlternateLayout, layoutLabel, type LayoutChoice } from '../derive/layouts'
import { featureExtent, featureLabel } from '../derive/options'
import type { PickerOption } from '../derive/pickers'
import { fitView } from '../map/geometry'
import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'
import ChipInput from './ChipInput'
import Dropdown from './Dropdown'
import NumberField from './NumberField'

const TAG_MATCHES: readonly PickerOption[] = [
  { value: 'all', label: 'All of' },
  { value: 'any', label: 'Any of' },
]
const CLUSTER_SCOPES: readonly PickerOption[] = [
  { value: 'all', label: 'All' },
  { value: 'clustered', label: 'Clustered' },
  { value: 'unclustered', label: 'Unclustered' },
]

function isColourMode(value: string): value is ColourMode {
  return value === 'none' || value === 'cluster' || value === 'feature' || value === 'artist'
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="filter-row">
      <span className="setting-label">{label}</span>
      <div className="row-controls">{children}</div>
    </div>
  )
}

/** Two aligned sections: how the map is coloured, and the filters that decide which tracks are shown. */
export default function AtlasSettings({ store }: { store: AtlasStore }) {
  const { atlas, filters, colourMode, colourFeature, layout, derived } = useAtlasStore(store)
  const tracks = atlas?.tracks
  const tagOptions = useMemo(() => derived.tags.map((tag) => ({ value: tag, label: tag })), [derived.tags])
  const featureOptions = useMemo(() => derived.features.map((key) => ({ value: key, label: featureLabel(key) })), [derived.features])
  const extent = useMemo(
    () => (tracks && filters.range ? featureExtent(tracks, filters.range.feature) : null),
    [tracks, filters.range],
  )
  const set = (patch: Partial<Filters>): void => store.setFilters({ ...filters, ...patch })
  const hasFeatures = derived.features.length > 0
  const hasArtists = derived.artists.length > 0
  const { range } = filters
  const colourModes: PickerOption[] = [
    { value: 'none', label: 'None' },
    { value: 'cluster', label: 'Cluster' },
    { value: 'feature', label: 'Feature', disabled: !hasFeatures },
    { value: 'artist', label: 'Artist', disabled: !hasArtists },
  ]

  const summary = atlas?.manifest.summary
  const layoutOptions: PickerOption[] = [
    { value: 'primary', label: layoutLabel(summary?.layout ?? 'umap') },
    { value: 'alternate', label: layoutLabel(summary?.alternate_layout ?? 'hierarchical') },
  ]

  function chooseLayout(value: string): void {
    if (value !== 'primary' && value !== 'alternate') return
    store.setLayout(value satisfies LayoutChoice)
    const next = store.getSnapshot().atlas
    if (next) store.setView(fitView(next.tracks))
  }

  function chooseRangeFeature(feature: string): void {
    const bounds = tracks && feature ? featureExtent(tracks, feature) : null
    set({ range: feature && bounds ? { feature, min: bounds.min, max: bounds.max } : null })
  }

  function changeBound(side: 'min' | 'max', raw: string): void {
    if (range && extent) set({ range: setRangeBound(range, side, raw, extent) })
  }

  return (
    <section id="atlas-settings" className="settings glass" aria-label="Settings">
      <div className="settings-section">
        <div className="section-head"><span className="setting-label">View</span></div>
        <FilterRow label="Colour">
          <Dropdown label="Colour by" value={colourMode} options={colourModes}
            onChange={(value) => { if (isColourMode(value)) store.setColourMode(value) }} />
          {colourMode === 'feature' && hasFeatures ? (
            <Dropdown label="Colour feature" value={colourFeature ?? ''} options={featureOptions}
              onChange={(value) => store.setColourFeature(value || null)} />
          ) : null}
        </FilterRow>
        {atlas && hasAlternateLayout(atlas) ? (
          <FilterRow label="Layout">
            <Dropdown label="Layout" value={layout} options={layoutOptions} onChange={chooseLayout} />
          </FilterRow>
        ) : null}
      </div>

      <div className="settings-section">
        <div className="section-head">
          <span className="setting-label">Filters</span>
          <button type="button" className="button" disabled={!hasActiveFilters(filters)} onClick={() => store.setFilters(EMPTY_FILTERS)}>
            Clear
          </button>
        </div>
        <FilterRow label="Tags">
          <Dropdown label="Tag match" value={filters.tagMatch} options={TAG_MATCHES}
            onChange={(value) => set({ tagMatch: value === 'any' ? 'any' : ('all' satisfies TagMatch) })} />
          <ChipInput label="Add tag" options={tagOptions} selected={filters.tags} onChange={(tags) => set({ tags })} />
        </FilterRow>
        <FilterRow label="Cluster">
          <Dropdown label="Cluster scope" value={filters.scope} options={CLUSTER_SCOPES}
            onChange={(value) => set({ scope: value === 'clustered' || value === 'unclustered' ? value : ('all' satisfies ClusterScope) })} />
          <ChipInput label="Add cluster" options={derived.clusters} selected={filters.clusterIds.map(String)}
            onChange={(ids) => set({ clusterIds: ids.map(Number) })} />
        </FilterRow>
        {hasArtists ? (
          <FilterRow label="Artist">
            <ChipInput label="Add artist" options={derived.artists} selected={filters.artists} onChange={(artists) => set({ artists })} />
            <label className="check">
              <input type="checkbox" checked={filters.hideOtherArtists} onChange={(event) => set({ hideOtherArtists: event.target.checked })} />
              Hide others
            </label>
          </FilterRow>
        ) : null}
        {hasFeatures ? (
          <FilterRow label="Range">
            <Dropdown label="Range feature" value={range?.feature ?? ''} onChange={chooseRangeFeature}
              options={[{ value: '', label: 'None' }, ...featureOptions]} />
            {range && extent ? (
              <>
                <NumberField label="Minimum" value={range.min} onCommit={(raw) => changeBound('min', raw)} />
                <span className="sep" aria-hidden="true">–</span>
                <NumberField label="Maximum" value={range.max} onCommit={(raw) => changeBound('max', raw)} />
              </>
            ) : null}
          </FilterRow>
        ) : null}
      </div>
    </section>
  )
}
