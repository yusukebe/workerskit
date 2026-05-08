import { defineConfig } from 'vitest/config'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'

export default defineConfig({
  test: {
    projects: [
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
