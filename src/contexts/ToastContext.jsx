import { createContext, useContext, useState, useCallback } from 'react'
import Toast from '../components/Toast'

const ToastContext = createContext()

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((title, message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    // Support both (message, type, duration) and (title, message, type, duration) patterns
    const toastData = typeof message === 'string' && ['success', 'error', 'warning', 'info'].includes(type)
      ? { id, title, message, type, duration }
      : { id, title: null, message: title, type: message || 'info', duration: type || 4000 }

    setToasts(prev => [...prev, toastData])

    // Auto-remove after duration
    const finalDuration = toastData.duration
    if (finalDuration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, finalDuration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // showToast(title, message, type, duration) - full format with title
  const showToast = useCallback((title, message, type = 'info', duration = 4000) => {
    return addToast(title, message, type, duration)
  }, [addToast])

  // Short-hand methods for simple toasts (message only)
  const toast = {
    success: (message, duration) => addToast(null, message, 'success', duration || 4000),
    error: (message, duration) => addToast(null, message, 'error', duration || 4000),
    warning: (message, duration) => addToast(null, message, 'warning', duration || 4000),
    info: (message, duration) => addToast(null, message, 'info', duration || 4000)
  }

  const contextValue = {
    showToast,
    toast,
    // Also expose individual methods for backwards compatibility
    success: toast.success,
    error: toast.error,
    warning: toast.warning,
    info: toast.info
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <Toast
            key={t.id}
            title={t.title}
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
