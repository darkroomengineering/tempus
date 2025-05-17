export default class Clock {
  private startTime = 0
  elapsed = 0
  private _isPlaying = false
  private _deltaTime = 0
  private needsReset = true

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
