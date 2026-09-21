import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import type { TimeEvent } from '../types'
import { homeBanner } from './copy'

const daysAgo = (n: number) => dayjs().subtract(n, 'day').format('YYYY-MM-DD')

const make = (name: string, interval: number | undefined, ago: number | null): TimeEvent => ({
  id: name,
  name,
  category: '居家清洁',
  expectedIntervalDays: interval,
  records: ago === null ? [] : [{ id: `${name}-r`, date: daysAgo(ago) }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('homeBanner', () => {
  it('点名超期最严重的一项，其余只报数量', () => {
    const banner = homeBanner([
      make('洗牙', 180, 200),
      make('换床单', 14, 21),
      make('剪头发', 45, 42),
    ])
    expect(banner.tone).toBe('overdue')
    expect(banner.text).toBe('本局就「换床单」提出警告：已超期 7 天，另有 1 项超期')
  })

  it('只有一项超期时不提"另有"', () => {
    expect(homeBanner([make('换床单', 14, 21)]).text).not.toContain('另有')
  })

  it('没有超期时点名该做的', () => {
    const banner = homeBanner([make('剪头发', 45, 42), make('联系父母', 7, 1)])
    expect(banner.tone).toBe('due')
    expect(banner.text).toBe('「剪头发」该办了，还剩 3 天')
  })

  it('到期当天说今天到期', () => {
    expect(homeBanner([make('剪头发', 45, 45)]).text).toContain('今天到期')
  })

  it('有周期却从没记录的也算待办', () => {
    expect(homeBanner([make('体检', 365, null)]).text).toBe('「体检」该办了，还没有任何记录')
  })

  it('全部正常时同一天给出同一句', () => {
    const events = [make('联系父母', 7, 1), make('空调滤网', undefined, 97)]
    const morning = new Date('2026-09-21T01:00:00Z')
    const evening = new Date('2026-09-21T20:00:00Z')
    expect(homeBanner(events, morning).tone).toBe('calm')
    expect(homeBanner(events, morning).text).toBe(homeBanner(events, evening).text)
  })
})
