// Core playground: every ORDERING use case on one page, verified live.
//
// Every demo callback calls mark(); a callback at order -Infinity opens a
// record per frame and one at +Infinity prints the last few. So the page shows
// the REAL per-frame execution order — throttled callbacks only appear on the
// frames they run, and constraints show exactly where they landed.

import Lottie from 'lottie-web'
import { animate } from 'motion'
import Tempus from 'tempus'
import { profiler } from 'tempus/profiler'

// Debug-only: expose the Tempus singleton on window for console poking.
declare global {
  interface Window {
    tempus: typeof Tempus
    tempusVersion: string
  }
}
window.tempus = Tempus

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

// patch() first: the shim that drains native rAF is itself a Tempus callback
// (label 'tempus', order 0), so it takes the first order-0 slot. Every patched
// loop below runs there — see the "patched loops" section.
Tempus.patch()

// ---------------------------------------------------------------------------
// Frame trace
// ---------------------------------------------------------------------------

type Frame = { frame: number; ran: string[] }
const frames: Frame[] = []

function mark(label: string) {
  frames[frames.length - 1]?.ran.push(label)
}

Tempus.add(
  ({ frame }) => {
    frames.push({ frame, ran: [] })
    if (frames.length > 5) frames.shift()
  },
  { order: Number.NEGATIVE_INFINITY, label: 'trace:open' }
)

// A demo callback: marks itself, burns a little CPU so the profiler has
// something to draw.
function demo(label: string, work = 2000) {
  return () => {
    mark(label)
    sumPrimes(work)
  }
}

// ---------------------------------------------------------------------------
// Page scaffold
// ---------------------------------------------------------------------------

const app = document.querySelector('#app')!

function section(title: string, note: string) {
  const el = document.createElement('section')
  el.innerHTML = `<h2>${title}</h2><p>${note}</p>`
  app.appendChild(el)
  return el
}

function button(
  parent: Element,
  text: string,
  onClick: (el: HTMLButtonElement) => void
) {
  const el = document.createElement('button')
  el.textContent = text
  el.onclick = () => onClick(el)
  parent.appendChild(el)
  return el
}

function pre(parent: Element) {
  const el = document.createElement('pre')
  parent.appendChild(el)
  return el
}

const title = document.createElement('h1')
title.textContent = `tempus ${window.tempusVersion} — ordering`
app.appendChild(title)

const out = section(
  'live',
  'Top: the resolved order from Tempus.inspect(). Bottom: what actually ran, per frame.'
)
const resolvedEl = pre(out)
const framesEl = pre(out)

// ---------------------------------------------------------------------------
// 1. Numeric order
// ---------------------------------------------------------------------------

section(
  'order: number',
  'Lower runs first, like CSS order. Default 0. Equal orders keep registration order (tick-a before tick-b). ±Infinity pins first / last. `priority` is the deprecated alias.'
)
Tempus.add(demo('first'), { label: 'first', order: Number.NEGATIVE_INFINITY })
Tempus.add(demo('scroll', 20000), { label: 'scroll', order: -1 })
Tempus.add(demo('tick-a'), { label: 'tick-a' })
Tempus.add(demo('tick-b'), { label: 'tick-b' })
Tempus.add(demo('render', 25000), { label: 'render', order: 1 })
Tempus.add(demo('legacy'), { label: 'legacy', priority: 2 })
Tempus.add(demo('last'), { label: 'last', order: Number.POSITIVE_INFINITY })

// ---------------------------------------------------------------------------
// 2. Label constraints
// ---------------------------------------------------------------------------

section(
  'order: { after, before }',
  "Hard constraints on other callbacks' labels. Numeric order (0 here) only breaks ties between callbacks free to run — so `setup` runs before `scroll` (-1), and `after-late` waits for `late` (5)."
)
// after one label
Tempus.add(demo('parallax'), { label: 'parallax', order: { after: 'scroll' } })
// before one label
Tempus.add(demo('prep'), { label: 'prep', order: { before: 'render' } })
// both
Tempus.add(demo('cull'), {
  label: 'cull',
  order: { after: 'scroll', before: 'render' },
})
// arrays
Tempus.add(demo('setup'), {
  label: 'setup',
  order: { before: ['scroll', 'render'] },
})
Tempus.add(demo('post'), {
  label: 'post',
  order: { after: ['render', 'legacy'] },
})
// constraints beat numbers
Tempus.add(demo('late'), { label: 'late', order: 5 })
Tempus.add(demo('after-late'), {
  label: 'after-late',
  order: { after: 'late' },
})

// ---------------------------------------------------------------------------
// 3. A label is a group
// ---------------------------------------------------------------------------

section(
  'label groups',
  'A label names every callback registered with it: `collide` waits for both `sim` callbacks.'
)
Tempus.add(demo('sim'), { label: 'sim' })
Tempus.add(demo('sim'), { label: 'sim' })
Tempus.add(demo('collide'), { label: 'collide', order: { after: 'sim' } })

