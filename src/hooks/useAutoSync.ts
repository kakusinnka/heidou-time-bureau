import { useEffect } from 'react'
import { useStore } from '../store'

/**
 * 三个时机拉一次远端：打开页面、从后台切回前台、断网恢复。
 * 手机上"切回前台"是主要场景——在另一台设备上打过卡，回到这台时要能看到。
 */
export function useAutoSync() {
  const configured = useStore((s) => s.syncConfig !== null)
  const syncNow = useStore((s) => s.syncNow)

  useEffect(() => {
    if (!configured) return

    const sync = () => void syncNow()
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }

    sync()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', sync)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', sync)
    }
  }, [configured, syncNow])
}
