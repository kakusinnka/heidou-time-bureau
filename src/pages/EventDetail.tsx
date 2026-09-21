import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import EventForm from '../components/EventForm'
import { useEvents, useStore } from '../store'
import { getState, getStats, liveRecords } from '../lib/status'
import { daysBetween, formatDate, maxSelectableDate, today } from '../lib/date'

const BANNER: Record<string, string> = {
  overdue: 'bg-overdue-bg text-overdue',
  due: 'bg-due-bg text-due',
  empty: 'bg-due-bg text-due',
  fine: 'bg-card text-fine',
  untracked: 'bg-card text-ink-soft',
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const event = useEvents().find((e) => e.id === id)
  const categories = useStore((s) => s.categories)
  const checkIn = useStore((s) => s.checkIn)
  const removeRecord = useStore((s) => s.removeRecord)
  const removeEvent = useStore((s) => s.removeEvent)
  const [editing, setEditing] = useState(false)
  const [backfillDate, setBackfillDate] = useState('')

  if (!event) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">这份档案已经不在了</p>
        <Link to="/" className="rounded-lg border border-line px-4 py-2 text-sm">
          回到首页
        </Link>
      </div>
    )
  }

  const { daysSince, status, daysRemaining } = getState(event)
  const stats = getStats(event)
  const records = liveRecords(event)
  const icon = categories.find((c) => c.name === event.category)?.icon ?? '📌'

  const headline =
    daysSince === null ? '尚无记录' : daysSince === 0 ? '今天' : `${daysSince} 天`
  const subline =
    status === 'overdue'
      ? `已超期 ${Math.abs(daysRemaining ?? 0)} 天`
      : status === 'due'
        ? `该做了 · 还剩 ${daysRemaining} 天`
        : status === 'fine'
          ? `距下次还有 ${daysRemaining} 天`
          : status === 'untracked'
            ? '未设期望周期，只作记录'
            : '还没有任何记录'

  const confirmDelete = () => {
    if (confirm(`删除「${event.name}」及其全部记录？`)) {
      removeEvent(event.id)
      navigate('/')
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-safe pb-safe">
      <header className="flex items-center justify-between">
        <Link to="/" className="text-sm text-ink-soft">
          ← 返回
        </Link>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm text-ink-soft"
        >
          编辑
        </button>
      </header>

      <div>
        <h1 className="text-xl font-medium">
          {icon} {event.name}
        </h1>
        <p className="text-sm text-ink-soft">
          {event.category}
          {event.expectedIntervalDays
            ? ` · 期望每 ${event.expectedIntervalDays} 天`
            : ' · 未设周期'}
        </p>
      </div>

      <div className={`rounded-xl px-4 py-5 text-center ${BANNER[status]}`}>
        <p className="text-3xl font-medium">{headline}</p>
        <p className="text-sm">{subline}</p>
      </div>

      {stats.average !== null && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: '平均间隔', value: stats.average },
            { label: '最短', value: stats.shortest },
            { label: '最长', value: stats.longest },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-card py-2">
              <p className="text-xs text-ink-soft">{s.label}</p>
              <p className="font-medium">{s.value} 天</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => checkIn(event.id)}
          disabled={records[0]?.date === today()}
          className="flex-1 rounded-lg bg-ink py-3 text-paper disabled:opacity-40"
        >
          {records[0]?.date === today() ? '今天已记录' : '今天做了'}
        </button>
        {/* 日期输入铺满整个按钮并设为透明，点哪里都能唤起系统日期选择器 */}
        <label className="relative flex-1 rounded-lg border border-line py-3 text-center">
          补录日期
          <input
            type="date"
            value={backfillDate}
            max={maxSelectableDate()}
            onChange={(e) => {
              if (!e.target.value) return
              checkIn(event.id, e.target.value)
              setBackfillDate('')
            }}
            className="absolute inset-0 size-full opacity-0"
          />
        </label>
      </div>

      <div>
        <h2 className="mb-2 text-sm text-ink-soft">历史记录（{stats.count} 次）</h2>
        {records.length === 0 ? (
          <p className="text-sm text-ink-faint">还没有记录，打一次卡就有了。</p>
        ) : (
          <ul>
            {records.map((r, i) => {
              const next = records[i + 1]
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between border-b border-line py-2.5 text-sm"
                >
                  <span>{formatDate(r.date)}</span>
                  <span className="flex items-center gap-3">
                    {next && (
                      <span className="text-ink-faint">
                        间隔 {daysBetween(next.date, r.date)} 天
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeRecord(event.id, r.id)}
                      aria-label={`删除 ${r.date} 的记录`}
                      className="text-ink-faint"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={confirmDelete}
        className="mt-auto py-4 text-sm text-ink-faint"
      >
        销毁这份档案
      </button>

      {editing && <EventForm event={event} onClose={() => setEditing(false)} />}
    </div>
  )
}
