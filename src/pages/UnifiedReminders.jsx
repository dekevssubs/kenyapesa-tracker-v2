import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { UnifiedRemindersService } from '../utils/unifiedRemindersService'
import { RenewalReminderService } from '../utils/renewalReminderService'
import CreateRenewalReminderModal from '../components/reminders/CreateRenewalReminderModal'
import ConfirmationModal from '../components/ConfirmationModal'
import {
  Bell, Plus, Trash2, Calendar, AlertCircle, Clock,
  CheckCircle, X, DollarSign, Filter, ChevronDown,
  RefreshCw, Ban, RotateCcw, FileText, Repeat, Link2, Search
} from 'lucide-react'

export default function UnifiedReminders() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Data state
  const [reminders, setReminders] = useState([])
  const [grouped, setGrouped] = useState({ overdue: [], today: [], urgent: [], upcoming: [] })
  const [summary, setSummary] = useState({ total: 0, byType: {}, byUrgency: {}, totalAmount: 0 })
  const [loading, setLoading] = useState(true)

  // Filter state
  const [filterType, setFilterType] = useState('all')
  const [filterUrgency, setFilterUrgency] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Modal states
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [showLinkExpenseModal, setShowLinkExpenseModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)

  // Selected item states
  const [selectedReminder, setSelectedReminder] = useState(null)
  const [actionType, setActionType] = useState(null)

  // Link to expense modal state
  const [recentExpenses, setRecentExpenses] = useState([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('')

  useEffect(() => {
    if (user) {
      fetchReminders()
    }
  }, [user])

  const fetchReminders = async () => {
    try {
      setLoading(true)
      const service = new UnifiedRemindersService(supabase, user.id)
      const result = await service.getAllUpcomingReminders(30)

      if (result.success) {
        setReminders(result.reminders)
        setGrouped(result.grouped)
        setSummary(result.summary)
      } else {
        toast.error('Failed to fetch reminders')
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
      toast.error('Failed to fetch reminders')
    } finally {
      setLoading(false)
    }
  }

  // Fetch recent expenses for linking
  const fetchRecentExpenses = async (reminder) => {
    setLoadingExpenses(true)
    try {
      // Get expenses from last 30 days that could match this reminder
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_reversed', false)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(20)

      if (error) throw error
      setRecentExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Failed to fetch expenses')
    } finally {
      setLoadingExpenses(false)
    }
  }

  // Filter reminders
  const filteredReminders = reminders.filter(r => {
    if (filterType !== 'all' && r.kind !== filterType) return false
    if (filterUrgency !== 'all') {
      if (filterUrgency === 'overdue' && r.daysUntil >= 0) return false
      if (filterUrgency === 'today' && r.daysUntil !== 0) return false
      if (filterUrgency === 'urgent' && (r.daysUntil < 1 || r.daysUntil > 3)) return false
      if (filterUrgency === 'upcoming' && r.daysUntil <= 3) return false
    }
    return true
  })

  const hasActiveFilters = filterType !== 'all' || filterUrgency !== 'all'

  const resetFilters = () => {
    setFilterType('all')
    setFilterUrgency('all')
  }

  // Open link expense modal
  const openLinkExpenseModal = (reminder) => {
    setSelectedReminder(reminder)
    setSelectedExpense(null)
    setExpenseSearchQuery('')
    fetchRecentExpenses(reminder)
    setShowLinkExpenseModal(true)
  }

  // Handle linking expense to reminder (mark as paid)
  const handleLinkExpense = async () => {
    if (!selectedReminder || !selectedExpense) return

    try {
      // Calculate next due date based on the expense date
      const expenseDate = new Date(selectedExpense.date)
      let nextDate = new Date(expenseDate)

      switch (selectedReminder.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1)
          break
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7)
          break
        case 'biweekly':
          nextDate.setDate(nextDate.getDate() + 14)
          break
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1)
          break
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3)
          break
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          break
        default:
          nextDate.setMonth(nextDate.getMonth() + 1)
      }

      // Update the recurring transaction with new next_date
      const { error } = await supabase
        .from('recurring_transactions')
        .update({
          next_date: nextDate.toISOString().split('T')[0]
        })
        .eq('id', selectedReminder.id)
        .eq('user_id', user.id)

      if (error) throw error

      toast.success(`Marked as paid! Next due: ${nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`)
      setShowLinkExpenseModal(false)
      fetchReminders()
    } catch (error) {
      console.error('Error linking expense:', error)
      toast.error('Failed to mark as paid')
    }
  }

  // Handle renewal reminder actions
  const openActionModal = (reminder, action) => {
    setSelectedReminder(reminder)
    setActionType(action)
    setShowActionModal(true)
  }

  const handleRenewalAction = async () => {
    if (!selectedReminder || !actionType) return

    try {
      const service = new RenewalReminderService(supabase, user.id)
      let result

      switch (actionType) {
        case 'cancelled':
          result = await service.markAsCancelled(selectedReminder.id)
          if (result.success) {
            toast.success(`Great! "${selectedReminder.title}" marked as cancelled`)
          }
          break
        case 'renewed':
          const nextDate = new Date(selectedReminder.dueDate)
          nextDate.setMonth(nextDate.getMonth() + 1)

          result = await service.markAsRenewed(selectedReminder.id, {
            createNextReminder: true,
            nextRenewalDate: nextDate.toISOString().split('T')[0]
          })
          if (result.success) {
            toast.success(`"${selectedReminder.title}" renewed. Next reminder set.`)
          }
          break
        case 'expired':
          result = await service.markAsExpired(selectedReminder.id)
          if (result.success) {
            toast.warning(`"${selectedReminder.title}" marked as expired`)
          }
          break
        default:
          return
      }

      if (!result.success) {
        toast.error(result.error || 'Failed to update reminder')
      }

      setShowActionModal(false)
      fetchReminders()
    } catch (error) {
      console.error('Error handling renewal action:', error)
      toast.error('Failed to update reminder')
    }
  }

  // Handle delete
  const openDeleteModal = (reminder) => {
    setSelectedReminder(reminder)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!selectedReminder) return

    try {
      let result

      if (selectedReminder.sourceType === 'renewal_reminder') {
        const service = new RenewalReminderService(supabase, user.id)
        result = await service.deleteReminder(selectedReminder.id)
      } else {
        const { error } = await supabase
          .from('recurring_transactions')
          .update({ is_active: false })
          .eq('id', selectedReminder.id)
          .eq('user_id', user.id)

        result = { success: !error, error: error?.message }
      }

      if (result.success) {
        toast.success('Reminder deleted')
        setShowDeleteModal(false)
        fetchReminders()
      } else {
        toast.error(result.error || 'Failed to delete reminder')
      }
    } catch (error) {
      console.error('Error deleting reminder:', error)
      toast.error('Failed to delete reminder')
    }
  }

  // Filter expenses based on search
  const filteredExpenses = recentExpenses.filter(expense => {
    if (!expenseSearchQuery) return true
    const query = expenseSearchQuery.toLowerCase()
    return (
      expense.description?.toLowerCase().includes(query) ||
      expense.category?.toLowerCase().includes(query) ||
      expense.amount?.toString().includes(query)
    )
  })

  // Badge component
  const Badge = ({ badge }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bgClass} ${badge.textClass}`}>
      {badge.type === 'bill' && <FileText className="h-3 w-3 mr-1" />}
      {badge.type === 'subscription' && <Repeat className="h-3 w-3 mr-1" />}
      {badge.type === 'renewal' && <Ban className="h-3 w-3 mr-1" />}
      {badge.label}
    </span>
  )

  // Urgency badge
  const UrgencyBadge = ({ urgency }) => {
    const colors = {
      overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      today: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      urgent: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      upcoming: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[urgency.level]}`}>
        {urgency.label}
      </span>
    )
  }

  // Reminder card component
  const ReminderCard = ({ reminder }) => {
    const isRenewal = reminder.kind === 'renewal'
    const canPay = !isRenewal && reminder.daysUntil <= 3

    return (
      <div className="card p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-2">
              <Badge badge={reminder.badge} />
              <UrgencyBadge urgency={reminder.urgency} />
            </div>

            {/* Title and amount */}
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {reminder.title}
            </h3>
            <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
              {formatCurrency(reminder.amount)}
            </p>

            {/* Due date */}
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
              <Calendar className="h-4 w-4 mr-1" />
              <span>
                {isRenewal ? 'Renews' : 'Due'}: {new Date(reminder.dueDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
              {reminder.daysUntil === 0 && (
                <span className="ml-2 text-red-600 dark:text-red-400 font-medium">(Today!)</span>
              )}
              {reminder.daysUntil === 1 && (
                <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">(Tomorrow)</span>
              )}
              {reminder.daysUntil < 0 && (
                <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                  ({Math.abs(reminder.daysUntil)} day{Math.abs(reminder.daysUntil) > 1 ? 's' : ''} overdue)
                </span>
              )}
            </div>

            {/* Frequency for bills/subscriptions */}
            {!isRenewal && reminder.frequency && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                <RefreshCw className="h-4 w-4 mr-1" />
                <span className="capitalize">{reminder.frequency}</span>
              </div>
            )}

            {/* Notes for renewals */}
            {isRenewal && reminder.notes && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                {reminder.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-2 ml-4">
            {isRenewal ? (
              <>
                <button
                  onClick={() => openActionModal(reminder, 'cancelled')}
                  className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                  title="I cancelled it"
                >
                  <CheckCircle className="h-5 w-5" />
                </button>
                <button
                  onClick={() => openActionModal(reminder, 'renewed')}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="It renewed"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  onClick={() => openDeleteModal(reminder)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                {canPay ? (
                  <button
                    onClick={() => openLinkExpenseModal(reminder)}
                    className="px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center"
                    title="Link to an expense you've already recorded"
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Paid
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 text-sm rounded-lg cursor-not-allowed flex items-center"
                    title="Can mark as paid from 3 days before due date"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Wait
                  </button>
                )}
                <button
                  onClick={() => openDeleteModal(reminder)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render grouped section
  const renderSection = (title, items, icon, colorClass) => {
    if (items.length === 0) return null

    return (
      <div className="mb-6">
        <div className={`flex items-center mb-3 ${colorClass}`}>
          {icon}
          <h3 className="font-semibold ml-2">{title}</h3>
          <span className="ml-2 text-sm opacity-75">({items.length})</span>
        </div>
        <div className="space-y-3">
          {items.map(reminder => (
            <ReminderCard key={`${reminder.sourceType}-${reminder.id}`} reminder={reminder} />
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reminders</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Bills, subscriptions, and cancellation reminders
          </p>
        </div>
        <button
          onClick={() => setShowRenewalModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-1" />
          Cancel Reminder
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Due</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(summary.totalAmount)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary-500 opacity-50" />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bills</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {summary.byType?.bills || 0}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Subscriptions</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {summary.byType?.subscriptions || 0}
              </p>
            </div>
            <Repeat className="h-8 w-8 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cancel Reminders</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {summary.byType?.renewals || 0}
              </p>
            </div>
            <Ban className="h-8 w-8 text-red-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          <Filter className="h-5 w-5 mr-2" />
          Filters
          <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="input"
                >
                  <option value="all">All Types</option>
                  <option value="bill">Bills</option>
                  <option value="subscription">Subscriptions</option>
                  <option value="renewal">Cancel Reminders</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Urgency
                </label>
                <select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  className="input"
                >
                  <option value="all">All</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due Today</option>
                  <option value="urgent">Urgent (1-3 days)</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredReminders.length} of {reminders.length} reminders
                </p>
                <button
                  onClick={resetFilters}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reminder Lists */}
      {filteredReminders.length === 0 ? (
        <div className="card p-8 text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {hasActiveFilters ? 'No matching reminders' : 'No upcoming reminders'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Add bills, subscriptions, or set cancellation reminders'
            }
          </p>
          {!hasActiveFilters && (
            <button
              onClick={() => setShowRenewalModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-5 w-5 mr-1" />
              Add Reminder
            </button>
          )}
        </div>
      ) : (
        <>
          {hasActiveFilters ? (
            <div className="space-y-3">
              {filteredReminders.map(reminder => (
                <ReminderCard key={`${reminder.sourceType}-${reminder.id}`} reminder={reminder} />
              ))}
            </div>
          ) : (
            <>
              {renderSection(
                'Overdue',
                grouped.overdue,
                <AlertCircle className="h-5 w-5" />,
                'text-red-600 dark:text-red-400'
              )}
              {renderSection(
                'Due Today',
                grouped.today,
                <Clock className="h-5 w-5" />,
                'text-orange-600 dark:text-orange-400'
              )}
              {renderSection(
                'Urgent (1-3 days)',
                grouped.urgent,
                <Bell className="h-5 w-5" />,
                'text-yellow-600 dark:text-yellow-400'
              )}
              {renderSection(
                'Upcoming',
                grouped.upcoming,
                <Calendar className="h-5 w-5" />,
                'text-green-600 dark:text-green-400'
              )}
            </>
          )}
        </>
      )}

      {/* Create Renewal Reminder Modal */}
      <CreateRenewalReminderModal
        isOpen={showRenewalModal}
        onClose={() => setShowRenewalModal(false)}
        onSuccess={() => fetchReminders()}
      />

      {/* Link to Expense Modal */}
      {showLinkExpenseModal && selectedReminder && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col animate-slideIn shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Mark as Paid
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Link "{selectedReminder.title}" to an expense you've recorded
                </p>
              </div>
              <button
                onClick={() => setShowLinkExpenseModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={expenseSearchQuery}
                  onChange={(e) => setExpenseSearchQuery(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingExpenses ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No recent expenses found. Add an expense first, then come back to link it.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExpenses.map(expense => (
                    <button
                      key={expense.id}
                      onClick={() => setSelectedExpense(expense)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedExpense?.id === expense.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {expense.description || expense.category}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(expense.date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                            {expense.category && ` • ${expense.category}`}
                          </p>
                        </div>
                        <p className="font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowLinkExpenseModal(false)}
                className="flex-1 btn btn-secondary py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkExpense}
                disabled={!selectedExpense}
                className="flex-1 btn btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Link & Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Action Confirmation Modal */}
      {showActionModal && selectedReminder && (
        <ConfirmationModal
          isOpen={showActionModal}
          onClose={() => setShowActionModal(false)}
          onConfirm={handleRenewalAction}
          title={
            actionType === 'cancelled' ? 'Mark as Cancelled' :
            actionType === 'renewed' ? 'Mark as Renewed' :
            'Mark as Expired'
          }
          message={
            actionType === 'cancelled'
              ? `Great job! You cancelled "${selectedReminder.title}" and avoided a ${formatCurrency(selectedReminder.amount)} charge.`
              : actionType === 'renewed'
              ? `"${selectedReminder.title}" renewed for ${formatCurrency(selectedReminder.amount)}. We'll create a reminder for next month.`
              : `This will mark "${selectedReminder.title}" as expired. You can add the renewal as an expense if needed.`
          }
          confirmText={
            actionType === 'cancelled' ? 'Yes, I Cancelled It' :
            actionType === 'renewed' ? 'It Renewed' :
            'Mark Expired'
          }
          variant={actionType === 'cancelled' ? 'info' : actionType === 'renewed' ? 'warning' : 'danger'}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Reminder"
        message={`Are you sure you want to delete "${selectedReminder?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
