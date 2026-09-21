import { describe, expect, it } from 'vitest'
import type { AppData, TimeEvent } from '../types'
import { mergeData } from './merge'

const event = (partial: Partial<TimeEvent> & { id: string }): TimeEvent => ({
  name: partial.id,
  category: '居家清洁',
  records: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...partial,
})

const data = (events: TimeEvent[]): AppData => ({ events, categories: [] })

const names = (d: AppData) => d.events.map((e) => e.name).sort()

describe('mergeData', () => {
  it('两边独有的事项都保留', () => {
    const merged = mergeData(data([event({ id: 'a' })]), data([event({ id: 'b' })]))
    expect(names(merged)).toEqual(['a', 'b'])
  })

  it('同一事项取 updatedAt 较新的字段', () => {
    const old = event({ id: 'a', name: '旧名字', updatedAt: '2026-01-01T00:00:00.000Z' })
    const fresh = event({
      id: 'a',
      name: '新名字',
      expectedIntervalDays: 30,
      updatedAt: '2026-05-01T00:00:00.000Z',
    })
    expect(mergeData(data([old]), data([fresh])).events[0].name).toBe('新名字')
    // 换个顺序结果要一样
    expect(mergeData(data([fresh]), data([old])).events[0].name).toBe('新名字')
  })

  it('打卡记录取并集', () => {
    const a = event({ id: 'a', records: [{ id: 'r1', date: '2026-01-01' }] })
    const b = event({ id: 'a', records: [{ id: 'r2', date: '2026-02-01' }] })
    const merged = mergeData(data([a]), data([b])).events[0]
    expect(merged.records.map((r) => r.id).sort()).toEqual(['r1', 'r2'])
  })

  it('一方删除的记录不会被另一方复活', () => {
    const deleted = event({
      id: 'a',
      records: [{ id: 'r1', date: '2026-01-01', deletedAt: '2026-03-01T00:00:00.000Z' }],
    })
    const alive = event({ id: 'a', records: [{ id: 'r1', date: '2026-01-01' }] })
    expect(mergeData(data([deleted]), data([alive])).events[0].records[0].deletedAt).toBe(
      '2026-03-01T00:00:00.000Z',
    )
    expect(mergeData(data([alive]), data([deleted])).events[0].records[0].deletedAt).toBe(
      '2026-03-01T00:00:00.000Z',
    )
  })

  it('一方删除的事项不会被另一方复活，哪怕对方更新得更晚', () => {
    const deleted = event({
      id: 'a',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: '2026-01-01T00:00:00.000Z',
    })
    const edited = event({ id: 'a', name: '改过名', updatedAt: '2026-06-01T00:00:00.000Z' })
    expect(mergeData(data([deleted]), data([edited])).events[0].deletedAt).toBeTruthy()
  })

  it('分类按名称去重', () => {
    const merged = mergeData(
      { events: [], categories: [{ name: '健身', icon: '🏋️', isCustom: true }] },
      {
        events: [],
        categories: [
          { name: '健身', icon: '💪', isCustom: true },
          { name: '车辆', icon: '🚗', isCustom: true },
        ],
      },
    )
    expect(merged.categories.map((c) => c.name)).toEqual(['健身', '车辆'])
  })
})
