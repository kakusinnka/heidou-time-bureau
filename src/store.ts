import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import type { AppData, Category, TimeEvent } from './types'
import { loadData, saveData } from './lib/storage'
import { today } from './lib/date'

export type EventDraft = {
  name: string
  category: string
  expectedIntervalDays?: number
}

/** 撤销一次打卡用：记下刚写入的记录，5 秒内可以撤回 */
export type LastCheckIn = { eventId: string; recordId: string; name: string }

type Store = AppData & {
  lastCheckIn: LastCheckIn | null
  addEvent: (draft: EventDraft, initialDate?: string) => TimeEvent
  updateEvent: (id: string, draft: EventDraft) => void
  removeEvent: (id: string) => void
  checkIn: (eventId: string, date?: string) => void
  removeRecord: (eventId: string, recordId: string) => void
  undoCheckIn: () => void
  dismissUndo: () => void
  addCategory: (category: Category) => void
  replaceAll: (data: AppData) => void
}

const newId = () => crypto.randomUUID()

export const useStore = create<Store>((set, get) => {
  /** 所有写操作都走这里：改内存的同时落一份到 localStorage */
  const commit = (updater: (data: AppData) => AppData) => {
    set((state) => {
      const next = updater({ events: state.events, categories: state.categories })
      saveData(next)
      return next
    })
  }

  const touchEvent = (event: TimeEvent): TimeEvent => ({
    ...event,
    updatedAt: new Date().toISOString(),
  })

  return {
    ...loadData(),
    lastCheckIn: null,

    addEvent: (draft, initialDate) => {
      const now = new Date().toISOString()
      const event: TimeEvent = {
        id: newId(),
        name: draft.name.trim(),
        category: draft.category,
        expectedIntervalDays: draft.expectedIntervalDays,
        records: initialDate ? [{ id: newId(), date: initialDate }] : [],
        createdAt: now,
        updatedAt: now,
      }
      commit((data) => ({ ...data, events: [...data.events, event] }))
      return event
    },

    updateEvent: (id, draft) =>
      commit((data) => ({
        ...data,
        events: data.events.map((e) =>
          e.id === id
            ? touchEvent({
                ...e,
                name: draft.name.trim(),
                category: draft.category,
                expectedIntervalDays: draft.expectedIntervalDays,
              })
            : e,
        ),
      })),

    // 软删除：保留墓碑，M3 同步时才能正确合并删除
    removeEvent: (id) =>
      commit((data) => ({
        ...data,
        events: data.events.map((e) =>
          e.id === id ? touchEvent({ ...e, deletedAt: new Date().toISOString() }) : e,
        ),
      })),

    checkIn: (eventId, date) => {
      const recordId = newId()
      const event = get().events.find((e) => e.id === eventId)
      if (!event) return
      commit((data) => ({
        ...data,
        events: data.events.map((e) =>
          e.id === eventId
            ? touchEvent({
                ...e,
                records: [...e.records, { id: recordId, date: date ?? today() }],
              })
            : e,
        ),
      }))
      set({ lastCheckIn: { eventId, recordId, name: event.name } })
    },

    removeRecord: (eventId, recordId) =>
      commit((data) => ({
        ...data,
        events: data.events.map((e) =>
          e.id === eventId
            ? touchEvent({
                ...e,
                records: e.records.map((r) =>
                  r.id === recordId ? { ...r, deletedAt: new Date().toISOString() } : r,
                ),
              })
            : e,
        ),
      })),

    undoCheckIn: () => {
      const last = get().lastCheckIn
      if (!last) return
      get().removeRecord(last.eventId, last.recordId)
      set({ lastCheckIn: null })
    },

    dismissUndo: () => set({ lastCheckIn: null }),

    addCategory: (category) =>
      commit((data) =>
        data.categories.some((c) => c.name === category.name)
          ? data
          : { ...data, categories: [...data.categories, category] },
      ),

    replaceAll: (data) => commit(() => data),
  }
})

/**
 * 未被软删除的事项，界面一律用这个。
 * 选择器每次都会返回新数组，必须用 useShallow 比较，否则 React 会判定快照一直在变而反复重渲染。
 */
export const useEvents = () =>
  useStore(useShallow((s) => s.events.filter((e) => !e.deletedAt)))
