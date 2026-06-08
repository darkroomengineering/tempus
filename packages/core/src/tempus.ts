// Infinity = max FPS (system default)

import Clock from './clock'
import type { TempusCallback, TempusOptions, UID } from './types'
import { getUID } from './uid'
import { version } from '../../../package.json'

const isClient = typeof window !== 'undefined'

// Bound so they can be called bare (`originalRAF(cb)`) without "Illegal
// invocation" — native rAF requires `this === window` in some browsers.
const originalRAF = (isClient &&
  window.requestAnimationFrame.bind(
    window
  )) as typeof window.requestAnimationFrame
const originalCancelRAF = (isClient &&
  window.cancelAnimationFrame.bind(
    window
  )) as typeof window.cancelAnimationFrame

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

  // patch() state
  private patched = false
  private rafQueue = new Map<number, FrameRequestCallback>()
  private rafHandleId = 0
  private patchedRAF?: typeof window.requestAnimationFrame
  private patchedCancelRAF?: typeof window.cancelAnimationFrame
  private flushUnsubscribe?: () => void

  constructor() {
    if (!isClient) return

    this.play()
  }

  restart() {
    if (this.rafId) {
      originalCancelRAF(this.rafId)
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
    this.rafId = originalRAF(this.raf)
  }

  pause() {
    if (!isClient || !this.rafId || !this.clock.isPlaying) return

    originalCancelRAF(this.rafId)
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

    this.rafId = originalRAF(this.raf)
  }

  patch() {
    if (!isClient || this.patched) return
    this.patched = true

    // A single Tempus subscription drains the rAF queue once per frame.
    // Every patched rAF callback is absorbed — no detection, no string
    // matching, so minified/third-party/arrow/bound loops all work.
    this.flushUnsubscribe = this.add(
      () => {
        if (this.rafQueue.size === 0) return

        // Snapshot then clear: callbacks that re-register during the flush
        // run NEXT frame, matching native one-shot rAF semantics (so a tight
        // requestAnimationFrame(loop) doesn't recurse synchronously forever).
        const batch = Array.from(this.rafQueue.values())
        this.rafQueue.clear()

        // Pass a performance.now()-comparable timestamp, as the browser does.
        const now = performance.now()
        for (const callback of batch) {
          try {
            callback(now)
          } catch (error) {
            console.error('Tempus.patch: rAF callback threw', error)
          }
        }
      },
      { label: 'tempus' }
    )

    this.patchedRAF = ((callback: FrameRequestCallback): number => {
      const id = ++this.rafHandleId
      this.rafQueue.set(id, callback)
      return id
    }) as typeof window.requestAnimationFrame
    window.requestAnimationFrame = this.patchedRAF

    this.patchedCancelRAF = ((handle: number): void => {
      this.rafQueue.delete(handle)
    }) as typeof window.cancelAnimationFrame
    window.cancelAnimationFrame = this.patchedCancelRAF
  }

  unpatch() {
    if (!isClient || !this.patched) return

    // Only restore if nobody else re-patched on top of us, otherwise we'd
    // clobber their wrapper.
    if (window.requestAnimationFrame === this.patchedRAF) {
      window.requestAnimationFrame = originalRAF
    }
    if (window.cancelAnimationFrame === this.patchedCancelRAF) {
      window.cancelAnimationFrame = originalCancelRAF
    }

    this.flushUnsubscribe?.()
    this.flushUnsubscribe = undefined
    this.rafQueue.clear()
    this.patchedRAF = undefined
    this.patchedCancelRAF = undefined
    this.patched = false
  }
}

const Tempus = new TempusImpl()

export { Tempus }
