import type { Cluster, Track } from '../data/types'
import { trackTags } from './tracks'

export interface Option {
  readonly value: string
  readonly label: string
}

export const FEATURE_LABELS: Record<string, string> = {
  bpm: 'BPM',
  danceability: 'Danceability',
  onset_rate: 'Onset rate',
  loudness: 'Loudness',
  dynamic_complexity: 'Dynamic complexity',
  key_strength: 'Key strength',
}

/** Labels must be unique because a list is picked by typing; clashes get the value appended. */
export function uniqueLabels(options: readonly Option[]): Option[] {
  const seen = new Map<string, number>()
  for (const option of options) seen.set(option.label, (seen.get(option.label) ?? 0) + 1)
  return options.map((option) =>
    (seen.get(option.label) ?? 0) > 1 ? { ...option, label: `${option.label} · ${option.value}` } : option,
  )
}

export function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key
}

/** Feature keys present on tracks, in a stable order. */
export function featureKeys(tracks: readonly Track[]): string[] {
  return [...new Set(tracks.flatMap((track) => Object.keys(track.features)))].sort()
}

export function tagOptions(tracks: readonly Track[]): string[] {
  return [...new Set(tracks.flatMap(trackTags))].sort()
}

/** Artists as options (id and "name (tracks)"), alphabetical; tracks without an artist id are skipped. */
export function artistOptions(tracks: readonly Track[]): Option[] {
  const byId = new Map<string, { name: string; count: number }>()
  for (const track of tracks) {
    if (track.artist_id == null) continue
    const entry = byId.get(track.artist_id)
    if (entry) entry.count += 1
    else byId.set(track.artist_id, { name: track.artist, count: 1 })
  }
  return uniqueLabels(
    [...byId]
      .sort((a, b) => a[1].name.localeCompare(b[1].name) || a[0].localeCompare(b[0]))
      .map(([value, { name, count }]) => ({ value, label: `${name} (${count})` })),
  )
}

/** Clusters as options, biggest first; the id keeps equal labels apart. */
export function clusterOptions(clusters: readonly Cluster[]): Option[] {
  return uniqueLabels(
    [...clusters]
      .sort((a, b) => b.size - a.size || a.id - b.id)
      .map((cluster) => ({ value: String(cluster.id), label: `${cluster.label} · ${cluster.size}` })),
  )
}

/** Smallest and largest value of a feature over all tracks, for a range filter. */
export function featureExtent(tracks: readonly Track[], feature: string): { min: number; max: number } | null {
  let min = Infinity
  let max = -Infinity
  for (const track of tracks) {
    const value = track.features[feature]
    if (value === undefined) continue
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  return min <= max ? { min, max } : null
}
