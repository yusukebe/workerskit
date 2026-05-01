import { describe, expect, it } from 'vitest'
import { SELF } from 'cloudflare:test'

describe('workerskit/prod', () => {
  it('serves /hello from pre-built bundle', async () => {
    const res = await SELF.fetch('http://test/hello')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
  })

  it('forwards subpath', async () => {
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
