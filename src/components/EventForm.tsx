import { useState } from 'react'
import Sheet from './Sheet'
import type { TimeEvent } from '../types'
import type { EventDraft } from '../store'
import { useStore } from '../store'
import { maxSelectableDate } from '../lib/date'

const PRESET_INTERVALS = [
  { label: '7 天', days: 7 },
  { label: '30 天', days: 30 },
  { label: '90 天', days: 90 },
  { label: '半年', days: 180 },
  { label: '一年', days: 365 },
]

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-1.5 text-sm ${
    active ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft'
  }`

export default function EventForm({
  event,
  onClose,
}: {
  /** 不传表示新建 */
  event?: TimeEvent
  onClose: () => void
}) {
  const categories = useStore((s) => s.categories)
  const addEvent = useStore((s) => s.addEvent)
  const updateEvent = useStore((s) => s.updateEvent)
  const addCategory = useStore((s) => s.addCategory)

  const [name, setName] = useState(event?.name ?? '')
  const [category, setCategory] = useState(event?.category ?? categories[0]?.name ?? '')
  const [interval, setInterval] = useState<number | undefined>(
    event?.expectedIntervalDays,
  )
  const [customInterval, setCustomInterval] = useState(
    event && event.expectedIntervalDays
      ? !PRESET_INTERVALS.some((p) => p.days === event.expectedIntervalDays)
      : false,
  )
  const [initialDate, setInitialDate] = useState('')
  const [newCategory, setNewCategory] = useState<{ name: string; icon: string } | null>(
    null,
  )
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) {
      setError('先给这件事起个名字')
      return
    }
    if (!category) {
      setError('选一个分类')
      return
    }
    const draft: EventDraft = {
      name,
      category,
      expectedIntervalDays: interval && interval > 0 ? interval : undefined,
    }
    if (event) updateEvent(event.id, draft)
    else addEvent(draft, initialDate || undefined)
    onClose()
  }

  const confirmNewCategory = () => {
    const trimmed = newCategory?.name.trim()
    if (!trimmed) return
    const icon = newCategory?.icon.trim() || '📌'
    addCategory({ name: trimmed, icon, isCustom: true })
    setCategory(trimmed)
    setNewCategory(null)
  }

  return (
    <Sheet title={event ? '修订档案' : '立案新事项'} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-ink-soft">名称</span>
          <input
            value={name}
            autoFocus={!event}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            placeholder="换牙刷"
            className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink-faint"
          />
        </label>

        <div>
          <span className="text-sm text-ink-soft">分类</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCategory(c.name)}
                className={chip(category === c.name)}
              >
                {c.icon} {c.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setNewCategory({ name: '', icon: '' })}
              className="rounded-lg border border-dashed border-line px-3 py-1.5 text-sm text-ink-soft"
            >
              + 自建
            </button>
          </div>
          {newCategory && (
            <div className="mt-2 flex gap-2">
              <input
                value={newCategory.icon}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, icon: e.target.value })
                }
                placeholder="🎯"
                maxLength={4}
                className="w-16 rounded-lg border border-line bg-paper px-2 py-2 text-center outline-none"
              />
              <input
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                placeholder="分类名"
                className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 outline-none"
              />
              <button
                type="button"
                onClick={confirmNewCategory}
                className="rounded-lg border border-line px-3 text-sm"
              >
                添加
              </button>
            </div>
          )}
        </div>

        <div>
          <span className="text-sm text-ink-soft">期望周期（可不填）</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {PRESET_INTERVALS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => {
                  setInterval(p.days)
                  setCustomInterval(false)
                }}
                className={chip(!customInterval && interval === p.days)}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomInterval(true)}
              className={chip(customInterval)}
            >
              自定义
            </button>
            <button
              type="button"
              onClick={() => {
                setInterval(undefined)
                setCustomInterval(false)
              }}
              className={chip(!customInterval && interval === undefined)}
            >
              不设
            </button>
          </div>
          {customInterval && (
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={interval ?? ''}
              onChange={(e) => setInterval(Number(e.target.value) || undefined)}
              placeholder="多少天"
              className="mt-2 w-32 rounded-lg border border-line bg-paper px-3 py-2 outline-none"
            />
          )}
        </div>

        {!event && (
          <label className="block">
            <span className="text-sm text-ink-soft">上次做是什么时候（可不填）</span>
            <input
              type="date"
              value={initialDate}
              max={maxSelectableDate()}
              onChange={(e) => setInitialDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2.5 outline-none"
            />
          </label>
        )}

        {error && <p className="text-sm text-overdue">{error}</p>}

        <button
          type="button"
          onClick={submit}
          className="w-full rounded-lg bg-ink py-3 text-paper active:opacity-90"
        >
          {event ? '保存' : '立案'}
        </button>
      </div>
    </Sheet>
  )
}
