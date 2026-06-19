// tempus/profiler — a live overlay that shows how a frame is composed.
//
// It reads Tempus.inspect() (every Tempus.add() callback + every loop absorbed
// by Tempus.patch(), in execution order) and lays each one out on a single
// timeline whose full width is the per-frame budget (1000 / Tempus.targetFps).
// Each segment's width is that callback's share of the budget, drawn end-to-end
// so you can see the frame fill up — and overflow — left to right.

// Import the published package entry (not the relative source) so this module
// shares the ONE Tempus singleton with the host app. A relative import would
// make tsup inline a second copy whose framerates are always empty.
import Tempus from 'tempus'

export type ProfilerCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export type ProfilerOptions = {
  // Overlay refresh rate. Kept low so the panel itself stays cheap; the
  // measurements it shows are unaffected (they come from Tempus.inspect()).
  fps?: number
  // Where to pin the panel. Default 'top-left'.
  corner?: ProfilerCorner
  // Mount target. Defaults to document.body.
  container?: HTMLElement
}

export type ProfilerHandle = {
  element: HTMLElement
  destroy: () => void
}

const isClient = typeof window !== 'undefined'

// Our own render callback shows up in inspect() like any other — tag it so we
// can filter it back out of the timeline.
const PROFILER_LABEL = 'tempus:profiler'

const STYLE_ID = 'tempus-profiler-style'

const CORNERS: Record<ProfilerCorner, string> = {
  'top-left': 'top:12px;left:12px;',
  'top-right': 'top:12px;right:12px;',
  'bottom-left': 'bottom:12px;left:12px;',
  'bottom-right': 'bottom:12px;right:12px;',
}

