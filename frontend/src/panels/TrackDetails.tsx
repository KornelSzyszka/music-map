import { useMemo } from 'react'
import { buildLookup, neighboursOfTrack } from '../derive/atlasLookup'
import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'

const NEIGHBOURS_LISTED = 10

const FEATURE_LABELS: Record<string, string> = {
  bpm: 'BPM',
  danceability: 'Danceability',
  onset_rate: 'Onset rate',
  loudness: 'Loudness',
  dynamic_complexity: 'Dynamic complexity',
  key_strength: 'Key strength',
}

function formatFeature(value: number): string {
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)
}

/** Details of the selected track and its nearest neighbours in feature space. */
export default function TrackDetails({ store }: { store: AtlasStore }) {
  const { atlas, derived, view } = useAtlasStore(store)
  const lookup = useMemo(() => (atlas ? buildLookup(atlas) : null), [atlas])
  const selected = derived.selectedTrack
  if (!atlas || !lookup) return null
  if (!selected) {
    return (
      <aside className="track-details">
        <p className="muted">Select a track to see its details and its nearest neighbours in feature space.</p>
        {atlas.manifest.summary ? (
          <p className="muted">
            {atlas.manifest.track_count.toLocaleString('en-US')} tracks, {atlas.manifest.summary.clusters} clusters covering{' '}
            {Math.round(atlas.manifest.summary.clustered_share * 100)}% of them. The rest are grey: no dense group.
          </p>
        ) : null}
      </aside>
    )
  }
  const cluster = selected.cluster_id === null ? null : lookup.clusters.get(selected.cluster_id)
  const neighbours = neighboursOfTrack(lookup, selected.id, NEIGHBOURS_LISTED)
  const tags = [...selected.genres, ...selected.instruments, ...selected.moods]
  const select = (id: string): void => {
    const target = lookup.tracks.get(id)
    if (!target) return
    store.setSelection(id)
    store.setView({ ...view, x: target.x, y: target.y })
  }
  return (
    <aside className="track-details" aria-live="polite">
      <h2>{selected.title}</h2>
      <p className="muted">{selected.artist}</p>
      <p className="muted">{cluster ? `Cluster: ${cluster.label} (${cluster.size} tracks)` : 'Not in a cluster'}</p>
      {tags.length > 0 ? (
        <p className="tag-list">
          {tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </p>
      ) : null}
      <dl className="stats">
        {Object.entries(selected.features).map(([key, value]) => (
          <div key={key}><dt>{FEATURE_LABELS[key] ?? key}</dt><dd>{formatFeature(value)}</dd></div>
        ))}
      </dl>
      <h3>Nearest in feature space</h3>
      <ol className="neighbour-list">
        {neighbours.map(({ track, distance }) => (
          <li key={track.id}>
            <button type="button" onClick={() => select(track.id)}>{track.title}</button>
            <span className="muted"> {track.artist} · distance {distance.toFixed(2)}</span>
          </li>
        ))}
      </ol>
      <p className="muted">
        Neighbours come from the standardised acoustic features, not from distance on the map, so some are far away on it.
      </p>
      {selected.source_url ? (
        <p><a href={selected.source_url} target="_blank" rel="noreferrer">Open on Jamendo</a></p>
      ) : null}
    </aside>
  )
}
