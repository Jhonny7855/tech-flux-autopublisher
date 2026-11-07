import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Topics from './pages/Topics'
import ScriptEditor from './pages/ScriptEditor'
import VideoPreview from './pages/VideoPreview'
import PublishingCalendar from './pages/PublishingCalendar'
import YouTubeSettings from './pages/YouTubeSettings'
import Analytics from './pages/Analytics'
import AutomationSettings from './pages/AutomationSettings'
import ContentHistory from './pages/ContentHistory'
import LogsNotifications from './pages/LogsNotifications'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tech-darker">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin-slow"></div>
          <p className="text-slate-400">Loading Tech Flux...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="topics" element={<Topics />} />
        <Route path="script/:projectId?" element={<ScriptEditor />} />
        <Route path="preview/:projectId?" element={<VideoPreview />} />
        <Route path="calendar" element={<PublishingCalendar />} />
        <Route path="youtube" element={<YouTubeSettings />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="automation" element={<AutomationSettings />} />
        <Route path="history" element={<ContentHistory />} />
        <Route path="logs" element={<LogsNotifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App