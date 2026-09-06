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

// Run relative to other callbacks by `label`. `before`/`after` are hard
// constraints — a label names every callback registered with it — and take a
// single label or an array. Unknown labels are ignored until they register.
export type TempusOrderConstraint = {
  before?: string | string[]
  after?: string | string[]
}

export type TempusOrder = number | TempusOrderConstraint

export type TempusOptions = {
  // Sort key for execution order within a frame — lower runs first, like CSS
  // `order`. Default 0. Negative values run before the default, positive after.
  // Or a `{ before, after }` constraint on other callbacks' labels; the numeric
  // key then only breaks ties between callbacks free to run.
  order?: TempusOrder
  /** @deprecated Use `order` instead. Kept as an alias for backwards compat. */
  priority?: number
  fps?: number | string
  label?: string
}

export type UID = number

// Normalized per-callback timing returned by Tempus.inspect(), consumed by
// tempus/profiler. Covers both Tempus.add() callbacks (source: 'add') and loops
// absorbed by Tempus.patch() (source: 'patch') with a single shape.
export type TempusCallbackInfo = {
  label: string
  samples: number[]
  order: number
  // Label constraints this callback was registered with (empty when none).
  before: string[]
  after: string[]
  fps: number | string
  source: 'add' | 'patch'
}
