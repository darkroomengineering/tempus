## Installation

```bash
$ npm i @studio-freight/tempus
```

## Usage

```javascript
import { raf } from '@studio-freight/tempus'

function onFrame(time, deltaTime) {
  // called every frame
}

// subscribe
const unsubscribe = raf.add(onFrame, 0)

// unsubscribe
unsubscribe()
raf.remove(onFrame)
```

## Methods

- `add(callback, priority)`
- `remove(callback)`
