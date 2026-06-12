// Landing hero prototype — the page runs on a single live Tempus loop and
// visualizes itself: an oscilloscope of per-frame budget usage, the current
// frame's composition, and a metronome driven by Tempus time.
//
// Concept: Tempus = tempo. One heartbeat (rAF), many instruments (callbacks),
// kept in order (order) and in time (fps), racing one budget per frame.

import Tempus, { type TempusState } from 'tempus'
import { profiler } from 'tempus/profiler'

// ---------------------------------------------------------------------------
// Synthetic workloads. CPU cost is machine-dependent, so we calibrate a "cost
// per millisecond" once and express every workload in target milliseconds —
// the budget interplay then looks the same on a phone and a workstation.
// ---------------------------------------------------------------------------

function isPrime(n: number) {
  if (n < 2) return false
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
  return true
}

function sumPrimes(limit: number) {
  let sum = 0
  for (let i = 2; i <= limit; i++) if (isPrime(i)) sum += i
  return sum
}

// Trial division up to √n makes cost grow ~ limit^1.5, so invert with ^(2/3).
const CAL_LIMIT = 60000
function calibrate() {
  const t0 = performance.now()
  sumPrimes(CAL_LIMIT)
  const ms = performance.now() - t0
  return Math.max(ms, 0.05)
}
const unitMs = calibrate()
// Number of primes to sum to burn roughly `ms` milliseconds.
function primesForMs(ms: number) {
  return Math.max(0, Math.round(CAL_LIMIT * (ms / unitMs) ** (2 / 3)))
}
function burn(ms: number) {
  sumPrimes(primesForMs(ms))
}

// Slider-driven extra load, 0..1.
let load = 0

// Each "instrument" exercises a different Tempus feature, so the page doubles
// as a live feature tour. `feature` is the human label shown in the legend.
type Demo = {
  label: string
  feature: string
  order?: number
  fps?: number | string
  run: (state: TempusState) => void
}

const DEMOS: Demo[] = [
  // order: lower runs first within a frame (like CSS `order`)
  { label: 'physics', feature: 'runs first · order −1', order: -1, run: () => burn(2) },
  { label: 'render', feature: 'order 0', order: 0, run: () => burn(3) },
  // fps: throttle a callback to a fixed or relative rate
  { label: 'audio', feature: 'relative rate · 50%', order: 1, fps: '50%', run: () => burn(1.5) },
  { label: 'particles', feature: 'throttled · 30 fps', order: 2, fps: 30, run: () => burn(2) },
  // state.frame: do work on alternating frames (ping/pong)
  {
    label: 'ping',
    feature: 'alternates · frame % 2',
    order: 3,
    run: (s) => {
      if (s.frame % 2 === 0) burn(0.8)
    },
  },
  {
    label: 'pong',
    feature: 'alternates · frame % 2',
    order: 3,
    run: (s) => {
      if (s.frame % 2 === 1) burn(0.8)
    },
  },
  // live stress, driven by the LOAD slider
  {
    label: 'load',
    feature: 'live stress · slider',
    order: 4,
    run: () => {
      if (load > 0) burn(load * 12)
    },
  },
  // state.budget(): only do optional work while there's frame time left. Runs
  // last (highest order) so budget() reflects what every other channel used —
  // crank LOAD and watch it yield.
  {
    label: 'idle',
    feature: 'budget-gated · idle',
    order: 5,
    run: (s) => {
      if (s.budget() > 7) burn(1.5)
    },
  },
]

for (const d of DEMOS) {
  Tempus.add(d.run, { label: d.label, order: d.order, fps: d.fps })
}

// patch(): absorb a third-party-style native requestAnimationFrame loop so it
// rides the same Tempus loop and appears in the timeline as `legacyRaf ⟳`.
Tempus.patch()
function legacyRaf() {
  burn(1.2)
  requestAnimationFrame(legacyRaf)
}
requestAnimationFrame(legacyRaf)

