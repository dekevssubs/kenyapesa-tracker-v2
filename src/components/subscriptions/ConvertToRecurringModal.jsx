import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { SubscriptionService } from '../../utils/subscriptionService'
import { BillReminderService } from '../../utils/newBillReminderService'
import { X, RefreshCw, Repeat, FileText, Calendar, Loader2 } from 'lucide-react'

export default function ConvertToRecurringModal({
  isOpen,
  onClose,
  onSuccess,
  expense
}) {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(false)
  const [frequency, setFrequency] = useState('monthly')
  const [recurrenceType, setRecurrenceType] = useState('subscription')

  // Calculate next due date
  const calculateNextDueDate = (fromDate, freq) => {
    const date = new Date(fromDate)
    if (freq === 'yearly') {
      date.setFullYear(date.getFullYear() + 1)
    } else {
      date.setMonth(date.getMonth() + 1)
    }
    return date.toISOString().split('T')[0]
  }

  const handleConvert = async () => {
    if (!expense || !user) return

    setLoading(true)
    try {
      const nextDueDate = calculateNextDueDate(expense.date, frequency)
      const itemName = expense.description || `${expense.category?.charAt(0).toUpperCase()}${expense.category?.slice(1)} expense`

      if (recurrenceType === 'subscription') {
        const subscriptionService = new SubscriptionService(supabase, user.id)
        const result = await subscriptionService.createSubscription({
          name: itemName,
          description: `Converted from expense on ${expense.date}`,
          categoryId: expense.category_id,
          categorySlug: expense.category,
          amount: parseFloat(expense.amount),
          frequency,
          nextDueDate,
          sourceExpenseId: expense.id
        })

        if (!result.success) {
          throw new Error(result.error)
        }

        // Update the expense to mark it as recurrent
        await supabase
          .from('expenses')
          .update({
            is_recurrent: true,
            recurrence_frequency: frequency,
            recurrence_type: 'subscription',
            linked_subscription_id: result.subscription.id
          })
          .eq('id', expense.id)
          .eq('user_id', user.id)

        toast.success(`Subscription created! Next payment due: ${nextDueDate}`)
      } else {
        const billService = new BillReminderService(supabase, user.id)
        const result = await billService.createBillReminder({
          name: itemName,
          description: `Converted from expense on ${expense.date}`,
          categoryId: expense.category_id,
          categorySlug: expense.category,
          amount: parseFloat(expense.amount),
          frequency,
          nextDueDate,
          sourceExpenseId: expense.id
        })

        if (!result.success) {
          throw new Error(result.error)
        }

        // Update the expense to mark it as recurrent
        await supabase
          .from('expenses')
          .update({
            is_recurrent: true,
            recurrence_frequency: frequency,
            recurrence_type: 'bill',
            linked_bill_reminder_id: result.billReminder.id
          })
          .eq('id', expense.id)
          .eq('user_id', user.id)

        toast.success(`Bill reminder created! Next payment due: ${nextDueDate}`)
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error converting to recurring:', error)
      toast.error(`Failed to convert: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !expense) return null

  const nextDueDate = calculateNextDueDate(expense.date, frequency)

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full animate-slideIn shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <RefreshCw className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Convert to Recurring
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {expense.description || expense.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Expense Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(expense.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Category</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                {expense.category}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Date</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {new Date(expense.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Frequency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Frequency
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFrequency('monthly')}
                className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  frequency === 'monthly'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-300'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setFrequency('yearly')}
                className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  frequency === 'yearly'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-300'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Type
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setRecurrenceType('subscription')}
                className={`w-full flex items-center p-4 rounded-lg border-2 transition-all ${
                  recurrenceType === 'subscription'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                }`}
              >
                <div className={`p-2 rounded-lg mr-3 ${
                  recurrenceType === 'subscription'
                    ? 'bg-purple-100 dark:bg-purple-900/40'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Repeat className={`h-5 w-5 ${
                    recurrenceType === 'subscription'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${
                    recurrenceType === 'subscription'
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Subscription
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Netflix, Spotify, software services
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  recurrenceType === 'subscription'
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300 dark:border-gray-500'
                }`}>
                  {recurrenceType === 'subscription' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRecurrenceType('bill')}
                className={`w-full flex items-center p-4 rounded-lg border-2 transition-all ${
                  recurrenceType === 'bill'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                }`}
              >
                <div className={`p-2 rounded-lg mr-3 ${
                  recurrenceType === 'bill'
                    ? 'bg-purple-100 dark:bg-purple-900/40'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <FileText className={`h-5 w-5 ${
                    recurrenceType === 'bill'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${
                    recurrenceType === 'bill'
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Bill Reminder
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Rent, utilities, loan payments
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  recurrenceType === 'bill'
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300 dark:border-gray-500'
                }`}>
                  {recurrenceType === 'bill' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Next Due Date Preview */}
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center text-purple-700 dark:text-purple-300">
              <Calendar className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm font-medium">Next payment due</p>
                <p className="text-lg font-bold">
                  {new Date(nextDueDate).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 btn btn-secondary py-3"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={loading}
            className="flex-1 btn btn-primary py-3 flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-5 w-5 mr-2" />
                Convert
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
