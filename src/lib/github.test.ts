import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppData } from '../types'
import type { SyncConfig } from './github'
import {
  SyncError,
  decodeBase64,
  encodeBase64,
  parseRepoInput,
  readRemote,
  writeRemote,
} from './github'
import { toExportJson } from './transfer'

const config: SyncConfig = {
  token: 'github_pat_test',
  owner: 'kakusinnka',
  repo: 'heidou-time-bureau-data',
  path: 'data.json',
}

const data: AppData = {
  events: [
    {
      id: 'e1',
      name: '换床单',
      category: '居家清洁',
      expectedIntervalDays: 14,
      records: [{ id: 'r1', date: '2026-09-01' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ],
  categories: [{ name: '居家清洁', icon: '🏠', isCustom: false }],
}

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

const mockFetch = (impl: (url: string, init?: RequestInit) => Response) =>
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string | URL, init?: RequestInit) => Promise.resolve(impl(String(url), init))),
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('base64 编解码', () => {
  it('中文与 emoji 都能原样往返', () => {
    const text = '换床单 🏠 已超期'
    expect(decodeBase64(encodeBase64(text))).toBe(text)
  })

  it('能解开 GitHub 返回的带换行的 base64', () => {
    const raw = encodeBase64('体检')
    expect(decodeBase64(`${raw.slice(0, 2)}\n${raw.slice(2)}`)).toBe('体检')
  })
})

describe('parseRepoInput', () => {
  it.each([
    'kakusinnka/heidou-time-bureau-data',
    'https://github.com/kakusinnka/heidou-time-bureau-data',
    'https://github.com/kakusinnka/heidou-time-bureau-data.git',
    '  kakusinnka/heidou-time-bureau-data/  ',
  ])('接受 %s', (input) => {
    expect(parseRepoInput(input)).toEqual({
      owner: 'kakusinnka',
      repo: 'heidou-time-bureau-data',
    })
  })

  it('拒绝不成对的输入', () => {
    expect(parseRepoInput('heidou-time-bureau-data')).toBeNull()
  })
})

describe('readRemote', () => {
  it('带上 token 并解出数据和 sha', async () => {
    let seenUrl = ''
    let seenAuth = ''
    mockFetch((url, init) => {
      seenUrl = url
      seenAuth = new Headers(init?.headers).get('Authorization') ?? ''
      return respond(200, { content: encodeBase64(toExportJson(data)), sha: 'abc123' })
    })

    const result = await readRemote(config)
    expect(result.sha).toBe('abc123')
    expect(result.data.events[0].name).toBe('换床单')
    expect(seenUrl).toContain(
      '/repos/kakusinnka/heidou-time-bureau-data/contents/data.json',
    )
    expect(seenAuth).toBe('Bearer github_pat_test')
  })

  it('文件还不存在时当作空数据，而不是报错', async () => {
    mockFetch(() => respond(404, { message: 'Not Found' }))
    await expect(readRemote(config)).resolves.toEqual({
      data: { events: [], categories: [] },
      sha: null,
    })
  })

  it('401 提示 token 失效', async () => {
    mockFetch(() => respond(401, { message: 'Bad credentials' }))
    await expect(readRemote(config)).rejects.toMatchObject({ kind: 'auth' })
  })

  it('限流和权限不足都是 403，靠剩余次数区分', async () => {
    mockFetch(() => respond(403, {}, { 'x-ratelimit-remaining': '0' }))
    await expect(readRemote(config)).rejects.toMatchObject({ kind: 'rateLimit' })

    mockFetch(() => respond(403, {}, { 'x-ratelimit-remaining': '4999' }))
    await expect(readRemote(config)).rejects.toMatchObject({ kind: 'auth' })
  })

  it('网络不通报 network', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('failed'))))
    await expect(readRemote(config)).rejects.toMatchObject({ kind: 'network' })
  })
})

describe('writeRemote', () => {
  it('首次写入不带 sha，后续写入带上', async () => {
    const bodies: Record<string, unknown>[] = []
    mockFetch((_url, init) => {
      bodies.push(JSON.parse(String(init?.body)))
      return respond(200, { content: { sha: 'new-sha' } })
    })

    await writeRemote(config, data, null)
    await writeRemote(config, data, 'old-sha')

    expect(bodies[0].sha).toBeUndefined()
    expect(bodies[1].sha).toBe('old-sha')
    expect(decodeBase64(String(bodies[0].content))).toContain('换床单')
  })

  it('sha 过期返回 409，归类为可重试的冲突', async () => {
    mockFetch(() => respond(409, { message: 'is at 1234 but expected 5678' }))
    await expect(writeRemote(config, data, 'stale')).rejects.toMatchObject({
      kind: 'conflict',
    })
  })

  it('其他错误保留 GitHub 的原始说明', async () => {
    mockFetch(() => respond(500, { message: 'Server Error' }))
    const error = await writeRemote(config, data, null).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SyncError)
    expect((error as SyncError).message).toContain('Server Error')
  })
})