// The stats panel: the real tempus/profiler overlay, pinned top-right. It reads
// the same live loop and renders the per-frame composition + per-channel timing,
// so the page doesn't reinvent it.
profiler({ corner: 'top-right' })

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const canvas = document.getElementById('scope') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const armEl = document.getElementById('metro-arm') as HTMLElement
const loadInput = document.getElementById('load') as HTMLInputElement
const toggleEl = document.getElementById('toggle') as HTMLButtonElement

loadInput.addEventListener('input', () => {
  load = Number(loadInput.value) / 100
})

// Start/stop the single Tempus loop powering the whole page. When paused, every
// callback (workloads, scope, profiler) halts together — the seismograph freezes
// mid-trace, which is the point: one switch governs all rAF on the page.
function syncToggle() {
  const playing = Tempus.isPlaying
  toggleEl.textContent = playing ? 'stop' : 'start'
  toggleEl.classList.toggle('paused', !playing)
  toggleEl.setAttribute('aria-label', playing ? 'Stop the loop' : 'Start the loop')
}
toggleEl.addEventListener('click', () => {
  if (Tempus.isPlaying) Tempus.pause()
  else Tempus.play()
  syncToggle()
})
syncToggle()

const SCOPE_LABEL = 'tempus:scope'
// Our own scope callback and the profiler overlay's render callback shouldn't
// count toward the budget the seismograph plots.
const INTERNAL = new Set([SCOPE_LABEL, 'tempus:profiler'])
const DISPLAY_MAX = 1.5 // chart headroom: show up to 150% of budget

// Brand palette, shared with tempus/profiler.
const GREEN = '#7ddc7d'
const AMBER = '#ffb000'
const RED = '#ff5b5b'
function usageColor(pct: number) {
  if (pct > 1) return RED
  if (pct > 0.66) return AMBER
  return GREEN
}

function lastSample(samples: number[]) {
  return samples.length ? samples[samples.length - 1]! : 0
}

// ---------------------------------------------------------------------------
// Oscilloscope canvas — a scrolling seismograph of per-frame budget usage.
// ---------------------------------------------------------------------------

let dpr = 1
let cssW = 0
let cssH = 0
const history: number[] = [] // ring of usage pct (0..n), newest last

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  cssW = canvas.clientWidth
  cssH = canvas.clientHeight
  canvas.width = Math.floor(cssW * dpr)
  canvas.height = Math.floor(cssH * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
window.addEventListener('resize', resize)

function drawScope(usagePct: number) {
  const step = 3 // px per sample column
  const cols = Math.ceil(cssW / step)
  history.push(usagePct)
  while (history.length > cols) history.shift()

  ctx.clearRect(0, 0, cssW, cssH)

  // budget line at 100%
  const budgetY = cssH - (1 / DISPLAY_MAX) * cssH
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 6])
  ctx.beginPath()
  ctx.moveTo(0, budgetY)
  ctx.lineTo(cssW, budgetY)
  ctx.stroke()
  ctx.setLineDash([])

  // seismograph columns
  ctx.lineWidth = 2
  for (let i = 0; i < history.length; i++) {
    const pct = history[i]!
    const x = i * step + 1
    const h = (Math.min(pct, DISPLAY_MAX) / DISPLAY_MAX) * cssH
    const color = usageColor(pct)
    ctx.strokeStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(x, cssH)
    ctx.lineTo(x, cssH - h)
    ctx.stroke()
  }
  ctx.shadowBlur = 0
}

// ---------------------------------------------------------------------------
// Per-frame: draw scope + swing metronome (smooth, every frame)
// ---------------------------------------------------------------------------

Tempus.add(
  (state) => {
    const budget = Tempus.frameBudget
    let total = 0
    for (const e of Tempus.inspect()) {
      if (INTERNAL.has(e.label)) continue
      total += lastSample(e.samples)
    }
    drawScope(total / budget)

    // Metronome: one full swing every 0.9s, driven by Tempus elapsed time.
    const angle = Math.sin((state.time / 900) * Math.PI * 2) * 16
    armEl.style.transform = `rotate(${angle}deg)`
  },
  { order: Number.POSITIVE_INFINITY, label: SCOPE_LABEL }
)

resize()
