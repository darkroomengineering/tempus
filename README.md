## Installation

```bash
$ npm i @studio-freighttempus
```

## Usage

```javascript
import { raf } from '@studio-freighttempus'

function onFrame(time, deltaTime) {
     called every frame
}

 subscribe
const id = raf.add(onFrame, 0)

 unsubscribe
raf.remove(id)
```

## Methods

- `add(callback, priority)`
- `remove(id)`

