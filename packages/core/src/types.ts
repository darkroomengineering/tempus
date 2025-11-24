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
