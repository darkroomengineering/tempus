import { expect, test } from 'bun:test'
import { normalizeOrder, sortByOrder } from './order'
import type { TempusOrder } from './types'

const cb = (label: string, order?: TempusOrder) => ({
  label,
  ...normalizeOrder(order),
})
const run = (...list: ReturnType<typeof cb>[]) =>
  sortByOrder(list).map((c) => c.label)

test('numeric order, registration order breaks ties', () => {
  expect(run(cb('b', 1), cb('a', -1), cb('c'), cb('d'))).toEqual([
    'a',
    'c',
    'd',
    'b',
  ])
})

test('before/after beat numeric order, arrays supported', () => {
  expect(
    run(
      cb('a', { after: 'scroll' }),
      cb('scroll', 5),
      cb('render', 1),
      cb('b', { after: 'scroll', before: 'render' }),
      cb('c', { before: ['scroll', 'render'] })
    )
  ).toEqual(['c', 'scroll', 'a', 'b', 'render'])
})

test('a label names every callback carrying it; unknown labels are dormant', () => {
  expect(
    run(cb('x', { after: 'scroll' }), cb('scroll', 3), cb('scroll', 4))
  ).toEqual(['scroll', 'scroll', 'x'])
  expect(run(cb('x', { after: 'later' }), cb('y', 1))).toEqual(['x', 'y'])
  expect(run(cb('x', { after: 'later' }), cb('later', 1))).toEqual([
    'later',
    'x',
  ])
})

test('cycles fall back to numeric order', () => {
  expect(run(cb('a', { after: 'b' }), cb('b', { after: 'a' }))).toEqual([
    'a',
    'b',
  ])
})

test('before moves the declarer up to its target; targets never move', () => {
  expect(
    run(cb('scroll', -1), cb('tick'), cb('setup', { before: 'scroll' }))
  ).toEqual(['setup', 'scroll', 'tick'])
  expect(
    run(cb('render', 1), cb('late', 5), cb('after-late', { after: 'late' }))
  ).toEqual(['render', 'late', 'after-late'])
})

test('cycle members keep their numeric slot; others are unaffected', () => {
  expect(
    run(cb('a', { after: 'b' }), cb('b', { after: 'a' }), cb('z', 1))
  ).toEqual(['a', 'b', 'z'])
})
