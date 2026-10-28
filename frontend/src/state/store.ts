import type { Atlas } from '../data/loader'
import type { Track } from '../data/types'
import { colourScheme, type ColourMode, type Legend } from '../derive/colouring'
import { EMPTY_FILTERS, visibilityMask, visibleClusters, type Filters } from '../derive/filters'
import { hasAlternateLayout, withLayout, type LayoutChoice } from '../derive/layouts'
import { artistOptions, clusterOptions, featureKeys, tagOptions, type Option } from '../derive/options'

export interface View {
  readonly x: number
  readonly y: number
  /** CSS pixels per map unit. */
  readonly scale: number
}

export interface Derived {
  readonly mask: Uint8Array
  readonly slots: Int8Array
  readonly legend: Legend
  readonly visibleCount: number
  readonly visibleClusters: ReadonlySet<number>
  readonly selectedTrack: Track | null
  readonly tags: readonly string[]
  readonly artists: readonly Option[]
  readonly clusters: readonly Option[]
  readonly features: readonly string[]
}

export interface AtlasState {
  readonly atlas: Atlas | null
  readonly status: 'idle' | 'loading' | 'ready' | 'error'
  readonly error: string | null
  readonly view: View
  readonly selection: string | null
  readonly filters: Filters
  readonly colourMode: ColourMode
  /** Feature used by the Feature colour mode; null until one is chosen. */
  readonly colourFeature: string | null
  readonly settingsOpen: boolean
  /** The layout shown; the alternate one exists only when the export carries it. */
  readonly layout: LayoutChoice
  readonly derived: Derived
}

const EMPTY_DERIVED: Derived = {
  mask: new Uint8Array(),
  slots: new Int8Array(),
  legend: { kind: 'none' },
  visibleCount: 0,
  visibleClusters: new Set(),
  selectedTrack: null,
  tags: [],
  artists: [],
  clusters: [],
  features: [],
}

function count(mask: Uint8Array): number {
  return mask.reduce((sum, visible) => sum + visible, 0)
}

function copyFilters(filters: Filters): Filters {
  return {
    ...filters,
    tags: [...filters.tags],
    clusterIds: [...filters.clusterIds],
    artists: [...filters.artists],
    range: filters.range ? { ...filters.range } : null,
  }
}

export function createAtlasStore() {
  let state: AtlasState = {
    atlas: null,
    status: 'idle',
    error: null,
    view: { x: 0, y: 0, scale: 1 },
    selection: null,
    filters: EMPTY_FILTERS,
    colourMode: 'none',
    colourFeature: null,
    settingsOpen: true,
    layout: 'primary',
    derived: EMPTY_DERIVED,
  }
  const listeners = new Set<() => void>()

  function publish(next: AtlasState): void {
    state = next
    listeners.forEach((listener) => listener())
  }

  function publishLayout(choice: LayoutChoice): void {
    if (!state.atlas || choice === state.layout) return
    if (choice === 'alternate' && !hasAlternateLayout(state.atlas)) return
    // Both layouts are the same swap of the position pairs, so the current atlas is the source either way.
    const atlas = withLayout(state.atlas, 'alternate')
    const selectedTrack = atlas.tracks.find((track) => track.id === state.selection) ?? null
    publish({ ...state, atlas, layout: choice, derived: { ...state.derived, selectedTrack } })
  }

  function scheme(atlas: Atlas | null, mode: ColourMode, feature: string | null, filters: Filters) {
    if (!atlas) return { slots: EMPTY_DERIVED.slots, legend: EMPTY_DERIVED.legend }
    return colourScheme({ tracks: atlas.tracks, clusters: atlas.clusters, mode, feature, artists: filters.artists })
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    startLoading() {
      publish({ ...state, atlas: null, status: 'loading', error: null, selection: null, derived: EMPTY_DERIVED })
    },
    failLoading(error: string) {
      publish({ ...state, status: 'error', error })
    },
    setAtlas(atlas: Atlas) {
      const mask = visibilityMask(atlas.tracks, state.filters)
      const features = featureKeys(atlas.tracks)
      const colourFeature = state.colourFeature && features.includes(state.colourFeature) ? state.colourFeature : (features[0] ?? null)
      const { slots, legend } = scheme(atlas, state.colourMode, colourFeature, state.filters)
      publish({
        ...state,
        atlas,
        layout: 'primary',
        status: 'ready',
        error: null,
        selection: null,
        colourFeature,
        derived: {
          mask,
          slots,
          legend,
          visibleCount: count(mask),
          visibleClusters: visibleClusters(atlas.tracks, mask),
          selectedTrack: null,
          tags: tagOptions(atlas.tracks),
          artists: artistOptions(atlas.tracks),
          clusters: clusterOptions(atlas.clusters),
          features,
        },
      })
    },
    setFilters(input: Filters) {
      const filters = copyFilters(input)
      const tracks = state.atlas?.tracks ?? []
      const mask = visibilityMask(tracks, filters)
      // Artist colouring follows the chosen artists; other modes keep their slots.
      const coloured =
        state.colourMode === 'artist'
          ? scheme(state.atlas, state.colourMode, state.colourFeature, filters)
          : { slots: state.derived.slots, legend: state.derived.legend }
      publish({
        ...state,
        filters,
        derived: { ...state.derived, ...coloured, mask, visibleCount: count(mask), visibleClusters: visibleClusters(tracks, mask) },
      })
    },
    setColourMode(colourMode: ColourMode) {
      publish({
        ...state,
        colourMode,
        derived: { ...state.derived, ...scheme(state.atlas, colourMode, state.colourFeature, state.filters) },
      })
    },
    setColourFeature(colourFeature: string | null) {
      const coloured =
        state.colourMode === 'feature'
          ? scheme(state.atlas, state.colourMode, colourFeature, state.filters)
          : { slots: state.derived.slots, legend: state.derived.legend }
      publish({ ...state, colourFeature, derived: { ...state.derived, ...coloured } })
    },
    setLayout: publishLayout,
    setSettingsOpen(settingsOpen: boolean) {
      publish({ ...state, settingsOpen })
    },
    setSelection(selection: string | null) {
      const selectedTrack = state.atlas?.tracks.find((track) => track.id === selection) ?? null
      if (selection !== null && selectedTrack === null) {
        throw new Error(`Cannot select unknown track "${selection}"`)
      }
      publish({ ...state, selection, derived: { ...state.derived, selectedTrack } })
    },
    setView(view: View) {
      if (![view.x, view.y, view.scale].every(Number.isFinite) || view.scale <= 0) {
        throw new Error('View requires finite coordinates and a positive finite scale')
      }
      publish({ ...state, view: { ...view } })
    },
  }
}

export type AtlasStore = ReturnType<typeof createAtlasStore>
