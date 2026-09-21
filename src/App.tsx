import { HashRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import EventDetail from './pages/EventDetail'
import Settings from './pages/Settings'
import UndoToast from './components/UndoToast'
import { useAutoSync } from './hooks/useAutoSync'

export default function App() {
  useAutoSync()

  return (
    // GitHub Pages 没有服务端路由，刷新子路径会 404，所以用 hash 路由
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <UndoToast />
    </HashRouter>
  )
}