// Deterministic, readable hue per label so a callback keeps the same colour
// across frames (identity at a glance, not a rainbow that reshuffles).
function hueFor(label: string) {
  let h = 0
  for (let i = 0; i < label.length; i++) {
    h = (h * 31 + label.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 360
}

function colorFor(label: string) {
  return `hsl(${hueFor(label)} 70% 55%)`
}

const CSS = `
.tempus-profiler {
  position: fixed;
  z-index: 2147483647;
  width: 320px;
  padding: 10px 12px 12px;
  border-radius: 10px;
  background: rgba(12, 12, 14, 0.92);
  color: #e8e8ea;
  font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  user-select: none;
}
.tempus-profiler-head {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 8px;
  cursor: grab;
  touch-action: none;
}
.tempus-profiler.dragging { cursor: grabbing; }
.tempus-profiler.dragging .tempus-profiler-head { cursor: grabbing; }
.tempus-profiler-toggle {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: #e8e8ea;
  font-size: 9px;
  line-height: 1;
  cursor: pointer;
}
.tempus-profiler-toggle:hover { background: rgba(255, 255, 255, 0.18); }
.tempus-profiler-toggle.paused { background: rgba(125, 220, 125, 0.22); color: #7ddc7d; }
.tempus-profiler-title { font-weight: 600; letter-spacing: 0.02em; }
.tempus-profiler-head .spacer { flex: 1; }
.tempus-profiler-head b { color: #fff; font-weight: 600; }
.tempus-profiler-track {
  position: relative;
  height: 18px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.tempus-profiler-seg {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 1px;
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.35);
}
.tempus-profiler-seg.throttled {
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255, 255, 255, 0.18) 0 4px,
    transparent 4px 8px
  );
}
.tempus-profiler-danger {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(255, 64, 64, 0.22);
  pointer-events: none;
}
.tempus-profiler-budget {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: #fff;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.6);
  pointer-events: none;
}
.tempus-profiler-scale {
  display: flex;
  justify-content: space-between;
  margin: 3px 1px 8px;
  color: rgba(232, 232, 234, 0.5);
}
.tempus-profiler-list { display: flex; flex-direction: column; gap: 3px; }
.tempus-profiler-row { display: flex; align-items: center; gap: 7px; }
.tempus-profiler-order {
  flex: none;
  width: 22px;
  text-align: right;
  color: rgba(232, 232, 234, 0.45);
  font-size: 10px;
}
.tempus-profiler-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex: none;
}
.tempus-profiler-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tempus-profiler-badge {
  flex: none;
  padding: 0 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(232, 232, 234, 0.7);
  font-size: 9px;
}
.tempus-profiler-ms { flex: none; color: #fff; }
.tempus-profiler-pct { flex: none; width: 40px; text-align: right; }
.tempus-profiler.collapsed .tempus-profiler-track,
.tempus-profiler.collapsed .tempus-profiler-scale,
.tempus-profiler.collapsed .tempus-profiler-list { display: none; }
`

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

// Mean over a callback's sample window. Throttled buckets only push a sample on
// the frames they actually run, so this is the average "cost when it runs".
function average(samples: number[]) {
  if (!samples.length) return 0
  let sum = 0
  for (const s of samples) sum += s
  return sum / samples.length
}

function pctColor(pct: number) {
  if (pct > 66) return '#ff5b5b'
  if (pct > 33) return '#ffb000'
  return '#7ddc7d'
}

// Compact, readable `order` for the legend gutter. ±Infinity (used to force a
// callback first/last) shows as ±∞ rather than a giant number.
function formatOrder(order: number) {
  if (order === Number.POSITIVE_INFINITY) return '∞'
  if (order === Number.NEGATIVE_INFINITY) return '-∞'
  return String(order)
}

export function profiler(options: ProfilerOptions = {}): ProfilerHandle {
  if (!isClient) {
    // SSR-safe no-op so callers don't have to guard.
    return { element: null as unknown as HTMLElement, destroy() {} }
  }

  // Refresh twice a second by default: the panel shows a rolling average, so a
  // faster cadence just makes the numbers flicker without telling you more.
  const { fps = 5, corner = 'top-left', container = document.body } = options

  injectStyle()

  const root = document.createElement('div')
  root.className = 'tempus-profiler'
  root.style.cssText = CORNERS[corner]
  root.innerHTML = `
    <div class="tempus-profiler-head">
      <button class="tempus-profiler-toggle" data-toggle type="button"></button>
      <span class="tempus-profiler-title">tempus</span>
      <span class="spacer"></span>
      <span class="tempus-profiler-stat" data-fps></span>
      <span class="tempus-profiler-stat" data-usage></span>
    </div>
    <div class="tempus-profiler-track" data-track></div>
    <div class="tempus-profiler-scale">
      <span>0</span>
      <span data-budget></span>
    </div>
    <div class="tempus-profiler-list" data-list></div>
  `
  container.appendChild(root)

  const head = root.querySelector('.tempus-profiler-head') as HTMLElement
  const toggleEl = root.querySelector('[data-toggle]') as HTMLButtonElement
  const fpsEl = root.querySelector('[data-fps]') as HTMLElement
  const usageEl = root.querySelector('[data-usage]') as HTMLElement
  const trackEl = root.querySelector('[data-track]') as HTMLElement
  const budgetEl = root.querySelector('[data-budget]') as HTMLElement
  const listEl = root.querySelector('[data-list]') as HTMLElement

  // Drag the panel by its header. We switch to top/left positioning on first
  // grab (the panel starts pinned to a corner via right/bottom), clamp to the
  // viewport, and treat a press that never moves past a few px as a tap —
  // which toggles collapse, preserving the old click-to-collapse behaviour.
  const DRAG_THRESHOLD = 4 // px before a press counts as a drag, not a tap
  let dragging = false
  let moved = false
  let startX = 0
  let startY = 0
  let originLeft = 0
  let originTop = 0

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    const rect = root.getBoundingClientRect()
    // Pin via left/top from here on so right/bottom corners don't fight us.
    originLeft = rect.left
    originTop = rect.top
    startX = e.clientX
    startY = e.clientY
    dragging = true
    moved = false
    head.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    if (!moved) {
      moved = true
      root.classList.add('dragging')
      root.style.right = 'auto'
      root.style.bottom = 'auto'
    }
    // Clamp so the panel can't be dragged fully off-screen.
    const maxLeft = window.innerWidth - root.offsetWidth
    const maxTop = window.innerHeight - root.offsetHeight
    const left = Math.min(Math.max(originLeft + dx, 0), Math.max(0, maxLeft))
    const top = Math.min(Math.max(originTop + dy, 0), Math.max(0, maxTop))
    root.style.left = `${left}px`
    root.style.top = `${top}px`
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    root.classList.remove('dragging')
    if (head.hasPointerCapture(e.pointerId))
      head.releasePointerCapture(e.pointerId)
    // A press that never crossed the threshold is a tap → toggle collapse.
    if (!moved) root.classList.toggle('collapsed')
  }

  head.addEventListener('pointerdown', onPointerDown)
  head.addEventListener('pointermove', onPointerMove)
  head.addEventListener('pointerup', onPointerUp)
  head.addEventListener('pointercancel', onPointerUp)

  // Start/stop the whole Tempus loop. Reflect the live state on every render
  // tick too, so the button stays correct if play/pause happens elsewhere.
  const syncToggle = () => {
    const playing = Tempus.isPlaying
    toggleEl.textContent = playing ? '⏸' : '▶'
    toggleEl.classList.toggle('paused', !playing)
    toggleEl.setAttribute(
      'aria-label',
      playing ? 'Stop the loop' : 'Start the loop'
    )
  }
  toggleEl.addEventListener('click', (e) => {
    e.stopPropagation()
    if (Tempus.isPlaying) Tempus.pause()
    else Tempus.play()
    // render() is part of the loop, so it won't fire while paused — update now.
    syncToggle()
  })
  // Keep button presses from starting a header drag / collapse toggle.
  toggleEl.addEventListener('pointerdown', (e) => e.stopPropagation())
  syncToggle()

  const render = () => {
    syncToggle()
    const budget = Tempus.frameBudget

    const entries = Tempus.inspect()
      .filter((entry) => entry.label !== PROFILER_LABEL)
      .map((entry) => {
        // Rolling average over the sample window (~1s at 60fps) rather than the
        // last frame, so the once-a-second readout stays stable instead of
        // latching onto a single spiky frame.
        const duration = average(entry.samples)
        return {
          label: entry.source === 'patch' ? `${entry.label} ⟳` : entry.label,
          duration,
          order: entry.order,
          throttled: entry.fps !== Number.POSITIVE_INFINITY,
          fps: entry.fps,
          color: colorFor(entry.label),
        }
      })

    const total = entries.reduce((acc, e) => acc + e.duration, 0)
    // The timeline spans at least one budget; if the frame blew through it,
    // grow the span so the overflow stays visible and the budget marker slides
    // left to mark where the limit was.
    const span = Math.max(budget, total) || budget
    const budgetLeft = (budget / span) * 100

    // Header
    fpsEl.innerHTML = `<b>${Math.round(Tempus.fps ?? 0)}</b> fps`
    const usagePct = Math.round((total / budget) * 100)
    usageEl.innerHTML = `<b style="color:${pctColor(usagePct)}">${usagePct}%</b> budget`
    budgetEl.textContent = `${budget.toFixed(1)}ms`

    // Timeline: each callback as a segment, laid end-to-end.
    let offset = 0
    let segHTML = ''
    for (const e of entries) {
      const left = (offset / span) * 100
      const width = (e.duration / span) * 100
      offset += e.duration
      segHTML += `<div class="tempus-profiler-seg${
        e.throttled ? ' throttled' : ''
      }" style="left:${left}%;width:${width}%;background:${e.color}" title="${
        e.label
      }: ${e.duration.toFixed(2)}ms"></div>`
    }
    // Over-budget region + budget marker.
    if (total > budget) {
      segHTML += `<div class="tempus-profiler-danger" style="left:${budgetLeft}%;width:${
        100 - budgetLeft
      }%"></div>`
    }
    segHTML += `<div class="tempus-profiler-budget" style="left:${budgetLeft}%"></div>`
    trackEl.innerHTML = segHTML

    // Legend / detail list, ordered by `order` (low → high, i.e. the order
    // callbacks run). The timeline above keeps true execution order.
    listEl.innerHTML = [...entries]
      .sort((a, b) => a.order - b.order)
      .map((e) => {
        const pct = (e.duration / budget) * 100
        return `<div class="tempus-profiler-row">
          <span class="tempus-profiler-order" title="order ${formatOrder(
            e.order
          )}">${formatOrder(e.order)}</span>
          <span class="tempus-profiler-dot" style="background:${e.color}"></span>
          <span class="tempus-profiler-label">${e.label}</span>
          ${
            e.throttled
              ? `<span class="tempus-profiler-badge">${e.fps}${
                  typeof e.fps === 'number' ? 'fps' : ''
                }</span>`
              : ''
          }
          <span class="tempus-profiler-ms">${e.duration.toFixed(2)}ms</span>
          <span class="tempus-profiler-pct" style="color:${pctColor(pct)}">${pct.toFixed(
            0
          )}%</span>
        </div>`
      })
      .join('')
  }

  // Run last (order Infinity) so we snapshot after every other callback has
  // executed this frame. Throttled to keep the panel cheap.
  const unsubscribe = Tempus.add(render, {
    fps,
    order: Number.POSITIVE_INFINITY,
    label: PROFILER_LABEL,
  })

  return {
    element: root,
    destroy() {
      unsubscribe?.()
      root.remove()
    },
  }
}
