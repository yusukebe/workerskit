export interface KakeraBindings {
  ASSETS: Fetcher
  LOADER: WorkerLoader
}

export interface KakeraOptions {
  dir?: string
  extensions?: string[]
}

const ASSETS_ORIGIN = 'http://dummy'

export const kakera = (options: KakeraOptions = {}): ExportedHandler<KakeraBindings> => {
  const prefix = options.dir ? `${options.dir}/` : ''
  const extensions = options.extensions ?? ['js']

  return {
    async fetch(request, env) {
      const url = new URL(request.url)
      const segments = url.pathname.split('/').filter(Boolean)
      const routeName = segments[0] || 'index'

      let path: string | null = null
      for (const ext of extensions) {
        const candidate = `${prefix}${routeName}.${ext}`
        const res = await env.ASSETS.fetch(
          new Request(`${ASSETS_ORIGIN}/${candidate}`, { method: 'HEAD' })
        )
        if (res.ok) {
          path = candidate
          break
        }
      }
      if (path === null) return new Response('Not Found', { status: 404 })

      const worker = env.LOADER.get(routeName, async () => {
        const res = await env.ASSETS.fetch(new Request(`${ASSETS_ORIGIN}/${path}`))
        return {
          compatibilityDate: '2026-03-24',
          mainModule: 'index.js',
          modules: { 'index.js': await res.text() },
          globalOutbound: null
        }
      })
      const subPath = '/' + segments.slice(1).join('/')
      const forwarded = new URL(subPath + url.search, url.origin)
      return worker.getEntrypoint().fetch(new Request(forwarded, request))
    }
  }
}

export const app = /* @__PURE__ */ kakera()
