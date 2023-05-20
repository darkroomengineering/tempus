const isClient = typeof window !== 'undefined'

class Tempus {
  constructor() {
    this.callbacks = []
    this.tempusId = 0
    this.now = performance.now()
    requestAnimationFrame(this.raf)
  }

  add(callback, priority = 0) {
    this.tempusId++
    this.callbacks.push({ callback, priority, id: this.tempusId})
    this.callbacks.sort((a, b) => a.priority - b.priority)

    return () => this.remove({tempusId: this.tempusId})
  }

  remove({tempusId}) {
    this.callbacks = this.callbacks.filter(({ id }) =>  tempusId !== id )
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

