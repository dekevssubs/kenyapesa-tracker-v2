import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { BillReminderService } from '../../utils/billReminderService'
import { formatCurrency } from '../../utils/calculations'
import {
  Bell,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function BillRemindersWidget() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bills, setBills] = useState({
    dueToday: [],
    urgent: [],
    upcoming: []
  })
  const [summary, setSummary] = useState({
    total: 0,
    dueToday: 0,
    urgent: 0,
    upcoming: 0,
    totalAmount: 0
  })
  const [expandedSections, setExpandedSections] = useState({
    dueToday: true,
    urgent: true,
    upcoming: false
  })

  useEffect(() => {
    if (user) {
      fetchBillReminders()
    }
  }, [user])

  const fetchBillReminders = async () => {
    try {
      setLoading(true)
      const billService = new BillReminderService(supabase, user.id)
      const result = await billService.getUpcomingBills(7)

      if (result.success) {
        setBills(result.bills)
        setSummary(result.summary)
      }
    } catch (error) {
      console.error('Error fetching bill reminders:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center p-8">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  // Don't show widget if no upcoming bills
  if (summary.total === 0) {
    return (
      <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-green-500 p-2 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Bill Reminders</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          No upcoming bills in the next 7 days. You're all caught up!
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-500 p-2 rounded-lg">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bill Reminders</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {summary.total} bill{summary.total !== 1 ? 's' : ''} due in the next 7 days
            </p>
          </div>
        </div>
        <Link
          to="/subscriptions"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          View All
          <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Due Today */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-xs font-semibold text-red-600">Due Today</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{summary.dueToday}</p>
          <p className="text-xs text-red-600 mt-1">
            {formatCurrency(summary.amountDueToday)}
          </p>
        </div>

        {/* Urgent (1-3 days) */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-600">Urgent</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{summary.urgent}</p>
          <p className="text-xs text-amber-600 mt-1">
            {formatCurrency(summary.amountUrgent)}
          </p>
        </div>

        {/* Upcoming (4-7 days) */}
        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Coming</span>
          </div>
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{summary.upcoming}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {formatCurrency(summary.amountUpcoming)}
          </p>
        </div>
      </div>

      {/* Bills List */}
      <div className="space-y-3">
        {/* Due Today Section */}
        {bills.dueToday.length > 0 && (
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('dueToday')}
              className="w-full bg-red-50 px-4 py-3 flex items-center justify-between hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="font-semibold text-red-700">
                  Due Today ({bills.dueToday.length})
                </span>
              </div>
              {expandedSections.dueToday ? (
                <ChevronUp className="h-4 w-4 text-red-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-red-600" />
              )}
            </button>
            {expandedSections.dueToday && (
              <div className="divide-y divide-red-100">
                {bills.dueToday.map((bill) => (
                  <div key={bill.id} className="p-3 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{bill.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(bill.next_date).toLocaleDateString('en-KE', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                            {bill.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-700">
                          {formatCurrency(bill.amount)}
                        </p>
                        <span className="text-xs text-red-600 font-medium">
                          {bill.urgencyLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Urgent Section (1-3 days) */}
        {bills.urgent.length > 0 && (
          <div className="border border-amber-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('urgent')}
              className="w-full bg-amber-50 px-4 py-3 flex items-center justify-between hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-amber-700">
                  Urgent (1-3 days) ({bills.urgent.length})
                </span>
              </div>
              {expandedSections.urgent ? (
                <ChevronUp className="h-4 w-4 text-amber-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-600" />
              )}
            </button>
            {expandedSections.urgent && (
              <div className="divide-y divide-amber-100">
                {bills.urgent.map((bill) => (
                  <div key={bill.id} className="p-3 bg-white hover:bg-amber-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{bill.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(bill.next_date).toLocaleDateString('en-KE', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                            {bill.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-700">
                          {formatCurrency(bill.amount)}
                        </p>
                        <span className="text-xs text-amber-600 font-medium">
                          {bill.urgencyLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Section (4-7 days) */}
        {bills.upcoming.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('upcoming')}
              className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="font-semibold text-gray-700">
                  Coming Soon (4-7 days) ({bills.upcoming.length})
                </span>
              </div>
              {expandedSections.upcoming ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </button>
            {expandedSections.upcoming && (
              <div className="divide-y divide-gray-100">
                {bills.upcoming.map((bill) => (
                  <div key={bill.id} className="p-3 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{bill.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(bill.next_date).toLocaleDateString('en-KE', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                            {bill.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-700">
                          {formatCurrency(bill.amount)}
                        </p>
                        <span className="text-xs text-gray-600">
                          {bill.urgencyLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Total Amount Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Amount Due (7 days)
          </span>
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(summary.totalAmount)}
          </span>
        </div>
      </div>
    </div>
  )
}
