## Installation

```bash
$ npm i @studio-freight/tempus
```

## Usage

```javascript
import { raf } from '@studio-freight/tempus'

function onFrame(time, deltaTime) {
     called every frame
}

// subscribe
const id = raf.add(onFrame, 0)

// unsubscribe
raf.remove(id)
```

## Methods

- `add(callback, priority)`
- `remove(id)`
