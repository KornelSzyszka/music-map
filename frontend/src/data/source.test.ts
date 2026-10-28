import { describe, expect, it } from 'vitest'
import { chooseAtlasSource } from './source'

const reply = (ok: boolean, type: string) => () =>
  Promise.resolve({ ok, headers: new Headers({ 'content-type': type }) })

describe('chooseAtlasSource', () => {
  it('uses the pipeline export when a JSON manifest is served', async () => {
    expect(await chooseAtlasSource(reply(true, 'application/json'))).toEqual({ baseUrl: './atlas', synthetic: false })
  })

  it('falls back to the demo atlas when the dev server answers with index.html', async () => {
    expect(await chooseAtlasSource(reply(true, 'text/html'))).toEqual({ baseUrl: './fixtures', synthetic: true })
  })

  it('falls back when the manifest is missing or the request fails', async () => {
    expect((await chooseAtlasSource(reply(false, 'application/json'))).synthetic).toBe(true)
    const failing = () => Promise.reject(new Error('offline'))
    expect((await chooseAtlasSource(failing)).synthetic).toBe(true)
  })
})
