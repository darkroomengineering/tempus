// Infinity = max FPS (system default)

import { version } from '../../../package.json'
import Clock from './clock'
import { type Ordered, normalizeOrder, sortByOrder } from './order'
import { type Throttled, ticks } from './throttle'
import type {
  TempusCallback,
  TempusCallbackInfo,
  TempusOptions,
  TempusState,
  UID,
} from './types'
import { getUID } from './uid'

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

// How many recent per-frame durations to retain per callback — shared by both
// Tempus.add() callbacks and loops absorbed by Tempus.patch() so timing is
// sampled identically everywhere.
const SAMPLE_WINDOW = 60

// Record a per-frame duration in a rolling window, mutating in place.
function pushSample(samples: number[], duration: number) {
  samples.push(duration)
  if (samples.length > SAMPLE_WINDOW) samples.shift()
}

// Drop an absorbed loop's row once it hasn't run for this many frames (it
// stopped rescheduling), so dead loops disappear from the profiler view.
const PATCH_STALE_FRAMES = 120

type PatchEntry = {
  callback: FrameRequestCallback
  label: string
  samples: number[]
  lastFrame: number
}

// One Tempus.add() registration. Lives in a single list sorted by `order` /
// `before` / `after` across every fps; `fps` only decides which frames it runs.
type Entry = Ordered &
  Throttled & {
    callback: TempusCallback
    uid: UID
    samples: number[]
    // Clock time of its last run, so throttled callbacks get the real delta.
    lastTime?: number
  }

class TempusImpl {
  callbacks: Entry[] = []
  clock = new Clock()
  fps?: number
  usage = 0
  private rafId: number | undefined
  frameCount = 0

  // Frame rate the per-callback `budget` is measured against. At 60fps the
  // budget is ~16.67ms; callbacks call `state.budget()` to see how much of it
  // is left and decide whether to do expensive work this frame.
  targetFps = 60
  private frameStartTime = performance.now()

  get frameBudget() {
    return 1000 / this.targetFps
  }

  // The single object handed to every callback each tick. Reused (not
  // reallocated) to avoid per-frame GC; `budget()` is a live method (built in
  // the constructor) so it always reflects the time left at the moment called.
  private state!: TempusState

  // patch() state
  private patched = false
  private rafQueue = new Map<number, FrameRequestCallback>()
  private rafHandleId = 0
  private patchedRAF?: typeof window.requestAnimationFrame
  private patchedCancelRAF?: typeof window.cancelAnimationFrame
  private flushUnsubscribe?: () => void
  // The shim callback that drains the rAF queue; inspect() reports the
  // absorbed loops in its slot instead of the shim itself.
  private flush?: TempusCallback
  // Per-absorbed-callback timing, keyed by the callback identity so a
  // self-rescheduling loop keeps one stable row across frames. The map and
  // array hold the SAME entry objects — the array stays enumerable for the
  // profiler view, the map gives O(1) identity lookup.
  private patchMeta = new WeakMap<FrameRequestCallback, PatchEntry>()
  private patchEntries: PatchEntry[] = []
  private patchAnonCount = 0

  constructor() {
    const impl = this
    this.state = {
      time: 0,
      deltaTime: 0,
      frame: 0,
      budget() {
        return impl.frameBudget - (performance.now() - impl.frameStartTime)
      },
    }

    if (!isClient) return

    this.play()
  }

  restart() {
    if (this.rafId) {
      originalCancelRAF(this.rafId)
    }
    this.frameCount = 0

    for (const entry of this.callbacks) {
      entry.lastTime = undefined
      entry.lastSlot = -1
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
      order,
      priority,
      fps = Number.POSITIVE_INFINITY,
      label = '',
    }: TempusOptions = {}
  ) {
    if (!isClient) return

    if (typeof callback !== 'function') {
      console.warn('Tempus.add: callback is not a function')
      return
    }

    if (
      typeof fps !== 'number' &&
      !(typeof fps === 'string' && fps.endsWith('%'))
    ) {
      console.warn(
        'Tempus.add: fps is not a number or a string ending with "%"'
      )
      return
    }

    const uid = getUID()
    // Re-resolve the whole list so a `before`/`after` naming a label that
    // registers later still binds. `priority` is the deprecated alias for
    // `order`; `order` wins when both are set.
    this.callbacks = sortByOrder([
      ...this.callbacks,
      {
        callback,
        uid,
        label,
        fps,
        samples: [],
        lastSlot: -1,
        ...normalizeOrder(order ?? priority ?? 0),
      },
    ])

    return () => {
      // Re-resolve: constraints that pointed at the removed label go dormant
      // and everything settles back to its own order.
      this.callbacks = sortByOrder(
        this.callbacks.filter((entry) => entry.uid !== uid)
      )
    }
  }

