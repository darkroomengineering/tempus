import { defineConfig } from 'astro/config'

import react from '@astrojs/react'

export default defineConfig({
  integrations: [react()],
  devToolbar: {
    enabled: false,
  },
  srcDir: './www',
})
