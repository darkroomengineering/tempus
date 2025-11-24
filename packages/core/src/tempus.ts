// Infinity = max FPS (system default)

import Clock from './clock'
import type { TempusCallback, TempusOptions, UID } from './types'
import { getUID } from './uid'
import { version } from '../../../package.json'

const isClient = typeof window !== 'undefined'

const originalRAF = (isClient &&
  window.requestAnimationFrame) as typeof window.requestAnimationFrame
const originalCancelRAF = (isClient &&
  window.cancelAnimationFrame) as typeof window.cancelAnimationFrame

if (isClient) {
  ;(window as any).tempusVersion = version
}

function stopwatch(callback: () => void) {
  const now = performance.now()
  callback()
  return performance.now() - now
}

class Framerate {
  callbacks: {
    callback: TempusCallback
    priority: number
    uid: UID
    label: string
    samples: number[]
    idle: number
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

  dispatch(time: number, deltaTime: number, frameCount: number) {
    for (let i = 0; i < this.callbacks.length; i++) {
      const duration = stopwatch(() => {
        if (
          (this.callbacks[i]?.idle ?? Number.POSITIVE_INFINITY) > Tempus.usage
        ) {
          this.callbacks[i]?.callback(time, deltaTime, frameCount)
        }
      })

      this.callbacks[i]!.samples?.push(duration)
      this.callbacks[i]!.samples = this.callbacks[i]!.samples?.slice(-9)
    }
  }

  raf(time: number, deltaTime: number, frameCount: number) {
    this.time += deltaTime

    if (this.isRelativeFps) {
      if (this.framesCount === 0) {
        this.dispatch(time, deltaTime, frameCount)
      }

      this.framesCount++
      this.framesCount %= this.maxFramesCount
    } else {
      if (this.fps === Number.POSITIVE_INFINITY) {
        this.dispatch(time, deltaTime, frameCount)
      } else if (this.time >= this.executionTime) {
        this.time = this.time % this.executionTime
        const deltaTime = time - this.lastTickDate
        this.lastTickDate = time

        this.dispatch(time, deltaTime, frameCount)
      }
    }
  }

  add({
    callback,
    priority,
    label,
    idle,
  }: {
    callback: TempusCallback
    priority: number
    label: string
    idle: number
  }) {
    if (typeof callback !== 'function') {
      console.warn('Tempus.add: callback is not a function')
      return
    }

    const uid = getUID()
    this.callbacks.push({ callback, priority, uid, label, samples: [], idle })
    this.callbacks.sort((a, b) => a.priority - b.priority)

    return () => this.remove(uid)
  }

  remove(uid: UID) {
    this.callbacks = this.callbacks.filter(({ uid: u }) => uid !== u)
  }
}

class TempusImpl {
  framerates: Record<number | string, Framerate> = {}
  clock = new Clock()
  fps?: number
  usage = 0
  private rafId: number | undefined
  frameCount = 0

  constructor() {
    if (!isClient) return

    this.play()
  }

  restart() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }
    this.frameCount = 0

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
      idle = Number.POSITIVE_INFINITY,
    }: TempusOptions = {}
  ) {
    if (!isClient) return

    if (
      typeof fps === 'number' ||
      (typeof fps === 'string' && fps.endsWith('%'))
    ) {
      if (!this.framerates[fps]) this.framerates[fps] = new Framerate(fps)
      return this.framerates[fps].add({ callback, priority, label, idle })
    }

    console.warn('Tempus.add: fps is not a number or a string ending with "%"')
  }

  private raf = (browserElapsed: number) => {
    if (!isClient) return

    this.clock.update(browserElapsed)

    const elapsed = this.clock.time
    const deltaTime = this.clock.deltaTime

    this.fps = 1000 / deltaTime

    const duration = stopwatch(() => {
      for (const framerate of Object.values(this.framerates)) {
        framerate.raf(elapsed, deltaTime, this.frameCount)
      }
    })

    if (deltaTime) {
      this.usage = duration / deltaTime
    }

    this.frameCount++

    this.rafId = requestAnimationFrame(this.raf)
  }

  patch() {
    if (!isClient) return

    window.requestAnimationFrame = (
      callback,
      { priority = 0, fps = Number.POSITIVE_INFINITY } = {}
    ) => {
      const stringifiedCallback = callback.toString()

      if (
        (stringifiedCallback.includes(
          `requestAnimationFrame(${callback.name})`
        ) ||
          stringifiedCallback.includes(
            `requestAnimationFrame(this.${callback.name})`
          )) &&
        callback !== this.raf
      ) {
        // @ts-ignore
        if (!callback.__tempusPatched) {
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

      return originalRAF(callback)
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
