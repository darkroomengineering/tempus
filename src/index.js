// Infinity = max FPS (system default)

import { getUID } from './uid'

class Framerate {
  constructor(fps = Infinity) {
    this.callbacks = []
    this.fps = fps
    this.now = performance.now()
    this.lastTickDate = performance.now()
  }

  get executionTime() {
    return 1000 / this.fps
  }

  dispatch(now, deltaTime) {
    for (let i = 0; i < this.callbacks.length; i++) {
      this.callbacks[i].callback(now, deltaTime)
    }
  }

  raf(now, deltaTime) {
    this.now += deltaTime

    if (this.fps === Infinity) {
      this.dispatch(now, deltaTime)
    } else if (this.now >= this.executionTime) {
      this.now = this.now % this.executionTime
      const deltaTime = now - this.lastTickDate
      this.lastTickDate = now

      this.dispatch(now, deltaTime)
    }
  }

  add({ callback, priority }) {
    const uid = getUID()
    this.callbacks.push({ callback, priority, uid })
    this.callbacks.sort((a, b) => a.priority - b.priority)

    return () => this.remove(uid)
  }

  remove(uid) {
    this.callbacks = this.callbacks.filter(({ uid: u }) => uid !== u)
  }
}

class Tempus {
  constructor() {
    this.framerates = {}
    this.now = performance.now()
    requestAnimationFrame(this.raf)
  }

  add(callback, { priority = 0, fps = Infinity } = {}) {
    if (typeof fps === 'number') {
      if (!this.framerates[fps]) this.framerates[fps] = new Framerate(fps)

      return this.framerates[fps].add({ callback, priority })
    }
  }

  remove(uid, { fps = Infinity } = {}) {
    if (typeof fps === 'number') {
      this.framerates[fps].remove(uid)
    }
  }

  raf = (now) => {
    requestAnimationFrame(this.raf, true)

    const deltaTime = now - this.now
    this.now = now

    for (const framerate of Object.values(this.framerates)) {
      framerate.raf(now, deltaTime)
    }
  }

  patch() {
    console.log('Tempus is taking over the rAf')
    const originalRAF = window.requestAnimationFrame
    const originalCancelRAF = window.cancelAnimationFrame

    window.requestAnimationFrame = (callback, { priority = 0, fps = Infinity } = {}) => {
      if (callback === this.raf) {
        return originalRAF(callback)
      }

      if (!callback.patched) {
        const remove = this.add(callback, { priority, fps })
        callback.patched = true
        callback.remove = remove
      }

      return callback.remove
    }

    window.cancelAnimationFrame = (callback) => {
      if (typeof callback === 'function') callback?.()

      return originalCancelRAF(callback)
    }
  }
}

const isClient = typeof window !== 'undefined'

export default isClient && new Tempus()
