# Tempus/react

## Basic Usage

```js
import { useTempus } from 'tempus/react'

function App() {  
  useTempus((time, deltaTime, frameCount) => {
    console.log('frame', time, deltaTime, frameCount)
  })
}
```

## Options

```js
useTempus(() => {}, { 
  fps: 30, // Will run at 30 FPS
  priority: -1, // Will run before other animations
})
```

## Patching requestAnimationFrame

```js
import { ReactTempus } from 'tempus/react'

<ReactTempus patch />
```
