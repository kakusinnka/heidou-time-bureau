import type { AppData } from '../types'
import { PRESET_CATEGORIES } from '../types'

const KEY = 'heidou.data.v1'

export function emptyData(): AppData {
  return { events: [], categories: [...PRESET_CATEGORIES] }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      events: parsed.events ?? [],
      // 分类为空说明是早期数据或导入了残缺文件，退回预设，避免新建页无分类可选
      categories: parsed.categories?.length ? parsed.categories : [...PRESET_CATEGORIES],
    }
  } catch {
    // 隐私模式或数据损坏时不至于白屏
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // 容量满或被禁用时忽略，内存里的数据仍然可用
  }
}
