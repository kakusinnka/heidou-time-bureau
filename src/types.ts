/** 一次完成记录。deletedAt 是软删除标记，为了 M3 阶段多设备合并时不让已删的记录复活 */
export type CheckRecord = {
  id: string
  /** 本地日历日，格式 YYYY-MM-DD */
  date: string
  deletedAt?: string
}

export type TimeEvent = {
  id: string
  name: string
  /** 对应 Category.name */
  category: string
  /** 期望间隔天数，不填表示只记录、不判断状态 */
  expectedIntervalDays?: number
  records: CheckRecord[]
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type Category = {
  name: string
  icon: string
  isCustom: boolean
}

export type AppData = {
  events: TimeEvent[]
  categories: Category[]
}

export const PRESET_CATEGORIES: Category[] = [
  { name: '医疗健康', icon: '🩺', isCustom: false },
  { name: '个护美容', icon: '🧴', isCustom: false },
  { name: '居家清洁', icon: '🏠', isCustom: false },
  { name: '社交家庭', icon: '👨‍👩‍👧', isCustom: false },
]
