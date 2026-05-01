export interface WorkersRoutesBindings {
  ASSETS: Fetcher
  LOADER: WorkerLoader
}

export function makeHandler(
  load: (env: WorkersRoutesBindings, routeName: string) => Promise<WorkerStub | null>
): ExportedHandler<WorkersRoutesBindings> {
  return {
    async fetch(request, env) {
      const url = new URL(request.url)
      const segments = url.pathname.split('/').filter(Boolean)
      const routeName = segments[0] || 'index'
      const subPath = '/' + segments.slice(1).join('/')

      const worker = await load(env, routeName)
      if (!worker) {
        return new Response('Not Found', { status: 404 })
      }

      const subUrl = new URL(subPath + url.search, url.origin)
      return worker.getEntrypoint().fetch(new Request(subUrl, request))
    }
  }
}
