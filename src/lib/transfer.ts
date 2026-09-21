import type { AppData, Category, CheckRecord, TimeEvent } from '../types'
import { today } from './date'

export const EXPORT_VERSION = 1

export type ExportFile = {
  version: number
  exportedAt: string
  data: AppData
}

export function toExportJson(data: AppData): string {
  const file: ExportFile = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
  return JSON.stringify(file, null, 2)
}

export function exportFileName(): string {
  return `黑豆时间管理局-${today()}.json`
}

export function downloadJson(json: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  // Firefox 要求链接在文档里才会触发下载；iOS Safari 则会在点击后异步去读这个 blob，
  // 所以既不能立刻移除节点，也不能立刻回收 URL，否则下载会被取消
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
  }, 10_000)
}

export class ImportError extends Error {}

/**
 * 解析导入的文件。别人手动编辑过、或者从别的地方拷来的文件都可能残缺，
 * 所以这里逐字段校验，宁可整份拒绝，也不要写进一半脏数据。
 */
export function parseImportJson(text: string): AppData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ImportError('这不是一个有效的 JSON 文件')
  }

  // 同时接受带版本号的导出文件和裸的数据对象
  const raw = isRecord(parsed) && 'data' in parsed ? parsed.data : parsed
  if (!isRecord(raw)) throw new ImportError('文件内容不是本局认得的格式')

  const version = isRecord(parsed) ? parsed.version : undefined
  if (typeof version === 'number' && version > EXPORT_VERSION) {
    throw new ImportError('这份文件来自更新版本的应用，请先更新页面')
  }

  if (!Array.isArray(raw.events)) throw new ImportError('文件里没有事项列表')

  return {
    events: raw.events.map(parseEvent),
    categories: Array.isArray(raw.categories) ? raw.categories.map(parseCategory) : [],
  }
}

function parseEvent(raw: unknown, index: number): TimeEvent {
  if (!isRecord(raw)) throw new ImportError(`第 ${index + 1} 个事项格式不对`)
  const name = requireString(raw.name, `第 ${index + 1} 个事项缺少名称`)
  const id = typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID()
  const now = new Date().toISOString()
  return {
    id,
    name,
    category: typeof raw.category === 'string' ? raw.category : '',
    expectedIntervalDays:
      typeof raw.expectedIntervalDays === 'number' && raw.expectedIntervalDays > 0
        ? raw.expectedIntervalDays
        : undefined,
    records: Array.isArray(raw.records) ? raw.records.map((r) => parseRecord(r, name)) : [],
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    deletedAt: typeof raw.deletedAt === 'string' ? raw.deletedAt : undefined,
  }
}

function parseRecord(raw: unknown, eventName: string): CheckRecord {
  if (!isRecord(raw)) throw new ImportError(`「${eventName}」有一条记录格式不对`)
  const date = requireString(raw.date, `「${eventName}」有一条记录缺少日期`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ImportError(`「${eventName}」的日期 ${date} 不是 YYYY-MM-DD 格式`)
  }
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    date,
    deletedAt: typeof raw.deletedAt === 'string' ? raw.deletedAt : undefined,
  }
}

function parseCategory(raw: unknown, index: number): Category {
  if (!isRecord(raw)) throw new ImportError(`第 ${index + 1} 个分类格式不对`)
  return {
    name: requireString(raw.name, `第 ${index + 1} 个分类缺少名称`),
    icon: typeof raw.icon === 'string' && raw.icon ? raw.icon : '📌',
    isCustom: raw.isCustom !== false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ImportError(message)
  return value
}
