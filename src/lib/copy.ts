import type { TimeEvent } from '../types'
import { getState, sortEvents } from './status'

export type Banner = { tone: 'overdue' | 'due' | 'calm'; text: string }

/** 一切正常时轮换的几句，按日期选，同一天内不会一刷新就变 */
const CALM_LINES = ['一切正常，本局无事可奏', '今日无案可审', '诸事顺遂，本局可以摸鱼了']

/**
 * 首页顶部的横幅：点名最该处理的那一件，其余的只报数量。
 * 口吻可以像个一本正经的衙门，但不数落人——产品书里说了，不要变成新的压力源。
 */
export function homeBanner(events: TimeEvent[], date: Date = new Date()): Banner {
  const overdue = events.filter((e) => getState(e).status === 'overdue')
  const due = events.filter((e) => {
    const { status } = getState(e)
    return status === 'due' || status === 'empty'
  })

  if (overdue.length > 0) {
    const top = sortEvents(overdue, 'overdue')[0]
    const days = Math.abs(getState(top).daysRemaining ?? 0)
    const rest = overdue.length - 1
    return {
      tone: 'overdue',
      text: `本局就「${top.name}」提出警告：已超期 ${days} 天${rest > 0 ? `，另有 ${rest} 项超期` : ''}`,
    }
  }

  if (due.length > 0) {
    const top = sortEvents(due, 'overdue')[0]
    const { daysRemaining, status } = getState(top)
    const detail =
      status === 'empty' ? '还没有任何记录' : daysRemaining === 0 ? '今天到期' : `还剩 ${daysRemaining} 天`
    const rest = due.length - 1
    return {
      tone: 'due',
      text: `「${top.name}」该办了，${detail}${rest > 0 ? `，另有 ${rest} 项待办` : ''}`,
    }
  }

  const dayIndex = Math.floor(date.getTime() / 86_400_000)
  return { tone: 'calm', text: CALM_LINES[dayIndex % CALM_LINES.length] }
}
