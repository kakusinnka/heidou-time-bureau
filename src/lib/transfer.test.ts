import { describe, expect, it } from 'vitest'
import { ImportError, parseImportJson, toExportJson } from './transfer'
import type { AppData } from '../types'
import { PRESET_CATEGORIES } from '../types'

const sample: AppData = {
  events: [
    {
      id: 'e1',
      name: '剪头发',
      category: '个护美容',
      expectedIntervalDays: 45,
      records: [{ id: 'r1', date: '2026-08-01' }],
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ],
  categories: PRESET_CATEGORIES,
}

describe('导出再导入', () => {
  it('内容原样还原', () => {
    expect(parseImportJson(toExportJson(sample))).toEqual(sample)
  })

  it('也接受没有版本号包装的裸数据', () => {
    expect(parseImportJson(JSON.stringify(sample)).events[0].name).toBe('剪头发')
  })
})

describe('parseImportJson 的校验', () => {
  it('拒绝非 JSON', () => {
    expect(() => parseImportJson('不是 json')).toThrow(ImportError)
  })

  it('拒绝没有事项列表的文件', () => {
    expect(() => parseImportJson('{"categories":[]}')).toThrow(/没有事项列表/)
  })

  it('拒绝缺名称的事项', () => {
    expect(() => parseImportJson('{"events":[{"id":"x"}]}')).toThrow(/缺少名称/)
  })

  it('拒绝格式不对的日期', () => {
    const json = '{"events":[{"name":"体检","records":[{"date":"2026/01/01"}]}]}'
    expect(() => parseImportJson(json)).toThrow(/YYYY-MM-DD/)
  })

  it('拒绝更高版本的文件', () => {
    expect(() => parseImportJson('{"version":99,"data":{"events":[]}}')).toThrow(
      /更新版本/,
    )
  })

  it('缺 id 的记录会补一个，不至于整份失败', () => {
    const parsed = parseImportJson(
      '{"events":[{"name":"体检","records":[{"date":"2026-01-01"}]}]}',
    )
    expect(parsed.events[0].records[0].id).toMatch(/[0-9a-f-]{36}/)
  })
})
