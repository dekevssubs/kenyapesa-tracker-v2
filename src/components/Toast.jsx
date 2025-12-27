import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export default function Toast({ title, message, type = 'info', onClose, duration = 4000 }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 300) // Match animation duration
  }

  const getToastStyles = () => {
    const baseStyles = 'pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border min-w-[320px] max-w-md transition-all duration-300 transform'

    const visibilityStyles = isVisible && !isExiting
      ? 'translate-x-0 opacity-100'
      : 'translate-x-full opacity-0'

    switch (type) {
      case 'success':
        return `${baseStyles} ${visibilityStyles} bg-white dark:bg-gray-800 border-green-200 dark:border-green-800`
      case 'error':
        return `${baseStyles} ${visibilityStyles} bg-white dark:bg-gray-800 border-red-200 dark:border-red-800`
      case 'warning':
        return `${baseStyles} ${visibilityStyles} bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-800`
      case 'info':
      default:
        return `${baseStyles} ${visibilityStyles} bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800`
    }
  }

  const getIcon = () => {
    const iconClass = 'h-5 w-5 flex-shrink-0'

    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-600 dark:text-green-400`} />
      case 'error':
        return <XCircle className={`${iconClass} text-red-600 dark:text-red-400`} />
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-amber-600 dark:text-amber-400`} />
      case 'info':
      default:
        return <Info className={`${iconClass} text-blue-600 dark:text-blue-400`} />
    }
  }

  const getDefaultTitle = () => {
    switch (type) {
      case 'success':
        return 'Success'
      case 'error':
        return 'Error'
      case 'warning':
        return 'Warning'
      case 'info':
      default:
        return 'Info'
    }
  }

  // Use custom title if provided, otherwise use default based on type
  const displayTitle = title || getDefaultTitle()

  return (
    <div className={getToastStyles()}>
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
          {displayTitle}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
          {message}
        </p>
      </div>

      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
