import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import type { AppData, Category, TimeEvent } from './types'
import { loadData, saveData } from './lib/storage'
import { today } from './lib/date'
import { mergeData } from './lib/merge'
import type { SyncConfig } from './lib/github'
import { SyncError, readRemote, writeRemote } from './lib/github'
import { loadSync, saveSync } from './lib/syncConfig'

export type EventDraft = {
  name: string
  category: string
  expectedIntervalDays?: number
}

/** 撤销一次打卡用：记下刚写入的记录，5 秒内可以撤回 */
export type LastCheckIn = { eventId: string; recordId: string; name: string }

/** off 表示还没配置 GitHub，其余是已配置后的实时状态 */
export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error'

type Store = AppData & {
  lastCheckIn: LastCheckIn | null
  syncConfig: SyncConfig | null
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncedAt: string | null
  setSyncConfig: (config: SyncConfig | null) => Promise<void>
  syncNow: () => Promise<void>
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

/** 本地改完不马上推，攒一下再发，省掉连续打卡时的多次提交 */
const PUSH_DELAY_MS = 2000

/** 判断"合并后和远端是否一致"用：顺序不同不算内容不同，否则会白推一次提交 */
function sortForCompare(data: AppData): AppData {
  const byId = <T extends { id: string }>(items: T[]) =>
    [...items].sort((a, b) => a.id.localeCompare(b.id))
  return {
    events: byId(data.events).map((e) => ({ ...e, records: byId(e.records) })),
    categories: [...data.categories].sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export const useStore = create<Store>((set, get) => {
  const stored = loadSync()
  let remoteSha = stored?.sha ?? null
  let pushTimer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<void> | null = null

  /** 所有写操作都走这里：改内存、落一份到 localStorage，再安排一次推送 */
  const commit = (updater: (data: AppData) => AppData) => {
    set((state) => {
      const next = updater({ events: state.events, categories: state.categories })
      saveData(next)
      return next
    })
    schedulePush()
  }

  const schedulePush = () => {
    if (!get().syncConfig) return
    clearTimeout(pushTimer)
    pushTimer = setTimeout(() => void get().syncNow(), PUSH_DELAY_MS)
  }

  const persistSync = (config: SyncConfig | null, lastSyncedAt: string | null) =>
    saveSync(config ? { config, sha: remoteSha, lastSyncedAt } : null)

  /**
   * 一轮同步：拉远端 → 与本地合并 → 有差异才写回。
   * 写回时带上拉取到的 sha，远端在这期间被别的设备改过就会 409，
   * 这时重新来一轮（最多两次），用新的远端内容再合并一次。
   */
  const runSync = async (attempt = 0): Promise<void> => {
    const config = get().syncConfig
    if (!config) return

    if (!navigator.onLine) {
      set({ syncStatus: 'error', syncError: '当前离线，联网后会自动重试' })
      return
    }

    set({ syncStatus: 'syncing', syncError: null })
    try {
      const remote = await readRemote(config)
      const local: AppData = { events: get().events, categories: get().categories }
      const merged = mergeData(local, remote.data)

      // 合并结果可能比本地多出远端的内容，先落到本地
      saveData(merged)
      set({ events: merged.events, categories: merged.categories })

      const remoteIsCurrent =
        JSON.stringify(sortForCompare(remote.data)) === JSON.stringify(sortForCompare(merged))
      remoteSha = remoteIsCurrent
        ? remote.sha
        : await writeRemote(config, merged, remote.sha)

      const now = new Date().toISOString()
      persistSync(config, now)
      set({ syncStatus: 'idle', syncError: null, lastSyncedAt: now })
    } catch (error) {
      if (error instanceof SyncError && error.kind === 'conflict' && attempt < 2) {
        return runSync(attempt + 1)
      }
      set({
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : '同步失败',
      })
    }
  }

  const touchEvent = (event: TimeEvent): TimeEvent => ({
    ...event,
    updatedAt: new Date().toISOString(),
  })

  return {
    ...loadData(),
    lastCheckIn: null,
    syncConfig: stored?.config ?? null,
    syncStatus: stored ? 'idle' : 'off',
    syncError: null,
    lastSyncedAt: stored?.lastSyncedAt ?? null,

    setSyncConfig: async (config) => {
      clearTimeout(pushTimer)
      remoteSha = null
      persistSync(config, null)
      set({
        syncConfig: config,
        syncStatus: config ? 'idle' : 'off',
        syncError: null,
        lastSyncedAt: null,
      })
      if (config) await get().syncNow()
    },

    // 同一时刻只跑一轮，重复调用都等同一个 promise
    syncNow: () => {
      if (running) return running
      running = runSync().finally(() => {
        running = null
      })
      return running
    },

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
