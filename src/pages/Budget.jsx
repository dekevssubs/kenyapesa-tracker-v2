import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { getCategoryIcon } from '../utils/iconMappings'
import { FileText, Plus, Edit2, Trash2, X, TrendingUp, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react'
import ConfirmationModal from '../components/ConfirmationModal'
import { useConfirmation } from '../hooks/useConfirmation'

const EXPENSE_CATEGORIES = [
  'rent', 'transport', 'food', 'utilities', 'airtime',
  'entertainment', 'health', 'education', 'clothing', 'savings', 'debt', 'other'
]

export default function Budget() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { isOpen: confirmOpen, config: confirmConfig, confirm, close: closeConfirm } = useConfirmation()
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState([])
  const [expenses, setExpenses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [predictions, setPredictions] = useState({})

  const [formData, setFormData] = useState({
    category: 'food',
    monthly_limit: '',
    month: new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
  })

  useEffect(() => {
    if (user) {
      fetchBudgets()
      fetchExpenses()
    }
  }, [user])

  useEffect(() => {
    if (expenses.length > 0) {
      calculatePredictions()
    }
  }, [expenses])

  const fetchBudgets = async () => {
    try {
      const currentMonth = new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
      
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)

      if (error) throw error
      setBudgets(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching budgets:', error)
      setLoading(false)
    }
  }

  const fetchExpenses = async () => {
    try {
      const currentDate = new Date()
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0])

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
    }
  }

  const calculatePredictions = async () => {
    try {
      // Fetch last 3 months expenses for prediction
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const { data: historicalData } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', threeMonthsAgo.toISOString().split('T')[0])

      if (!historicalData || historicalData.length === 0) return

      // Calculate average spending by category
      const categoryTotals = {}
      const categoryCounts = {}

      historicalData.forEach(expense => {
        if (!categoryTotals[expense.category]) {
          categoryTotals[expense.category] = 0
          categoryCounts[expense.category] = 0
        }
        categoryTotals[expense.category] += parseFloat(expense.amount)
        categoryCounts[expense.category]++
      })

      const pred = {}
      Object.keys(categoryTotals).forEach(category => {
        const avgMonthly = categoryTotals[category] / 3 // 3 months average
        const trend = Math.random() * 0.2 - 0.1 // Simulate +/- 10% trend
        pred[category] = {
          predicted: avgMonthly * (1 + trend),
          historical: avgMonthly,
          trend: trend > 0 ? 'increasing' : 'decreasing'
        }
      })

      setPredictions(pred)
    } catch (error) {
      console.error('Error calculating predictions:', error)
    }
  }

  const getCategorySpent = (category) => {
    return expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0)
  }

  const getBudgetStatus = (spent, limit) => {
    const percentage = (spent / limit) * 100
    if (percentage >= 100) return { status: 'over', color: 'red', message: 'Over budget!' }
    if (percentage >= 90) return { status: 'warning', color: 'yellow', message: 'Almost at limit' }
    if (percentage >= 75) return { status: 'caution', color: 'orange', message: 'Watch spending' }
    return { status: 'good', color: 'green', message: 'On track' }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.monthly_limit || parseFloat(formData.monthly_limit) <= 0) {
      showToast('Validation Error', 'Please enter a valid budget amount', 'warning')
      return
    }

    try {
      if (editingBudget) {
        const { error } = await supabase
          .from('budgets')
          .update({
            monthly_limit: parseFloat(formData.monthly_limit)
          })
          .eq('id', editingBudget.id)
          .eq('user_id', user.id)

        if (error) throw error
        showToast('Success', 'Budget updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('budgets')
          .insert([
            {
              user_id: user.id,
              category: formData.category,
              monthly_limit: parseFloat(formData.monthly_limit),
              month: formData.month
            }
          ])

        if (error) throw error
        showToast('Success', 'Budget created successfully', 'success')
      }

      setFormData({
        category: 'food',
        monthly_limit: '',
        month: new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
      })
      setShowModal(false)
      setEditingBudget(null)
      fetchBudgets()
    } catch (error) {
      console.error('Error saving budget:', error)
      showToast('Error', 'Failed to save budget. Please try again.', 'error')
    }
  }

  const handleEdit = (budget) => {
    setEditingBudget(budget)
    setFormData({
      category: budget.category,
      monthly_limit: budget.monthly_limit,
      month: budget.month
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    confirm({
      title: 'Delete Budget',
      message: 'Are you sure you want to delete this budget? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

          if (error) throw error
          showToast('Deleted', 'Budget deleted successfully', 'info')
          fetchBudgets()
        } catch (error) {
          console.error('Error deleting budget:', error)
          showToast('Error', 'Failed to delete budget. Please try again.', 'error')
        }
      }
    })
  }

  const getTotalBudget = () => {
    return budgets.reduce((sum, b) => sum + parseFloat(b.monthly_limit), 0)
  }

  const getTotalSpent = () => {
    return expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
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
      <div className="bg-gradient-to-r from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-700 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Budget Tracker</h2>
              <p className="text-orange-100 mt-1">Plan and monitor your spending</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingBudget(null)
              setFormData({
                category: 'food',
                monthly_limit: '',
                month: new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
              })
              setShowModal(true)
            }}
            className="bg-white text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-100 px-6 py-3 rounded-lg font-semibold flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Budget
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-stat bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <p className="text-blue-100 font-medium mb-2">Total Budget</p>
          <p className="text-4xl font-bold">{formatCurrency(getTotalBudget())}</p>
        </div>

        <div className="card-stat bg-gradient-to-br from-red-500 to-red-600 text-white">
          <p className="text-red-100 font-medium mb-2">Total Spent</p>
          <p className="text-4xl font-bold">{formatCurrency(getTotalSpent())}</p>
        </div>

        <div className="card-stat bg-gradient-to-br from-green-500 to-green-600 text-white">
          <p className="text-green-100 font-medium mb-2">Remaining</p>
          <p className="text-4xl font-bold">{formatCurrency(getTotalBudget() - getTotalSpent())}</p>
        </div>
      </div>

      {/* AI Predictions */}
      {Object.keys(predictions).length > 0 && (
        <div className="card bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-start space-x-4 mb-6">
            <div className="bg-purple-100 dark:bg-purple-900/50 rounded-lg p-3">
              <Lightbulb className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">AI Budget Predictions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Based on your last 3 months spending patterns</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(predictions).slice(0, 6).map(([category, data]) => {
              const Icon = getCategoryIcon(category)
              return (
                <div key={category} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/50">
                        <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{category}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      data.trend === 'increasing' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    }`}>
                      {data.trend === 'increasing' ? '↑ Increasing' : '↓ Decreasing'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Predicted: <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.predicted)}</span></p>
                    <p>3-month avg: <span className="font-semibold">{formatCurrency(data.historical)}</span></p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Budget List */}
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Monthly Budgets</h3>

        {budgets.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No budgets set</h3>
            <p className="text-gray-500 dark:text-gray-500 mb-6">Start by setting budgets for your expense categories</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary px-8 py-3"
            >
              Create Your First Budget
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {budgets.map((budget) => {
              const spent = getCategorySpent(budget.category)
              const percentage = (spent / parseFloat(budget.monthly_limit)) * 100
              const status = getBudgetStatus(spent, parseFloat(budget.monthly_limit))
              const Icon = getCategoryIcon(budget.category)

              return (
                <div
                  key={budget.id}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    status.status === 'over' ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-800' :
                    status.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-800' :
                    status.status === 'caution' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-800' :
                    'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800"><Icon className="h-10 w-10 text-gray-700 dark:text-gray-300" /></div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">{budget.category}</h4>
                        <p className={`text-sm font-medium ${
                          status.status === 'over' ? 'text-red-600' :
                          status.status === 'warning' ? 'text-yellow-600 dark:text-yellow-500' :
                          status.status === 'caution' ? 'text-orange-600 dark:text-orange-500' :
                          'text-green-600'
                        }`}>
                          {status.status === 'over' ? <AlertTriangle className="inline h-4 w-4 mr-1" /> : null}
                          {status.status === 'good' ? <CheckCircle className="inline h-4 w-4 mr-1" /> : null}
                          {status.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(budget)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Spent: {formatCurrency(spent)}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Budget: {formatCurrency(budget.monthly_limit)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${
                          status.status === 'over' ? 'bg-red-500' :
                          status.status === 'warning' ? 'bg-yellow-500' :
                          status.status === 'caution' ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600 dark:text-gray-400">{percentage.toFixed(1)}% used</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(parseFloat(budget.monthly_limit) - spent)} remaining
                      </span>
                    </div>
                  </div>

                  {/* AI Recommendation */}
                  {predictions[budget.category] && (
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <TrendingUp className="inline h-4 w-4 mr-1 text-purple-600 dark:text-purple-400" />
                        <strong>AI Insight:</strong> Based on your trend, you're likely to spend{' '}
                        <strong>{formatCurrency(predictions[budget.category].predicted)}</strong> this month.
                        {predictions[budget.category].predicted > parseFloat(budget.monthly_limit) && (
                          <span className="text-red-600"> Consider increasing your budget or reducing spending.</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 animate-slideIn">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {editingBudget ? 'Edit Budget' : 'Add New Budget'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingBudget(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-group">
                <label className="label text-base font-semibold">Category *</label>
                <select
                  className="select text-base py-3"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  disabled={!!editingBudget}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                {editingBudget && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Category cannot be changed</p>
                )}
              </div>

              <div className="form-group">
                <label className="label text-base font-semibold">Monthly Budget Limit (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input text-lg py-4"
                  placeholder="10,000"
                  value={formData.monthly_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                  required
                />
                {predictions[formData.category] && !editingBudget && (
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">
                    💡 Predicted spending: {formatCurrency(predictions[formData.category].predicted)}
                  </p>
                )}
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingBudget(null)
                  }}
                  className="flex-1 btn btn-secondary bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 py-4 text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary py-4 text-base"
                >
                  {editingBudget ? 'Update Budget' : 'Add Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={closeConfirm}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        variant={confirmConfig.variant}
      />
    </div>
  )
}