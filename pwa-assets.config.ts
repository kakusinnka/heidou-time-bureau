import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// 从 public/logo.svg 生成各尺寸图标：npx pwa-assets-generator
// Android 的可遮罩图标和 iOS 主屏图标会被系统裁成圆形或圆角方形，需要留白并铺底色
const paper = '#f7f5ef'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.3,
      resizeOptions: { background: paper },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0.3,
      resizeOptions: { background: paper },
    },
  },
  images: ['public/logo.svg'],
})
