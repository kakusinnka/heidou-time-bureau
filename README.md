# heidou-time-bureau
一个用来记录"上次做某事是什么时候"的工具，用略带调侃的"审判/管理"口吻，帮你看清生活中被拖延的事项。

产品设计见 [docs/时间管理局-产品书.md](docs/时间管理局-产品书.md)。

## 技术栈

Vite + React + TypeScript + Tailwind CSS，纯静态部署在 GitHub Pages 上。
数据存在另一个私有仓库 `heidou-time-bureau-data` 里，前端通过 GitHub API 读写。

## 开启多设备同步

1. 在 GitHub 建一个**私有**仓库存数据（本项目用的是 `heidou-time-bureau-data`）。
2. 生成细粒度 PAT：Settings → Developer settings → Personal access tokens → Fine-grained tokens。
   Repository access 只选那一个数据仓库，Permissions 里只给 **Contents: Read and write**。
3. 打开应用 → 数据 → GitHub 同步，填仓库名和 token，保存。

数据文件会在数据仓库里自动创建，每次同步是一次 commit。token 只存在浏览器的
localStorage 里，不会发往 GitHub 以外的地方。注意 `<用户名>.github.io` 下所有 Pages
共享同一个 origin，也就共享 localStorage——这正是 token 必须限定到单个仓库的原因。

## 本地开发

需要 Node 20 以上。

```bash
npm install
npm run dev
```

改了 `public/logo.svg` 之后，重新生成各尺寸图标：

```bash
npx pwa-assets-generator
```

Service Worker 只在生产构建里生效，验证离线和更新提示要用 `npm run build && npm run preview`。

## 部署

推送到 `main` 分支后由 GitHub Actions 自动构建并发布到 Pages。
需要在仓库的 Settings → Pages 里把 Source 设为 GitHub Actions。
