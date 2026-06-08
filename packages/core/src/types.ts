export type TempusCallback = (
  time: number,
  deltaTime: number,
  frameCount: number
) => void

export type TempusOptions = {
  priority?: number
  fps?: number | string
  label?: string
  idle?: number
}

export type UID = number

// Normalized per-callback timing returned by Tempus.inspect(), consumed by
// tempus/debug. Covers both Tempus.add() callbacks (source: 'add') and loops
// absorbed by Tempus.patch() (source: 'patch') with a single shape.
export type TempusCallbackInfo = {
  label: string
  samples: number[]
  priority: number
  fps: number | string
  idle: number
  source: 'add' | 'patch'
}
