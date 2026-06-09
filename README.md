# Tempus

[![TEMPUS](https://assets.darkroom.engineering/tempus/banner.gif)](https://github.com/darkroomengineering/tempus)

## Introduction

`tempus` means time in Latin, this package is a lightweight, high-performance animation frame manager for JavaScript applications.

## Packages

- [tempus](./README.md)
- [tempus/react](./packages/react/README.md)

## Features

- **One shared rAF loop** — merges every requestAnimationFrame call into a single loop to cut per-frame overhead
- **Explicit ordering** — run animations in an explicit order each frame instead of registration order
- **Custom frame rates** — throttle callbacks to a target FPS independent of the display refresh
- **Frame budget** — every callback gets `state.budget()` (ms left this frame) to gracefully skip or chunk work
- **Library-friendly** — drop-in compatible with GSAP, Lenis, and other animation tools
- **Zero dependencies** — no external packages, nothing extra to audit
- **~1KB gzipped** — a negligible footprint for a core primitive

## Installation

using package manager

```bash
npm install tempus
```

```js
import Tempus from 'tempus'
```

using script tag

```html
<script src="https://unpkg.com/tempus@1.0.0-dev.17/dist/tempus.min.js"></script> 
```

## Basic Usage

```javascript
import Tempus from "tempus"

// Simple animation at maximum FPS.
// Every callback receives a single `state` object:
// { time, deltaTime, frame, budget }
function animate({ time, deltaTime, frame, budget }) {
  console.log('frame', time, deltaTime)
}

Tempus.add(animate)
```

### Cleanup
```javascript
const unsubscribe = Tempus.add(animate)

unsubscribe()
```

### Playback Control

```javascript
Tempus.pause() // no rafs will be called
Tempus.play() // resume
Tempus.restart() // set clock elapsed time to 0
```

### React

See [tempus/react](./packages/react/README.md)

## Advanced Usage

### Custom Frame Rates

```javascript
Tempus.add(animate, { 
  fps: 30 // Will run at 30 FPS
})

Tempus.add(animate, { 
  fps: '50%' // Will run at 50% of the system's FPS
})
```

### Order System

`order` is a sort key for execution within a frame — lower runs first, exactly like CSS `order`. Default is `0`; negative values run before it, positive after.

`——[-Infinity]——[0]——[Infinity]——> execution order`


#### Input
```javascript
// Default order: 0 (runs second)
Tempus.add(() => console.log('animate'))

// Order: 1 (runs third)
Tempus.add(() => console.log('render'), { order: 1 })

// Order: -1 (runs first)
Tempus.add(() => console.log('scroll'), { order: -1 })
```
#### Output

```
scroll
animate
render
```

### Idle Pattern (frame budget)

`state.budget()` returns the milliseconds left in the current frame before it exceeds the budget (`1000 / Tempus.targetFps`, default 60fps ≈ 16.67ms). It's the live equivalent of `requestIdleCallback`'s `timeRemaining()`, so you can gate optional or expensive work and avoid blocking the main thread:

```javascript
// run only when there's spare frame time left
Tempus.add(({ budget }) => {
  if (budget() > 0) doExpensiveWork()
})

// or chew through work in chunks until the budget runs out.
// budget() is live, so calling it again inside the loop reflects time already spent.
Tempus.add((state) => {
  while (state.budget() > 0) {
    doChunkOfWork()
  }
})
```

Tune the target with `Tempus.targetFps` (default `60`). Note this is *frame-budget* idle — leftover time before the frame is over budget — not the browser's true post-paint idle. For genuine background work, prefer native `requestIdleCallback`.

### Ping Pong Technique

`ping` and `pong` will alternate between each frame, but never during the same frame

```javascript
Tempus.add(({ frame }) => {
  if (frame % 2 === 0) {
    console.log('ping')
  } else {
    console.log('pong')
  }
})
```

### Global RAF Patching

```javascript
// Patch native requestAnimationFrame across all your app
Tempus.patch()
// Now any requestAnimationFrame recursive calls will use Tempus
```

## Integration Examples

### With Lenis Smooth Scroll
```javascript
// lenis.raf expects a time in ms, so pull it off the state object
Tempus.add(({ time }) => lenis.raf(time))
```

### With GSAP
```javascript
// Remove GSAP's internal RAF
gsap.ticker.remove(gsap.updateRoot)

// Add to Tempus
Tempus.add(({ time }) => {
  gsap.updateRoot(time / 1000)
})
```

### With Three.js
```javascript
Tempus.add(() => {
  renderer.render(scene, camera)
}, { order: 1 })
// the render will happen after other rafs
// so it can be synched with lenis for instance
```

## API Reference

### Tempus.add(callback, options)

Adds an animation callback to the loop.

- **callback**: `(state: TempusState) => void`, where `TempusState` is:
  - `time`: `number` - Elapsed time in ms since the loop started
  - `deltaTime`: `number` - Time in ms since this callback's previous run
  - `frame`: `number` - Frame counter
  - `budget`: `() => number` - Call it for the ms left in the current frame before exceeding the budget (live)
- **options**:
  - `order`: `number` (default: 0) - Sort key for execution order; lower runs first (like CSS `order`)
  - `priority`: `number` - **Deprecated** alias for `order`
  - `fps`: `number` (default: Infinity) - Target frame rate
- **Returns**: `() => void` - Unsubscribe function

### Tempus.targetFps

`number` (default: `60`). The frame rate `state.budget()` is measured against — the budget per frame is `1000 / Tempus.targetFps` ms.

### Tempus.patch()

Patches the native `requestAnimationFrame` to use Tempus.

### Tempus.unpatch()

Unpatches the native `requestAnimationFrame` to use the original one.

## Best Practices

- Order callbacks deliberately: things others depend on (like scroll) should run first — give them a lower `order` (e.g. `-1`)
- Clean up animations when they're no longer needed
- Consider using specific FPS for non-critical animations to improve performance (e.g: collisions)
- Gate optional or expensive work on `state.budget()` so it yields when the frame is full
- Use Ping Pong technique for heavy computations running concurrently

## License

MIT © [darkroom.engineering](https://github.com/darkroomengineering)

# Shoutout

Thank you to [Keith Cirkel](https://github.com/keithamus) for having transfered us the npm package name 🙏.