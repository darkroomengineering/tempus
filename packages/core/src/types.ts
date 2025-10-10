export type TempusCallback = (
  time: number,
  deltaTime: number,
  frameCount: number
) => void

export type TempusOptions = {
  priority?: number
  fps?: number | string
  label?: string
}

export type UID = number
