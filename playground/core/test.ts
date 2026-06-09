import Tempus from 'tempus'
import { debug } from 'tempus/debug'
import Lottie from 'lottie-web'
import { animate } from 'motion'

function isPrime(num: number) {
  if (num < 2) return false
  for (let i = 2; i * i <= num; i++) {
    if (num % i === 0) return false
  }
  return true
}

function sumPrimes(limit: number) {
  let sum = 0
  for (let i = 2; i <= limit; i++) {
    if (isPrime(i)) {
      sum += i
    }
  }
  return sum
}

function _animate() {
  // a plain Tempus callback; the state arg (time/deltaTime/frame/budget) is
  // ignored here
  const result = sumPrimes(50000)
}

Tempus.patch()

const element = document.createElement('div')
element.style.width = '100px'
element.style.height = '100px'
document.querySelector('#app')!.appendChild(element)

const animation = Lottie.loadAnimation({
  container: element, // the dom element that will contain the animation
  // renderer: 'svg',
  loop: true,
  autoplay: true,
  path: '/lottie.json', // the path to the animation json
})

// motion.dev — Motion's frameloop captures `requestAnimationFrame` at
// module-eval time (createRenderBatcher(requestAnimationFrame, ...)), so it
// MUST be imported *dynamically, after* Tempus.patch() for its loop to be
// absorbed. A static top-level `import` would bind the native rAF first and
// the animation would never show up in the stats panel below.
// import('motion').then(({ animate }) => {
const box = document.createElement('div')
box.style.cssText =
  'width:60px;height:60px;background:#e0245e;border-radius:12px;margin:16px 0'
document.querySelector('#app')!.appendChild(box)

// Continuous animation keeps Motion scheduling frames every tick, so its
// batched loop appears as `[patched] processBatch` in the stats panel.
animate(
  box,
  { rotate: 360, scale: [1, 1.3, 1] },
  { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }
)
// })

// setTimeout(() => {
//   animation.play()
// }, 1000)

// console.log(animation)

// // animation.play()

Tempus.add(
  ({ time, deltaTime }) => {
    console.log('50%', time, deltaTime)
  },
  {
    fps: '50%',
    label: '50%',
  }
)

Tempus.add(
  () => {
    sumPrimes(100030)
    console.log(Tempus)
  },
  {
    fps: 10,
    label: 'gsap',
    // idle: 0.33, // idle callback will only run when the usage is less than 80%
  }
)

// Tempus.add(
//   () => {
//     sumPrimes(25030)
//     console.log('webgl:render')
//   },
//   {
//     priority: 1,
//     label: 'webgl:render',
//   }
// )

Tempus.add(
  () => {
    sumPrimes(10030)
  },
  {
    label: 'physics',
  }
)

// budget-gated work: every callback receives `state.budget()` (ms left in the
// ~16.67ms @ 60fps frame). Self-gate expensive work on it — no special `idle`
// option needed. `budget` is live, so you can loop until it runs out.
Tempus.add(
  (state) => {
    // let chunks = 0
    // console.log('budget', state.budget())
    // while (state.budget() > 5) {
    //   console.log(state.budget())
    //   sumPrimes(2000)
    //   chunks++
    // }
    // if (chunks) console.log('idle:work ran', chunks, 'chunks')

    if (state.budget() > 5) {
      console.log('idle work')
    }
  },
  {
    label: 'idle:work',
  }
)

Tempus.add(_animate, {
  priority: -1,
  label: 'lenis',
})

window.tempus = Tempus

class Test {
  constructor() {
    this.raf()
  }

  raf = () => {
    console.log('test raf')
    requestAnimationFrame(this.raf)
  }
}

new Test()

const slider = () => {
  sumPrimes(10030)
  requestAnimationFrame(slider)
}

requestAnimationFrame(slider)

// Live frame-composition overlay: a budget timeline with one ordered segment
// per rAF, each sized to its share of the frame budget.
debug()

Tempus.add(
  ({ frame }) => {
    // ping/pong on alternating frames
    if (frame % 2 === 0) {
      // console.log('ping')
    } else {
      // console.log('pong')
    }
  },
  {
    label: 'ping pong',
    priority: 2,
  }
)

const playpauseBtn = document.createElement('button')
playpauseBtn.textContent = 'Pause'
playpauseBtn.style.marginRight = '10px'
playpauseBtn.onclick = () => {
  console.log('was playing?', Tempus.isPlaying)
  if (Tempus.isPlaying) {
    Tempus.pause()
    playpauseBtn.textContent = 'Play'
  } else {
    Tempus.play()
    playpauseBtn.textContent = 'Pause'
  }
}

const restartBtn = document.createElement('button')
restartBtn.textContent = 'Restart'
restartBtn.onclick = () => {
  console.log('restarting')
  Tempus.restart()
  playpauseBtn.textContent = 'Pause'
}

document.querySelector('#app')!.appendChild(playpauseBtn)
document.querySelector('#app')!.appendChild(restartBtn)

const idleCallback = () => {
  console.log('idle callback')
  requestIdleCallback(idleCallback)
}

requestIdleCallback(idleCallback)
