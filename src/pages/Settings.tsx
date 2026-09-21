import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import SyncSection from '../components/SyncSection'
import InstallSection from '../components/InstallSection'
import { mergeData } from '../lib/merge'
import {
  ImportError,
  downloadJson,
  exportFileName,
  parseImportJson,
  toExportJson,
} from '../lib/transfer'

type Notice = { tone: 'ok' | 'bad'; text: string }

export default function Settings() {
  const events = useStore((s) => s.events)
  const categories = useStore((s) => s.categories)
  const replaceAll = useStore((s) => s.replaceAll)
  const fileInput = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [notice, setNotice] = useState<Notice | null>(null)

  const liveCount = events.filter((e) => !e.deletedAt).length
  const recordCount = events.reduce(
    (sum, e) => sum + e.records.filter((r) => !r.deletedAt).length,
    0,
  )

  const handleExport = () => {
    downloadJson(toExportJson({ events, categories }), exportFileName())
    setNotice({ tone: 'ok', text: '已导出，文件在你的下载目录里' })
  }

  const handleFile = async (file: File) => {
    try {
      const incoming = parseImportJson(await file.text())
      const incomingCount = incoming.events.filter((e) => !e.deletedAt).length

      if (mode === 'replace') {
        if (!confirm(`用文件里的 ${incomingCount} 个事项覆盖当前 ${liveCount} 个？`)) {
          return
        }
        replaceAll(incoming)
        setNotice({ tone: 'ok', text: `已覆盖为 ${incomingCount} 个事项` })
        return
      }

      const merged = mergeData({ events, categories }, incoming)
      replaceAll(merged)
      setNotice({
        tone: 'ok',
        text: `已合并，现在共 ${merged.events.filter((e) => !e.deletedAt).length} 个事项`,
      })
    } catch (error) {
      setNotice({
        tone: 'bad',
        text: error instanceof ImportError ? error.message : '导入失败，文件读不出来',
      })
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 pt-safe pb-safe">
      <header className="flex items-center justify-between">
        <Link to="/" className="text-sm text-ink-soft">
          ← 返回
        </Link>
        <h1 className="font-medium">数据管理</h1>
        <span className="w-10" />
      </header>

      <p className="text-sm text-ink-soft">
        当前有 {liveCount} 个事项、{recordCount} 条打卡记录，都存在这台设备的浏览器里。
        换设备或清缓存前先导出一份。
      </p>

      <SyncSection />

      <InstallSection />

      <section className="space-y-2">
        <h2 className="text-sm text-ink-soft">导出</h2>
        <button
          type="button"
          onClick={handleExport}
          className="w-full rounded-lg bg-ink py-3 text-paper active:opacity-90"
        >
          导出为 JSON 文件
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm text-ink-soft">导入</h2>
        <div className="flex gap-2">
          {(
            [
              { value: 'merge', label: '合并', hint: '保留两边的记录' },
              { value: 'replace', label: '覆盖', hint: '丢掉当前数据' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-left ${
                mode === option.value ? 'border-ink' : 'border-line'
              }`}
            >
              <span className="block text-sm">{option.label}</span>
              <span className="block text-xs text-ink-faint">{option.hint}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="w-full rounded-lg border border-line py-3"
        >
          选择 JSON 文件
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            // 清空 value，否则连续选同一个文件不会再触发 change
            e.target.value = ''
            if (file) void handleFile(file)
          }}
        />
      </section>

      {notice && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            notice.tone === 'ok' ? 'bg-card text-ink-soft' : 'bg-overdue-bg text-overdue'
          }`}
        >
          {notice.text}
        </p>
      )}

      <p className="mt-auto text-xs text-ink-faint">
        导出的文件可以离线保存，即便 token 过期或不想再用 GitHub，数据也拿得回来。
      </p>
    </div>
  )
}
