import type { AppData, CheckRecord, TimeEvent } from '../types'

/**
 * 合并两份数据，结果与参数顺序无关。
 * 导入 JSON 和 M3 的多设备同步共用这一套规则：
 * - 事项按 id 配对，标量字段取 updatedAt 较新的一方
 * - 打卡记录取并集，任何一方删了就算删了（墓碑优先，避免删除被对方"复活"）
 */
export function mergeData(a: AppData, b: AppData): AppData {
  return {
    events: mergeById(a.events, b.events, mergeEvent),
    categories: dedupeBy([...a.categories, ...b.categories], (c) => c.name),
  }
}

function mergeEvent(a: TimeEvent, b: TimeEvent): TimeEvent {
  const [newer, older] = a.updatedAt >= b.updatedAt ? [a, b] : [b, a]
  return {
    ...newer,
    createdAt: older.createdAt < newer.createdAt ? older.createdAt : newer.createdAt,
    deletedAt: a.deletedAt ?? b.deletedAt,
    records: mergeById(a.records, b.records, mergeRecord),
  }
}

function mergeRecord(a: CheckRecord, b: CheckRecord): CheckRecord {
  return { ...a, deletedAt: a.deletedAt ?? b.deletedAt }
}

function mergeById<T extends { id: string }>(
  a: T[],
  b: T[],
  merge: (x: T, y: T) => T,
): T[] {
  const result = new Map(a.map((item) => [item.id, item]))
  for (const item of b) {
    const existing = result.get(item.id)
    result.set(item.id, existing ? merge(existing, item) : item)
  }
  return [...result.values()]
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const result = new Map<string, T>()
  for (const item of items) {
    if (!result.has(key(item))) result.set(key(item), item)
  }
  return [...result.values()]
}
