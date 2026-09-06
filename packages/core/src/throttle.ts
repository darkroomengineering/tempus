// Whether a callback runs this frame. Decided from the shared clock and frame
// counter rather than a per-callback timer, so every callback sharing an fps
// ticks on the same frames whenever it was registered (lockstep, no drift).

export type Throttled = {
  fps: number | string
  // Index of the last 1000/fps ms slot this callback ran in (absolute fps only).
  lastSlot: number
}

export function ticks(entry: Throttled, time: number, frame: number) {
  const { fps } = entry
  if (fps === Number.POSITIVE_INFINITY) return true
  // eg: '33%' → every 3rd frame
  if (typeof fps === 'string') {
    return frame % Math.max(1, Math.round(100 / Number.parseFloat(fps))) === 0
  }
  const slot = Math.floor(time / (1000 / fps))
  if (slot === entry.lastSlot) return false
  entry.lastSlot = slot
  return true
}
