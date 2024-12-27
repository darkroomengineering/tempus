export type TempusCallback = (time: number, deltaTime: number) => void

export type TempusOptions = {
  priority?: number
  fps?: number
}

export type UID = number
