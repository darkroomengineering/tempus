# Tempus/react

React bindings for [tempus](../../README.md).

## Basic Usage

`useTempus` adds a callback to the loop for the lifetime of the component and removes it on unmount. The callback receives the same single `state` object as the core API: `{ time, deltaTime, frame, budget }`.

```js
import { useTempus } from 'tempus/react'

function App() {
  useTempus(({ time, deltaTime, frame, budget }) => {
    console.log('frame', time, deltaTime, frame)
  })
}
```

The latest callback is always used without re-subscribing, so it can safely close over component state without being wrapped in `useCallback`.

## Options

`useTempus` forwards the same options as [`Tempus.add`](../../README.md#tempusaddcallback-options):

```js
useTempus(() => {}, {
  fps: 30,            // Will run at 30 FPS (or a relative rate like '50%')
  order: -1,          // Will run before other animations (lower runs first)
  label: 'my-effect', // Shown in tempus/profiler and Tempus.inspect()
})
```

## Patching requestAnimationFrame

`ReactTempus` calls `Tempus.patch()` on mount and `Tempus.unpatch()` on unmount, routing every native `requestAnimationFrame` through Tempus while it's mounted. Render it once near the root of your app.

```js
import { ReactTempus } from 'tempus/react'

// patch defaults to true; pass patch={false} to disable
<ReactTempus patch />
```
