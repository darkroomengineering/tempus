# Tempus

[![TEMPUS](https://assets.darkroom.engineering/tempus/banner.gif)](https://github.com/darkroomengineering/tempus)

## Introduction

`tempus` means time in Latin, this package is a lightweight, high-performance animation frame manager for JavaScript applications.

## Packages

- [tempus](./README.md)
- [tempus/react](./packages/react/README.md)

## Features

- **One shared rAF loop** — merges every requestAnimationFrame call into a single loop to cut per-frame overhead
- **Priority ordering** — run animations in an explicit order each frame instead of registration order
- **Custom frame rates** — throttle callbacks to a target FPS independent of the display refresh
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

// Simple animation at maximum FPS
function animate(time, deltaTime) {
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

### Priority System

`——[-Infinity]——[0]——[Infinity]——> execution order`


#### Input
```javascript
// Default priority: 0 (runs second)
Tempus.add(() => console.log('animate'))

// Priority: 1 (runs third)
Tempus.add(() => console.log('render'), { priority: 1 })

// Priority: -1 (runs first)
Tempus.add(() => console.log('scroll'), { priority: -1 })
```
#### Output

```
scroll
animate
render
```

### Idle Callback

`idle` callback will only run when the usage is less than the idle percentage in order to not block the main thread. It's useful for optional background tasks.

```javascript
Tempus.add(() => console.log('idle'), { idle: 0.8 }) // will only run when the raf usage is less than 80%
```

### Ping Pong Technique

`ping` and `pong` will alternate between each frame, but never during the same frame

```javascript
let framesCount = 0

Tempus.add(() => {
  if (framesCount === 0) {
    console.log('ping')
  } else {
    console.log('pong')
  }

  framesCount++
  framesCount %= 2
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
Tempus.add(lenis.raf)
```

### With GSAP
```javascript
// Remove GSAP's internal RAF
gsap.ticker.remove(gsap.updateRoot)

// Add to Tempus
Tempus.add((time) => {
  gsap.updateRoot(time / 1000)
})
```

### With Three.js
```javascript
Tempus.add(() => {
  renderer.render(scene, camera)
}, { priority: 1 })
// the render will happen after other rafs
// so it can be synched with lenis for instance
```

## API Reference

### Tempus.add(callback, options)

Adds an animation callback to the loop.

- **callback**: `(time: number, deltaTime: number, frameCount: number) => void`
- **options**:
  - `priority`: `number` (default: 0) - Lower numbers run first
  - `fps`: `number` (default: Infinity) - Target frame rate
- **Returns**: `() => void` - Unsubscribe function

### Tempus.patch()

Patches the native `requestAnimationFrame` to use Tempus.

### Tempus.unpatch()

Unpatches the native `requestAnimationFrame` to use the original one.

## Best Practices

- Use priorities wisely: critical animations (like scroll) should have higher priority
- Clean up animations when they're no longer needed
- Consider using specific FPS for non-critical animations to improve performance (e.g: collisions)
- Use Ping Pong technique for heavy computations running concurrently

## License

MIT © [darkroom.engineering](https://github.com/darkroomengineering)

# Shoutout

Thank you to [Keith Cirkel](https://github.com/keithamus) for having transfered us the npm package name 🙏.