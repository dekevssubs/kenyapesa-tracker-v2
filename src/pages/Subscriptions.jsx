import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { RefreshCw, Plus, Edit2, Trash2, X, Play, Pause, Calendar, AlertCircle, DollarSign } from 'lucide-react'

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
]

const EXPENSE_CATEGORIES = [
  'rent', 'transport', 'food', 'utilities', 'airtime',
  'entertainment', 'health', 'education', 'clothing', 'savings', 'debt', 'other'
]

export default function Subscriptions() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [totalMonthly, setTotalMonthly] = useState(0)

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'entertainment',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    auto_add: false,
    payment_method: 'mpesa',
    description: ''
  })

  useEffect(() => {
    if (user) {
      fetchSubscriptions()
    }
  }, [user])

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .order('next_date', { ascending: true })

      if (error) throw error

      setSubscriptions(data || [])
      
      // Calculate monthly total
      const monthly = (data || []).reduce((sum, sub) => {
        if (!sub.is_active) return sum
        const amount = parseFloat(sub.amount)
        switch (sub.frequency) {
          case 'daily': return sum + (amount * 30)
          case 'weekly': return sum + (amount * 4.33)
          case 'monthly': return sum + amount
          case 'yearly': return sum + (amount / 12)
          default: return sum
        }
      }, 0)

      setTotalMonthly(monthly)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      setLoading(false)
    }
  }

  const calculateNextDate = (startDate, frequency) => {
    const date = new Date(startDate)
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1)
        break
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
    }
    return date.toISOString().split('T')[0]
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const nextDate = calculateNextDate(formData.start_date, formData.frequency)

      if (editingItem) {
        const { error } = await supabase
          .from('recurring_transactions')
          .update({
            name: formData.name,
            amount: parseFloat(formData.amount),
            category: formData.category,
            frequency: formData.frequency,
            start_date: formData.start_date,
            next_date: nextDate,
            auto_add: formData.auto_add,
            payment_method: formData.payment_method,
            description: formData.description
          })
          .eq('id', editingItem.id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('recurring_transactions')
          .insert([
            {
              user_id: user.id,
              name: formData.name,
              amount: parseFloat(formData.amount),
              category: formData.category,
              type: 'expense',
              frequency: formData.frequency,
              start_date: formData.start_date,
              next_date: nextDate,
              auto_add: formData.auto_add,
              payment_method: formData.payment_method,
              description: formData.description,
              is_active: true
            }
          ])

        if (error) throw error
      }

      setFormData({
        name: '',
        amount: '',
        category: 'entertainment',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        auto_add: false,
        payment_method: 'mpesa',
        description: ''
      })
      setShowModal(false)
      setEditingItem(null)
      fetchSubscriptions()
    } catch (error) {
      console.error('Error saving subscription:', error)
      alert('Error saving subscription. Please try again.')
    }
  }

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active: !currentStatus })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      fetchSubscriptions()
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return

    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      fetchSubscriptions()
    } catch (error) {
      console.error('Error deleting subscription:', error)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      amount: item.amount,
      category: item.category,
      frequency: item.frequency,
      start_date: item.start_date,
      auto_add: item.auto_add,
      payment_method: item.payment_method || 'mpesa',
      description: item.description || ''
    })
    setShowModal(true)
  }

  const getDaysUntilNext = (nextDate) => {
    const today = new Date()
    const next = new Date(nextDate)
    const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getFrequencyIcon = (freq) => {
    const icons = { daily: '📅', weekly: '📆', monthly: '🗓️', yearly: '📋' }
    return icons[freq] || '📅'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-xl p-4">
              <RefreshCw className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Subscriptions & Recurring Expenses</h2>
              <p className="text-indigo-100 mt-1">Manage your recurring payments</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingItem(null)
              setFormData({
                name: '',
                amount: '',
                category: 'entertainment',
                frequency: 'monthly',
                start_date: new Date().toISOString().split('T')[0],
                auto_add: false,
                payment_method: 'mpesa',
                description: ''
              })
              setShowModal(true)
            }}
            className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl font-semibold flex items-center transition-all shadow-md"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Subscription
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-purple-100 font-medium mb-2">Total Monthly Cost</p>
          <p className="text-4xl font-bold">{formatCurrency(totalMonthly)}</p>
          <p className="text-purple-100 text-sm mt-2">{subscriptions.filter(s => s.is_active).length} active subscriptions</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-blue-100 font-medium mb-2">Active Subscriptions</p>
          <p className="text-4xl font-bold">{subscriptions.filter(s => s.is_active).length}</p>
          <p className="text-blue-100 text-sm mt-2">of {subscriptions.length} total</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-green-100 font-medium mb-2">Yearly Cost</p>
          <p className="text-4xl font-bold">{formatCurrency(totalMonthly * 12)}</p>
          <p className="text-green-100 text-sm mt-2">projected annual spending</p>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Your Subscriptions</h3>

        {subscriptions.length === 0 ? (
          <div className="text-center py-16">
            <RefreshCw className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No subscriptions yet</h3>
            <p className="text-gray-500 mb-6">Track your recurring expenses like Netflix, rent, or bundles</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary px-8 py-3">
              Add Your First Subscription
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => {
              const daysUntil = getDaysUntilNext(sub.next_date)
              return (
                <div
                  key={sub.id}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    sub.is_active
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="text-4xl">{getFrequencyIcon(sub.frequency)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{sub.name}</h4>
                          {!sub.is_active && (
                            <span className="badge badge-danger">Paused</span>
                          )}
                          {sub.auto_add && (
                            <span className="badge badge-success">Auto-add</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 capitalize">
                          {sub.frequency} • {sub.category}
                        </p>
                        {sub.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{sub.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="h-4 w-4 mr-1" />
                            Next: {new Date(sub.next_date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                            {daysUntil === 0 && <span className="ml-2 text-orange-600 font-bold">(Today!)</span>}
                            {daysUntil > 0 && daysUntil <= 3 && <span className="ml-2 text-orange-600 font-bold">(In {daysUntil} days)</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 ml-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">{formatCurrency(sub.amount)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">per {sub.frequency.slice(0, -2)}</p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => handleToggleActive(sub.id, sub.is_active)}
                          className={`p-2 rounded-lg transition-colors ${
                            sub.is_active 
                              ? 'text-orange-600 hover:bg-orange-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={sub.is_active ? 'Pause' : 'Resume'}
                        >
                          {sub.is_active ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={() => handleEdit(sub)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
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

      {/* Upcoming Payments Alert */}
      {subscriptions.filter(s => s.is_active && getDaysUntilNext(s.next_date) <= 3).length > 0 && (
        <div className="card bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200">
          <div className="flex items-start space-x-4">
            <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Upcoming Payments</h4>
              <div className="space-y-2">
                {subscriptions
                  .filter(s => s.is_active && getDaysUntilNext(s.next_date) <= 3)
                  .map(sub => (
                    <p key={sub.id} className="text-sm text-gray-700">
                      <strong>{sub.name}</strong> - {formatCurrency(sub.amount)} due in {getDaysUntilNext(sub.next_date) === 0 ? 'today' : `${getDaysUntilNext(sub.next_date)} days`}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 animate-slideIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingItem ? 'Edit Subscription' : 'Add New Subscription'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingItem(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-base font-semibold text-gray-700">
                    Subscription Name *
                  </label>
                  <input
                    type="text"
                    className="input text-base py-3.5"
                    placeholder="Netflix, Rent, Safaricom..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-base font-semibold text-gray-700">
                    Amount (KES) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-base py-3.5"
                    placeholder="1,200"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-base font-semibold text-gray-700">
                    Category *
                  </label>
                  <select
                    className="select text-base py-3.5"
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

                <div className="space-y-3">
                  <label className="block text-base font-semibold text-gray-700">
                    Frequency *
                  </label>
                  <select
                    className="select text-base py-3.5"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    required
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-base font-semibold text-gray-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  className="input text-base py-3.5"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="block text-base font-semibold text-gray-700">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  className="input text-base py-3.5"
                  placeholder="Additional notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_add}
                    onChange={(e) => setFormData({ ...formData, auto_add: e.target.checked })}
                    className="mt-1 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <div>
                    <span className="text-base font-semibold text-gray-900">Auto-add to expenses</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Automatically create expense entries when due (coming soon)
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingItem(null)
                  }}
                  className="flex-1 btn btn-secondary py-4 text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary py-4 text-base"
                >
                  {editingItem ? 'Update' : 'Add'} Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}