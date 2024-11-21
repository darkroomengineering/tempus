// Infinity = max FPS (system default)

import { getUID } from './uid'

class Framerate {
  constructor(fps = Infinity) {
    this.callbacks = []
    this.fps = fps
    this.time = 0
    this.lastTickDate = performance.now()
  }

  get executionTime() {
    return 1000 / this.fps
  }

  dispatch(time, deltaTime) {
    for (let i = 0; i < this.callbacks.length; i++) {
      this.callbacks[i].callback(time, deltaTime)
    }
  }

  raf(time, deltaTime) {
    this.time += deltaTime

    if (this.fps === Infinity) {
      this.dispatch(time, deltaTime)
    } else if (this.time >= this.executionTime) {
      this.time = this.time % this.executionTime
      const deltaTime = time - this.lastTickDate
      this.lastTickDate = time

      this.dispatch(time, deltaTime)
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
    /**
     * @private
     */
    this.framerates = {}

    /**
     * @private
     */
    this.time = performance.now()
    requestAnimationFrame(this.raf)
  }

  /**
   * @param {Function} callback
   * @param {{ priority?: number, fps?: number }} [options]
   * @returns {Function}
   */
  add(callback, { priority = 0, fps = Infinity } = {}) {
    if (typeof fps === 'number') {
      if (!this.framerates[fps]) this.framerates[fps] = new Framerate(fps)

      return this.framerates[fps].add({ callback, priority })
    }
  }

  /**
   * @private
   */
  raf = (time) => {
    requestAnimationFrame(this.raf, true)

    const deltaTime = time - this.time
    this.time = time

    for (const framerate of Object.values(this.framerates)) {
      framerate.raf(time, deltaTime)
    }
  }

  patch() {
    const originalRAF = window.requestAnimationFrame
    const originalCancelRAF = window.cancelAnimationFrame

    window.requestAnimationFrame = (callback, { priority = 0, fps = Infinity } = {}) => {
      if (callback === this.raf || !callback.toString().includes('requestAnimationFrame(')) {
        return originalRAF(callback)
      }

      if (!callback.__tempusPatched) {
        callback.__tempusPatched = true
        callback.__tempusUnsubscribe = this.add(callback, { priority, fps })
      }

      return callback.__tempusUnsubscribe
    }

    window.cancelAnimationFrame = (callback) => {
      if (typeof callback === 'function') callback?.()

      return originalCancelRAF(callback)
    }
  }
}

const isClient = typeof window !== 'undefined'

export default isClient && new Tempus()
