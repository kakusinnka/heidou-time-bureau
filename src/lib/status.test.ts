import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import type { TimeEvent } from '../types'
import { getState, getStats, sortEvents } from './status'

const daysAgo = (n: number) => dayjs().subtract(n, 'day').format('YYYY-MM-DD')

function makeEvent(partial: Partial<TimeEvent> & { id: string }): TimeEvent {
  return {
    name: partial.id,
    category: '居家清洁',
    records: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

const withDays = (id: string, interval: number | undefined, ago: number[]) =>
  makeEvent({
    id,
    expectedIntervalDays: interval,
    records: ago.map((d, i) => ({ id: `${id}-${i}`, date: daysAgo(d) })),
  })

describe('getState', () => {
  it('未达到周期的 90% 算正常', () => {
    const state = getState(withDays('a', 100, [89]))
    expect(state.status).toBe('fine')
    expect(state.daysSince).toBe(89)
    expect(state.daysRemaining).toBe(11)
  })

  it('刚好到 90% 算该做了', () => {
    expect(getState(withDays('a', 100, [90])).status).toBe('due')
  })

  it('刚好到 100% 仍算该做了，超过才算超期', () => {
    expect(getState(withDays('a', 100, [100])).status).toBe('due')
    expect(getState(withDays('a', 100, [101])).status).toBe('overdue')
  })

  it('没设周期的事项不判断状态', () => {
    const state = getState(withDays('a', undefined, [500]))
    expect(state.status).toBe('untracked')
    expect(state.daysRemaining).toBeNull()
  })

  it('有周期但从没记录过，视为该做了', () => {
    const state = getState(withDays('a', 30, []))
    expect(state.status).toBe('empty')
    expect(state.daysSince).toBeNull()
  })

  it('取最新一条记录，且忽略已删除的记录', () => {
    const event = makeEvent({
      id: 'a',
      expectedIntervalDays: 10,
      records: [
        { id: 'r1', date: daysAgo(30) },
        { id: 'r2', date: daysAgo(1), deletedAt: '2026-01-02T00:00:00.000Z' },
        { id: 'r3', date: daysAgo(5) },
      ],
    })
    expect(getState(event).daysSince).toBe(5)
  })
})

describe('sortEvents', () => {
  it('超期的排最前，没设周期的沉到最后', () => {
    const overdue = withDays('overdue', 10, [30])
    const fine = withDays('fine', 100, [10])
    const untracked = withDays('untracked', undefined, [999])
    const due = withDays('due', 10, [10])

    const order = sortEvents([fine, untracked, overdue, due], 'overdue').map((e) => e.id)
    expect(order).toEqual(['overdue', 'due', 'fine', 'untracked'])
  })

  it('都没设周期时，已过天数多的排前面', () => {
    const order = sortEvents(
      [withDays('short', undefined, [3]), withDays('long', undefined, [40])],
      'overdue',
    ).map((e) => e.id)
    expect(order).toEqual(['long', 'short'])
  })
})

describe('getStats', () => {
  it('统计相邻记录之间的间隔', () => {
    const stats = getStats(withDays('a', 45, [0, 41, 93]))
    expect(stats.count).toBe(3)
    expect(stats.shortest).toBe(41)
    expect(stats.longest).toBe(52)
    expect(stats.average).toBe(47)
  })

  it('只有一条记录时算不出间隔', () => {
    expect(getStats(withDays('a', 45, [10])).average).toBeNull()
  })
})
