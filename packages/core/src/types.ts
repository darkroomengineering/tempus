// The single object passed to every Tempus callback each tick. `budget()`
// returns the live remaining frame time in ms (= the browser IdleDeadline's
// timeRemaining): positive means headroom, negative means the frame is already
// over budget. Gate expensive work on it, e.g. `if (budget() > 0) doWork()`.
export type TempusState = {
  time: number
  deltaTime: number
  frame: number
  budget: () => number
}

export type TempusCallback = (state: TempusState) => void

export type TempusOptions = {
  // Sort key for execution order within a frame — lower runs first, like CSS
  // `order`. Default 0. Negative values run before the default, positive after.
  order?: number
  /** @deprecated Use `order` instead. Kept as an alias for backwards compat. */
  priority?: number
  fps?: number | string
  label?: string
}

export type UID = number

// Normalized per-callback timing returned by Tempus.inspect(), consumed by
// tempus/debug. Covers both Tempus.add() callbacks (source: 'add') and loops
// absorbed by Tempus.patch() (source: 'patch') with a single shape.
export type TempusCallbackInfo = {
  label: string
  samples: number[]
  order: number
  fps: number | string
  source: 'add' | 'patch'
}
