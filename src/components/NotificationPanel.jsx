import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  Trophy,
  TrendingUp,
  Target,
  Clock,
  HandCoins,
  X,
  CheckCheck,
  Trash2,
  Bell,
  Zap
} from 'lucide-react'

const ICON_MAP = {
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'info': Info,
  'calendar': Calendar,
  'trophy': Trophy,
  'trending-up': TrendingUp,
  'target': Target,
  'clock': Clock,
  'hand-coins': HandCoins
}

const COLOR_CLASSES = {
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800'
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800'
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800'
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800'
  }
}

export default function NotificationPanel({
  notifications,
  unreadCount,
  totalCount,
  urgentOnly,
  onToggleUrgentOnly,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotification,
  onClearAll
}) {
  const navigate = useNavigate()

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
      onClose()
    }
  }

  const getRelativeTime = (timestamp) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now - time) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return time.toLocaleDateString()
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-slideIn">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            <button
              onClick={() => !urgentOnly && onToggleUrgentOnly()}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                urgentOnly
                  ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Urgent</span>
            </button>
            <button
              onClick={() => urgentOnly && onToggleUrgentOnly()}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !urgentOnly
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>All ({totalCount || 0})</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={onMarkAllAsRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" />
                </button>
                <button
                  onClick={onClearAll}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center space-x-1"
                  title="Clear all (will reappear in 2 hours)"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-[32rem] overflow-y-auto scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <CheckCheck className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">All caught up!</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => {
              const Icon = ICON_MAP[notification.icon] || Info
              const colorClass = COLOR_CLASSES[notification.color] || COLOR_CLASSES.blue

              return (
                <div
                  key={notification.id}
                  className={`
                    relative p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors
                    ${!notification.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                  )}

                  <div className="flex items-start space-x-3 pl-2">
                    {/* Icon */}
                    <div className={`flex-shrink-0 p-2 rounded-lg ${colorClass.bg}`}>
                      <Icon className={`h-5 w-5 ${colorClass.text}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onClearNotification(notification.id)
                          }}
                          className="flex-shrink-0 ml-2 p-1 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Clear notification"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {getRelativeTime(notification.timestamp)}
                        </span>
                        {notification.priority && (
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full font-medium
                            ${notification.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                              notification.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}
                          `}>
                            {notification.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            {unreadCount > 0 && ` • ${unreadCount} unread`}
          </p>
        </div>
      )}
    </div>
  )
}
