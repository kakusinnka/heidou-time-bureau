import { useEffect } from 'react'
import { useStore } from '../store'

const VISIBLE_MS = 5000

/** 打卡后短暂出现，给一次反悔的机会 */
export default function UndoToast() {
  const last = useStore((s) => s.lastCheckIn)
  const undoCheckIn = useStore((s) => s.undoCheckIn)
  const dismissUndo = useStore((s) => s.dismissUndo)

  useEffect(() => {
    if (!last) return
    const timer = setTimeout(dismissUndo, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [last, dismissUndo])

  if (!last) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-safe">
      <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-paper">
        <span className="min-w-0 truncate text-sm">已记录「{last.name}」</span>
        <button type="button" onClick={undoCheckIn} className="shrink-0 text-sm underline">
          撤销
        </button>
      </div>
    </div>
  )
}
