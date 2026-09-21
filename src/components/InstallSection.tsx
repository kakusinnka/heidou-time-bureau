import { promptInstall, useInstallState } from '../lib/install'

export default function InstallSection() {
  const state = useInstallState()

  // 已经从主屏幕打开了，就不用再提
  if (state === 'installed') return null

  return (
    <section className="space-y-2">
      <h2 className="text-sm text-ink-soft">添加到主屏幕</h2>
      {state === 'prompt' ? (
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="w-full rounded-lg border border-line py-3"
        >
          安装到手机
        </button>
      ) : (
        <p className="rounded-lg bg-card px-3 py-2.5 text-sm text-ink-soft">
          {state === 'ios'
            ? '用 Safari 打开本页，点底部的分享按钮，选「添加到主屏幕」。'
            : '在浏览器菜单里选「安装应用」或「添加到主屏幕」。'}
        </p>
      )}
      <p className="text-xs text-ink-faint">装好后从桌面图标打开，全屏显示，没网也能看。</p>
    </section>
  )
}
