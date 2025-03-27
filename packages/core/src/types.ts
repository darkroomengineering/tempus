export type TempusCallback = (time: number, deltaTime: number) => void

export type TempusOptions = {
  priority?: number
  fps?: number
  label?: string
}

export type UID = number
