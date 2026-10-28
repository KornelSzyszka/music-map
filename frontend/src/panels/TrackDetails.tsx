import { useMemo } from 'react'
import { buildLookup, neighboursOfTrack } from '../derive/atlasLookup'
import { EMPTY_FILTERS } from '../derive/filters'
import { featureLabel } from '../derive/options'
import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'

const NEIGHBOURS_LISTED = 10
const EMPTY = '—'

function formatFeature(value: number): string {
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)
}

/** The permanent panel: the selected track and its nearest neighbours; em dashes while nothing is selected. */
export default function TrackDetails({ store }: { store: AtlasStore }) {
  const { atlas, derived, filters, view } = useAtlasStore(store)
  const lookup = useMemo(() => (atlas ? buildLookup(atlas) : null), [atlas])
  const indexById = useMemo(() => new Map((atlas?.tracks ?? []).map((track, index) => [track.id, index])), [atlas])
  const selected = derived.selectedTrack
  if (!atlas || !lookup) return null

  const cluster = selected && selected.cluster_id !== null ? lookup.clusters.get(selected.cluster_id) : undefined
  const neighbours = selected
    ? neighboursOfTrack(lookup, selected.id, NEIGHBOURS_LISTED, (id) => {
        const index = indexById.get(id)
        return index !== undefined && derived.mask[index] === 1
      })
    : []
  const tags = selected ? [...selected.genres, ...selected.instruments, ...selected.moods] : []
  const artistId = selected?.artist_id ?? null
  const featureRows: Array<[string, number | undefined]> = selected
    ? Object.entries(selected.features)
    : derived.features.map((key) => [key, undefined])

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
    <aside className="track-details glass" aria-label="Selected track" aria-live="polite">
      <h2>{selected?.title ?? EMPTY}</h2>
      {selected && artistId !== null ? (
        <p>
          <button type="button" className="link" onClick={highlightArtist} title="Highlight this artist">
            {selected.artist}
          </button>
        </p>
      ) : (
        <p>{selected?.artist ?? EMPTY}</p>
      )}
      <dl className="fields">
        <div><dt>Cluster</dt><dd>{cluster?.label ?? EMPTY}</dd></div>
      </dl>
      {tags.length > 0 ? (
        <ul className="tag-list">
          {tags.map((tag) => <li key={tag} className="tag">{tag}</li>)}
        </ul>
      ) : null}
      <dl className="stats">
        {featureRows.map(([key, value]) => (
          <div key={key}><dt>{featureLabel(key)}</dt><dd>{value === undefined ? EMPTY : formatFeature(value)}</dd></div>
        ))}
      </dl>
      <h3>Nearest</h3>
      {neighbours.length > 0 ? (
        <ol className="neighbour-list">
          {neighbours.map(({ track, distance }) => (
            <li key={track.id}>
              <button type="button" className="link" onClick={() => select(track.id)}>{track.title}</button>
              <span className="muted"> {track.artist} · <span className="mono">{distance.toFixed(2)}</span></span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">{EMPTY}</p>
      )}
      {selected?.source_url ? <p><a href={selected.source_url} target="_blank" rel="noreferrer">Jamendo</a></p> : null}
    </aside>
  )
}
