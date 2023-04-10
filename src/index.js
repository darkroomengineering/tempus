const isClient = typeof window !== 'undefined'

class Tempus {
  constructor() {
    this.callbacks = []
    this.now = performance.now()
    requestAnimationFrame(this.raf)
  }

  add(callback, priority = 0) {
    this.callbacks.push({ callback, priority })
    this.callbacks.sort((a, b) => a.priority - b.priority)

    return () => this.remove(callback)
  }

  remove(callback) {
    this.callbacks = this.callbacks.filter(({ callback: cb }) => callback !== cb)
  }

  raf = (now) => {
    requestAnimationFrame(this.raf)

    const deltaTime = now - this.now
    this.now = now

    for (let i = 0; i < this.callbacks.length; i++) {
      this.callbacks[i].callback(now, deltaTime)
    }
  }
}

if (!isClient) console.warn('Tempus can be used in client side only')

export default isClient && new Tempus()
