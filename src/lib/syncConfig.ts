import type { SyncConfig } from './github'

const KEY = 'heidou.sync.v1'

export type StoredSync = {
  config: SyncConfig
  sha: string | null
  lastSyncedAt: string | null
}

export function loadSync(): StoredSync | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredSync>
    const config = parsed.config
    if (!config?.token || !config.owner || !config.repo) return null
    return {
      config: { ...config, path: config.path || 'data.json' },
      sha: parsed.sha ?? null,
      lastSyncedAt: parsed.lastSyncedAt ?? null,
    }
  } catch {
    return null
  }
}

export function saveSync(stored: StoredSync | null): void {
  try {
    if (stored) localStorage.setItem(KEY, JSON.stringify(stored))
    else localStorage.removeItem(KEY)
  } catch {
    // 存不进去就只能这次会话有效，不影响使用
  }
}

/** 界面上只显示尾部几位，避免截图或投屏时把 token 露出去 */
export function maskToken(token: string): string {
  return token.length <= 8 ? '••••' : `${'•'.repeat(8)}${token.slice(-4)}`
}
