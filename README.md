# heidou-time-bureau
一个用来记录"上次做某事是什么时候"的工具，用略带调侃的"审判/管理"口吻，帮你看清生活中被拖延的事项。

产品设计见 [docs/时间管理局-产品书.md](docs/时间管理局-产品书.md)。

## 技术栈

Vite + React + TypeScript + Tailwind CSS，纯静态部署在 GitHub Pages 上。
数据存在另一个私有仓库 `heidou-time-bureau-data` 里，前端通过 GitHub API 读写。

## 本地开发

需要 Node 20 以上。

```bash
npm install
npm run dev
```

## 部署

推送到 `main` 分支后由 GitHub Actions 自动构建并发布到 Pages。
需要在仓库的 Settings → Pages 里把 Source 设为 GitHub Actions。
