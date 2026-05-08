# Kakera

> **Kakera** (欠片) is Japanese for "fragment" or "shard" — each route is its own little fragment, sandboxed and loaded on demand.

A file-based routing framework for Cloudflare Workers. Each route file runs as an **independent Dynamic Worker** — fully isolated, loaded via the Worker Loader binding.

> **Status:** experimental.

## Install

```sh
npm i kakera-worker
```

## How it looks

```
my-app/
  routes/
    index.ts        # GET /
    users.ts        # /users/*
    posts.ts        # /posts/*
  src/
    app.ts          # host worker entry
  build.ts          # bun build script
  wrangler.jsonc
  package.json
```

Each route is just a worker — typically a Hono app:

```ts
// routes/users.ts
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.json({ users: [] }))
app.get('/:id', (c) => c.json({ id: c.req.param('id') }))

export default app
```

The host Worker dispatches by the first path segment (`/users/123` → `users.ts`, then forwards `/123`). Routes are sandboxed from each other.

## Host worker

```ts
// src/app.ts
export { app as default } from 'kakera-worker'
```

That's it. Or with options:

```ts
import { kakera } from 'kakera-worker'
export default kakera({ dir: 'subdir' }) // fetches subdir/<name>.js via ASSETS
```

`extensions` option (default `['js']`):

```ts
kakera({ extensions: ['js', 'mjs'] })
```

## Build script

`build.ts` uses Bun's `Glob` API so route discovery is shell-independent and works whether you have only `.ts`, only `.tsx`, or both:

```ts
// build.ts
import { Glob } from 'bun'

const entrypoints = [...new Glob('routes/*.{ts,tsx}').scanSync('.')]

const result = await Bun.build({
  entrypoints,
  outdir: './dist',
  target: 'browser',
  format: 'esm'
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}
```

## Wrangler config

Routes are pre-bundled per-file by `bun build`, and the output directory is served via the ASSETS binding. Wrangler's `[build]` runs the bundler on startup and re-runs it when `watch_dir` changes — `wrangler dev` is the only command you need.

```jsonc
// wrangler.jsonc
{
  "name": "my-app",
  "main": "src/app.ts",
  "build": {
    "command": "bun run build",
    "watch_dir": "routes"
  },
  "assets": { "directory": "dist", "binding": "ASSETS" },
  "worker_loaders": [{ "binding": "LOADER" }],
  "compatibility_date": "2026-03-17"
}
```

## Scripts

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "build": "bun run build.ts",
    "deploy": "wrangler deploy"
  }
}
```

- `wrangler dev` — runs `[build].command` (= `bun run build`), then starts workerd. Edits in `routes/` trigger a re-bundle and reload.
- `wrangler deploy` — same flow, but ships to Cloudflare.

## Try the example

```sh
cd example
bun install
bun run dev
```

## Why

- **Isolation by default.** Each route is its own Worker — bugs, deps, and runtime crashes can't leak between routes.
- **Tiny host bundle.** The host worker is ~1.6 KiB. No runtime bundler shipped.
- **Standard tooling.** Bundling is `bun build`. Watch-and-rebuild is Wrangler's `[build]`. Nothing magic.
- **Per-route bindings (planned).** Each route can eventually have its own scoped set of bindings.

## How it works

| Step                     |                                                                          |
| ------------------------ | ------------------------------------------------------------------------ |
| Host entry               | `src/app.ts` (re-exports `app` from `kakera-worker`)                     |
| Route source on disk     | `routes/<name>.ts(x)` → `dist/<name>.js` (built by `build.ts`)           |
| ASSETS binding directory | `dist`                                                                   |
| Bundling                 | `bun build` invoked by Wrangler `[build]` on startup and on file changes |
| LOADER cache key         | `<name>` (Worker Loader binding caches by key)                           |
| Host bundle size         | ~1.6 KiB                                                                 |

## References

- [Dynamic Workers](https://developers.cloudflare.com/dynamic-workers/)
- [Worker Loader binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/)
- [Wrangler custom builds](https://developers.cloudflare.com/workers/wrangler/configuration/#custom-builds)
- [Hono](https://hono.dev/)
