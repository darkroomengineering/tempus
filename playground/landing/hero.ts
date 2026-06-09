// Landing hero prototype — the page runs on a single live Tempus loop and
// visualizes itself: an oscilloscope of per-frame budget usage, the current
// frame's composition, and a metronome driven by Tempus time.
//
// Concept: Tempus = tempo. One heartbeat (rAF), many instruments (callbacks),
// kept in order (order) and in time (fps), racing one budget per frame.

import Tempus from 'tempus'

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

// The "orchestra": a handful of callbacks at different orders and rates,
// so the timeline has real structure to show.
Tempus.add(() => burn(4.5), { label: 'render', order: 0 })
Tempus.add(() => burn(3), { label: 'physics', order: -1 })
Tempus.add(() => burn(2.5), { label: 'particles', order: 1, fps: 30 })
Tempus.add(() => burn(1.5), { label: 'audio', order: 2, fps: '50%' })
Tempus.add(
  () => {
    if (load > 0) burn(load * 12)
  },
  { label: 'load', order: 3 }
)

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const canvas = document.getElementById('scope') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const compositionEl = document.getElementById('composition') as HTMLElement
const fpsEl = document.getElementById('r-fps') as HTMLElement
const frameEl = document.getElementById('r-frame') as HTMLElement
const budgetEl = document.getElementById('r-budget') as HTMLElement
const armEl = document.getElementById('metro-arm') as HTMLElement
const loadInput = document.getElementById('load') as HTMLInputElement
const toggleEl = document.getElementById('toggle') as HTMLButtonElement

loadInput.addEventListener('input', () => {
  load = Number(loadInput.value) / 100
})

// Start/stop the single Tempus loop powering the whole page. When paused, every
// callback (workloads, scope, readout) halts together — the seismograph freezes
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
const DISPLAY_MAX = 1.5 // chart headroom: show up to 150% of budget

// Brand palette, shared with tempus/debug.
const GREEN = '#7ddc7d'
const AMBER = '#ffb000'
const RED = '#ff5b5b'
function usageColor(pct: number) {
  if (pct > 1) return RED
  if (pct > 0.66) return AMBER
  return GREEN
}
function colorFor(label: string) {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0
  return `hsl(${Math.abs(h) % 360} 70% 55%)`
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
      if (e.label === SCOPE_LABEL) continue
      total += lastSample(e.samples)
    }
    drawScope(total / budget)

    // Metronome: one full swing every 0.9s, driven by Tempus elapsed time.
    const angle = Math.sin((state.time / 900) * Math.PI * 2) * 16
    armEl.style.transform = `rotate(${angle}deg)`
  },
  { order: Number.POSITIVE_INFINITY, label: SCOPE_LABEL }
)

// ---------------------------------------------------------------------------
// Throttled: numeric readout + frame-composition bar (5x/sec is plenty)
// ---------------------------------------------------------------------------

Tempus.add(
  () => {
    const budget = Tempus.frameBudget

    const entries = Tempus.inspect().filter((e) => e.label !== SCOPE_LABEL)
    let total = 0
    let offset = 0
    let segs = ''
    for (const e of entries) {
      const d = lastSample(e.samples)
      total += d
    }
    const span = Math.max(budget, total) || budget
    for (const e of entries) {
      const d = lastSample(e.samples)
      const left = (offset / span) * 100
      const width = (d / span) * 100
      offset += d
      const throttled = e.fps !== Number.POSITIVE_INFINITY
      segs += `<i style="left:${left}%;width:${width}%;background:${colorFor(
        e.label
      )}"${throttled ? ' class="t"' : ''}></i>`
    }
    if (total > budget) {
      const bl = (budget / span) * 100
      segs += `<u style="left:${bl}%;width:${100 - bl}%"></u>`
    }
    compositionEl.innerHTML = segs

    const usagePct = Math.round((total / budget) * 100)
    fpsEl.textContent = String(Math.round(Tempus.fps ?? 0))
    frameEl.textContent = String(Tempus.frameCount)
    budgetEl.textContent = `${total.toFixed(1)}/${budget.toFixed(1)}ms`
    budgetEl.style.color = usageColor(total / budget)
  },
  { fps: 5, order: Number.POSITIVE_INFINITY, label: 'tempus:readout' }
)

resize()
