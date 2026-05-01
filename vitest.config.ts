import { defineConfig } from 'vitest/config'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './test/dev/wrangler.jsonc' }
          })
        ],
        test: {
          name: 'dev',
          include: ['test/dev/**/*.test.ts']
        }
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './test/prod/wrangler.jsonc' }
          })
        ],
        test: {
          name: 'prod',
          include: ['test/prod/**/*.test.ts']
        }
      }
    ]
  }
})
