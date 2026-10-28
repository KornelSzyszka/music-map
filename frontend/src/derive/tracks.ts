import type { Track } from '../data/types'

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
