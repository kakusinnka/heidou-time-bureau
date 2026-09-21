import { Link } from 'react-router-dom'
import type { TimeEvent } from '../types'
import { getState } from '../lib/status'
import { useStore } from '../store'

const ACCENT: Record<string, string> = {
  overdue: 'border-l-overdue',
  due: 'border-l-due',
  empty: 'border-l-due',
  fine: 'border-l-transparent',
  untracked: 'border-l-transparent',
}

const TEXT: Record<string, string> = {
  overdue: 'text-overdue',
  due: 'text-due',
  empty: 'text-due',
  fine: 'text-ink-soft',
  untracked: 'text-ink-faint',
}

function describe(event: TimeEvent): string {
  const { daysSince, status, daysRemaining } = getState(event)
  if (status === 'empty') return '尚无记录'
  if (daysSince === null) return '尚无记录'
  const past = daysSince === 0 ? '今天刚做' : `已过去 ${daysSince} 天`
  if (status === 'untracked') return past
  if (status === 'overdue') return `${past} · 超期 ${Math.abs(daysRemaining ?? 0)} 天`
  if (status === 'due') {
    return `${past} · ${daysRemaining === 0 ? '今天到期' : `还剩 ${daysRemaining} 天`}`
  }
  return `${past} · 周期 ${event.expectedIntervalDays} 天`
}

export default function EventCard({ event, icon }: { event: TimeEvent; icon: string }) {
  const checkIn = useStore((s) => s.checkIn)
  const { status } = getState(event)
  const faded = status === 'untracked'

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-line border-l-4 bg-card p-3 ${ACCENT[status]} ${faded ? 'opacity-70' : ''}`}
    >
      <Link to={`/event/${event.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="text-xl" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate ${faded ? 'text-ink-soft' : 'font-medium'}`}
          >
            {event.name}
          </span>
          <span className={`block text-sm ${TEXT[status]}`}>{describe(event)}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => checkIn(event.id)}
        aria-label={`记录一次${event.name}`}
        className="size-11 shrink-0 rounded-full border border-line text-lg text-ink-soft active:scale-95 active:bg-paper"
      >
        ✓
      </button>
    </li>
  )
}
