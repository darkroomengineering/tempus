// Execution order, same rules as pmndrs/scheduler's job sorter: numeric
// `order` is the sort key (lower first, registration order breaks ties);
// `before`/`after` are hard edges to every callback carrying that label,
// resolved with Kahn's algorithm so the numeric key still decides among
// callbacks that are free to run. Constraints move the callback that declares
// them, never its target (see effectiveOrder). Unknown labels are dormant
// until a matching callback registers (the list is re-sorted on add/remove).

import type { TempusOrder } from './types'

export type Ordered = {
  label: string
  order: number
  before: string[]
  after: string[]
}

const toArray = (value?: string | string[]) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]

export function normalizeOrder(
  order: TempusOrder = 0
): Pick<Ordered, 'order' | 'before' | 'after'> {
  if (typeof order === 'number') return { order, before: [], after: [] }
  return {
    order: 0,
    before: toArray(order.before),
    after: toArray(order.after),
  }
}

export function sortByOrder<T extends Ordered>(callbacks: T[]): T[] {
  if (!callbacks.some((c) => c.before.length || c.after.length)) {
    // Stable sort keeps registration order between equal `order` values.
    return callbacks.slice().sort((a, b) => a.order - b.order)
  }

  const byLabel = new Map<string, T[]>()
  for (const c of callbacks) {
    if (c.label) byLabel.set(c.label, [...(byLabel.get(c.label) ?? []), c])
  }

  // [runs first, runs second] pairs, plus `before` targets per declarer kept
  // apart: only those inherit order below.
  const pairs: [T, T][] = []
  const befores = new Map(callbacks.map((c) => [c, [] as T[]]))
  for (const c of callbacks) {
    for (const label of c.before)
      for (const t of byLabel.get(label) ?? []) {
        if (t === c) continue
        pairs.push([c, t])
        befores.get(c)!.push(t)
      }
    for (const label of c.after)
      for (const t of byLabel.get(label) ?? []) {
        if (t !== c) pairs.push([t, c])
      }
  }

  // A callback that must run `before` a lower-order one adopts that order, so
  // it lands just ahead of its target instead of pushing the target down past
  // unrelated callbacks. `after` doesn't inherit: the declarer simply waits,
  // then runs at its own order.
  const effective = new Map<T, number>()
  const effectiveOrder = (c: T, visiting = new Set<T>()): number => {
    const known = effective.get(c)
    if (known !== undefined) return known
    let order = c.order
    if (!visiting.has(c)) {
      visiting.add(c)
      for (const t of befores.get(c)!) {
        order = Math.min(order, effectiveOrder(t, visiting))
      }
      visiting.delete(c)
      effective.set(c, order)
    }
    return order
  }

  // Stable sort keeps registration order between equal effective orders.
  const sorted = callbacks
    .slice()
    .sort((a, b) => effectiveOrder(a) - effectiveOrder(b))

  // Kahn's: the ready callback with the lowest effective order runs next.
  // ponytail: O(n²) scan for the next ready node; runs on add/remove only,
  // swap for a heap if lists ever hold thousands of callbacks.
  const resolve = (edges: [T, T][]) => {
    const inDegree = new Map(sorted.map((c) => [c, 0]))
    const out = new Map(sorted.map((c) => [c, [] as T[]]))
    for (const [from, to] of edges) {
      out.get(from)!.push(to)
      inDegree.set(to, inDegree.get(to)! + 1)
    }
    const result: T[] = []
    const remaining = new Set(sorted)
    while (remaining.size) {
      const next = sorted.find((c) => remaining.has(c) && inDegree.get(c) === 0)
      if (!next) break
      remaining.delete(next)
      result.push(next)
      for (const t of out.get(next)!) inDegree.set(t, inDegree.get(t)! - 1)
    }
    return { result, remaining }
  }

  const { result, remaining } = resolve(pairs)
  if (!remaining.size) return result

  // Callbacks in (or stuck behind) a cycle lose their constraints and keep
  // their numeric slot; everything else resolves as before.
  console.warn(
    'Tempus.add: circular before/after order, falling back to numeric order'
  )
  return resolve(
    pairs.filter(([a, b]) => !remaining.has(a) && !remaining.has(b))
  ).result
}
