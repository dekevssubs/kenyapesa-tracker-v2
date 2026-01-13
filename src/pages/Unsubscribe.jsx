import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Mail, CheckCircle, AlertCircle, Loader2, ArrowLeft, Settings } from 'lucide-react'
import { unsubscribeByToken } from '../services/emailService'

export default function Unsubscribe() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading') // loading, success, error, no_token
  const [message, setMessage] = useState('')
  const [emailType, setEmailType] = useState(null)

  const token = searchParams.get('token')
  const type = searchParams.get('type') // Optional: specific email type to unsubscribe

  useEffect(() => {
    if (!token) {
      setStatus('no_token')
      return
    }

    handleUnsubscribe()
  }, [token, type])

  const handleUnsubscribe = async () => {
    try {
      setStatus('loading')
      const result = await unsubscribeByToken(token, type)

      setStatus('success')
      setEmailType(result.emailType)

      if (result.emailType) {
        setMessage(`You have been unsubscribed from ${formatEmailType(result.emailType)} emails.`)
      } else {
        setMessage('You have been unsubscribed from all KenyaPesa email notifications.')
      }
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Failed to unsubscribe. The link may be invalid or expired.')
    }
  }

  const formatEmailType = (type) => {
    const types = {
      bill_overdue: 'bill reminder',
      budget_exceeded: 'budget alert',
      goal_achieved: 'goal achievement',
      low_balance: 'low balance warning',
      weekly_summary: 'weekly summary'
    }
    return types[type] || type.replace(/_/g, ' ')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img
              src="/logo-full.svg"
              alt="KenyaPesa"
              className="h-12 w-auto mx-auto"
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Processing...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we update your preferences.
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Unsubscribed Successfully
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {message}
              </p>

              <div className="space-y-3">
                <Link
                  to="/settings"
                  className="flex items-center justify-center w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Manage Email Preferences
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center w-full px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Unable to Unsubscribe
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {message}
              </p>

              <div className="space-y-3">
                <Link
                  to="/settings"
                  className="flex items-center justify-center w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Manage Preferences Manually
                </Link>
                <Link
                  to="/"
                  className="flex items-center justify-center w-full px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Go to Homepage
                </Link>
              </div>
            </div>
          )}

          {/* No Token State */}
          {status === 'no_token' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Email Preferences
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                To manage your email preferences, please log in to your account and visit the Settings page.
              </p>

              <div className="space-y-3">
                <Link
                  to="/login"
                  className="flex items-center justify-center w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/"
                  className="flex items-center justify-center w-full px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Go to Homepage
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            KenyaPesa Tracker - Your Personal Finance Companion
          </p>
        </div>
      </div>
    </div>
  )
}
