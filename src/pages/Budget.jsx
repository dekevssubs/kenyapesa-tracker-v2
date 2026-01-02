import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { getCategoryIcon } from '../utils/iconMappings'
import { FileText, Plus, Edit2, Trash2, X, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, Info, AlertCircle } from 'lucide-react'
import ConfirmationModal from '../components/ConfirmationModal'
import { useConfirmation } from '../hooks/useConfirmation'
import { fetchAndPredict } from '../utils/aiPredictions'
import budgetService from '../utils/budgetService'

const EXPENSE_CATEGORIES = [
  'rent', 'transport', 'food', 'utilities', 'airtime',
  'entertainment', 'health', 'education', 'clothing', 'savings', 'debt', 'fees', 'other'
]

export default function Budget() {
  const { user } = useAuth()
  const toast = useToast()
  const { isOpen: confirmOpen, config: confirmConfig, confirm, close: closeConfirm } = useConfirmation()
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState([]) // Budgets with spending data (ledger-first)
  const [budgetSummary, setBudgetSummary] = useState(null) // Total budget summary (server-side)
  const [overspentBudgets, setOverspentBudgets] = useState([]) // Overspent budgets (server-side)
  const [warningBudgets, setWarningBudgets] = useState([]) // Warning budgets (server-side)
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [predictions, setPredictions] = useState({}) // AI forecasted spending (advisory)

  const [formData, setFormData] = useState({
    category: 'food',
    monthly_limit: '',
    month: new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
  })

  useEffect(() => {
    if (user) {
      fetchBudgetsWithSpending()
      calculatePredictions()
    }
  }, [user])

  // Fetch budgets with spending data (ledger-first, server-side calculations)
  const fetchBudgetsWithSpending = async () => {
    try {
      setLoading(true)
      const currentMonth = new Date()

      // Get all budget data from server-side (NO client-side calculations)
      const [enrichedBudgets, summary, overspent, warnings] = await Promise.all([
        budgetService.getBudgetsWithSpending(user.id, currentMonth),
        budgetService.getTotalBudgetSummary(user.id, currentMonth),
        budgetService.getOverspentBudgets(user.id, currentMonth),
        budgetService.getWarningBudgets(user.id, currentMonth)
      ])

      setBudgets(enrichedBudgets)
      setBudgetSummary(summary)
      setOverspentBudgets(overspent)
      setWarningBudgets(warnings)

      setLoading(false)
    } catch (error) {
      console.error('Error fetching budgets with spending:', error)
      setLoading(false)
    }
  }

  const calculatePredictions = async () => {
    try {
      // Use the real AI prediction engine (forecasted spending - advisory only)
      const aiPredictions = await fetchAndPredict(user.id, supabase)
      setPredictions(aiPredictions)
    } catch (error) {
      console.error('Error calculating predictions:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.monthly_limit || parseFloat(formData.monthly_limit) <= 0) {
      toast.warning('Please enter a valid budget amount')
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
        toast.success('Budget updated successfully')
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
        toast.success('Budget created successfully')
      }

      setFormData({
        category: 'food',
        monthly_limit: '',
        month: new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
      })
      setShowModal(false)
      setEditingBudget(null)
      fetchBudgetsWithSpending()
    } catch (error) {
      console.error('Error saving budget:', error)
      toast.error('Failed to save budget. Please try again.')
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
          toast.info('Budget deleted successfully')
          fetchBudgetsWithSpending()
        } catch (error) {
          console.error('Error deleting budget:', error)
          toast.error('Failed to delete budget. Please try again.')
        }
      }
    })
  }

  // ❌ REMOVED: All client-side calculations moved to budgetService
  // Per canonical spec: "No UI-side calculations allowed"
  // All data comes from server-side budgetService functions

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

      {/* Critical Alert Banner - Overspent Budgets */}
      {overspentBudgets.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 rounded-xl p-6 animate-pulse">
          <div className="flex items-start space-x-4">
            <div className="bg-red-500 rounded-lg p-3 flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 dark:text-red-100 mb-2">
                Budget Alert: {overspentBudgets.length} {overspentBudgets.length === 1 ? 'Category' : 'Categories'} Over Budget!
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                You've exceeded your budget limit in the following {overspentBudgets.length === 1 ? 'category' : 'categories'}. Consider reviewing your spending.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overspentBudgets.map(budget => {
                  const Icon = getCategoryIcon(budget.category)
                  return (
                    <div key={budget.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-red-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{budget.category}</span>
                        </div>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                          +{formatCurrency(budget.overspend)} over
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Spent: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(budget.spent)}</span> of {formatCurrency(budget.monthly_limit)}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  Total overspend: {formatCurrency(budgetSummary?.totalOverspend || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Summary Card - Budgets Approaching Limit */}
      {warningBudgets.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-yellow-400 dark:bg-yellow-500 rounded-lg p-3 flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                {warningBudgets.length} {warningBudgets.length === 1 ? 'Budget' : 'Budgets'} Approaching Limit
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {warningBudgets.map(budget => {
                  const Icon = getCategoryIcon(budget.category)
                  return (
                    <div key={budget.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border-l-4 border-yellow-400">
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 capitalize">{budget.category}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {budget.percentage.toFixed(1)}% used
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary - All data from server-side budgetService */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-stat bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <p className="text-blue-100 font-medium mb-2">Total Budget</p>
          <p className="text-4xl font-bold">{formatCurrency(budgetSummary?.totalBudget || 0)}</p>
        </div>

        <div className="card-stat bg-gradient-to-br from-red-500 to-red-600 text-white">
          <p className="text-red-100 font-medium mb-2">Total Spent</p>
          <p className="text-4xl font-bold">{formatCurrency(budgetSummary?.totalSpent || 0)}</p>
          {budgetSummary && budgetSummary.totalSpent > budgetSummary.totalBudget && (
            <p className="text-xs text-red-100 mt-2 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Over budget!
            </p>
          )}
        </div>

        <div className={`card-stat ${budgetSummary && budgetSummary.totalRemaining < 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-600'} text-white`}>
          <p className={`${budgetSummary && budgetSummary.totalRemaining < 0 ? 'text-red-100' : 'text-green-100'} font-medium mb-2`}>Remaining</p>
          <p className="text-4xl font-bold">{formatCurrency(Math.abs(budgetSummary?.totalRemaining || 0))}</p>
          {budgetSummary && budgetSummary.totalRemaining < 0 && (
            <p className="text-xs text-red-100 mt-2">Overspent</p>
          )}
        </div>

        <div className="card-stat bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <p className="text-purple-100 font-medium mb-2">Budget Status</p>
          <div className="flex flex-col space-y-2">
            {overspentBudgets.length > 0 && (
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="text-2xl font-bold">{overspentBudgets.length}</span>
                <span className="text-sm ml-2">over limit</span>
              </div>
            )}
            {warningBudgets.length > 0 && (
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span className="text-2xl font-bold">{warningBudgets.length}</span>
                <span className="text-sm ml-2">approaching</span>
              </div>
            )}
            {overspentBudgets.length === 0 && warningBudgets.length === 0 && (
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-lg font-semibold">All on track</span>
              </div>
            )}
          </div>
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
              const confidenceColor = data.confidence > 0.7 ? 'text-green-600 dark:text-green-400' : data.confidence > 0.5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
              const trendDisplay = data.trend === 'insufficient_data' ? 'Insufficient Data' :
                                   data.trend === 'increasing' ? `↑ Increasing ${Math.abs(data.trendPercentage).toFixed(1)}%` :
                                   data.trend === 'decreasing' ? `↓ Decreasing ${Math.abs(data.trendPercentage).toFixed(1)}%` :
                                   '→ Stable'
              const trendColor = data.trend === 'insufficient_data' ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' :
                                 data.trend === 'increasing' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                 data.trend === 'decreasing' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'

              return (
                <div key={category} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/50">
                        <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{category}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${trendColor}`}>
                      {trendDisplay}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <p>Predicted: <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.predicted)}</span></p>
                    <p>3-month avg: <span className="font-semibold">{formatCurrency(data.movingAverage)}</span></p>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs">Confidence:</span>
                      <span className={`text-xs font-semibold ${confidenceColor}`}>
                        {(data.confidence * 100).toFixed(0)}% ({data.dataPoints} months)
                      </span>
                    </div>
                  </div>
                  {data.recommendation && (
                    <div className="mt-2 pt-2 border-t border-purple-100 dark:border-purple-800">
                      <p className="text-xs text-gray-700 dark:text-gray-300">{data.recommendation}</p>
                    </div>
                  )}
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
              // Budget data already enriched with spending info from budgetService
              const spent = budget.spent || 0
              const percentage = budget.percentage || 0
              const status = budget.status || 'good'
              const statusMessage = budget.statusMessage || 'On track'
              const Icon = getCategoryIcon(budget.category)

              return (
                <div
                  key={budget.id}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    status === 'over' ? 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-600 shadow-lg shadow-red-200 dark:shadow-red-900/50' :
                    status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 shadow-md shadow-yellow-200 dark:shadow-yellow-900/50' :
                    status === 'at-limit' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800' :
                    'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800"><Icon className="h-10 w-10 text-gray-700 dark:text-gray-300" /></div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">{budget.category}</h4>
                        <p className={`text-sm font-medium ${
                          status === 'over' ? 'text-red-600 dark:text-red-400' :
                          status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                          status === 'at-limit' ? 'text-blue-600 dark:text-blue-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {status === 'over' && <AlertTriangle className="inline h-4 w-4 mr-1" />}
                          {status === 'warning' && <Info className="inline h-4 w-4 mr-1" />}
                          {status === 'at-limit' && <CheckCircle className="inline h-4 w-4 mr-1" />}
                          {status === 'good' && <CheckCircle className="inline h-4 w-4 mr-1" />}
                          {statusMessage}
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
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${
                          status === 'over' ? 'bg-red-500' :
                          status === 'warning' ? 'bg-yellow-500' :
                          status === 'at-limit' ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600 dark:text-gray-400">{percentage.toFixed(1)}% used</span>
                      {status === 'over' ? (
                        <span className="font-bold text-red-600 dark:text-red-400 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {formatCurrency(budget.overspend || 0)} over budget
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(budget.remaining || 0)} remaining
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Recommendation */}
                  {predictions[budget.category] && (
                    <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div className="flex items-start space-x-2">
                        <TrendingUp className="h-4 w-4 mt-0.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>AI Insight:</strong> {predictions[budget.category].recommendation}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">
                              Predicted: <strong className="text-gray-900 dark:text-gray-100">{formatCurrency(predictions[budget.category].predicted)}</strong>
                            </span>
                            <span className={`font-semibold ${
                              predictions[budget.category].confidence > 0.7 ? 'text-green-600 dark:text-green-400' :
                              predictions[budget.category].confidence > 0.5 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {(predictions[budget.category].confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                          {predictions[budget.category].predicted > parseFloat(budget.monthly_limit) && (
                            <div className="pt-2 mt-2 border-t border-purple-200 dark:border-purple-700">
                              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                ⚠️ Prediction exceeds budget by {formatCurrency(predictions[budget.category].predicted - parseFloat(budget.monthly_limit))}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
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
                  <div className="mt-3 p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-4 w-4 mt-0.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <div className="flex-1 text-sm space-y-1">
                        <p className="text-gray-700 dark:text-gray-300">
                          <strong>AI Suggestion:</strong> {predictions[formData.category].recommendation}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>Predicted: <strong className="text-purple-600 dark:text-purple-400">{formatCurrency(predictions[formData.category].predicted)}</strong></span>
                          <span className={`font-semibold ${
                            predictions[formData.category].confidence > 0.7 ? 'text-green-600 dark:text-green-400' :
                            predictions[formData.category].confidence > 0.5 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {(predictions[formData.category].confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
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