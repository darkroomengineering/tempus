const isClient = typeof window !== 'undefined'

class Tempus {
  constructor() {
    this.callbacks = new Map()
    this.now = isClient ? performance.now() : 0
    this.isDirty = false
    if (isClient) {
      requestAnimationFrame(this.raf)
    } else {
      console.warn('Tempus can be used in client side only')
    }
  }

  add(callback, priority = 0) {
    if (!this.callbacks.has(priority)) {
      this.callbacks.set(priority, new Set())
    }
    this.callbacks.get(priority).add(callback)
    this.isDirty = true

    return () => this.remove(callback, priority)
  }

  remove(callback, priority) {
    if (this.callbacks.has(priority)) {
      this.callbacks.get(priority).delete(callback)
    }
  }

  raf = (now) => {
    if (isClient) {
      requestAnimationFrame(this.raf)
    }

    const deltaTime = now - this.now
    this.now = now

    if (this.isDirty) {
      this.sortCallbacks()
      this.isDirty = false
    }

    for (let [priority, callbacks] of this.callbacks) {
      for (let callback of callbacks) {
        try {
          callback(now, deltaTime)
        } catch (error) {
          console.error(`Error in Tempus callback with priority ${priority}`, error)
        }
      }
    }
  }

  sortCallbacks() {
    this.callbacks = new Map([...this.callbacks.entries()].sort((a, b) => a[0] - b[0]))
  }
}

export default new Tempus()
