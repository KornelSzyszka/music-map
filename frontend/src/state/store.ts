import type { Atlas } from '../data/loader'
import type { Track } from '../data/types'
import { trackColours, trackTags, visibilityMask } from '../derive/tracks'
import type { ColourMode, Filters } from '../derive/tracks'

export interface View {
  readonly x: number
  readonly y: number
  /** CSS pixels per map unit. */
  readonly scale: number
}

export interface AtlasState {
  readonly atlas: Atlas | null
  readonly status: 'idle' | 'loading' | 'ready' | 'error'
  readonly error: string | null
  readonly view: View
  readonly selection: string | null
  readonly filters: Filters
  readonly colourMode: ColourMode
  readonly derived: {
    readonly mask: Uint8Array
    readonly colours: readonly string[]
    readonly tags: readonly string[]
    readonly visibleCount: number
    readonly selectedTrack: Track | null
  }
}

export function createAtlasStore() {
  let state: AtlasState = {
    atlas: null,
    status: 'idle',
    error: null,
    view: { x: 0, y: 0, scale: 1 },
    selection: null,
    filters: { text: '', tags: [] },
    colourMode: 'cluster',
    derived: { mask: new Uint8Array(), colours: [], tags: [], visibleCount: 0, selectedTrack: null },
  }
  const listeners = new Set<() => void>()
  function publish(next: AtlasState): void {
    state = next
    listeners.forEach((listener) => listener())
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    startLoading() {
      publish({ ...state, atlas: null, status: 'loading', error: null, selection: null,
        derived: { mask: new Uint8Array(), colours: [], tags: [], visibleCount: 0, selectedTrack: null } })
    },
    failLoading(error: string) {
      publish({ ...state, status: 'error', error })
    },
    setAtlas(atlas: Atlas) {
      const mask = visibilityMask(atlas.tracks, state.filters)
      publish({ ...state, atlas, status: 'ready', error: null, selection: null,
        derived: {
          mask,
          colours: trackColours(atlas.tracks, state.colourMode),
          tags: [...new Set(atlas.tracks.flatMap(trackTags))].sort(),
          visibleCount: mask.reduce((sum, visible) => sum + visible, 0),
          selectedTrack: null,
        } })
    },
    setFilters(filters: Filters) {
      const mask = visibilityMask(state.atlas?.tracks ?? [], filters)
      publish({ ...state, filters: { text: filters.text, tags: [...filters.tags] },
        derived: { ...state.derived, mask, visibleCount: mask.reduce((sum, visible) => sum + visible, 0) } })
    },
    setColourMode(colourMode: ColourMode) {
      publish({ ...state, colourMode,
        derived: { ...state.derived, colours: trackColours(state.atlas?.tracks ?? [], colourMode) } })
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
