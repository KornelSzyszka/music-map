import { expect, test } from 'vitest'
import type { AtlasManifest } from './types'

test('manifest type accepts the documented fields', () => {
  const manifest: AtlasManifest = {
    schema_version: '0.1',
    dataset_version: 'pilot-001',
    projection_id: 'acoustic-v1-umap40',
    feature_set_id: 'acoustic-v1',
    track_count: 10000,
    seed: 42,
  }

  expect(manifest.track_count).toBe(10000)
})
