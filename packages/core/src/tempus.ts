// Infinity = max FPS (system default)

import type { TempusCallback, TempusOptions, UID } from './types'
import { getUID } from './uid'

const isClient = typeof window !== 'undefined'

const originalRAF = (isClient &&
  window.requestAnimationFrame) as typeof window.requestAnimationFrame
const originalCancelRAF = (isClient &&
  window.cancelAnimationFrame) as typeof window.cancelAnimationFrame

class Clock {
  private startTime: number = 0
  private elapsed: number = 0
  private _isPlaying: boolean = false
  private _deltaTime: number = 0
  private needsReset: boolean = true

  play() {
    if (this._isPlaying) return
    this.startTime = performance.now() - this.elapsed
    this._isPlaying = true
  }

  pause() {
    if (!this._isPlaying) return
    this._deltaTime = 0
    this._isPlaying = false
    this.needsReset = true
  }

  reset() {
    this.elapsed = 0
    this.startTime = 0
    this._deltaTime = 0
    this._isPlaying = false
    this.needsReset = true
  }

  update(browserTime: number) {
    if (!this._isPlaying) return

    if (this.needsReset) {
      this.startTime = browserTime
      this.needsReset = false
    } else {
      const newElapsed = browserTime - this.startTime
      const newDelta = newElapsed - this.elapsed

      this._deltaTime = newDelta
      this.elapsed = newElapsed
    }
  }

  get time() {
    return this.elapsed
  }

  get isPlaying() {
    return this._isPlaying
  }

  get deltaTime() {
    return this._deltaTime
  }
}

class Framerate {
  callbacks: {
    callback: TempusCallback
    priority: number
    uid: UID
    label: string
    samples: number[]
  }[] = []
  fps: number | string
  time = 0
  lastTickDate = performance.now()
  framesCount = 0

  constructor(fps: number | string = Number.POSITIVE_INFINITY) {
    this.fps = fps
  }

  get isRelativeFps() {
    // eg: '33%'
    return typeof this.fps === 'string' && this.fps.endsWith('%')
  }

  get maxFramesCount() {
    if (!this.isRelativeFps) return 1

    // @ts-ignore
    return Math.max(1, Math.round(100 / Number(this.fps.replace('%', ''))))
  }

  get executionTime() {
    if (this.isRelativeFps) return 0

    // @ts-ignore
    return 1000 / this.fps
  }

  dispatch(time: number, deltaTime: number) {
    for (let i = 0; i < this.callbacks.length; i++) {
      const now = performance.now()

      this.callbacks[i]?.callback(time, deltaTime)

      const duration = performance.now() - now

      this.callbacks[i]!.samples?.push(duration)
      this.callbacks[i]!.samples = this.callbacks[i]!.samples?.slice(-9)
    }
  }

  raf(time: number, deltaTime: number) {
    this.time += deltaTime

    if (this.isRelativeFps) {
      if (this.framesCount === 0) {
        this.dispatch(time, deltaTime)
      }

      this.framesCount++
      this.framesCount %= this.maxFramesCount
    } else {
      if (this.fps === Number.POSITIVE_INFINITY) {
        this.dispatch(time, deltaTime)
      } else if (this.time >= this.executionTime) {
        this.time = this.time % this.executionTime
        const deltaTime = time - this.lastTickDate
        this.lastTickDate = time

        this.dispatch(time, deltaTime)
      }
    }
  }

  add({
    callback,
    priority,
    label,
  }: { callback: TempusCallback; priority: number; label: string }) {
    if (typeof callback !== 'function') {
      console.warn('Tempus.add: callback is not a function')
      return
    }

    const uid = getUID()
    this.callbacks.push({ callback, priority, uid, label, samples: [] })
    this.callbacks.sort((a, b) => a.priority - b.priority)

    return () => this.remove(uid)
  }

  remove(uid: UID) {
    this.callbacks = this.callbacks.filter(({ uid: u }) => uid !== u)
  }
}

class TempusImpl {
  framerates: Record<number | string, Framerate>
  clock: Clock
  fps?: number
  usage: number
  rafId: number | undefined

  constructor() {
    this.framerates = {}

    this.clock = new Clock()
    this.usage = 0
    if (!isClient) return

    this.play()
  }

  restart() {
    if (this.rafId) { 
      cancelAnimationFrame(this.rafId)
    }

    for (const framerate of Object.values(this.framerates)) {
      framerate.framesCount = 0
      framerate.time = 0
      framerate.lastTickDate = performance.now()
    }

    this.clock.reset()
    this.play()
  }

  play() {
    if (!isClient || this.clock.isPlaying) return

    this.clock.play()
    this.rafId = requestAnimationFrame(this.raf)
  }

  pause() {
    if (!isClient || !this.rafId || !this.clock.isPlaying) return

    cancelAnimationFrame(this.rafId)
    this.rafId = undefined
    this.clock.pause()
  }

  get isPlaying() {
    return this.clock.isPlaying
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

    if (
      typeof fps === 'number' ||
      (typeof fps === 'string' && fps.endsWith('%'))
    ) {
      if (!this.framerates[fps]) this.framerates[fps] = new Framerate(fps)
      return this.framerates[fps].add({ callback, priority, label })
    }

    console.warn('Tempus.add: fps is not a number or a string ending with "%"')
  }

  private raf = (browserElapsed: number) => {
    if (!isClient) return
    
    this.clock.update(browserElapsed)

    const elapsed = this.clock.time
    const deltaTime = this.clock.deltaTime

    console.log({ deltaTime, elapsed })

    this.fps = 1000 / deltaTime

    const now = performance.now()

    for (const framerate of Object.values(this.framerates)) {
      framerate.raf(elapsed, deltaTime)
    }

    const duration = performance.now() - now

    this.usage = duration / deltaTime

    this.rafId = requestAnimationFrame(this.raf)
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
