import { useMemo, useState } from 'react'
import EventCard from '../components/EventCard'
import EventForm from '../components/EventForm'
import { useEvents, useStore } from '../store'
import { getState, sortEvents } from '../lib/status'
import type { SortMode } from '../lib/status'

const SORT_LABELS: { mode: SortMode; label: string }[] = [
  { mode: 'overdue', label: '超期优先' },
  { mode: 'category', label: '按分类' },
  { mode: 'recent', label: '最近完成' },
]

export default function Home() {
  const events = useEvents()
  const categories = useStore((s) => s.categories)
  const [sort, setSort] = useState<SortMode>('overdue')
  const [creating, setCreating] = useState(false)

  const sorted = useMemo(() => sortEvents(events, sort), [events, sort])
  const iconOf = (name: string) =>
    categories.find((c) => c.name === name)?.icon ?? '📌'

  const overdue = events.filter((e) => getState(e).status === 'overdue').length
  const due = events.filter((e) => getState(e).status === 'due').length

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex items-center justify-between pb-3">
        <h1 className="text-lg font-medium">黑豆时间管理局</h1>
      </header>

      {events.length > 0 && (
        <>
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              overdue > 0
                ? 'bg-overdue-bg text-overdue'
                : due > 0
                  ? 'bg-due-bg text-due'
                  : 'text-ink-soft'
            }`}
          >
            {overdue > 0
              ? `本局记录在案：${overdue} 项超期${due > 0 ? `，${due} 项该做了` : ''}`
              : due > 0
                ? `${due} 项该做了，其余一切正常`
                : '一切正常，本局无事可奏'}
          </p>

          <div className="flex gap-2 py-3">
            {SORT_LABELS.map((s) => (
              <button
                key={s.mode}
                type="button"
                onClick={() => setSort(s.mode)}
                className={`rounded-lg px-2.5 py-1 text-sm ${
                  sort === s.mode ? 'bg-line text-ink' : 'text-ink-faint'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      {events.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p>本局尚未受理任何事项</p>
          <p className="text-sm text-ink-soft">
            从一件你怀疑自己拖了很久的事开始。
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 pb-24">
          {sorted.map((event) => (
            <EventCard key={event.id} event={event} icon={iconOf(event.category)} />
          ))}
        </ul>
      )}

      {/* 跟着内容一起居中，所以套一层限宽的定位容器，而不是直接贴屏幕右下角 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-end px-4 pb-safe">
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="新建事项"
          className="pointer-events-auto size-14 rounded-full bg-ink text-2xl text-paper active:scale-95"
        >
          +
        </button>
      </div>

      {creating && <EventForm onClose={() => setCreating(false)} />}
    </div>
  )
}
