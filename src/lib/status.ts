import type { CheckRecord, TimeEvent } from '../types'
import { daysBetween } from './date'

/** 缓冲区间：到达期望周期的 90% 就算"该做了" */
export const DUE_THRESHOLD = 0.9

export type Status = 'overdue' | 'due' | 'fine' | 'untracked' | 'empty'

export type EventState = {
  /** 距上次完成的天数，从未记录过为 null */
  daysSince: number | null
  status: Status
  /** 排序用：越大越需要关注 */
  sortKey: number
  /** 到期还剩几天，负数表示已超期；无周期或无记录为 null */
  daysRemaining: number | null
}

export function liveRecords(event: TimeEvent): CheckRecord[] {
  return event.records
    .filter((r) => !r.deletedAt)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function lastDate(event: TimeEvent): string | null {
  return liveRecords(event)[0]?.date ?? null
}

export function getState(event: TimeEvent): EventState {
  const last = lastDate(event)
  const daysSince = last === null ? null : daysBetween(last)
  const interval = event.expectedIntervalDays

  // 没设周期：只记录，不判断状态，排序时沉到最后
  if (!interval) {
    return {
      daysSince,
      status: 'untracked',
      sortKey: -1,
      daysRemaining: null,
    }
  }

  // 有周期但从没记录过：当作"该做了"，排在真正超期的事项之后
  if (daysSince === null) {
    return { daysSince: null, status: 'empty', sortKey: 1, daysRemaining: null }
  }

  const ratio = daysSince / interval
  return {
    daysSince,
    status: ratio > 1 ? 'overdue' : ratio >= DUE_THRESHOLD ? 'due' : 'fine',
    sortKey: ratio,
    daysRemaining: interval - daysSince,
  }
}

export type SortMode = 'overdue' | 'recent' | 'category'

export function sortEvents(events: TimeEvent[], mode: SortMode): TimeEvent[] {
  const list = [...events]
  if (mode === 'recent') {
    return list.sort((a, b) => (lastDate(b) ?? '').localeCompare(lastDate(a) ?? ''))
  }
  if (mode === 'category') {
    return list.sort(
      (a, b) =>
        a.category.localeCompare(b.category, 'zh') ||
        getState(b).sortKey - getState(a).sortKey,
    )
  }
  return list.sort((a, b) => {
    const diff = getState(b).sortKey - getState(a).sortKey
    // 都没设周期时，按已过天数多的排前面
    if (diff !== 0) return diff
    return (getState(b).daysSince ?? -1) - (getState(a).daysSince ?? -1)
  })
}

export type Stats = {
  count: number
  average: number | null
  shortest: number | null
  longest: number | null
}

/** 相邻两次完成之间的间隔统计，至少要有两条记录才有意义 */
export function getStats(event: TimeEvent): Stats {
  const records = liveRecords(event)
  const gaps: number[] = []
  for (let i = 0; i < records.length - 1; i++) {
    gaps.push(daysBetween(records[i + 1].date, records[i].date))
  }
  if (gaps.length === 0) {
    return { count: records.length, average: null, shortest: null, longest: null }
  }
  return {
    count: records.length,
    average: Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length),
    shortest: Math.min(...gaps),
    longest: Math.max(...gaps),
  }
}
