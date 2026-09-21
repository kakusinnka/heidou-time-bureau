export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-medium">黑豆时间管理局</h1>
        <span className="text-sm text-ink-faint">设置</span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-base">本局尚未受理任何事项</p>
        <p className="text-sm text-ink-soft">
          第一阶段只搭好了骨架，事件列表在下一阶段接入。
        </p>
      </div>
    </div>
  )
}
