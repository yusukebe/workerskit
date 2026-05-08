# Kakera

> **Kakera** (欠片) — Japanese for "fragment" / "shard". Each route is a fragment that runs as its own isolated worker.

A file-based routing framework for Cloudflare Workers. Each route file runs as an **independent Dynamic Worker** loaded via the Worker Loader binding.

The host worker is a thin (~1.6 KiB) dispatcher that reads pre-built `.js` bundles from the ASSETS binding and hands them to the Worker Loader. Bundling is delegated to `bun build` (driven by a small `build.ts` in the consumer's project) and wired into `wrangler dev` / `wrangler deploy` via Wrangler's `[build]`.

## Public API

```ts
import { app, kakera, type KakeraBindings, type KakeraOptions } from 'kakera-worker'
```

- `app` — pre-built default `ExportedHandler<KakeraBindings>` instance. The zero-config path: `export { app as default } from 'kakera-worker'`.
- `kakera(options?)` — factory returning an `ExportedHandler<KakeraBindings>`. Use when overriding `dir` or `extensions`.
- `KakeraBindings` — `{ ASSETS: Fetcher; LOADER: WorkerLoader }`. The required binding shape on the consumer's `wrangler.jsonc`.
- `KakeraOptions` — `{ dir?: string; extensions?: string[] }`.

There is no separate `dev` / `prod` entry. The host always reads pre-built bundles via ASSETS — there is no runtime bundler.

## Repository layout

```
kakera/
  src/
    shared.ts         # KakeraBindings type + makeHandler factory
    index.ts          # exports `app`, `kakera`, KakeraOptions, KakeraBindings
  example/
    routes/{index,users}.ts   # source — bundled by build.ts
    src/app.ts        # `export { app as default } from 'kakera-worker'`
    build.ts          # Bun.Glob + Bun.build
    wrangler.jsonc    # has [build].command = "bun run build"
    package.json
  test/
    fixtures/routes   # test route source
    prod              # vitest-pool-workers project (legacy directory name)
  package.json
  tsconfig.json / tsconfig.build.json
  AGENTS.md / README.md
```

`example/` consumes the framework via `"kakera-worker": "file:.."`. Single-package, no monorepo.

## How it works

1. Request → host worker.
2. Host extracts `routeName` from the first path segment (`/users/123` → `users`, `/` → `index`).
3. `env.ASSETS.fetch('/<dir>/<route>.js')` — `dir` defaults to `''`, configurable via `kakera({ dir })`.
4. LOADER cache key = `<route>` (deterministic since `.js` is built ahead of time).
5. On cache miss, fetch the `.js` bundle and pass it as a single `index.js` module to `LOADER.get`.

There is no runtime bundling. Source-to-bundle is the consumer's responsibility, driven by `build.ts` + Wrangler's `[build]`.

## Required wrangler config

```jsonc
{
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

Wrangler runs `[build].command` on `wrangler dev` startup and re-runs it whenever a file inside `watch_dir` changes. `Fetcher` and `WorkerLoader` types come from `@cloudflare/workers-types`.

## Route contract

A route is a module default-exporting anything with a `fetch(request)` — typically a Hono app:

```ts
// routes/users.ts
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.json({ users: [] }))
app.get('/:id', (c) => c.json({ id: c.req.param('id') }))
export default app
```

The host strips the first path segment before forwarding, so the route sees `/`, `/:id`, etc. Common middleware lives inside the route (Hono's `app.use(...)` or imported helpers). Kakera deliberately does not provide a host-side middleware mechanism — each route is a self-contained worker.

## Build details

The consumer keeps a small `build.ts` at the project root:

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

Wired in `package.json` as `"build": "bun run build.ts"`, called by Wrangler's `[build].command`.

- Why a script and not `bun build ./routes/*.ts ...` directly in `[build].command`? Wrangler spawns `[build].command` without a shell, so unwrapped globs reach `bun` literally and fail with `ModuleNotFound`. Using `Bun.Glob` is shell-independent and tolerates a project with only `.ts` or only `.tsx`.
- `--target=browser` is correct for `workerd` (V8, no Node builtins). `--target=bun` would mix in Bun-specific APIs; `--target=node` would pull Node builtins.
- `Bun.build` with multiple entrypoints does **not** code-split — each entry is a self-contained bundle (hono, react, etc. inlined). This matters because LOADER receives only the route's own `.js` and can't resolve external chunks.

## `/* @__PURE__ */` annotations

`src/index.ts` ends with:

```ts
export const app = /* @__PURE__ */ kakera()
```

Lets bundlers tree-shake `app` when a consumer only uses `kakera(options)`. Cheap; keep it.

## Running the example

```sh
cd example
bun install
bun run dev          # wrangler dev (runs [build] automatically, watches routes/)
bun run deploy       # wrangler deploy
```

## Constraints / non-obvious things

- LOADER caches workers by name. Bundle output is per-build immutable, so name alone is sufficient.
- Routes get `hono` (and any other dep) bundled inline at build time. Adding a new dep means rebuilding and adding it to the consumer's `package.json`.
- The host always tries `index` for `/`. There's no `index.html`-style fallback or directory listing.
- The `[build]` watch trigger reloads the worker isolate, not just assets. Cache-on-isolate strategies in the host are pointless because the isolate is recreated on each route edit.

## References

- [Dynamic Workers](https://developers.cloudflare.com/dynamic-workers/)
- [Worker Loader binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/)
- [Wrangler custom builds](https://developers.cloudflare.com/workers/wrangler/configuration/#custom-builds)

## Status / next steps

- [x] Single host export (`kakera-worker`) — runtime bundler removed
- [x] Wrangler `[build]` + `build.ts` integration in example
- [ ] Configurable `compatibilityDate` (currently `'2026-03-24'` hardcoded in `src/index.ts`)
- [ ] Dynamic route segments (`[id].ts`)
- [ ] Per-route binding configuration
- [ ] npm publish
