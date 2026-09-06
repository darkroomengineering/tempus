import { expect, test } from 'bun:test'

// Fake the browser loop so the singleton auto-plays against a queue we drain.
const queue: FrameRequestCallback[] = []
Object.assign(globalThis, {
  window: {
    requestAnimationFrame: (cb: FrameRequestCallback) => queue.push(cb),
    cancelAnimationFrame: () => {},
  },
})
const { Tempus } = await import('./tempus')
const frame = (t: number) => {
  for (const cb of queue.splice(0)) cb(t)
}

test('order holds across fps, throttled callbacks get their own delta', () => {
  const log: string[] = []
  let halfDelta = 0
  Tempus.add(() => log.push('render'), { label: 'render', order: 1 })
  const unsub = Tempus.add(
    ({ deltaTime }) => {
      log.push('half')
      halfDelta = deltaTime
    },
    { fps: 30, order: { before: 'render' } }
  )!
  Tempus.add(() => log.push('scroll'), { order: -1 })

  // 60Hz frames; the 30fps callback ticks on the first frame of each 33ms slot
  for (const t of [100, 116.7, 133.4, 150.1]) frame(t)
  expect(log.join(' ')).toBe(
    'scroll half render | scroll render | scroll half render | scroll render'
      .split(' | ')
      .join(' ')
  )
  expect(halfDelta).toBeCloseTo(33.4)
  expect(Tempus.inspect().map((e) => e.fps)).toEqual([
    Number.POSITIVE_INFINITY,
    30,
    Number.POSITIVE_INFINITY,
  ])

  unsub()
  log.length = 0
  frame(166.8)
  expect(log).toEqual(['scroll', 'render'])
})

test('patched loops are reported where the shim runs, without the shim row', () => {
  const log: string[] = []
  Tempus.add(() => log.push('first'), { label: 'first', order: -1 })
  Tempus.add(() => log.push('last'), { label: 'last', order: 1 })
  Tempus.patch()
  function loop() {
    log.push('loop')
    window.requestAnimationFrame(loop)
  }
  window.requestAnimationFrame(loop)
  frame(200)
  frame(216.7)

  expect(log.slice(-3)).toEqual(['first', 'loop', 'last'])
  const rows = Tempus.inspect().map((e) => `${e.label}:${e.source}`)
  expect(rows).not.toContain('tempus:add')
  expect(rows.indexOf('loop:patch')).toBeGreaterThan(rows.indexOf('first:add'))
  expect(rows.indexOf('loop:patch')).toBeLessThan(rows.indexOf('last:add'))
  Tempus.unpatch()
})

test('removing a callback re-resolves dormant constraints', () => {
  const labels = () => Tempus.inspect().map((e) => e.label)
  Tempus.add(() => {}, { label: 'after-x', order: { after: 'x' } })
  const removeX = Tempus.add(() => {}, { label: 'x', order: 5 })!
  expect(labels().indexOf('after-x')).toBeGreaterThan(labels().indexOf('last'))
  removeX()
  expect(labels().indexOf('after-x')).toBeLessThan(labels().indexOf('last'))
})
