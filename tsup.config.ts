import { defineConfig, type Options } from 'tsup'

const OUT_DIR = 'dist'

function makeBuildOptions(
  fileName: string,
  entryPoint: string,
  format?: 'esm' | 'browser',
  overwrites: Options = {}
): Options[] {
  const options = {
    entryPoints: { [fileName]: entryPoint },
    format: 'esm',
    outDir: OUT_DIR,
    platform: 'browser',
    target: 'es2022',
    cjsInterop: false,
    dts: true,
    sourcemap: true,
    external: ['react', 'tempus'],
    outExtension: () => (format === 'esm' ? { js: '.mjs', dts: '.d.ts' } : { js: '.js' }),
    ...overwrites,
  } satisfies Options

  const minifyOptions = {
    ...options,
    minify: true,
    outExtension: () => ({ js: '.min.js' }),
    ...overwrites,
  } satisfies Options

  return format === 'esm' ? [options] : [options, minifyOptions]
}

// Builds
export const coreESMOptions = makeBuildOptions('tempus', 'packages/core/index.ts', 'esm')
const coreBrowserOptions = makeBuildOptions('tempus', 'packages/core/browser.ts', 'browser', { dts: false })

const reactOptions = makeBuildOptions('tempus-react', 'packages/react/index.ts', 'esm', {
  banner: { js: '"use client";' },
})

export default defineConfig(() => {
  console.log(`\x1b[31mLNS\x1b[0m\x1b[1m Building all packages\x1b[0m\n`)
  return [...coreESMOptions, ...coreBrowserOptions, ...reactOptions]
})
