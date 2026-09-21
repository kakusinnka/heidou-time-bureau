import { useSyncExternalStore } from 'react'

/** Chrome 的非标准事件，TypeScript 自带的 DOM 类型里没有 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

// 这个事件在页面加载早期就会触发，等设置页挂载时再监听就错过了，所以模块一加载就接住
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export type InstallState = 'installed' | 'prompt' | 'ios' | 'manual'

function currentState(): InstallState {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return 'installed'
  if (deferred) return 'prompt'
  // iPadOS 13 以后伪装成 Mac，要靠触点数量区分
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios ? 'ios' : 'manual'
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    currentState,
  )
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice
  // 每个事件只能用一次，不论用户点了什么
  deferred = null
  notify()
}
