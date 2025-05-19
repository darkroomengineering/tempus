export default class Clock {
  private _elapsed = 0
  private _currentTime = 0
  private _startTime: number | undefined = undefined
  private _lastTime: number | undefined = undefined
  private _isPlaying = false
  private _deltaTime = 0

  play() {
    if (this._isPlaying) return
    this._currentTime = 0
    this._startTime = undefined
    this._isPlaying = true
  }

  pause() {
    if (!this._isPlaying) return
    this._deltaTime = 0
    this._isPlaying = false
  }

  reset() {
    this._elapsed = 0
    this._deltaTime = 0
    this._currentTime = 0
    this._lastTime = undefined
    this._isPlaying = false
  }

  update(browserTime: number) {
    if (!this._isPlaying) return

    if (!this._startTime) {
      /**
       * We always rely on the browser's tick time from the requestAnimationFrame, avoid mixing it
       * with performance.now() because it's not in sync with the browser's rendering timeline.
       */
      this._startTime = browserTime
    }

    if (this._lastTime === undefined) {
      this._lastTime = this._startTime
      this._currentTime = 0
      this._deltaTime = 0
    } else {
      this._lastTime = this._currentTime
      this._currentTime = browserTime - this._startTime
      this._deltaTime = this._currentTime - this._lastTime
      this._elapsed += this._deltaTime
    }
  }

  get time() {
    return this._elapsed
  }

  get isPlaying() {
    return this._isPlaying
  }

  get deltaTime() {
    return this._deltaTime
  }
}
