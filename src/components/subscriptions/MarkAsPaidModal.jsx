import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { getCategoryIcon } from '../../utils/iconMappings'
import {
  X, Search, Link2, Plus, Calendar, DollarSign,
  CheckCircle, FileText, Loader2
} from 'lucide-react'

export default function MarkAsPaidModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  itemType
}) {
  const { user } = useAuth()
  const [activeMode, setActiveMode] = useState('link') // 'link' or 'create'
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch recent expenses when modal opens
  useEffect(() => {
    if (isOpen && user && item) {
      fetchRecentExpenses()
    }
  }, [isOpen, user, item])

  const fetchRecentExpenses = async () => {
    setLoading(true)
    try {
      // Get expenses from last 60 days, filtered by category if available
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_reversed', false)
        .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(30)

      // Filter by category if item has one
      if (item.category_slug) {
        query = query.eq('category', item.category_slug)
      }

      const { data, error } = await query

      if (error) throw error

      // If no expenses found with category filter, fetch all recent expenses
      if ((!data || data.length === 0) && item.category_slug) {
        const { data: allData, error: allError } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_reversed', false)
          .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: false })
          .limit(30)

        if (!allError) {
          setExpenses(allData || [])
        }
      } else {
        setExpenses(data || [])
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter expenses based on search
  const filteredExpenses = expenses.filter(expense => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      expense.description?.toLowerCase().includes(query) ||
      expense.category?.toLowerCase().includes(query) ||
      expense.amount?.toString().includes(query)
    )
  })

  const handleConfirm = () => {
    if (!selectedExpense) return
    onConfirm(selectedExpense.id, selectedExpense.date)
  }

  const handleCreateNew = () => {
    // Close this modal and redirect to expenses page
    // The user will create an expense there and then come back
    onClose()
    window.location.href = '/expenses'
  }

  if (!isOpen) return null

  const CategoryIcon = getCategoryIcon(item?.category?.slug || item?.category_slug)

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col animate-slideIn shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Mark as Paid
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {item?.name} - {formatCurrency(item?.amount)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveMode('link')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center transition-colors ${
              activeMode === 'link'
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Link Existing Expense
          </button>
          <button
            onClick={() => setActiveMode('create')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center transition-colors ${
              activeMode === 'create'
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Expense
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeMode === 'link' ? (
            <>
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-10"
                  />
                </div>
                {item?.category_slug && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Showing expenses from "{item.category_slug}" category first
                  </p>
                )}
              </div>

              {/* Expense List */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {searchQuery
                        ? 'No expenses match your search'
                        : 'No recent expenses found'}
                    </p>
                    <button
                      onClick={() => setActiveMode('create')}
                      className="btn btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Expense
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredExpenses.map(expense => {
                      const ExpenseIcon = getCategoryIcon(expense.category)
                      const isSelected = selectedExpense?.id === expense.id

                      return (
                        <button
                          key={expense.id}
                          onClick={() => setSelectedExpense(expense)}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                isSelected
                                  ? 'bg-indigo-100 dark:bg-indigo-900/40'
                                  : 'bg-gray-100 dark:bg-gray-700'
                              }`}>
                                <ExpenseIcon className={`h-5 w-5 ${
                                  isSelected
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {expense.description || expense.category}
                                </p>
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(expense.date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                  <span className="mx-2">•</span>
                                  <span className="capitalize">{expense.category}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <p className="font-bold text-red-600 dark:text-red-400">
                                {formatCurrency(expense.amount)}
                              </p>
                              {isSelected && (
                                <CheckCircle className="h-5 w-5 text-indigo-500" />
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Create New Expense Mode */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Create New Expense
              </h4>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-xs">
                You'll be redirected to the Expenses page to create a new expense. Once created, come back here to link it.
              </p>

              {/* Pre-fill info */}
              <div className="w-full max-w-sm p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Suggested details:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item?.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {item?.category?.name || item?.category_slug || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Description:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {item?.name}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateNew}
                className="btn btn-primary w-full max-w-sm"
              >
                <Plus className="h-5 w-5 mr-2" />
                Go to Expenses Page
              </button>
            </div>
          )}
        </div>

        {/* Footer - Only show for Link mode when expense is selected */}
        {activeMode === 'link' && (
          <div className="flex space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 btn btn-secondary py-3"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedExpense}
              className="flex-1 btn btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Confirm Payment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
