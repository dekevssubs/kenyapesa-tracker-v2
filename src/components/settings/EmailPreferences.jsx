import { useState, useEffect } from 'react'
import {
  Mail,
  Bell,
  Calendar,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  FileText,
  Target,
  Wallet,
  TrendingUp
} from 'lucide-react'
import { getEmailPreferences, updateEmailPreferences, getEmailLogs } from '../../services/emailService'
import { useToast } from '../../contexts/ToastContext'

export default function EmailPreferences() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState({
    emails_enabled: true,
    bill_overdue_emails: true,
    budget_exceeded_emails: true,
    goal_achieved_emails: true,
    low_balance_emails: false,
    weekly_summary_emails: true,
    max_emails_per_day: 5,
    digest_hour: 8,
    digest_timezone: 'Africa/Nairobi'
  })
  const [emailLogs, setEmailLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const prefs = await getEmailPreferences()
      setPreferences(prefs)
    } catch (error) {
      console.error('Failed to load email preferences:', error)
      toast.error('Failed to load email preferences')
    } finally {
      setLoading(false)
    }
  }

  const loadEmailLogs = async () => {
    try {
      const logs = await getEmailLogs(10)
      setEmailLogs(logs)
      setShowLogs(true)
    } catch (error) {
      console.error('Failed to load email logs:', error)
      toast.error('Failed to load email history')
    }
  }

  const handleToggle = async (field) => {
    const newValue = !preferences[field]
    const newPrefs = { ...preferences, [field]: newValue }
    setPreferences(newPrefs)

    try {
      setSaving(true)
      await updateEmailPreferences({ [field]: newValue })
      toast.success('Preference updated')
    } catch (error) {
      console.error('Failed to update preference:', error)
      setPreferences(preferences) // Revert
      toast.error('Failed to update preference')
    } finally {
      setSaving(false)
    }
  }

  const handleSelectChange = async (field, value) => {
    const newPrefs = { ...preferences, [field]: value }
    setPreferences(newPrefs)

    try {
      setSaving(true)
      await updateEmailPreferences({ [field]: value })
      toast.success('Preference updated')
    } catch (error) {
      console.error('Failed to update preference:', error)
      setPreferences(preferences) // Revert
      toast.error('Failed to update preference')
    } finally {
      setSaving(false)
    }
  }

  const emailTypes = [
    {
      id: 'bill_overdue_emails',
      icon: Calendar,
      title: 'Overdue Bill Alerts',
      description: 'Get notified when bills become overdue',
      color: 'red'
    },
    {
      id: 'budget_exceeded_emails',
      icon: AlertTriangle,
      title: 'Budget Exceeded Alerts',
      description: 'Get notified when you exceed a budget category',
      color: 'amber'
    },
    {
      id: 'goal_achieved_emails',
      icon: Target,
      title: 'Goal Achievement',
      description: 'Celebrate when you reach your savings goals',
      color: 'green'
    },
    {
      id: 'low_balance_emails',
      icon: Wallet,
      title: 'Low Balance Warnings',
      description: 'Get warned when account balance is low',
      color: 'orange'
    },
    {
      id: 'weekly_summary_emails',
      icon: TrendingUp,
      title: 'Weekly Summary',
      description: 'Receive a weekly overview of your finances',
      color: 'blue'
    }
  ]

  const getColorClasses = (color) => {
    const colors = {
      red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
    }
    return colors[color] || colors.blue
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <div className={`p-6 rounded-2xl border-2 ${
        preferences.emails_enabled
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
          : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${
              preferences.emails_enabled
                ? 'bg-green-200 dark:bg-green-800'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              <Mail className={`h-6 w-6 ${
                preferences.emails_enabled
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-500 dark:text-gray-400'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Email Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {preferences.emails_enabled
                  ? 'You will receive important email notifications'
                  : 'All email notifications are disabled'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('emails_enabled')}
            disabled={saving}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {preferences.emails_enabled ? (
              <ToggleRight className="h-10 w-10 text-green-600 dark:text-green-400" />
            ) : (
              <ToggleLeft className="h-10 w-10 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Email Type Preferences */}
      {preferences.emails_enabled && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Notification Types
          </h4>
          <div className="space-y-3">
            {emailTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2.5 rounded-lg ${getColorClasses(type.color)}`}>
                    <type.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                      {type.title}
                    </h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {type.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(type.id)}
                  disabled={saving}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {preferences[type.id] ? (
                    <ToggleRight className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-gray-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequency Settings */}
      {preferences.emails_enabled && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Frequency Settings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max emails per day */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3 mb-3">
                <Shield className="h-5 w-5 text-blue-500" />
                <label className="font-medium text-gray-900 dark:text-gray-100">
                  Max Emails Per Day
                </label>
              </div>
              <select
                value={preferences.max_emails_per_day}
                onChange={(e) => handleSelectChange('max_emails_per_day', parseInt(e.target.value))}
                disabled={saving}
                className="w-full select dark:bg-gray-700 dark:border-gray-600"
              >
                <option value={3}>3 emails</option>
                <option value={5}>5 emails</option>
                <option value={10}>10 emails</option>
                <option value={20}>Unlimited</option>
              </select>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Critical emails (OTP, verification) are not limited
              </p>
            </div>

            {/* Digest time */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3 mb-3">
                <Clock className="h-5 w-5 text-purple-500" />
                <label className="font-medium text-gray-900 dark:text-gray-100">
                  Summary Email Time
                </label>
              </div>
              <select
                value={preferences.digest_hour}
                onChange={(e) => handleSelectChange('digest_hour', parseInt(e.target.value))}
                disabled={saving}
                className="w-full select dark:bg-gray-700 dark:border-gray-600"
              >
                <option value={6}>6:00 AM</option>
                <option value={7}>7:00 AM</option>
                <option value={8}>8:00 AM</option>
                <option value={9}>9:00 AM</option>
                <option value={18}>6:00 PM</option>
                <option value={19}>7:00 PM</option>
                <option value={20}>8:00 PM</option>
              </select>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                When to receive weekly summary (EAT timezone)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email History */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <button
          onClick={loadEmailLogs}
          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <FileText className="h-4 w-4" />
          <span>View Email History</span>
        </button>

        {showLogs && (
          <div className="mt-4 space-y-2">
            {emailLogs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No emails sent yet
              </p>
            ) : (
              emailLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {log.status === 'sent' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {log.subject}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {log.email_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
        <div className="flex items-start space-x-3">
          <Bell className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Email Notifications are for Important Alerts Only</p>
            <p className="text-blue-600 dark:text-blue-400">
              Routine notifications still appear in-app. Emails are reserved for overdue bills,
              exceeded budgets, and achieved goals to avoid inbox clutter.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
