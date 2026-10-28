import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'

export default function AtlasToolbar({ store }: { store: AtlasStore }) {
  const { atlas, filters, derived, settingsOpen } = useAtlasStore(store)
  return (
    <div className="toolbar" role="search">
      <input
        type="search"
        aria-label="Search title or artist"
        placeholder="Search"
        value={filters.text}
        onChange={(event) => store.setFilters({ ...filters, text: event.target.value })}
      />
      <button type="button" className="button" aria-expanded={settingsOpen} aria-controls="atlas-settings"
        onClick={() => store.setSettingsOpen(!settingsOpen)}>
        Settings
      </button>
      <span className="count" role="status">
        {derived.visibleCount.toLocaleString('en-US')} / {(atlas?.tracks.length ?? 0).toLocaleString('en-US')}
      </span>
    </div>
  )
}
