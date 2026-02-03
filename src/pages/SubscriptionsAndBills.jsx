import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { SubscriptionService } from '../utils/subscriptionService'
import { BillReminderService } from '../utils/newBillReminderService'
import { PaymentHistoryService } from '../utils/paymentHistoryService'
import { getCategoryIcon } from '../utils/iconMappings'
import MarkAsPaidModal from '../components/subscriptions/MarkAsPaidModal'
import ConfirmationModal from '../components/ConfirmationModal'
import {
  RefreshCw, Calendar, AlertCircle, Clock, CheckCircle, X,
  DollarSign, FileText, Repeat, SkipForward, Ban, History,
  ChevronRight, AlertTriangle, Check
} from 'lucide-react'

export default function SubscriptionsAndBills() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // Tab state - initialize from URL query param
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl === 'bills' ? 'bills' : tabFromUrl === 'history' ? 'history' : 'subscriptions')

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'subscriptions') {
      searchParams.delete('tab')
    } else {
      searchParams.set('tab', tab)
    }
    setSearchParams(searchParams, { replace: true })
  }

  // Data state
  const [subscriptions, setSubscriptions] = useState([])
  const [billReminders, setBillReminders] = useState([])
  const [historyByCategory, setHistoryByCategory] = useState([])
  const [loading, setLoading] = useState(true)

  // Summary state
  const [summary, setSummary] = useState({
    totalMonthly: 0,
    upcomingCount: 0,
    overdueCount: 0
  })

  // Modal states
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false)
  const [showSkipModal, setShowSkipModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedItemType, setSelectedItemType] = useState(null) // 'subscription' or 'bill'

  // Services
  const [subscriptionService, setSubscriptionService] = useState(null)
  const [billService, setBillService] = useState(null)
  const [historyService, setHistoryService] = useState(null)

  useEffect(() => {
    if (user) {
      const subService = new SubscriptionService(supabase, user.id)
      const billSvc = new BillReminderService(supabase, user.id)
      const historySvc = new PaymentHistoryService(supabase, user.id)

      setSubscriptionService(subService)
      setBillService(billSvc)
      setHistoryService(historySvc)

      fetchAllData(subService, billSvc, historySvc)
    }
  }, [user])

  const fetchAllData = async (subService, billSvc, historySvc) => {
    setLoading(true)
    try {
      // Update overdue status first
      await Promise.all([
        subService.updateOverdueStatus(),
        billSvc.updateOverdueStatus()
      ])

      // Fetch all data
      const [subsResult, billsResult, historyResult, subSummary, billSummary] = await Promise.all([
        subService.getActiveSubscriptions(),
        billSvc.getActiveBillReminders(),
        historySvc.getPaymentHistoryByCategory(),
        subService.getSummary(),
        billSvc.getSummary()
      ])

      if (subsResult.success) setSubscriptions(subsResult.subscriptions)
      if (billsResult.success) setBillReminders(billsResult.billReminders)
      if (historyResult.success) setHistoryByCategory(historyResult.byCategory)

      // Calculate combined summary
      const totalMonthly = (subSummary.summary?.totalMonthly || 0) + (billSummary.summary?.totalMonthly || 0)
      const overdueCount = (subSummary.summary?.overdue || 0) + (billSummary.summary?.overdue || 0)
      const upcomingCount = (subSummary.summary?.upcomingThisWeek || 0) + (billSummary.summary?.upcomingThisWeek || 0)

      setSummary({ totalMonthly, overdueCount, upcomingCount })
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    if (subscriptionService && billService && historyService) {
      fetchAllData(subscriptionService, billService, historyService)
    }
  }

  // Open modals
  const openMarkPaidModal = (item, type) => {
    setSelectedItem(item)
    setSelectedItemType(type)
    setShowMarkPaidModal(true)
  }

  const openSkipModal = (item, type) => {
    setSelectedItem(item)
    setSelectedItemType(type)
    setShowSkipModal(true)
  }

  const openCancelModal = (item, type) => {
    setSelectedItem(item)
    setSelectedItemType(type)
    setShowCancelModal(true)
  }

  // Handle actions
  const handleMarkPaid = async (expenseId, paymentDate) => {
    if (!selectedItem || !selectedItemType) return

    try {
      let result
      if (selectedItemType === 'subscription') {
        result = await subscriptionService.markAsPaid(selectedItem.id, {
          expenseId,
          paymentDate
        })
      } else {
        result = await billService.markAsPaid(selectedItem.id, {
          expenseId,
          paymentDate
        })
      }

      if (result.success) {
        toast.success(result.message)
        setShowMarkPaidModal(false)
        refreshData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error marking as paid:', error)
      toast.error('Failed to mark as paid')
    }
  }

  const handleSkip = async () => {
    if (!selectedItem || !selectedItemType) return

    try {
      let result
      if (selectedItemType === 'subscription') {
        result = await subscriptionService.skipCycle(selectedItem.id)
      } else {
        result = await billService.skipCycle(selectedItem.id)
      }

      if (result.success) {
        toast.success(result.message)
        setShowSkipModal(false)
        refreshData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error skipping cycle:', error)
      toast.error('Failed to skip cycle')
    }
  }

  const handleCancel = async () => {
    if (!selectedItem || !selectedItemType) return

    try {
      let result
      if (selectedItemType === 'subscription') {
        result = await subscriptionService.cancelSubscription(selectedItem.id)
      } else {
        result = await billService.cancelBillReminder(selectedItem.id)
      }

      if (result.success) {
        toast.success(result.message)
        setShowCancelModal(false)
        refreshData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error cancelling:', error)
      toast.error('Failed to cancel')
    }
  }

  // Group items by urgency
  const groupByUrgency = (items) => {
    const groups = {
      overdue: [],
      today: [],
      urgent: [],
      upcoming: []
    }

    for (const item of items) {
      if (item.status === 'cancelled') continue

      if (item.status === 'overdue' || item.daysUntil < 0) {
        groups.overdue.push(item)
      } else if (item.daysUntil === 0) {
        groups.today.push(item)
      } else if (item.daysUntil <= 3) {
        groups.urgent.push(item)
      } else {
        groups.upcoming.push(item)
      }
    }

    return groups
  }

  // Item card component
  const ItemCard = ({ item, type }) => {
    const CategoryIcon = getCategoryIcon(item.category?.slug || item.category_slug)
    const isOverdue = item.status === 'overdue' || item.daysUntil < 0
    const isDueToday = item.daysUntil === 0
    const isDueSoon = item.daysUntil > 0 && item.daysUntil <= 3

    return (
      <div className={`p-4 rounded-xl border-2 transition-all ${
        isOverdue
          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
          : isDueToday
          ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20'
          : isDueSoon
          ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`p-2 rounded-lg ${
              isOverdue ? 'bg-red-100 dark:bg-red-900/40' :
              isDueToday ? 'bg-orange-100 dark:bg-orange-900/40' :
              'bg-gray-100 dark:bg-gray-700'
            }`}>
              <CategoryIcon className={`h-6 w-6 ${
                isOverdue ? 'text-red-600 dark:text-red-400' :
                isDueToday ? 'text-orange-600 dark:text-orange-400' :
                'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {item.name}
                </h4>
                {/* Status Badge */}
                {isOverdue && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    OVERDUE
                  </span>
                )}
                {isDueToday && !isOverdue && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full">
                    TODAY
                  </span>
                )}
              </div>

              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(item.amount)}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                  /{item.frequency === 'yearly' ? 'year' : 'month'}
                </span>
              </p>

              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                <Calendar className="h-4 w-4 mr-1" />
                <span>
                  Due: {new Date(item.next_due_date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                {item.daysUntil < 0 && (
                  <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                    ({Math.abs(item.daysUntil)} days overdue)
                  </span>
                )}
                {item.daysUntil === 1 && (
                  <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                    (Tomorrow)
                  </span>
                )}
                {item.daysUntil > 1 && item.daysUntil <= 3 && (
                  <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">
                    (In {item.daysUntil} days)
                  </span>
                )}
              </div>

              {item.category && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 capitalize">
                  {item.category.name || item.category_slug}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 mt-3 sm:mt-0 sm:ml-4">
            <button
              onClick={() => openMarkPaidModal(item, type)}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors flex items-center"
              title="Mark as paid"
            >
              <Check className="h-4 w-4 mr-1" />
              Paid
            </button>
            <button
              onClick={() => openSkipModal(item, type)}
              disabled={item.status === 'overdue'}
              className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center ${
                item.status === 'overdue'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
              }`}
              title={item.status === 'overdue' ? 'Cannot skip overdue items' : 'Skip this cycle'}
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Skip
            </button>
            <button
              onClick={() => openCancelModal(item, type)}
              className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm rounded-lg transition-colors flex items-center"
              title="Cancel permanently"
            >
              <Ban className="h-4 w-4 mr-1" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render items grouped by urgency
  const renderItemList = (items, type) => {
    const grouped = groupByUrgency(items)

    if (items.filter(i => i.status !== 'cancelled').length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            {type === 'subscription' ? (
              <Repeat className="h-8 w-8 text-gray-400" />
            ) : (
              <FileText className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No {type === 'subscription' ? 'subscriptions' : 'bills'} yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add a recurring expense to track {type === 'subscription' ? 'subscriptions' : 'bills'} here
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Overdue Section */}
        {grouped.overdue.length > 0 && (
          <div>
            <div className="flex items-center mb-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              <h3 className="font-semibold">Overdue ({grouped.overdue.length})</h3>
            </div>
            <div className="space-y-3">
              {grouped.overdue.map(item => (
                <ItemCard key={item.id} item={item} type={type} />
              ))}
            </div>
          </div>
        )}

        {/* Due Today Section */}
        {grouped.today.length > 0 && (
          <div>
            <div className="flex items-center mb-3 text-orange-600 dark:text-orange-400">
              <Clock className="h-5 w-5 mr-2" />
              <h3 className="font-semibold">Due Today ({grouped.today.length})</h3>
            </div>
            <div className="space-y-3">
              {grouped.today.map(item => (
                <ItemCard key={item.id} item={item} type={type} />
              ))}
            </div>
          </div>
        )}

        {/* Urgent Section (1-3 days) */}
        {grouped.urgent.length > 0 && (
          <div>
            <div className="flex items-center mb-3 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <h3 className="font-semibold">Due Soon ({grouped.urgent.length})</h3>
            </div>
            <div className="space-y-3">
              {grouped.urgent.map(item => (
                <ItemCard key={item.id} item={item} type={type} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {grouped.upcoming.length > 0 && (
          <div>
            <div className="flex items-center mb-3 text-green-600 dark:text-green-400">
              <Calendar className="h-5 w-5 mr-2" />
              <h3 className="font-semibold">Upcoming ({grouped.upcoming.length})</h3>
            </div>
            <div className="space-y-3">
              {grouped.upcoming.map(item => (
                <ItemCard key={item.id} item={item} type={type} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render history tab with category cards
  const renderHistoryTab = () => {
    if (historyByCategory.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No payment history yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Payment history will appear here once you mark items as paid or skip them
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {historyByCategory.map(category => {
          const CategoryIcon = getCategoryIcon(category.slug)

          return (
            <div key={category.name} className="card">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <CategoryIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {category.items.length} payment{category.items.length !== 1 ? 's' : ''} recorded
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(category.totalPaid)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">total paid</p>
                </div>
              </div>

              {/* Payment Items */}
              <div className="space-y-3">
                {category.items.slice(0, 5).map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      item.action === 'paid'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : item.action === 'skipped'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-full ${
                        item.action === 'paid'
                          ? 'bg-green-100 dark:bg-green-900/40'
                          : item.action === 'skipped'
                          ? 'bg-yellow-100 dark:bg-yellow-900/40'
                          : 'bg-red-100 dark:bg-red-900/40'
                      }`}>
                        {item.action === 'paid' ? (
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : item.action === 'skipped' ? (
                          <SkipForward className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {item.reference?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.payment_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                          {item.action === 'paid' && item.expense && (
                            <span className="ml-2">• Linked to expense</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {item.action === 'paid' ? (
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(item.amount_paid)}
                        </p>
                      ) : item.action === 'skipped' ? (
                        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          Skipped
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {category.items.length > 5 && (
                  <p className="text-sm text-center text-gray-500 dark:text-gray-400 pt-2">
                    And {category.items.length - 5} more...
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-2xl p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="bg-white bg-opacity-20 rounded-xl p-3">
            <RefreshCw className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Subscriptions & Bills</h1>
            <p className="text-indigo-100 mt-1">Track and manage your recurring payments</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(summary.totalMonthly)}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-indigo-500 opacity-50" />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming (7 days)</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {summary.upcomingCount}
              </p>
            </div>
            <Calendar className="h-10 w-10 text-yellow-500 opacity-50" />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
              <p className={`text-2xl font-bold ${
                summary.overdueCount > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {summary.overdueCount}
              </p>
            </div>
            <AlertCircle className={`h-10 w-10 opacity-50 ${
              summary.overdueCount > 0 ? 'text-red-500' : 'text-green-500'
            }`} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto">
          <button
            onClick={() => handleTabChange('subscriptions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
              activeTab === 'subscriptions'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <Repeat className="h-5 w-5 mr-2" />
            Subscriptions
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              {subscriptions.filter(s => s.status !== 'cancelled').length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('bills')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
              activeTab === 'bills'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <FileText className="h-5 w-5 mr-2" />
            Bills
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              {billReminders.filter(b => b.status !== 'cancelled').length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <History className="h-5 w-5 mr-2" />
            History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'subscriptions' && renderItemList(subscriptions, 'subscription')}
        {activeTab === 'bills' && renderItemList(billReminders, 'bill')}
        {activeTab === 'history' && renderHistoryTab()}
      </div>

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && selectedItem && (
        <MarkAsPaidModal
          isOpen={showMarkPaidModal}
          onClose={() => setShowMarkPaidModal(false)}
          onConfirm={handleMarkPaid}
          item={selectedItem}
          itemType={selectedItemType}
        />
      )}

      {/* Skip Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSkipModal}
        onClose={() => setShowSkipModal(false)}
        onConfirm={handleSkip}
        title="Skip This Cycle"
        message={
          selectedItem
            ? `Are you sure you want to skip "${selectedItem.name}" for this billing period? The next due date will be moved forward.`
            : ''
        }
        confirmText="Skip Cycle"
        variant="warning"
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel Permanently"
        message={
          selectedItem
            ? `Are you sure you want to cancel "${selectedItem.name}"? This action cannot be undone and no more reminders will be created.`
            : ''
        }
        confirmText="Cancel Permanently"
        variant="danger"
      />
    </div>
  )
}
