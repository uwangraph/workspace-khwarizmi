import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import fs from 'fs'

// Generate .svelte-kit directory if it doesn't exist
const skDir = path.resolve('./.svelte-kit/dev/generated')
if (!fs.existsSync(skDir)) {
  fs.mkdirSync(skDir, { recursive: true })
}

export default defineConfig({
  plugins: [
    svelte({
      hot: !process.env.VITEST,
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'tests/e2e'],
    setupFiles: ['tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/services/**/*.ts', 'src/lib/stores/**/*.ts', 'src/lib/type.ts'],
      exclude: ['node_modules', 'tests'],
    },
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      $app: path.resolve('./.svelte-kit/dev/generated/app'),
      $env: path.resolve('./tests/unit/mock-env'),
    },
  },
})
