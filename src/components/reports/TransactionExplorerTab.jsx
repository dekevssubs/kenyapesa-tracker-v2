import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { ReportsService } from '../../utils/reportsService'
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Receipt,
  TrendingUp,
  TrendingDown,
  Sparkles,
  HandCoins,
  Undo2,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'

// Transaction type configuration with icons and colors
const TRANSACTION_TYPE_CONFIG = {
  income: { icon: ArrowDownLeft, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Income' },
  expense: { icon: ArrowUpRight, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Expense' },
  transfer: { icon: ArrowLeftRight, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'Transfer' },
  transaction_fee: { icon: Receipt, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30', label: 'Fee' },
  investment_deposit: { icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', label: 'Investment' },
  investment_withdrawal: { icon: TrendingDown, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', label: 'Withdrawal' },
  investment_return: { icon: Sparkles, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Return' },
  lending: { icon: HandCoins, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', label: 'Lent' },
  repayment: { icon: Undo2, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', label: 'Repaid' },
  reversal: { icon: RotateCcw, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800', label: 'Reversal' }
}

export default function TransactionExplorerTab({ dateRange }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [accounts, setAccounts] = useState([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Detail drawer
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  // Available categories (derived from data)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (user && dateRange.from && dateRange.to) {
      fetchTransactions()
      fetchAccounts()
    }
  }, [user, dateRange])

  useEffect(() => {
    applyFilters()
  }, [transactions, searchQuery, selectedTypes, selectedAccount, selectedCategory])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const reportsService = new ReportsService(supabase, user.id)

      const result = await reportsService.getTransactions({
        startDate: dateRange.from,
        endDate: dateRange.to,
        includeReversals: true // Show all transactions including reversals
      })

      if (result.success) {
        setTransactions(result.transactions)

        // Extract unique categories
        const uniqueCategories = [...new Set(
          result.transactions
            .map(t => t.category)
            .filter(Boolean)
        )].sort()
        setCategories(uniqueCategories)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, account_type, category')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (!error && data) {
        setAccounts(data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.from_account?.name?.toLowerCase().includes(query) ||
        t.to_account?.name?.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(t => selectedTypes.includes(t.transaction_type))
    }

    // Account filter
    if (selectedAccount) {
      filtered = filtered.filter(t =>
        t.from_account_id === selectedAccount || t.to_account_id === selectedAccount
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    setFilteredTransactions(filtered)
  }

  const toggleTypeFilter = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTypes([])
    setSelectedAccount('')
    setSelectedCategory('')
  }

  const getTransactionConfig = (type) => {
    return TRANSACTION_TYPE_CONFIG[type] || TRANSACTION_TYPE_CONFIG.expense
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getAccountDisplay = (transaction) => {
    if (transaction.from_account && transaction.to_account) {
      return `${transaction.from_account.name} → ${transaction.to_account.name}`
    }
    if (transaction.from_account) {
      return transaction.from_account.name
    }
    if (transaction.to_account) {
      return transaction.to_account.name
    }
    return 'N/A'
  }

  const getAmountDisplay = (transaction) => {
    const config = getTransactionConfig(transaction.transaction_type)
    const isOutflow = ['expense', 'transfer', 'transaction_fee', 'investment_deposit', 'lending'].includes(transaction.transaction_type)
    const prefix = isOutflow ? '-' : '+'

    return {
      amount: `${prefix}${formatCurrency(transaction.amount)}`,
      className: isOutflow ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
    }
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
      {/* Search and Filter Bar */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {(selectedTypes.length > 0 || selectedAccount || selectedCategory) && (
              <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                {selectedTypes.length + (selectedAccount ? 1 : 0) + (selectedCategory ? 1 : 0)}
              </span>
            )}
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Clear Filters */}
          {(selectedTypes.length > 0 || selectedAccount || selectedCategory || searchQuery) && (
            <button
              onClick={clearFilters}
              className="btn btn-secondary flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {/* Transaction Type Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transaction Type
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TRANSACTION_TYPE_CONFIG).map(([type, config]) => {
                  const Icon = config.icon
                  const isSelected = selectedTypes.includes(type)
                  return (
                    <button
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                        transition-colors border
                        ${isSelected
                          ? `${config.bgColor} ${config.color} border-current`
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Account and Category Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="select w-full"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="select w-full"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </span>
        <span>
          Period: {new Date(dateRange.from).toLocaleDateString('en-KE')} - {new Date(dateRange.to).toLocaleDateString('en-KE')}
        </span>
      </div>

      {/* Transactions List */}
      <div className="card divide-y divide-gray-200 dark:divide-gray-700">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
            {(selectedTypes.length > 0 || selectedAccount || selectedCategory || searchQuery) && (
              <button
                onClick={clearFilters}
                className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters to see all transactions
              </button>
            )}
          </div>
        ) : (
          filteredTransactions.map((transaction) => {
            const config = getTransactionConfig(transaction.transaction_type)
            const Icon = config.icon
            const amountDisplay = getAmountDisplay(transaction)

            return (
              <div
                key={transaction.id}
                onClick={() => setSelectedTransaction(transaction)}
                className={`
                  p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors
                  ${transaction.isReversed ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-gray-900 dark:text-gray-100 truncate ${transaction.isReversed ? 'line-through' : ''}`}>
                        {transaction.description || transaction.category || config.label}
                      </p>

                      {/* Reversed Badge */}
                      {transaction.isReversed && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          Reversed
                        </span>
                      )}

                      {/* Reversal Transaction Badge */}
                      {transaction.transaction_type === 'reversal' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                          Reversal
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{getAccountDisplay(transaction)}</span>
                      <span>•</span>
                      <span>{transaction.category?.replace(/_/g, ' ') || 'Uncategorized'}</span>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-right hidden md:block">
                    {formatDate(transaction.date)}
                  </div>

                  {/* Amount */}
                  <div className={`font-bold ${amountDisplay.className} ${transaction.isReversed ? 'line-through' : ''}`}>
                    {amountDisplay.amount}
                  </div>

                  {/* Arrow */}
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Transaction Detail Drawer */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setSelectedTransaction(null)}>
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Transaction Details
                </h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Transaction Type Badge */}
              {(() => {
                const config = getTransactionConfig(selectedTransaction.transaction_type)
                const Icon = config.icon
                return (
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                  </div>
                )
              })()}

              {/* Reversed Status */}
              {selectedTransaction.isReversed && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                    This transaction has been reversed
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                    The amount was refunded back to the account
                  </p>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Amount</label>
                <p className={`text-3xl font-bold ${getAmountDisplay(selectedTransaction).className}`}>
                  {getAmountDisplay(selectedTransaction).amount}
                </p>
              </div>

              {/* Details Grid */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Date</label>
                  <p className="text-gray-900 dark:text-gray-100">{formatDate(selectedTransaction.date)}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Category</label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedTransaction.category?.charAt(0).toUpperCase() + selectedTransaction.category?.slice(1).replace(/_/g, ' ') || 'Uncategorized'}
                  </p>
                </div>

                {selectedTransaction.description && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Description</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedTransaction.description}</p>
                  </div>
                )}

                {selectedTransaction.from_account && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">From Account</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedTransaction.from_account.name}</p>
                  </div>
                )}

                {selectedTransaction.to_account && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">To Account</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedTransaction.to_account.name}</p>
                  </div>
                )}

                {selectedTransaction.reference_type && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Reference Type</label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {selectedTransaction.reference_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}

                {selectedTransaction.notes && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Notes</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p>Transaction ID: {selectedTransaction.id.slice(0, 8)}...</p>
                  <p>Created: {new Date(selectedTransaction.created_at).toLocaleString('en-KE')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
