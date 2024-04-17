[![TEMPUS](https://assets.darkroom.engineering/tempus/header.png)](https://github.com/darkroomengineering/tempus)

## Purpose
Tempus allows you to merge all your `requestAnimationFrame` (rAF) loops in one for better performance and gives you better control over their execution priority.

## Installation

```bash
$ npm i @darkroom.engineering/tempus
```

## Usage

```javascript
import Tempus from '@darkroom.engineering/tempus'

function onFrame(time, deltaTime) {
  // called every frame
}

// subscribe
const unsubscribe = Tempus.add(onFrame, 0)

// unsubscribe
unsubscribe()
// OR
Tempus.remove(onFrame)
```

## Methods

- `add(callback, priority)`
- `remove(callback)`

## Examples

### Lenis
```js
Tempus.add((time) => {
  lenis.raf(time)
}, 0);
```

### React
```jsx
import { useFrame } from '@darkroom.engineering/hamo'

function Component() {
  useFrame((time, deltaTime) => {
    // called every frame
  })
}
```

### GSAP
```js
gsap.ticker.remove(gsap.updateRoot);

Tempus.add((time) => {
  gsap.updateRoot(time / 1000);
}, 0);
```