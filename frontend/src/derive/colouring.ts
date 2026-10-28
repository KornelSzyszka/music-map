import type { Cluster, Track } from '../data/types'

/** A slot names a colour; the theme decides the actual value (see docs/design.md). */
export const GREY = -1
export const BASE = -2
export const SERIES_SLOTS = 7
export const SEQUENTIAL_BASE = 10
/** A faint version of a series colour, for tracks outside every cluster that lie closest to one. */
export const HALO_BASE = 20
export const SEQUENTIAL_STEPS = 9
export const MAX_ARTIST_COLOURS = 3
const DOMAIN_PERCENTILES = [0.005, 0.995] as const

export type ColourMode = 'none' | 'cluster' | 'feature' | 'artist'

export type Legend =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'categories'
      readonly entries: ReadonlyArray<{ readonly slot: number; readonly label: string; readonly count: number }>
    }
  | { readonly kind: 'scale'; readonly feature: string; readonly min: number; readonly max: number }

export interface ColourScheme {
  readonly slots: Int8Array
  readonly legend: Legend
}

export interface ColourInput {
  readonly tracks: readonly Track[]
  readonly clusters: readonly Cluster[]
  readonly mode: ColourMode
  readonly feature: string | null
  readonly artists: readonly string[]
}

export interface Domain {
  readonly min: number
  readonly max: number
}

/** Range of a feature over the whole data set (clipped percentiles), never over the visible subset. */
export function featureDomain(tracks: readonly Track[], feature: string): Domain | null {
  const values = tracks.map((track) => track.features[feature]).filter((value): value is number => value !== undefined)
  if (values.length === 0) return null
  values.sort((a, b) => a - b)
  const at = (fraction: number): number => values[Math.min(values.length - 1, Math.floor(fraction * values.length))]
  const min = at(DOMAIN_PERCENTILES[0])
  const max = at(DOMAIN_PERCENTILES[1])
  return max > min ? { min, max } : null
}

/** The largest clusters, biggest first, ties by id: they keep their colour whatever is filtered. */
export function coloredClusters(clusters: readonly Cluster[]): Cluster[] {
  return [...clusters].sort((a, b) => b.size - a.size || a.id - b.id).slice(0, SERIES_SLOTS)
}

export function colourScheme(input: ColourInput): ColourScheme {
  const { tracks, clusters, mode, feature, artists } = input
  const slots = new Int8Array(tracks.length).fill(BASE)

  if (mode === 'cluster') {
    const chosen = coloredClusters(clusters)
    const slotOf = new Map(chosen.map((cluster, index) => [cluster.id, index]))
    tracks.forEach((track, index) => {
      if (track.cluster_id !== null) {
        slots[index] = slotOf.get(track.cluster_id) ?? GREY
        return
      }
      // Unclustered: a faint tint of the nearest cluster, when that cluster has a colour.
      const home = track.home_cluster_id == null ? undefined : slotOf.get(track.home_cluster_id)
      slots[index] = home === undefined ? GREY : HALO_BASE + home
    })
    return {
      slots,
      legend: { kind: 'categories', entries: chosen.map((cluster, index) => ({ slot: index, label: cluster.label, count: cluster.size })) },
    }
  }

  if (mode === 'feature' && feature) {
    const domain = featureDomain(tracks, feature)
    if (domain) {
      tracks.forEach((track, index) => {
        const value = track.features[feature]
        if (value === undefined) {
          slots[index] = GREY
          return
        }
        const fraction = Math.min(1, Math.max(0, (value - domain.min) / (domain.max - domain.min)))
        slots[index] = SEQUENTIAL_BASE + Math.round(fraction * (SEQUENTIAL_STEPS - 1))
      })
      return { slots, legend: { kind: 'scale', feature, min: domain.min, max: domain.max } }
    }
  }

  if (mode === 'artist') {
    const chosen = artists.slice(0, MAX_ARTIST_COLOURS)
    if (chosen.length > 0) {
      const slotOf = new Map(chosen.map((id, index) => [id, index]))
      const names = new Map<string, string>()
      const counts = new Map<string, number>()
      tracks.forEach((track, index) => {
        const id = track.artist_id ?? null
        const slot = id === null ? undefined : slotOf.get(id)
        slots[index] = slot ?? GREY
        if (id !== null && slot !== undefined) {
          names.set(id, track.artist)
          counts.set(id, (counts.get(id) ?? 0) + 1)
        }
      })
      return {
        slots,
        legend: {
          kind: 'categories',
          entries: chosen.map((id, index) => ({ slot: index, label: names.get(id) ?? id, count: counts.get(id) ?? 0 })),
        },
      }
    }
  }

  return { slots, legend: { kind: 'none' } }
}
