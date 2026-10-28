import { useSyncExternalStore } from 'react'
import type { AtlasStore } from './store'

export function useAtlasStore(store: AtlasStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
