import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { getCategoryIcon, getPaymentIcon } from '../utils/iconMappings'
import { Bell, Plus, Edit2, Trash2, Calendar, AlertCircle, Clock, CheckCircle, X, DollarSign, Filter, ChevronDown } from 'lucide-react'

const BILL_FREQUENCIES = ['once', 'weekly', 'monthly', 'quarterly', 'yearly']

// Payment window: bills can only be marked as paid up to 3 days before due date
const PAYMENT_WINDOW_DAYS = 3

const EXPENSE_CATEGORIES = [
  'rent', 'transport', 'food', 'utilities', 'airtime',
  'entertainment', 'health', 'education', 'clothing', 'savings', 'debt', 'other'
]

const PAYMENT_METHODS = ['mpesa', 'cash', 'bank', 'card']

export default function BillReminders() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBill, setEditingBill] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filter states
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDueDays, setFilterDueDays] = useState('all') // 'all', 'overdue', 'today', 'week', 'month'
  const [sortBy, setSortBy] = useState('due_date') // 'due_date', 'amount', 'name'

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'utilities',
    payment_method: 'mpesa',
    due_date: new Date().toISOString().split('T')[0],
    frequency: 'monthly',
    notes: ''
  })

  useEffect(() => {
    if (user) {
      fetchBills()
    }
  }, [user])

  const fetchBills = async () => {
    try {
      const { data, error } = await supabase
        .from('bill_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('due_date', { ascending: true })

      if (error) throw error

      setBills(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching bills:', error)
      showToast('Error', 'Failed to fetch bills', 'error')
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showToast('Validation Error', 'Please enter a bill name', 'warning')
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Validation Error', 'Please enter a valid amount', 'warning')
      return
    }

    try {
      if (editingBill) {
        const { error } = await supabase
          .from('bill_reminders')
          .update({
            name: formData.name,
            amount: parseFloat(formData.amount),
            category: formData.category,
            payment_method: formData.payment_method,
            due_date: formData.due_date,
            frequency: formData.frequency,
            notes: formData.notes
          })
          .eq('id', editingBill.id)
          .eq('user_id', user.id)

        if (error) throw error
        showToast('Success', 'Bill reminder updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('bill_reminders')
          .insert([{
            user_id: user.id,
            name: formData.name,
            amount: parseFloat(formData.amount),
            category: formData.category,
            payment_method: formData.payment_method,
            due_date: formData.due_date,
            frequency: formData.frequency,
            notes: formData.notes,
            is_active: true
          }])

        if (error) throw error
        showToast('Success', 'Bill reminder created successfully', 'success')
      }

      resetForm()
      setShowModal(false)
      setEditingBill(null)
      fetchBills()
    } catch (error) {
      console.error('Error saving bill:', error)
      showToast('Error', 'Failed to save bill reminder', 'error')
    }
  }

  /**
   * Check if a bill is within the payment window (can be marked as paid)
   * Bills can be marked as paid from 3 days before due date onwards (including overdue)
   */
  const isWithinPaymentWindow = (bill) => {
    const daysUntil = getDaysUntilDue(bill.due_date)
    // Can pay if overdue (negative) or within 3 days of due date
    return daysUntil <= PAYMENT_WINDOW_DAYS
  }

  const handleMarkAsPaid = async (bill) => {
    // Check payment window
    const daysUntil = getDaysUntilDue(bill.due_date)
    if (daysUntil > PAYMENT_WINDOW_DAYS) {
      showToast(
        'Too Early',
        `You can only mark this bill as paid ${PAYMENT_WINDOW_DAYS} days before the due date (${new Date(bill.due_date).toLocaleDateString()})`,
        'warning'
      )
      return
    }

    if (!confirm(`Mark "${bill.name}" as paid and create expense entry?`)) return

    try {
      // Create expense entry
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          user_id: user.id,
          amount: parseFloat(bill.amount),
          category: bill.category,
          description: `Bill payment: ${bill.name}`,
          payment_method: bill.payment_method,
          date: new Date().toISOString().split('T')[0]
        }])

      if (expenseError) throw expenseError

      // Update last_reminded_at
      const { error: updateError } = await supabase
        .from('bill_reminders')
        .update({
          last_reminded_at: new Date().toISOString()
        })
        .eq('id', bill.id)

      if (updateError) throw updateError

      // If recurring, update due_date
      if (bill.frequency !== 'once') {
        const newDueDate = calculateNextDueDate(bill.due_date, bill.frequency)
        const { error: dueDateError } = await supabase
          .from('bill_reminders')
          .update({
            due_date: newDueDate
          })
          .eq('id', bill.id)

        if (dueDateError) throw dueDateError
      } else {
        // If one-time bill, deactivate it
        const { error: deactivateError } = await supabase
          .from('bill_reminders')
          .update({
            is_active: false
          })
          .eq('id', bill.id)

        if (deactivateError) throw deactivateError
      }

      showToast('Success', `"${bill.name}" marked as paid and expense created`, 'success')
      fetchBills()
    } catch (error) {
      console.error('Error marking bill as paid:', error)
      showToast('Error', 'Failed to mark bill as paid', 'error')
    }
  }

  const calculateNextDueDate = (currentDueDate, frequency) => {
    const date = new Date(currentDueDate)

    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
      default:
        break
    }

    return date.toISOString().split('T')[0]
  }

  const handleEdit = (bill) => {
    setEditingBill(bill)
    setFormData({
      name: bill.name,
      amount: bill.amount,
      category: bill.category,
      payment_method: bill.payment_method,
      due_date: bill.due_date,
      frequency: bill.frequency,
      notes: bill.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this bill reminder?')) return

    try {
      const { error } = await supabase
        .from('bill_reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      showToast('Deleted', 'Bill reminder deleted successfully', 'info')
      fetchBills()
    } catch (error) {
      console.error('Error deleting bill:', error)
      showToast('Error', 'Failed to delete bill reminder', 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      category: 'utilities',
      payment_method: 'mpesa',
      due_date: new Date().toISOString().split('T')[0],
      frequency: 'monthly',
      notes: ''
    })
  }

  const getDaysUntilDue = (dueDate) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const upcomingBills = bills.filter(bill => {
    const daysUntil = getDaysUntilDue(bill.due_date)
    return daysUntil <= 7 && daysUntil >= 0
  })

  const overdueBills = bills.filter(bill => getDaysUntilDue(bill.due_date) < 0)

  const totalUpcoming = upcomingBills.reduce((sum, b) => sum + parseFloat(b.amount), 0)
  const totalOverdue = overdueBills.reduce((sum, b) => sum + parseFloat(b.amount), 0)

  // Apply filters
  const filteredBills = bills.filter(bill => {
    // Category filter
    if (filterCategory !== 'all' && bill.category !== filterCategory) return false

    // Due days filter
    const daysUntil = getDaysUntilDue(bill.due_date)
    switch (filterDueDays) {
      case 'overdue':
        if (daysUntil >= 0) return false
        break
      case 'today':
        if (daysUntil !== 0) return false
        break
      case 'week':
        if (daysUntil < 0 || daysUntil > 7) return false
        break
      case 'month':
        if (daysUntil < 0 || daysUntil > 30) return false
        break
      default:
        break
    }

    return true
  })

  // Apply sorting
  const sortedBills = [...filteredBills].sort((a, b) => {
    switch (sortBy) {
      case 'amount':
        return parseFloat(b.amount) - parseFloat(a.amount)
      case 'name':
        return a.name.localeCompare(b.name)
      case 'due_date':
      default:
        return new Date(a.due_date) - new Date(b.due_date)
    }
  })

  const hasActiveFilters = filterCategory !== 'all' || filterDueDays !== 'all'

  const resetFilters = () => {
    setFilterCategory('all')
    setFilterDueDays('all')
    setSortBy('due_date')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100">Active Bill Reminders</p>
            <Bell className="h-6 w-6 text-blue-200" />
          </div>
          <p className="text-4xl font-bold">{bills.length}</p>
          <p className="text-sm text-blue-100 mt-2">
            Total: {formatCurrency(bills.reduce((sum, b) => sum + parseFloat(b.amount), 0))}
          </p>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-amber-100">Due This Week</p>
            <AlertCircle className="h-6 w-6 text-amber-200" />
          </div>
          <p className="text-4xl font-bold">{upcomingBills.length}</p>
          <p className="text-sm text-amber-100 mt-2">
            Amount: {formatCurrency(totalUpcoming)}
          </p>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-100">Overdue Bills</p>
            <Clock className="h-6 w-6 text-red-200" />
          </div>
          <p className="text-4xl font-bold">{overdueBills.length}</p>
          <p className="text-sm text-red-100 mt-2">
            Amount: {formatCurrency(totalOverdue)}
          </p>
        </div>
      </div>

      {/* Add New Button & Filters */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              resetForm()
              setEditingBill(null)
              setShowModal(true)
            }}
            className="btn btn-primary flex items-center justify-center py-3 flex-1"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Bill Reminder
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn flex items-center justify-center py-3 ${
              showFilters || hasActiveFilters
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                : 'btn-secondary'
            }`}
          >
            <Filter className="h-5 w-5 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                Active
              </span>
            )}
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input w-full"
                >
                  <option value="all">All Categories</option>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <select
                  value={filterDueDays}
                  onChange={(e) => setFilterDueDays(e.target.value)}
                  className="input w-full"
                >
                  <option value="all">All Bills</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due Today</option>
                  <option value="week">Due This Week</option>
                  <option value="month">Due This Month</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input w-full"
                >
                  <option value="due_date">Due Date</option>
                  <option value="amount">Amount (High to Low)</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {sortedBills.length} of {bills.length} bills
                  {filteredBills.length > 0 && ` • Total: ${formatCurrency(filteredBills.reduce((sum, b) => sum + parseFloat(b.amount), 0))}`}
                </p>
                <button
                  onClick={resetFilters}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overdue Bills Alert */}
      {overdueBills.length > 0 && (
        <div className="card bg-red-50 border border-red-200">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">
              Overdue Bills ({overdueBills.length})
            </h3>
          </div>
          <div className="space-y-2">
            {overdueBills.map(bill => {
              const CategoryIcon = getCategoryIcon(bill.category)
              const daysOverdue = Math.abs(getDaysUntilDue(bill.due_date))
              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <CategoryIcon className="h-5 w-5 text-gray-700" />
                    <div>
                      <p className="font-semibold text-gray-900">{bill.name}</p>
                      <p className="text-xs text-red-600">
                        {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <p className="font-bold text-red-600">{formatCurrency(bill.amount)}</p>
                    <button
                      onClick={() => handleMarkAsPaid(bill)}
                      className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Mark Paid
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bills List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {hasActiveFilters ? 'Filtered Bill Reminders' : 'All Bill Reminders'}
        </h3>

        {sortedBills.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {hasActiveFilters ? 'No bills match your filters' : 'No bill reminders yet'}
            </p>
            {hasActiveFilters ? (
              <button onClick={resetFilters} className="btn btn-secondary">
                Clear Filters
              </button>
            ) : (
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                Add Your First Bill Reminder
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedBills.map((bill) => {
              const CategoryIcon = getCategoryIcon(bill.category)
              const PaymentIcon = getPaymentIcon(bill.payment_method)
              const daysUntil = getDaysUntilDue(bill.due_date)

              let dueStatus = ''
              let dueColor = ''
              if (daysUntil < 0) {
                dueStatus = `${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'day' : 'days'} overdue`
                dueColor = 'text-red-600'
              } else if (daysUntil === 0) {
                dueStatus = 'Due today'
                dueColor = 'text-red-600'
              } else if (daysUntil <= 7) {
                dueStatus = `Due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`
                dueColor = 'text-amber-600'
              } else {
                dueStatus = `Due in ${daysUntil} days`
                dueColor = 'text-gray-600'
              }

              return (
                <div
                  key={bill.id}
                  className={`p-4 rounded-lg transition-colors ${
                    daysUntil < 0 ? 'bg-red-50 border border-red-200' :
                    daysUntil <= 7 ? 'bg-amber-50 border border-amber-200' :
                    'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2.5 rounded-lg bg-white">
                        <CategoryIcon className="h-7 w-7 text-gray-700" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-lg font-semibold text-gray-900">
                            {bill.name}
                          </p>
                          <span className="badge bg-blue-100 text-blue-700 capitalize">
                            {bill.frequency}
                          </span>
                          <span className="flex items-center text-xs text-gray-500">
                            <PaymentIcon className="h-3.5 w-3.5 mr-1" />
                            {bill.payment_method}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 capitalize mb-1">
                          Category: {bill.category}
                        </p>

                        {bill.notes && (
                          <p className="text-sm text-gray-600 mb-2">
                            {bill.notes}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-sm">
                          <span className="flex items-center text-gray-600">
                            <Calendar className="h-4 w-4 mr-1" />
                            Due: {new Date(bill.due_date).toLocaleDateString('en-KE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className={`flex items-center font-semibold ${dueColor}`}>
                            <Clock className="h-4 w-4 mr-1" />
                            {dueStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(bill.amount)}
                      </p>

                      <div className="flex space-x-2">
                        {isWithinPaymentWindow(bill) ? (
                          <button
                            onClick={() => handleMarkAsPaid(bill)}
                            className="px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Paid
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm rounded-lg cursor-not-allowed flex items-center"
                            title={`Available ${PAYMENT_WINDOW_DAYS} days before due date`}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Not Yet
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(bill)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bill.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBill ? 'Edit Bill Reminder' : 'Add New Bill Reminder'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingBill(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label className="label">Bill Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Electricity Bill, Rent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="2000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Category *</label>
                <select
                  className="select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Payment Method *</label>
                <select
                  className="select"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  required
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Due Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Frequency *</label>
                <select
                  className="select"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  required
                >
                  {BILL_FREQUENCIES.map((freq) => (
                    <option key={freq} value={freq}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Notes (Optional)</label>
                <textarea
                  className="textarea"
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingBill(null)
                  }}
                  className="flex-1 btn btn-secondary py-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary py-3"
                >
                  {editingBill ? 'Update' : 'Add'} Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