  private raf = (browserElapsed: number) => {
    if (!isClient) return

    this.clock.update(browserElapsed)

    const elapsed = this.clock.time
    const deltaTime = this.clock.deltaTime

    this.fps = 1000 / deltaTime
    this.frameStartTime = performance.now()

    this.state.time = elapsed
    this.state.deltaTime = deltaTime
    this.state.frame = this.frameCount

    const duration = stopwatch(() => {
      for (let i = 0; i < this.callbacks.length; i++) {
        const entry = this.callbacks[i]
        if (!entry || !ticks(entry, elapsed, this.frameCount)) continue

        // Throttled callbacks report the longer delta since they last ran;
        // override on the shared state for this call, then restore.
        this.state.deltaTime =
          entry.lastTime === undefined ? deltaTime : elapsed - entry.lastTime
        entry.lastTime = elapsed

        pushSample(
          entry.samples,
          stopwatch(() => entry.callback(this.state))
        )

        this.state.deltaTime = deltaTime
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
    this.flush = () => {
      if (this.rafQueue.size === 0) return

      // Snapshot then clear: callbacks that re-register during the flush
      // run NEXT frame, matching native one-shot rAF semantics (so a tight
      // requestAnimationFrame(loop) doesn't recurse synchronously forever).
      const batch = Array.from(this.rafQueue.values())
      this.rafQueue.clear()

      // Pass a performance.now()-comparable timestamp, as the browser does.
      const now = performance.now()
      const frame = this.frameCount
      for (const callback of batch) {
        // Time each absorbed loop individually and attribute it to a stable
        // row keyed by callback identity, so tempus/profiler can break the
        // single shim slot back down into per-loop cost.
        let meta = this.patchMeta.get(callback)
        if (!meta) {
          meta = {
            callback,
            label: callback.name || `anonymous#${++this.patchAnonCount}`,
            samples: [],
            lastFrame: frame,
          }
          this.patchMeta.set(callback, meta)
          this.patchEntries.push(meta)
        }

        const duration = stopwatch(() => {
          try {
            callback(now)
          } catch (error) {
            console.error('Tempus.patch: rAF callback threw', error)
          }
        })

        pushSample(meta.samples, duration)
        meta.lastFrame = frame
      }

      this.prunePatchEntries(frame)
    }
    this.flushUnsubscribe = this.add(this.flush, { label: 'tempus' })

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
    this.flush = undefined
    this.rafQueue.clear()
    this.patchedRAF = undefined
    this.patchedCancelRAF = undefined
    this.patchMeta = new WeakMap()
    this.patchEntries = []
    this.patchAnonCount = 0
    this.patched = false
  }

  // Drop rows for loops that stopped rescheduling, so they fall off the
  // profiler view instead of lingering as stale 0ms entries.
  private prunePatchEntries(frame: number) {
    for (let i = this.patchEntries.length - 1; i >= 0; i--) {
      const entry = this.patchEntries[i]!
      if (frame - entry.lastFrame > PATCH_STALE_FRAMES) {
        this.patchMeta.delete(entry.callback)
        this.patchEntries.splice(i, 1)
      }
    }
  }

  // Unified timing snapshot for tempus/profiler: every Tempus.add() callback and
  // every loop absorbed by Tempus.patch(), normalized to one shape. Samples
  // are copied so consumers can't mutate live state.
  inspect(): TempusCallbackInfo[] {
    const rows: TempusCallbackInfo[] = []
    for (const entry of this.callbacks) {
      // Absorbed loops run inside the shim's slot, in reschedule order: list
      // them in its place. The shim's own duration is their sum, so its row
      // would only double count.
      if (entry.callback === this.flush) {
        for (const loop of this.patchEntries) {
          rows.push({
            label: loop.label,
            samples: loop.samples.slice(),
            order: entry.order,
            before: [],
            after: [],
            fps: Number.POSITIVE_INFINITY,
            source: 'patch',
          })
        }
        continue
      }
      rows.push({
        label: entry.label,
        samples: entry.samples.slice(),
        order: entry.order,
        before: entry.before,
        after: entry.after,
        fps: entry.fps,
        source: 'add',
      })
    }
    return rows
  }
}

const Tempus = new TempusImpl()

export { Tempus }
