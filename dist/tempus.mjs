// packages/core/src/uid.ts
var index = 0;
function getUID() {
  return index++;
}

// packages/core/src/tempus.ts
var originalRAF = window.requestAnimationFrame;
var originalCancelRAF = window.cancelAnimationFrame;
var Framerate = class {
  callbacks;
  fps;
  time;
  lastTickDate;
  constructor(fps = Infinity) {
    this.callbacks = [];
    this.fps = fps;
    this.time = 0;
    this.lastTickDate = performance.now();
  }
  get executionTime() {
    return 1e3 / this.fps;
  }
  dispatch(time, deltaTime) {
    for (let i = 0; i < this.callbacks.length; i++) {
      this.callbacks[i]?.callback(time, deltaTime);
    }
  }
  raf(time, deltaTime) {
    this.time += deltaTime;
    if (this.fps === Infinity) {
      this.dispatch(time, deltaTime);
    } else if (this.time >= this.executionTime) {
      this.time = this.time % this.executionTime;
      const deltaTime2 = time - this.lastTickDate;
      this.lastTickDate = time;
      this.dispatch(time, deltaTime2);
    }
  }
  add({ callback, priority }) {
    if (typeof callback !== "function") console.error("Tempus.add: callback is not a function");
    const uid = getUID();
    this.callbacks.push({ callback, priority, uid });
    this.callbacks.sort((a, b) => a.priority - b.priority);
    return () => this.remove(uid);
  }
  remove(uid) {
    this.callbacks = this.callbacks.filter(({ uid: u }) => uid !== u);
  }
};
var Tempus = class {
  framerates;
  time;
  constructor() {
    this.framerates = {};
    this.time = performance.now();
    requestAnimationFrame(this.raf);
  }
  add(callback, { priority = 0, fps = Infinity } = {}) {
    if (typeof fps === "number") {
      if (!this.framerates[fps]) this.framerates[fps] = new Framerate(fps);
      return this.framerates[fps].add({ callback, priority });
    }
  }
  raf = (time) => {
    requestAnimationFrame(this.raf, true);
    const deltaTime = time - this.time;
    this.time = time;
    for (const framerate of Object.values(this.framerates)) {
      framerate.raf(time, deltaTime);
    }
  };
  patch() {
    window.requestAnimationFrame = (callback, { priority = 0, fps = Infinity } = {}) => {
      if (callback === this.raf || !callback.toString().includes("requestAnimationFrame(")) {
        return originalRAF(callback);
      }
      if (!callback.__tempusPatched) {
        callback.__tempusPatched = true;
        callback.__tempusUnsubscribe = this.add(callback, { priority, fps });
      }
      return callback.__tempusUnsubscribe;
    };
    window.cancelAnimationFrame = (callback) => {
      if (typeof callback === "function") {
        callback?.();
        return;
      }
      return originalCancelRAF(callback);
    };
  }
  unpatch() {
    window.requestAnimationFrame = originalRAF;
    window.cancelAnimationFrame = originalCancelRAF;
  }
};
var isClient = typeof window !== "undefined";
var tempus = isClient && new Tempus();
var tempus_default = tempus;

// packages/core/index.ts
var core_default = tempus_default;
export {
  core_default as default
};
//# sourceMappingURL=tempus.mjs.map