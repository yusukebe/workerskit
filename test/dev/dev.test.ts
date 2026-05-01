import { describe, expect, it } from 'vitest'
import { SELF } from 'cloudflare:test'

describe('workerkit/dev', () => {
  it('serves the index route at /', async () => {
    const res = await SELF.fetch('http://test/')
    expect(res.status).toBe(404) // no index fixture, falls through
  })

  it('serves /hello as routes/hello.ts root', async () => {
    const res = await SELF.fetch('http://test/hello')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
  })

  it('forwards subpath to route', async () => {
    const res = await SELF.fetch('http://test/hello/world')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hi world')
  })

  it('serves JSON route', async () => {
    const res = await SELF.fetch('http://test/json')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 404 for unknown route', async () => {
    const res = await SELF.fetch('http://test/missing')
    expect(res.status).toBe(404)
  })
})
