import { useState } from 'react'
import { useStore } from '../store'
import { parseRepoInput } from '../lib/github'
import { maskToken } from '../lib/syncConfig'

const DEFAULT_PATH = 'data.json'

const STATUS_TEXT = {
  off: '未配置',
  idle: '已同步',
  syncing: '同步中…',
  error: '同步失败',
} as const

export default function SyncSection() {
  const config = useStore((s) => s.syncConfig)
  const status = useStore((s) => s.syncStatus)
  const error = useStore((s) => s.syncError)
  const lastSyncedAt = useStore((s) => s.lastSyncedAt)
  const setSyncConfig = useStore((s) => s.setSyncConfig)
  const syncNow = useStore((s) => s.syncNow)

  const [editing, setEditing] = useState(!config)
  const [repo, setRepo] = useState(config ? `${config.owner}/${config.repo}` : '')
  const [path, setPath] = useState(config?.path ?? DEFAULT_PATH)
  const [token, setToken] = useState('')
  const [formError, setFormError] = useState('')

  const save = async () => {
    const parsed = parseRepoInput(repo)
    if (!parsed) {
      setFormError('仓库格式应该是 用户名/仓库名')
      return
    }
    if (!token.trim()) {
      setFormError('把生成好的 token 粘贴进来')
      return
    }
    setFormError('')
    await setSyncConfig({
      ...parsed,
      path: path.trim() || DEFAULT_PATH,
      token: token.trim(),
    })
    setToken('')
    setEditing(false)
  }

  const disconnect = async () => {
    if (!confirm('断开后 token 会从这台设备上删除，本地数据保留。继续？')) return
    await setSyncConfig(null)
    setRepo('')
    setToken('')
    setEditing(true)
  }

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm text-ink-soft">GitHub 同步</h2>
        <span
          className={`text-xs ${status === 'error' ? 'text-overdue' : 'text-ink-faint'}`}
        >
          {STATUS_TEXT[status]}
          {status === 'idle' && lastSyncedAt
            ? ` · ${new Date(lastSyncedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
            : ''}
        </span>
      </div>

      {error && <p className="rounded-lg bg-overdue-bg px-3 py-2 text-sm text-overdue">{error}</p>}

      {config && !editing ? (
        <div className="space-y-2">
          <div className="rounded-lg border border-line px-3 py-2 text-sm">
            <p>
              {config.owner}/{config.repo} · {config.path}
            </p>
            <p className="text-xs text-ink-faint">token {maskToken(config.token)}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={status === 'syncing'}
              className="flex-1 rounded-lg border border-line py-2.5 disabled:opacity-50"
            >
              立即同步
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex-1 rounded-lg border border-line py-2.5"
            >
              更换 token
            </button>
          </div>
          <button
            type="button"
            onClick={() => void disconnect()}
            className="w-full py-2 text-sm text-ink-faint"
          >
            断开同步
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="用户名/数据仓库名"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 outline-none"
          />
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder={DEFAULT_PATH}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 outline-none"
          />
          {/* type=password 既能遮住 token，也能让密码管理器帮着存 */}
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="粘贴细粒度 PAT"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 outline-none"
          />
          {formError && <p className="text-sm text-overdue">{formError}</p>}
          <button
            type="button"
            onClick={() => void save()}
            className="w-full rounded-lg bg-ink py-3 text-paper active:opacity-90"
          >
            保存并同步
          </button>
          {config && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="w-full py-2 text-sm text-ink-faint"
            >
              取消
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-ink-faint">
        token 只存在这台设备的浏览器里，不会发给除 GitHub 以外的任何地方。
        请用细粒度 PAT，Repository access 只选这一个数据仓库，权限只给 Contents 读写。
      </p>
    </section>
  )
}
