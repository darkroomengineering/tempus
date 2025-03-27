// Infinity = max FPS (system default)

import type { TempusCallback, TempusOptions, UID } from './types'
import { getUID } from './uid'

const isClient = typeof window !== 'undefined'

const originalRAF = (isClient &&
  window.requestAnimationFrame) as typeof window.requestAnimationFrame
const originalCancelRAF = (isClient &&
  window.cancelAnimationFrame) as typeof window.cancelAnimationFrame

class Framerate {
  callbacks: {
    callback: TempusCallback
    priority: number
    uid: UID
    label: string
    durations: number[]
  }[]
  fps: number
  time: number
  lastTickDate: number

  constructor(fps = Number.POSITIVE_INFINITY) {
    this.callbacks = []
    this.fps = fps
    this.time = 0
    this.lastTickDate = performance.now()
  }

  get executionTime() {
    return 1000 / this.fps
  }

  dispatch(time: number, deltaTime: number) {
    for (let i = 0; i < this.callbacks.length; i++) {
      const now = performance.now()

      this.callbacks[i]?.callback(time, deltaTime)

      const duration = performance.now() - now

      this.callbacks[i]!.durations?.push(duration)
      this.callbacks[i]!.durations = this.callbacks[i]!.durations?.slice(-9)
    }
  }

  raf(time: number, deltaTime: number) {
    this.time += deltaTime

    if (this.fps === Number.POSITIVE_INFINITY) {
      this.dispatch(time, deltaTime)
    } else if (this.time >= this.executionTime) {
      this.time = this.time % this.executionTime
      const deltaTime = time - this.lastTickDate
      this.lastTickDate = time

      this.dispatch(time, deltaTime)
    }
  }

  add({
    callback,
    priority,
    label,
  }: { callback: TempusCallback; priority: number; label: string }) {
    if (typeof callback !== 'function')
      console.error('Tempus.add: callback is not a function')

    const uid = getUID()
    this.callbacks.push({ callback, priority, uid, label, durations: [] })
    this.callbacks.sort((a, b) => a.priority - b.priority)

    return () => this.remove(uid)
  }

  remove(uid: UID) {
    this.callbacks = this.callbacks.filter(({ uid: u }) => uid !== u)
  }
}

class TempusImpl {
  private framerates: Record<number, Framerate>
  time: number
  fps?: number
  usage: number

  constructor() {
    this.framerates = {}
    this.time = isClient ? performance.now() : 0
    this.usage = 0

    if (!isClient) return

    requestAnimationFrame(this.raf)
  }

  add(
    callback: TempusCallback,
    {
      priority = 0,
      fps = Number.POSITIVE_INFINITY,
      label = '',
    }: TempusOptions = {}
  ) {
    if (!isClient) return

    if (typeof fps === 'number') {
      if (!this.framerates[fps]) this.framerates[fps] = new Framerate(fps)

      return this.framerates[fps].add({ callback, priority, label })
    }
  }

  private raf = (time: number) => {
    if (!isClient) return

    const deltaTime = time - this.time
    this.time = time

    this.fps = 1000 / deltaTime

    const now = performance.now()
    for (const framerate of Object.values(this.framerates)) {
      framerate.raf(time, deltaTime)
    }

    const duration = performance.now() - now

    this.usage = duration / deltaTime

    // @ts-ignore
    requestAnimationFrame(this.raf, true)
  }

  patch() {
    if (!isClient) return

    window.requestAnimationFrame = (
      callback,
      { priority = 0, fps = Number.POSITIVE_INFINITY } = {}
    ) => {
      if (
        callback === this.raf ||
        !callback.toString().includes('requestAnimationFrame(')
      ) {
        return originalRAF(callback)
      }

      // @ts-ignore
      if (!callback.__tempusPatched) {
        console.log('patching', callback.name, callback)
        // @ts-ignore
        callback.__tempusPatched = true
        // @ts-ignore
        callback.__tempusUnsubscribe = this.add(callback, {
          priority,
          fps,
          label: callback.name,
        })
      }

      // @ts-ignore
      return callback.__tempusUnsubscribe
    }

    window.cancelAnimationFrame = (callback: number | (() => void)) => {
      if (typeof callback === 'function') {
        callback?.()
        return
      }

      return originalCancelRAF(callback)
    }
  }

  unpatch() {
    if (!isClient) return

    window.requestAnimationFrame = originalRAF
    window.cancelAnimationFrame = originalCancelRAF
  }
}

const Tempus = new TempusImpl()

export { Tempus }
