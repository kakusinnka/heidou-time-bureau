import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// 部署在 https://kakusinnka.github.io/heidou-time-bureau/ 下，静态资源需要带仓库名前缀
export default defineConfig({
  base: '/heidou-time-bureau/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 新版本不自动刷新页面，而是提示用户，避免填到一半的表单被刷掉
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: '黑豆时间管理局',
        short_name: '时间管理局',
        description: '记录上次做某事是什么时候',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#f7f5ef',
        background_color: '#f7f5ef',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 只预缓存应用本身；GitHub API 的请求一律走网络，数据的离线兜底由 localStorage 负责。
        // 图标已经由 includeAssets 和 manifest 收进来了，这里再匹配图片会重复
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
