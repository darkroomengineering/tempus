## Installation

```bash
$ npm i @studio-freight/tempus
```

## Usage

```javascript
import Tempus from '@studio-freight/tempus'

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
