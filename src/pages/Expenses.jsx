import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { Plus, Edit2, Trash2, TrendingDown, Filter, X } from 'lucide-react'

const EXPENSE_CATEGORIES = [
  'rent', 'transport', 'food', 'utilities', 'airtime',
  'entertainment', 'health', 'education', 'clothing', 'savings', 'debt', 'other'
]

const PAYMENT_METHODS = ['mpesa', 'cash', 'bank', 'card']

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')

  const [formData, setFormData] = useState({
    amount: '',
    category: 'food',
    description: '',
    payment_method: 'mpesa',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (user) {
      fetchExpenses()
    }
  }, [user])

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error

      setExpenses(data || [])
      
      const currentDate = new Date()
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const monthlyTotal = (data || [])
        .filter(expense => {
          const expenseDate = new Date(expense.date)
          return expenseDate >= firstDay && expenseDate <= lastDay
        })
        .reduce((sum, expense) => sum + parseFloat(expense.amount), 0)

      setTotalExpenses(monthlyTotal)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update({
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            payment_method: formData.payment_method,
            date: formData.date
          })
          .eq('id', editingExpense.id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([
            {
              user_id: user.id,
              amount: parseFloat(formData.amount),
              category: formData.category,
              description: formData.description,
              payment_method: formData.payment_method,
              date: formData.date
            }
          ])

        if (error) throw error
      }

      setFormData({
        amount: '',
        category: 'food',
        description: '',
        payment_method: 'mpesa',
        date: new Date().toISOString().split('T')[0]
      })
      setShowModal(false)
      setEditingExpense(null)
      fetchExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Error saving expense. Please try again.')
    }
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setFormData({
      amount: expense.amount,
      category: expense.category,
      description: expense.description || '',
      payment_method: expense.payment_method,
      date: expense.date
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Error deleting expense. Please try again.')
    }
  }

  const getCategoryIcon = (category) => {
    const icons = {
      rent: '🏠',
      transport: '🚌',
      food: '🍕',
      utilities: '💡',
      airtime: '📱',
      entertainment: '🎬',
      health: '🏥',
      education: '📚',
      clothing: '👕',
      savings: '💰',
      debt: '💳',
      other: '📦'
    }
    return icons[category] || '📦'
  }

  const getCategoryColor = (category) => {
    const colors = {
      rent: 'bg-purple-100 text-purple-800',
      transport: 'bg-blue-100 text-blue-800',
      food: 'bg-orange-100 text-orange-800',
      utilities: 'bg-yellow-100 text-yellow-800',
      airtime: 'bg-green-100 text-green-800',
      entertainment: 'bg-pink-100 text-pink-800',
      health: 'bg-red-100 text-red-800',
      education: 'bg-indigo-100 text-indigo-800',
      clothing: 'bg-teal-100 text-teal-800',
      savings: 'bg-emerald-100 text-emerald-800',
      debt: 'bg-gray-100 text-gray-800',
      other: 'bg-slate-100 text-slate-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentIcon = (method) => {
    const icons = {
      mpesa: '📱',
      cash: '💵',
      bank: '🏦',
      card: '💳'
    }
    return icons[method] || '💳'
  }

  const filteredExpenses = expenses.filter(expense => {
    const categoryMatch = filterCategory === 'all' || expense.category === filterCategory
    const paymentMatch = filterPayment === 'all' || expense.payment_method === filterPayment
    return categoryMatch && paymentMatch
  })

  const getCategoryTotal = (category) => {
    const currentMonth = expenses.filter(e => {
      const d = new Date(e.date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    return currentMonth
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0)
  }

  const topCategories = EXPENSE_CATEGORIES
    .map(cat => ({ category: cat, total: getCategoryTotal(cat) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-100">Total Expenses This Month</p>
            <TrendingDown className="h-6 w-6 text-red-200" />
          </div>
          <p className="text-4xl font-bold">{formatCurrency(totalExpenses)}</p>
          <p className="text-sm text-red-100 mt-2">
            {expenses.filter(e => {
              const d = new Date(e.date)
              const now = new Date()
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length} transactions this month
          </p>
        </div>

        <div className="card flex items-center justify-center">
          <button
            onClick={() => {
              setEditingExpense(null)
              setFormData({
                amount: '',
                category: 'food',
                description: '',
                payment_method: 'mpesa',
                date: new Date().toISOString().split('T')[0]
              })
              setShowModal(true)
            }}
            className="btn btn-primary py-4 px-8 text-lg flex items-center"
          >
            <Plus className="h-6 w-6 mr-2" />
            Add New Expense
          </button>
        </div>
      </div>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Spending Categories This Month
          </h3>
          <div className="space-y-3">
            {topCategories.map(({ category, total }) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-2xl">{getCategoryIcon(category)}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 capitalize">{category}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(total / totalExpenses * 100).toFixed(0)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold text-gray-900">{formatCurrency(total)}</p>
                  <p className="text-xs text-gray-500">
                    {((total / totalExpenses) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select
              className="select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select
              className="select"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            >
              <option value="all">All Methods</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Expense History {filterCategory !== 'all' || filterPayment !== 'all' ? `(${filteredExpenses.length} filtered)` : ''}
        </h3>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <TrendingDown className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {expenses.length === 0 ? 'No expenses recorded yet' : 'No expenses match your filters'}
            </p>
            {expenses.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
              >
                Add Your First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="text-3xl">
                    {getCategoryIcon(expense.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-semibold text-gray-900 capitalize">
                        {expense.category}
                      </p>
                      <span className={`badge ${getCategoryColor(expense.category)}`}>
                        {expense.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getPaymentIcon(expense.payment_method)} {expense.payment_method}
                      </span>
                    </div>
                    {expense.description && (
                      <p className="text-sm text-gray-600">{expense.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(expense.date).toLocaleDateString('en-KE', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <p className="text-xl font-bold text-red-600">
                    -{formatCurrency(expense.amount)}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingExpense(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label className="label">Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="500"
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
                      {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Description</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Lunch at Java, Uber to town"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
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
                      {getPaymentIcon(method)} {method.charAt(0).toUpperCase() + method.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingExpense(null)
                  }}
                  className="flex-1 btn btn-secondary py-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary py-3"
                >
                  {editingExpense ? 'Update' : 'Add'} Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}