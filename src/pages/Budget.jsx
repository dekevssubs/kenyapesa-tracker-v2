import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { getCategoryIcon, getCategoryColor } from '../utils/iconMappings'
import {
  Plus, Edit2, Trash2, X, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, Lightbulb, Target, TrendingUp,
  Calendar, Wallet, PiggyBank
} from 'lucide-react'
import ConfirmationModal from '../components/ConfirmationModal'
import { useConfirmation } from '../hooks/useConfirmation'
import budgetService from '../utils/budgetService'
import { ensureUserHasCategories, getAllExpenseCategories } from '../utils/categoryService'
import CategorySelector from '../components/categories/CategorySelector'

export default function Budget() {
  const { user } = useAuth()
  const toast = useToast()
  const { isOpen: confirmOpen, config: confirmConfig, confirm, close: closeConfirm } = useConfirmation()

  // Core state
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState([])
  const [budgetSummary, setBudgetSummary] = useState(null)
  const [categories, setCategories] = useState([])

  // UI state
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    monthly_limit: '',
    month: new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
  })
  const [selectedCategory, setSelectedCategory] = useState(null)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, selectedMonth])

  const loadData = async () => {
    setLoading(true)
    try {
      // Ensure user has categories
      await ensureUserHasCategories(user.id)

      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number)
      const monthDate = new Date(year, month - 1, 1)

      // Fetch data in parallel
      const [budgetsData, summaryData, categoriesData] = await Promise.all([
        budgetService.getBudgetsWithSpending(user.id, monthDate),
        budgetService.getTotalBudgetSummary(user.id, monthDate),
        getAllExpenseCategories(user.id)
      ])

      setBudgets(budgetsData)
      setBudgetSummary(summaryData)
      setCategories(categoriesData.hierarchy || [])

      // Auto-expand groups that have budgets
      const groupsWithBudgets = {}
      budgetsData.forEach(budget => {
        const parentCategory = categoriesData.hierarchy?.find(cat =>
          cat.subcategories?.some(sub => sub.id === budget.category_id) ||
          cat.id === budget.category_id
        )
        if (parentCategory) {
          groupsWithBudgets[parentCategory.id] = true
        }
      })
      setExpandedGroups(groupsWithBudgets)

    } catch (error) {
      console.error('Error loading budget data:', error)
      toast.error('Failed to load budget data')
    } finally {
      setLoading(false)
    }
  }

  // Group budgets by parent category
  const groupedBudgets = useMemo(() => {
    const groups = {}

    budgets.forEach(budget => {
      // Find parent category
      let parentCategory = null
      for (const cat of categories) {
        if (cat.id === budget.category_id) {
          parentCategory = cat
          break
        }
        if (cat.subcategories?.some(sub => sub.id === budget.category_id)) {
          parentCategory = cat
          break
        }
      }

      if (parentCategory) {
        if (!groups[parentCategory.id]) {
          groups[parentCategory.id] = {
            parent: parentCategory,
            budgets: [],
            totalBudget: 0,
            totalSpent: 0
          }
        }
        groups[parentCategory.id].budgets.push(budget)
        groups[parentCategory.id].totalBudget += parseFloat(budget.monthly_limit || 0)
        groups[parentCategory.id].totalSpent += parseFloat(budget.spent || 0)
      }
    })

    return Object.values(groups).sort((a, b) =>
      (a.parent.display_order || 0) - (b.parent.display_order || 0)
    )
  }, [budgets, categories])

  // Budget status counts
  const statusCounts = useMemo(() => {
    return {
      onTrack: budgets.filter(b => b.status === 'good').length,
      nearLimit: budgets.filter(b => b.status === 'warning' || b.status === 'at-limit').length,
      overBudget: budgets.filter(b => b.status === 'over').length
    }
  }, [budgets])

  // Budget tip based on status
  const budgetTip = useMemo(() => {
    if (statusCounts.overBudget > 0) {
      return {
        type: 'warning',
        message: `You've exceeded ${statusCounts.overBudget} budget${statusCounts.overBudget > 1 ? 's' : ''}. Review your spending to get back on track.`
      }
    }
    if (statusCounts.nearLimit > 0) {
      return {
        type: 'caution',
        message: `${statusCounts.nearLimit} budget${statusCounts.nearLimit > 1 ? 's are' : ' is'} approaching the limit. Consider adjusting your spending.`
      }
    }
    if (budgets.length === 0) {
      return {
        type: 'info',
        message: 'Start by creating budgets for your expense categories to track your spending effectively.'
      }
    }
    return {
      type: 'success',
      message: 'Great job! All your budgets are on track. Keep up the good spending habits!'
    }
  }, [statusCounts, budgets.length])

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
    setFormData(prev => ({
      ...prev,
      category_id: category?.id || ''
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.monthly_limit || parseFloat(formData.monthly_limit) <= 0) {
      toast.warning('Please enter a valid budget amount')
      return
    }

    if (!formData.category_id && !editingBudget) {
      toast.warning('Please select a category')
      return
    }

    try {
      const [year, month] = selectedMonth.split('-').map(Number)
      const monthString = `${year}-${String(month).padStart(2, '0')}-01`

      if (editingBudget) {
        const { error } = await supabase
          .from('budgets')
          .update({ monthly_limit: parseFloat(formData.monthly_limit) })
          .eq('id', editingBudget.id)
          .eq('user_id', user.id)

        if (error) throw error
        toast.success('Budget updated successfully')
      } else {
        const { error } = await supabase
          .from('budgets')
          .insert([{
            user_id: user.id,
            category_id: formData.category_id,
            monthly_limit: parseFloat(formData.monthly_limit),
            month: monthString
          }])

        if (error) throw error
        toast.success('Budget created successfully')
      }

      resetForm()
      loadData()
    } catch (error) {
      console.error('Error saving budget:', error)
      if (error.code === '23505') {
        toast.error('A budget for this category already exists this month')
      } else {
        toast.error('Failed to save budget')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      category_id: '',
      monthly_limit: '',
      month: selectedMonth + '-01'
    })
    setSelectedCategory(null)
    setShowModal(false)
    setEditingBudget(null)
  }

  const handleEdit = (budget) => {
    setEditingBudget(budget)
    setFormData({
      category_id: budget.category_id,
      monthly_limit: budget.monthly_limit,
      month: budget.month
    })
    setSelectedCategory({
      id: budget.category_id,
      name: budget.categoryName,
      slug: budget.categorySlug
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
          toast.info('Budget deleted')
          loadData()
        } catch (error) {
          console.error('Error deleting budget:', error)
          toast.error('Failed to delete budget')
        }
      }
    })
  }

  const getProgressColor = (status) => {
    switch (status) {
      case 'over': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      case 'at-limit': return 'bg-blue-500'
      default: return 'bg-green-500'
    }
  }

  const getMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = -3; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Budget Planning
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track and manage your monthly spending limits
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
            <Calendar size={18} className="text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm font-medium text-slate-900 dark:text-slate-100"
            >
              {getMonthOptions().map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Add Budget Button */}
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Create Budget</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Budgets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Target size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Budget</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(budgetSummary?.totalBudget || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Wallet size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Amount Spent</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(budgetSummary?.totalSpent || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  (budgetSummary?.totalRemaining || 0) >= 0
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <PiggyBank size={20} className={
                    (budgetSummary?.totalRemaining || 0) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  } />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Remaining</p>
                  <p className={`text-lg font-bold ${
                    (budgetSummary?.totalRemaining || 0) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(Math.abs(budgetSummary?.totalRemaining || 0))}
                    {(budgetSummary?.totalRemaining || 0) < 0 && ' over'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Groups */}
          {budgets.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-12 border border-slate-200 dark:border-slate-700 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No budgets set
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Start by creating budgets for your expense categories
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Plus size={18} />
                Create Your First Budget
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedBudgets.map(group => {
                const isExpanded = expandedGroups[group.parent.id]
                const groupPercentage = group.totalBudget > 0
                  ? (group.totalSpent / group.totalBudget) * 100
                  : 0
                const groupStatus = groupPercentage > 100 ? 'over' :
                  groupPercentage >= 80 ? 'warning' : 'good'
                const ParentIcon = getCategoryIcon(group.parent.slug)
                const parentColor = getCategoryColor(group.parent.slug)

                return (
                  <div
                    key={group.parent.id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.parent.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${parentColor}`}>
                          <ParentIcon size={20} />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {group.parent.name}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {group.budgets.length} budget{group.budgets.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(group.totalBudget)}
                          </p>
                          <p className={`text-sm ${
                            groupStatus === 'over' ? 'text-red-600 dark:text-red-400' :
                            groupStatus === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-slate-500 dark:text-slate-400'
                          }`}>
                            {formatCurrency(group.totalSpent)} spent
                          </p>
                        </div>

                        {/* Mini progress bar */}
                        <div className="w-24 hidden sm:block">
                          <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${getProgressColor(groupStatus)}`}
                              style={{ width: `${Math.min(groupPercentage, 100)}%` }}
                            />
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronDown size={20} className="text-slate-400" />
                        ) : (
                          <ChevronRight size={20} className="text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 dark:border-slate-700">
                        {group.budgets.map(budget => {
                          const BudgetIcon = getCategoryIcon(budget.categorySlug || budget.category)

                          return (
                            <div
                              key={budget.id}
                              className="p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                    <BudgetIcon size={16} className="text-slate-600 dark:text-slate-400" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                      {budget.categoryName || budget.category}
                                    </h4>
                                    <p className={`text-xs font-medium ${
                                      budget.status === 'over' ? 'text-red-600 dark:text-red-400' :
                                      budget.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                                      budget.status === 'at-limit' ? 'text-blue-600 dark:text-blue-400' :
                                      'text-green-600 dark:text-green-400'
                                    }`}>
                                      {budget.statusMessage}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEdit(budget)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(budget.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="space-y-2">
                                <div className="h-2.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-500 ${getProgressColor(budget.status)}`}
                                    style={{ width: `${Math.min(budget.percentage || 0, 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600 dark:text-slate-400">
                                    {formatCurrency(budget.spent || 0)} spent
                                  </span>
                                  <span className="font-medium text-slate-900 dark:text-slate-100">
                                    {formatCurrency(budget.monthly_limit)} budget
                                  </span>
                                </div>
                                {budget.status === 'over' ? (
                                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    {formatCurrency(budget.overspend || 0)} over budget
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatCurrency(budget.remaining || 0)} remaining
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Budget Overview */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Budget Overview
            </h3>
            {budgets.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No budgets to display
              </p>
            ) : (
              <div className="space-y-3">
                {groupedBudgets.slice(0, 6).map(group => {
                  const percentage = group.totalBudget > 0
                    ? Math.round((group.totalSpent / group.totalBudget) * 100)
                    : 0
                  const status = percentage > 100 ? 'over' :
                    percentage >= 80 ? 'warning' : 'good'
                  const Icon = getCategoryIcon(group.parent.slug)

                  return (
                    <div key={group.parent.id} className="flex items-center gap-3">
                      <Icon size={16} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                            {group.parent.name}
                          </span>
                          <span className={`text-xs font-medium ${
                            status === 'over' ? 'text-red-600 dark:text-red-400' :
                            status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(status)}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Budget Status */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Budget Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">On Track</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {statusCounts.onTrack}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Near Limit</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {statusCounts.nearLimit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Over Budget</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {statusCounts.overBudget}
                </span>
              </div>
            </div>
          </div>

          {/* Budget Tip */}
          <div className={`rounded-xl p-5 border ${
            budgetTip.type === 'warning'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : budgetTip.type === 'caution'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : budgetTip.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                budgetTip.type === 'warning'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : budgetTip.type === 'caution'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : budgetTip.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                {budgetTip.type === 'warning' ? (
                  <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                ) : budgetTip.type === 'caution' ? (
                  <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400" />
                ) : budgetTip.type === 'success' ? (
                  <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                ) : (
                  <Lightbulb size={18} className="text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <h4 className={`font-medium mb-1 ${
                  budgetTip.type === 'warning'
                    ? 'text-red-900 dark:text-red-100'
                    : budgetTip.type === 'caution'
                    ? 'text-yellow-900 dark:text-yellow-100'
                    : budgetTip.type === 'success'
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-blue-900 dark:text-blue-100'
                }`}>
                  Budget Tip
                </h4>
                <p className={`text-sm ${
                  budgetTip.type === 'warning'
                    ? 'text-red-700 dark:text-red-300'
                    : budgetTip.type === 'caution'
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : budgetTip.type === 'success'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {budgetTip.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {editingBudget ? 'Edit Budget' : 'Create Budget'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                {editingBudget ? (
                  <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    {(() => {
                      const Icon = getCategoryIcon(editingBudget.categorySlug || editingBudget.category)
                      return <Icon size={18} className="text-slate-600 dark:text-slate-400" />
                    })()}
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {editingBudget.categoryName || editingBudget.category}
                    </span>
                  </div>
                ) : (
                  <CategorySelector
                    userId={user.id}
                    value={formData.category_id}
                    onChange={handleCategoryChange}
                    placeholder="Select a category"
                    showDescription
                  />
                )}
                {editingBudget && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Category cannot be changed
                  </p>
                )}
              </div>

              {/* Budget Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Monthly Budget (KES)
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., 10000"
                  value={formData.monthly_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                  required
                />
              </div>

              {/* Month Display */}
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This budget will be for{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  {editingBudget ? 'Update' : 'Create'} Budget
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
