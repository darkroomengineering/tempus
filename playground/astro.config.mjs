import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'

import react from '@astrojs/react'

// Resolve the `tempus` package to its TypeScript source (not the built dist)
// during playground dev. Vite doesn't watch node_modules, so importing the
// built bundle means source edits never HMR. Aliasing to source gives instant
// hot-reload — and keeps a single Tempus singleton, since both the app and the
// profiler module resolve `tempus` to the same source file.
//
// Order matters: @rollup/plugin-alias does prefix matching and returns the
// first hit, so the more specific subpaths must come before bare `tempus`.
const src = (path) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  integrations: [react()],
  devToolbar: {
    enabled: false,
  },
  srcDir: './www',
  vite: {
    resolve: {
      alias: [
        { find: 'tempus/profiler', replacement: src('../packages/core/profiler.ts') },
        { find: 'tempus/react', replacement: src('../packages/react/index.ts') },
        { find: 'tempus', replacement: src('../packages/core/index.ts') },
      ],
    },
  },
})
