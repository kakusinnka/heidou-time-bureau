import { useRegisterSW } from 'virtual:pwa-register/react'

/** 检查新版本的间隔。手机上的 PWA 可能几天都不重新加载，光靠打开时检查不够 */
const CHECK_INTERVAL_MS = 60 * 60 * 1000

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => void registration.update(), CHECK_INTERVAL_MS)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-safe">
      <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <span className="text-sm">本局发布了新版规章</span>
        <span className="flex shrink-0 gap-3 text-sm">
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="text-ink-faint"
          >
            稍后
          </button>
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="font-medium"
          >
            更新
          </button>
        </span>
      </div>
    </div>
  )
}
