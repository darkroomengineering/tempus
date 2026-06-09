// tempus/debug — a live overlay that shows how a frame is composed.
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

export type DebugCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export type DebugOptions = {
  // Overlay refresh rate. Kept low so the panel itself stays cheap; the
  // measurements it shows are unaffected (they come from Tempus.inspect()).
  fps?: number
  // Where to pin the panel. Default 'top-left'.
  corner?: DebugCorner
  // Mount target. Defaults to document.body.
  container?: HTMLElement
}

export type DebugHandle = {
  element: HTMLElement
  destroy: () => void
}

const isClient = typeof window !== 'undefined'

// Our own render callback shows up in inspect() like any other — tag it so we
// can filter it back out of the timeline.
const DEBUG_LABEL = 'tempus:debug'

const STYLE_ID = 'tempus-debug-style'

const CORNERS: Record<DebugCorner, string> = {
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
.tempus-debug {
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
.tempus-debug-head {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 8px;
  cursor: pointer;
}
.tempus-debug-title { font-weight: 600; letter-spacing: 0.02em; }
.tempus-debug-head .spacer { flex: 1; }
.tempus-debug-head b { color: #fff; font-weight: 600; }
.tempus-debug-track {
  position: relative;
  height: 18px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.tempus-debug-seg {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 1px;
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.35);
}
.tempus-debug-seg.throttled {
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255, 255, 255, 0.18) 0 4px,
    transparent 4px 8px
  );
}
.tempus-debug-danger {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(255, 64, 64, 0.22);
  pointer-events: none;
}
.tempus-debug-budget {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: #fff;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.6);
  pointer-events: none;
}
.tempus-debug-scale {
  display: flex;
  justify-content: space-between;
  margin: 3px 1px 8px;
  color: rgba(232, 232, 234, 0.5);
}
.tempus-debug-list { display: flex; flex-direction: column; gap: 3px; }
.tempus-debug-row { display: flex; align-items: center; gap: 7px; }
.tempus-debug-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex: none;
}
.tempus-debug-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tempus-debug-badge {
  flex: none;
  padding: 0 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(232, 232, 234, 0.7);
  font-size: 9px;
}
.tempus-debug-ms { flex: none; color: #fff; }
.tempus-debug-pct { flex: none; width: 40px; text-align: right; }
.tempus-debug.collapsed .tempus-debug-track,
.tempus-debug.collapsed .tempus-debug-scale,
.tempus-debug.collapsed .tempus-debug-list { display: none; }
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

export function debug(options: DebugOptions = {}): DebugHandle {
  if (!isClient) {
    // SSR-safe no-op so callers don't have to guard.
    return { element: null as unknown as HTMLElement, destroy() {} }
  }

  // Refresh twice a second by default: the panel shows a rolling average, so a
  // faster cadence just makes the numbers flicker without telling you more.
  const { fps = 5, corner = 'top-left', container = document.body } = options

  injectStyle()

  const root = document.createElement('div')
  root.className = 'tempus-debug'
  root.style.cssText = CORNERS[corner]
  root.innerHTML = `
    <div class="tempus-debug-head">
      <span class="tempus-debug-title">tempus</span>
      <span class="spacer"></span>
      <span class="tempus-debug-stat" data-fps></span>
      <span class="tempus-debug-stat" data-usage></span>
    </div>
    <div class="tempus-debug-track" data-track></div>
    <div class="tempus-debug-scale">
      <span>0</span>
      <span data-budget></span>
    </div>
    <div class="tempus-debug-list" data-list></div>
  `
  container.appendChild(root)

  const head = root.querySelector('.tempus-debug-head') as HTMLElement
  const fpsEl = root.querySelector('[data-fps]') as HTMLElement
  const usageEl = root.querySelector('[data-usage]') as HTMLElement
  const trackEl = root.querySelector('[data-track]') as HTMLElement
  const budgetEl = root.querySelector('[data-budget]') as HTMLElement
  const listEl = root.querySelector('[data-list]') as HTMLElement

  head.addEventListener('click', () => root.classList.toggle('collapsed'))

  const render = () => {
    const budget = Tempus.frameBudget

    const entries = Tempus.inspect()
      .filter((entry) => entry.label !== DEBUG_LABEL)
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
      segHTML += `<div class="tempus-debug-seg${
        e.throttled ? ' throttled' : ''
      }" style="left:${left}%;width:${width}%;background:${e.color}" title="${
        e.label
      }: ${e.duration.toFixed(2)}ms"></div>`
    }
    // Over-budget region + budget marker.
    if (total > budget) {
      segHTML += `<div class="tempus-debug-danger" style="left:${budgetLeft}%;width:${
        100 - budgetLeft
      }%"></div>`
    }
    segHTML += `<div class="tempus-debug-budget" style="left:${budgetLeft}%"></div>`
    trackEl.innerHTML = segHTML

    // Legend / detail list, ordered by `order` (low → high, i.e. the order
    // callbacks run). The timeline above keeps true execution order.
    listEl.innerHTML = [...entries]
      .sort((a, b) => a.order - b.order)
      .map((e) => {
        const pct = (e.duration / budget) * 100
        return `<div class="tempus-debug-row">
          <span class="tempus-debug-dot" style="background:${e.color}"></span>
          <span class="tempus-debug-label">${e.label}</span>
          ${
            e.throttled
              ? `<span class="tempus-debug-badge">${e.fps}${
                  typeof e.fps === 'number' ? 'fps' : ''
                }</span>`
              : ''
          }
          <span class="tempus-debug-ms">${e.duration.toFixed(2)}ms</span>
          <span class="tempus-debug-pct" style="color:${pctColor(pct)}">${pct.toFixed(
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
    label: DEBUG_LABEL,
  })

  return {
    element: root,
    destroy() {
      unsubscribe?.()
      root.remove()
    },
  }
}
