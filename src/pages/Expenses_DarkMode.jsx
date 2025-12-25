import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { getCategoryIcon, getPaymentIcon, getCategoryColor } from '../utils/iconMappings'
import { Plus, Edit2, Trash2, TrendingDown, Filter, X, AlertTriangle, Wallet, DollarSign, CheckCircle, MessageSquare } from 'lucide-react'
import { ExpenseService } from '../utils/expenseService'
import { calculateTransactionFee, getAvailableFeeMethods, formatFeeBreakdown, FEE_METHODS } from '../utils/kenyaTransactionFees'
import TransactionMessageParser from '../components/TransactionMessageParser'

const EXPENSE_CATEGORIES = [
  'rent', 'transport', 'food', 'utilities', 'airtime',
  'entertainment', 'health', 'education', 'clothing', 'savings', 'debt', 'loan', 'other'
]

const PAYMENT_METHODS = ['mpesa', 'cash', 'bank', 'card']

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMessageParser, setShowMessageParser] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')

  // Fee calculation state
  const [calculatedFee, setCalculatedFee] = useState(0)
  const [feeOverride, setFeeOverride] = useState(false)
  const [balanceCheck, setBalanceCheck] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)

  const [formData, setFormData] = useState({
    amount: '',
    category: 'food',
    description: '',
    payment_method: 'mpesa',
    account_id: '',
    fee_method: FEE_METHODS.MPESA_SEND,
    transaction_fee: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (user) {
      fetchExpenses()
      fetchAccounts()
    }
  }, [user])

  // Auto-calculate fee when amount or fee_method changes
  useEffect(() => {
    if (!feeOverride && formData.amount && formData.fee_method) {
      const fee = calculateTransactionFee(parseFloat(formData.amount), formData.fee_method)
      setCalculatedFee(fee)
      setFormData(prev => ({ ...prev, transaction_fee: fee.toString() }))
    }
  }, [formData.amount, formData.fee_method, feeOverride])

  // Check balance when account, amount, or fee changes
  useEffect(() => {
    async function checkBalance() {
      if (formData.account_id && formData.amount) {
        const expenseService = new ExpenseService(supabase, user.id)
        const totalAmount = parseFloat(formData.amount) + parseFloat(formData.transaction_fee || 0)
        const check = await expenseService.checkAccountBalance(formData.account_id, totalAmount)
        setBalanceCheck(check)
      } else {
        setBalanceCheck(null)
      }
    }
    checkBalance()
  }, [formData.account_id, formData.amount, formData.transaction_fee, user])

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

      // Include transaction fees in monthly total
      const monthlyTotal = (data || [])
        .filter(expense => {
          const expenseDate = new Date(expense.date)
          return expenseDate >= firstDay && expenseDate <= lastDay
        })
        .reduce((sum, expense) => {
          const amount = parseFloat(expense.amount)
          const fee = parseFloat(expense.transaction_fee || 0)
          return sum + amount + fee
        }, 0)

      setTotalExpenses(monthlyTotal)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const expenseService = new ExpenseService(supabase, user.id)
      const result = await expenseService.getAccountsForExpense()
      if (result.success) {
        setAccounts(result.accounts)
        // Auto-select primary account if available
        const primaryAccount = result.accounts.find(a => a.is_primary)
        if (primaryAccount && !formData.account_id) {
          setFormData(prev => ({ ...prev, account_id: primaryAccount.id }))
          setSelectedAccount(primaryAccount)
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (!formData.account_id) {
      alert('Please select an account')
      return
    }

    try {
      const expenseService = new ExpenseService(supabase, user.id)

      if (editingExpense) {
        // For editing, use direct update (simpler for now)
        const { error } = await supabase
          .from('expenses')
          .update({
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            payment_method: formData.payment_method,
            account_id: formData.account_id,
            transaction_fee: parseFloat(formData.transaction_fee || 0),
            fee_method: formData.fee_method,
            fee_override: feeOverride,
            date: formData.date
          })
          .eq('id', editingExpense.id)
          .eq('user_id', user.id)

        if (error) throw error
        alert('Expense updated successfully!')
      } else {
        // Create new expense using service
        const result = await expenseService.createExpense({
          account_id: formData.account_id,
          amount: parseFloat(formData.amount),
          date: formData.date,
          category: formData.category,
          description: formData.description,
          payment_method: formData.payment_method,
          fee_method: formData.fee_method,
          transaction_fee: parseFloat(formData.transaction_fee || 0),
          fee_override: feeOverride
        })

        if (!result.success) {
          throw new Error(result.error)
        }

        const breakdown = formatFeeBreakdown(formData.amount, formData.transaction_fee, formData.fee_method)
        alert(`Expense added successfully!\n\nAmount: ${breakdown.formattedAmount}\nFee: ${breakdown.formattedFee}\nTotal: ${breakdown.formattedTotal}`)
      }

      // Reset form
      const primaryAccount = accounts.find(a => a.is_primary)
      setFormData({
        amount: '',
        category: 'food',
        description: '',
        payment_method: 'mpesa',
        account_id: primaryAccount?.id || '',
        fee_method: FEE_METHODS.MPESA_SEND,
        transaction_fee: '',
        date: new Date().toISOString().split('T')[0]
      })
      setFeeOverride(false)
      setBalanceCheck(null)
      setShowModal(false)
      setEditingExpense(null)
      fetchExpenses()
      fetchAccounts() // Refresh accounts to update balances
    } catch (error) {
      console.error('Error saving expense:', error)
      alert(`Error saving expense: ${error.message}`)
    }
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setFormData({
      amount: expense.amount,
      category: expense.category,
      description: expense.description || '',
      payment_method: expense.payment_method,
      account_id: expense.account_id || '',
      fee_method: expense.fee_method || FEE_METHODS.MPESA_SEND,
      transaction_fee: expense.transaction_fee?.toString() || '0',
      date: expense.date
    })
    setFeeOverride(expense.fee_override || false)
    setShowModal(true)
  }

  const handleAccountChange = (accountId) => {
    setFormData(prev => ({ ...prev, account_id: accountId }))
    const account = accounts.find(a => a.id === accountId)
    setSelectedAccount(account || null)
  }

  const handleParsedMessage = (parsedData) => {
    // Update form data with parsed transaction details
    setFormData(prev => ({
      ...prev,
      amount: parsedData.amount.toString(),
      transaction_fee: parsedData.transactionFee.toString(),
      description: `${parsedData.description}${parsedData.reference ? ' - Ref: ' + parsedData.reference : ''}`.trim()
    }))

    // Set fee override since we got it from the message
    setFeeOverride(true)

    // Open the main form modal
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
        <div className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-100 dark:text-red-200">Total Expenses This Month</p>
            <TrendingDown className="h-6 w-6 text-red-200 dark:text-red-300" />
          </div>
          <p className="text-4xl font-bold">{formatCurrency(totalExpenses)}</p>
          <p className="text-sm text-red-100 dark:text-red-200 mt-2">
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Spending Categories This Month
          </h3>
          <div className="space-y-3">
            {topCategories.map(({ category, total }) => {
              const Icon = getCategoryIcon(category)
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                      <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{category}</p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                        <div
                          className="bg-red-500 dark:bg-red-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(total / totalExpenses * 100).toFixed(0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(total)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {((total / totalExpenses) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Expense History {filterCategory !== 'all' || filterPayment !== 'all' ? `(${filteredExpenses.length} filtered)` : ''}
        </h3>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <TrendingDown className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
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
            {filteredExpenses.map((expense) => {
              const CategoryIcon = getCategoryIcon(expense.category)
              const PaymentIcon = getPaymentIcon(expense.payment_method)
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-gray-800">
                      <CategoryIcon className="h-7 w-7 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                          {expense.category}
                        </p>
                        <span className={`badge ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                        <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <PaymentIcon className="h-3.5 w-3.5 mr-1" />
                          {expense.payment_method}
                        </span>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{expense.description}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
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
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      -{formatCurrency(expense.amount)}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full my-8 animate-slideIn shadow-2xl">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-xl z-10">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h3>
                {!editingExpense && (
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setShowMessageParser(true)
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center mt-1"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Parse Transaction Message
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingExpense(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form id="expense-form" onSubmit={handleSubmit} className="p-6 pt-4 max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
              {/* Account Selector */}
              <div className="form-group">
                <label className="label flex items-center">
                  <Wallet className="h-4 w-4 mr-1" />
                  Account *
                </label>
                <select
                  className="select"
                  value={formData.account_id}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.current_balance)}
                      {account.is_primary && ' (Primary)'}
                    </option>
                  ))}
                </select>
                {selectedAccount && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current balance: {formatCurrency(selectedAccount.current_balance)}
                  </p>
                )}
              </div>

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

              {/* Fee Method Selector */}
              <div className="form-group">
                <label className="label flex items-center justify-between">
                  <span>Fee Calculation Method</span>
                  <label className="flex items-center text-xs font-normal cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feeOverride}
                      onChange={(e) => setFeeOverride(e.target.checked)}
                      className="mr-1"
                    />
                    Manual Override
                  </label>
                </label>
                <select
                  className="select"
                  value={formData.fee_method}
                  onChange={(e) => setFormData({ ...formData, fee_method: e.target.value })}
                  disabled={feeOverride}
                >
                  {getAvailableFeeMethods().map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction Fee Display/Input */}
              <div className="form-group">
                <label className="label">Transaction Fee (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="0"
                  value={formData.transaction_fee}
                  onChange={(e) => {
                    setFormData({ ...formData, transaction_fee: e.target.value })
                    setFeeOverride(true)
                  }}
                  readOnly={!feeOverride}
                />
                {!feeOverride && formData.amount && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Auto-calculated based on {formData.fee_method}
                  </p>
                )}
              </div>

              {/* Total Amount Display */}
              {formData.amount && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(formData.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Fee:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(formData.transaction_fee || 0)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-blue-300 dark:border-blue-700 pt-1">
                    <span className="text-gray-900 dark:text-gray-100">Total:</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatCurrency(parseFloat(formData.amount) + parseFloat(formData.transaction_fee || 0))}</span>
                  </div>
                </div>
              )}

              {/* Balance Warning */}
              {balanceCheck && !balanceCheck.sufficient && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800 rounded-lg flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-900 dark:text-amber-400">Insufficient Balance</p>
                    <p className="text-amber-700 dark:text-amber-500">
                      {balanceCheck.accountName} has {formatCurrency(balanceCheck.balance)} available.
                      You need {formatCurrency(parseFloat(formData.amount) + parseFloat(formData.transaction_fee || 0))}.
                      Deficit: {formatCurrency(balanceCheck.deficit)}
                    </p>
                    <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                      You can still proceed, but the transaction will be recorded.
                    </p>
                  </div>
                </div>
              )}

              {/* Balance OK */}
              {balanceCheck && balanceCheck.sufficient && (
                <div className="p-2 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Sufficient balance available
                  </p>
                </div>
              )}

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
                      {method.charAt(0).toUpperCase() + method.slice(1)}
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

            </form>

            <div className="flex space-x-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setEditingExpense(null)
                  setFeeOverride(false)
                  setBalanceCheck(null)
                }}
                className="flex-1 btn btn-secondary py-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="expense-form"
                className="flex-1 btn btn-primary py-3"
              >
                {editingExpense ? 'Update' : 'Add'} Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Message Parser Modal */}
      {showMessageParser && (
        <TransactionMessageParser
          onParsed={handleParsedMessage}
          onClose={() => setShowMessageParser(false)}
        />
      )}
    </div>
  )
}
