import type { Track } from '../data/types'

export interface Filters {
  readonly text: string
  /** All selected tags must match, across genres, instruments and moods. */
  readonly tags: readonly string[]
}

export type ColourMode = 'cluster' | 'tag'

export const NEUTRAL_COLOUR = '#808080'
const PALETTE = ['#2563eb', '#dc2626', '#059669', '#9333ea', '#d97706', '#0891b2', '#db2777', '#65a30d']

export function trackTags(track: Track): readonly string[] {
  return [...track.genres, ...track.instruments, ...track.moods]
}

/** Case-insensitive AND of whitespace-separated terms over title and artist. */
export function searchMask(tracks: readonly Track[], text: string): Uint8Array {
  const terms = text.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return Uint8Array.from(tracks, (track) => {
    const searchable = `${track.title} ${track.artist}`.toLowerCase()
    return Number(terms.every((term) => searchable.includes(term)))
  })
}

export function visibilityMask(tracks: readonly Track[], filters: Filters): Uint8Array {
  const mask = searchMask(tracks, filters.text)
  const tags = filters.tags.map((tag) => tag.toLowerCase())
  if (tags.length === 0) return mask
  tracks.forEach((track, index) => {
    if (!mask[index]) return
    const available = new Set(trackTags(track).map((tag) => tag.toLowerCase()))
    mask[index] = Number(tags.every((tag) => available.has(tag)))
  })
  return mask
}

function colourForKey(key: string): string {
  let hash = 0
  for (const character of key) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

/** Tag mode uses the alphabetically first tag so array order cannot change colours. */
export function trackColours(tracks: readonly Track[], mode: ColourMode): readonly string[] {
  return tracks.map((track) => {
    const key = mode === 'cluster'
      ? track.cluster_id === null ? undefined : `cluster:${track.cluster_id}`
      : trackTags(track).map((tag) => tag.toLowerCase()).sort()[0]
    return key === undefined ? NEUTRAL_COLOUR : colourForKey(key)
  })
}

/** Map-space picking only; musical neighbours must come from the exported feature-space data. */
export function nearestPoint(
  tracks: readonly Track[],
  coordinate: { x: number; y: number },
  mask?: ArrayLike<number>,
  maxDistance = Infinity,
): Track | null {
  if (!Number.isFinite(coordinate.x) || !Number.isFinite(coordinate.y) || maxDistance < 0 || Number.isNaN(maxDistance)) {
    throw new Error('Point picking requires finite coordinates and a non-negative maximum distance')
  }
  if (mask && mask.length !== tracks.length) throw new Error('Visibility mask length must match tracks')
  let nearest: Track | null = null
  let distance = maxDistance
  tracks.forEach((track, index) => {
    if (mask && !mask[index]) return
    const candidateDistance = Math.hypot(track.x - coordinate.x, track.y - coordinate.y)
    if (candidateDistance <= distance && (nearest === null || candidateDistance < distance)) {
      nearest = track
      distance = candidateDistance
    }
  })
  return nearest
}
