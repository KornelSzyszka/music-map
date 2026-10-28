import type { Track } from '../data/types'
import { searchMask, trackTags } from './tracks'

export type TagMatch = 'all' | 'any'
export type ClusterScope = 'all' | 'clustered' | 'unclustered'

export interface FeatureRange {
  readonly feature: string
  readonly min: number
  readonly max: number
}

/**
 * Every filter hides points through a visibility mask. Different filters combine with AND;
 * inside a list (clusters, artists) any entry matches; tags need all or any, as chosen.
 */
export interface Filters {
  readonly text: string
  readonly tags: readonly string[]
  readonly tagMatch: TagMatch
  readonly scope: ClusterScope
  readonly clusterIds: readonly number[]
  readonly artists: readonly string[]
  /** Chosen artists only hide the others when this is set; otherwise they are just highlighted. */
  readonly hideOtherArtists: boolean
  readonly range: FeatureRange | null
}

export const EMPTY_FILTERS: Filters = {
  text: '',
  tags: [],
  tagMatch: 'all',
  scope: 'all',
  clusterIds: [],
  artists: [],
  hideOtherArtists: false,
  range: null,
}

/** True when something other than the defaults is set, so that Clear has an effect. */
export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.text.trim() !== '' ||
    filters.tags.length > 0 ||
    filters.scope !== 'all' ||
    filters.clusterIds.length > 0 ||
    filters.artists.length > 0 ||
    filters.range !== null
  )
}

export function visibilityMask(tracks: readonly Track[], filters: Filters): Uint8Array {
  const mask = searchMask(tracks, filters.text)
  const tags = filters.tags.map((tag) => tag.toLowerCase())
  const clusters = new Set(filters.clusterIds)
  const artists = new Set(filters.artists)
  const hideArtists = filters.hideOtherArtists && artists.size > 0
  const { range } = filters
  tracks.forEach((track, index) => {
    if (!mask[index]) return
    let visible = true
    if (tags.length > 0) {
      const available = new Set(trackTags(track).map((tag) => tag.toLowerCase()))
      visible = filters.tagMatch === 'all' ? tags.every((tag) => available.has(tag)) : tags.some((tag) => available.has(tag))
    }
    if (visible && filters.scope === 'clustered') visible = track.cluster_id !== null
    if (visible && filters.scope === 'unclustered') visible = track.cluster_id === null
    if (visible && clusters.size > 0) visible = track.cluster_id !== null && clusters.has(track.cluster_id)
    if (visible && hideArtists) visible = track.artist_id != null && artists.has(track.artist_id)
    if (visible && range) {
      const value = track.features[range.feature]
      visible = value !== undefined && value >= range.min && value <= range.max
    }
    mask[index] = Number(visible)
  })
  return mask
}

/** Ids of the clusters that still have a visible track, so labels follow the mask. */
export function visibleClusters(tracks: readonly Track[], mask: ArrayLike<number>): ReadonlySet<number> {
  const ids = new Set<number>()
  tracks.forEach((track, index) => {
    if (mask[index] && track.cluster_id !== null) ids.add(track.cluster_id)
  })
  return ids
}

/**
 * Apply one edited bound of a range. An empty or invalid entry resets that bound to the extent;
 * the value is kept inside the extent, and the other bound moves along so that min never exceeds max.
 */
export function setRangeBound(
  range: FeatureRange,
  side: 'min' | 'max',
  raw: string,
  extent: { readonly min: number; readonly max: number },
): FeatureRange {
  const parsed = Number.parseFloat(raw)
  const fallback = side === 'min' ? extent.min : extent.max
  const value = Math.min(extent.max, Math.max(extent.min, Number.isFinite(parsed) ? parsed : fallback))
  if (side === 'min') return { ...range, min: value, max: Math.max(range.max, value) }
  return { ...range, max: value, min: Math.min(range.min, value) }
}
