import type { AppData } from '../types'
import { parseImportJson, toExportJson } from './transfer'

export type SyncConfig = {
  token: string
  owner: string
  repo: string
  path: string
  branch?: string
}

export type RemoteFile = {
  data: AppData
  /** GitHub 给的文件版本指纹，写回时带上它做乐观锁；文件还不存在时为 null */
  sha: string | null
}

const API = 'https://api.github.com'

export type SyncErrorKind =
  | 'auth'
  | 'notFound'
  | 'conflict'
  | 'rateLimit'
  | 'network'
  | 'other'

export class SyncError extends Error {
  /** 冲突是可以自动重试的，其他错误需要用户处理 */
  readonly kind: SyncErrorKind

  constructor(message: string, kind: SyncErrorKind) {
    super(message)
    this.kind = kind
  }
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function contentsUrl(config: SyncConfig): string {
  const path = config.path.replace(/^\/+/, '')
  return `${API}/repos/${config.owner}/${config.repo}/contents/${encodeURI(path)}`
}

async function toSyncError(response: Response): Promise<SyncError> {
  if (response.status === 401) {
    return new SyncError('token 无效或已过期，请重新生成', 'auth')
  }
  if (response.status === 404) {
    return new SyncError('仓库或文件找不到，检查仓库名和 token 的仓库授权范围', 'notFound')
  }
  if (response.status === 409 || response.status === 412 || response.status === 422) {
    return new SyncError('远端已被其他设备修改', 'conflict')
  }
  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get('x-ratelimit-remaining')
    if (remaining === '0') return new SyncError('GitHub 接口调用太频繁，稍后再试', 'rateLimit')
    return new SyncError('token 没有这个仓库的写入权限', 'auth')
  }
  let detail = ''
  try {
    const body = (await response.json()) as { message?: string }
    detail = body.message ? `：${body.message}` : ''
  } catch {
    // 响应体读不出来就算了，状态码已经够定位问题
  }
  return new SyncError(`GitHub 返回 ${response.status}${detail}`, 'other')
}

async function request(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new SyncError('连不上 GitHub，检查网络', 'network')
  }
}

export async function readRemote(config: SyncConfig): Promise<RemoteFile> {
  const url = new URL(contentsUrl(config))
  if (config.branch) url.searchParams.set('ref', config.branch)
  // 带上时间戳绕开 GitHub 的响应缓存，否则刚写完再读可能拿到旧内容
  url.searchParams.set('t', Date.now().toString())

  const response = await request(url.toString(), { headers: headers(config.token) })

  // 首次同步时文件还不存在，这不是错误
  if (response.status === 404) return { data: { events: [], categories: [] }, sha: null }
  if (!response.ok) throw await toSyncError(response)

  const body = (await response.json()) as { content?: string; sha: string }
  if (!body.content) {
    throw new SyncError('远端那个路径是个目录，不是数据文件', 'other')
  }
  return { data: parseImportJson(decodeBase64(body.content)), sha: body.sha }
}

export async function writeRemote(
  config: SyncConfig,
  data: AppData,
  sha: string | null,
): Promise<string> {
  const response = await request(contentsUrl(config), {
    method: 'PUT',
    headers: { ...headers(config.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `同步于 ${new Date().toLocaleString('zh-CN')}`,
      content: encodeBase64(toExportJson(data)),
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
  })
  if (!response.ok) throw await toSyncError(response)
  const body = (await response.json()) as { content: { sha: string } }
  return body.content.sha
}

/** btoa 只认 Latin-1，中文要先转成 UTF-8 字节 */
export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function decodeBase64(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** 从 owner/repo 或完整仓库地址里取出仓库信息 */
export function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
  const match = /^([\w.-]+)\/([\w.-]+)$/.exec(cleaned)
  return match ? { owner: match[1], repo: match[2] } : null
}
