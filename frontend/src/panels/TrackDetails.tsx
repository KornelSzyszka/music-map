import { useMemo } from 'react'
import { buildLookup, neighboursOfTrack } from '../derive/atlasLookup'
import { EMPTY_FILTERS } from '../derive/filters'
import { featureLabel } from '../derive/options'
import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'

const NEIGHBOURS_LISTED = 10

function formatFeature(value: number): string {
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)
}

/** The selected track and its nearest neighbours in feature space; absent while nothing is selected. */
export default function TrackDetails({ store }: { store: AtlasStore }) {
  const { atlas, derived, filters, view } = useAtlasStore(store)
  const lookup = useMemo(() => (atlas ? buildLookup(atlas) : null), [atlas])
  const indexById = useMemo(() => new Map((atlas?.tracks ?? []).map((track, index) => [track.id, index])), [atlas])
  const selected = derived.selectedTrack
  if (!atlas || !lookup || !selected) return null

  const cluster = selected.cluster_id === null ? null : lookup.clusters.get(selected.cluster_id)
  const neighbours = neighboursOfTrack(lookup, selected.id, NEIGHBOURS_LISTED, (id) => {
    const index = indexById.get(id)
    return index !== undefined && derived.mask[index] === 1
  })
  const tags = [...selected.genres, ...selected.instruments, ...selected.moods]
  const artistId = selected.artist_id ?? null

  function select(id: string): void {
    const target = lookup?.tracks.get(id)
    if (!target) return
    store.setSelection(id)
    store.setView({ ...view, x: target.x, y: target.y })
  }

  function highlightArtist(): void {
    if (artistId === null) return
    store.setFilters({ ...EMPTY_FILTERS, ...filters, artists: [artistId] })
    store.setColourMode('artist')
  }

  return (
    <section className="track-details" aria-label="Selected track">
      <h2>{selected.title}</h2>
      {artistId === null ? (
        <p>{selected.artist}</p>
      ) : (
        <p>
          <button type="button" className="link" onClick={highlightArtist} title="Highlight this artist">
            {selected.artist}
          </button>
        </p>
      )}
      {cluster ? <p className="muted">{cluster.label}</p> : null}
      {tags.length > 0 ? (
        <ul className="tag-list">
          {tags.map((tag) => <li key={tag} className="tag">{tag}</li>)}
        </ul>
      ) : null}
      <dl className="stats">
        {Object.entries(selected.features).map(([key, value]) => (
          <div key={key}><dt>{featureLabel(key)}</dt><dd>{formatFeature(value)}</dd></div>
        ))}
      </dl>
      {neighbours.length > 0 ? (
        <>
          <h3>Nearest</h3>
          <ol className="neighbour-list">
            {neighbours.map(({ track, distance }) => (
              <li key={track.id}>
                <button type="button" className="link" onClick={() => select(track.id)}>{track.title}</button>
                <span className="muted"> {track.artist} · {distance.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {selected.source_url ? <p><a href={selected.source_url} target="_blank" rel="noreferrer">Jamendo</a></p> : null}
    </section>
  )
}