// ---------------------------------------------------------------------------
// 4. Ordering holds across fps
// ---------------------------------------------------------------------------

section(
  'across fps',
  'Throttled callbacks keep their place on the frames they run: `physics` (30fps) always sits between scroll and render, `half` (50%) before render, `heavy` (10fps) after it. Each shows its own deltaTime.'
)
Tempus.add(
  ({ deltaTime }) => {
    mark(`physics·${deltaTime.toFixed(0)}ms`)
    sumPrimes(5000)
  },
  { label: 'physics', fps: 30, order: { after: 'scroll', before: 'render' } }
)
Tempus.add(({ deltaTime }) => mark(`half·${deltaTime.toFixed(0)}ms`), {
  label: 'half',
  fps: '50%',
  order: { before: 'render' },
})
Tempus.add(
  ({ deltaTime }) => {
    mark(`heavy·${deltaTime.toFixed(0)}ms`)
    sumPrimes(60000)
  },
  { label: 'heavy', fps: 10, order: { after: 'render' } }
)

// ---------------------------------------------------------------------------
// 5. Late binding, removal, cycles
// ---------------------------------------------------------------------------

const dyn = section(
  'late binding · removal · cycles',
  'Order is re-resolved on every add. `after-lazy` targets a label that does not exist yet, so it sits at order 0 — add `lazy` (order 5) and watch it move behind; remove `lazy` and it comes back. A cycle warns in the console and falls back to numeric order.'
)
Tempus.add(demo('after-lazy'), {
  label: 'after-lazy',
  order: { after: 'lazy' },
})
let removeLazy: (() => void) | undefined
button(dyn, 'add lazy (order 5)', () => {
  removeLazy ??= Tempus.add(demo('lazy'), { label: 'lazy', order: 5 })
})
button(dyn, 'remove lazy', () => {
  removeLazy?.()
  removeLazy = undefined
})
button(dyn, 'add a cycle (warns)', (el) => {
  Tempus.add(demo('cycle-a'), { label: 'cycle-a', order: { after: 'cycle-b' } })
  Tempus.add(demo('cycle-b'), { label: 'cycle-b', order: { after: 'cycle-a' } })
  el.disabled = true
})

// ---------------------------------------------------------------------------
// 6. Patched loops
// ---------------------------------------------------------------------------

const patched = section(
  'patched loops ⟳',
  "Native requestAnimationFrame loops absorbed by Tempus.patch() run inside the shim's slot (order 0, registered when patch() was called — here, first), in the order they rescheduled. They have no order of their own."
)

class Test {
  constructor() {
    this.raf()
  }

  raf = () => {
    mark('raf ⟳')
    requestAnimationFrame(this.raf)
  }
}
new Test()

const slider = () => {
  mark('slider ⟳')
  sumPrimes(5000)
  requestAnimationFrame(slider)
}
requestAnimationFrame(slider)

// cancelAnimationFrame is patched too: this one never runs.
cancelAnimationFrame(requestAnimationFrame(() => mark('cancelled ⟳')))

const element = document.createElement('div')
element.style.width = '100px'
element.style.height = '100px'
patched.appendChild(element)

Lottie.loadAnimation({
  container: element, // the dom element that will contain the animation
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
patched.appendChild(box)

// Continuous animation keeps Motion scheduling frames every tick, so its
// batched loop appears as `processBatch ⟳` in the profiler.
animate(
  box,
  { rotate: 360, scale: [1, 1.3, 1] },
  { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }
)
// })

// ---------------------------------------------------------------------------
// 7. Loop control
// ---------------------------------------------------------------------------

const loop = section(
  'loop',
  'One switch governs everything above, patched loops included.'
)
const playpauseBtn = button(loop, 'Pause', (el) => {
  if (Tempus.isPlaying) {
    Tempus.pause()
    el.textContent = 'Play'
  } else {
    Tempus.play()
    el.textContent = 'Pause'
  }
})
button(loop, 'Restart', () => {
  Tempus.restart()
  playpauseBtn.textContent = 'Pause'
})

// ---------------------------------------------------------------------------
// Trace output + profiler. Registered last so they sit at the very end of the
// +Infinity tie.
// ---------------------------------------------------------------------------

Tempus.add(
  () => {
    resolvedEl.textContent = Tempus.inspect()
      .map((e, i) => {
        const fps =
          e.fps === Number.POSITIVE_INFINITY
            ? ''
            : ` (${e.fps}${typeof e.fps === 'number' ? 'fps' : ''})`
        return `${String(i + 1).padStart(2)}. ${e.label}${
          e.source === 'patch' ? ' ⟳' : ''
        }${fps}`
      })
      .join('\n')
    framesEl.textContent = frames
      .map((f) => `#${f.frame}  ${f.ran.join(' → ')}`)
      .join('\n')
  },
  { order: Number.POSITIVE_INFINITY, fps: 10, label: 'trace:render' }
)

// Live frame-composition overlay: a budget timeline with one ordered segment
// per callback, each sized to its share of the frame budget.
profiler({ corner: 'top-right' })
