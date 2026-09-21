import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 部署在 https://kakusinnka.github.io/heidou-time-bureau/ 下，静态资源需要带仓库名前缀
export default defineConfig({
  base: '/heidou-time-bureau/',
  plugins: [react(), tailwindcss()],
})
