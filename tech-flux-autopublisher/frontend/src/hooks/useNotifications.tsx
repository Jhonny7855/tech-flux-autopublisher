import React, { createContext, useContext, useState, useCallback } from 'react'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = crypto.randomUUID()
    const newNotification = { ...notification, id }
    setNotifications(prev => [...prev, newNotification])

    const duration = notification.duration ?? 5000
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, duration)
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map(notification => (
        <NotificationItem key={notification.id} notification={notification} onClose={removeNotification} />
      ))}
    </div>
  )
}

function NotificationItem({ notification, onClose }: { notification: Notification; onClose: (id: string) => void }) {
  const typeStyles = {
    info: 'bg-blue-900/50 border-blue-500',
    success: 'bg-green-900/50 border-green-500',
    warning: 'bg-yellow-900/50 border-yellow-500',
    error: 'bg-red-900/50 border-red-500',
  }

  const typeIcons = {
    info: 'info',
    success: 'check-circle',
    warning: 'alert-triangle',
    error: 'alert-circle',
  }

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border-l-4 border-r border-t border-b
        ${typeStyles[notification.type]} backdrop-blur-sm shadow-lg
        animate-slide-in-right
      `}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white">{notification.title}</p>
        {notification.message && (
          <p className="text-sm text-slate-300 mt-1">{notification.message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className="text-slate-400 hover:text-white transition-colors p-1"
        aria-label="Dismiss notification"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}