import { expect, test } from 'bun:test'
import { ticks } from './throttle'

const entry = (fps: number | string) => ({ fps, lastSlot: -1 })
// 60Hz frame times in ms
const frames = [0, 16.7, 33.4, 50.1, 66.8, 83.5, 100.2]

test('absolute fps ticks on the first frame of each 1000/fps slot', () => {
  const e = entry(30)
  expect(frames.map((t, i) => ticks(e, t, i))).toEqual([
    true,
    false,
    true,
    false,
    true,
    false,
    true,
  ])
})

test('callbacks sharing an fps run in lockstep whenever they registered', () => {
  const a = entry(30)
  const b = entry(30)
  // b registers on frame 1: ticks once immediately, then aligns with a
  const out = frames.map((t, i) => [ticks(a, t, i), i >= 1 && ticks(b, t, i)])
  expect(out.slice(2).every(([x, y]) => x === y)).toBe(true)
})

test('relative fps counts shared frames, Infinity always runs', () => {
  const e = entry('50%')
  expect([0, 1, 2, 3].map((f) => ticks(e, f * 16.7, f))).toEqual([
    true,
    false,
    true,
    false,
  ])
  expect(ticks(entry(Number.POSITIVE_INFINITY), 5, 1)).toBe(true)
})
