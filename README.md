# Tempus

[![TEMPUS](https://assets.darkroom.engineering/tempus/banner.gif)](https://github.com/darkroomengineering/tempus)

## Introduction

`tempus` means time in Latin, this package is a lightweight, high-performance animation frame manager for JavaScript applications.

## Packages

- [tempus](./README.md)
- [tempus/react](./packages/react/README.md)

## Features

- 🚀 Merge multiple requestAnimationFrame loops for better performance
- 🎯 Control execution priority of different animations
- ⚡ Support for custom frame rates (FPS)
- 🔄 Compatible with popular animation libraries
- 🪶 Zero dependencies
- 📦 ~1KB gzipped

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
<script src="https://unpkg.com/tempus@1.0.0-dev.9/dist/tempus.min.js"></script> 
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

### React

See [tempus/react](./packages/react/README.md)

## Advanced Usage

### Custom Frame Rates

```javascript
Tempus.add(animate, { 
  fps: 30 // Will run at 30 FPS
})
```

### Priority System

```javascript
// Higher priority (runs first)
Tempus.add(criticalAnimation, { priority: -1 })

// Lower priority (runs after)
Tempus.add(secondaryAnimation)
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

- **callback**: `(time: number, deltaTime: number) => void`
- **options**:
  - `priority`: `number` (default: 0) - Lower numbers run first
  - `fps`: `number` (default: Infinity) - Target frame rate
- **Returns**: `() => void` - Unsubscribe function

### Tempus.patch()

Patches the native `requestAnimationFrame` to use Tempus.

## Best Practices

- Use priorities wisely: critical animations (like scroll) should have higher priority
- Clean up animations when they're no longer needed
- Consider using specific FPS for non-critical animations to improve performance (e.g: collisions)

## License

MIT © [darkroom.engineering](https://github.com/darkroomengineering)

# Shoutout

Thank you to [Keith Cirkel](https://github.com/keithamus) for having transfered us the npm package name 🙏.