import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import {
  History,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Calendar,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react'

const TRANSACTION_TYPES = [
  { value: 'all', label: 'All Transactions', icon: null },
  { value: 'income', label: 'Income', icon: ArrowDownRight, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'expense', label: 'Expense', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'transfer', label: 'Transfer', icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'lending', label: 'Lending', icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'repayment', label: 'Repayment', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'investment_deposit', label: 'Investment Deposit', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'investment_withdrawal', label: 'Investment Withdrawal', icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'investment_return', label: 'Investment Return', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'transaction_fee', label: 'Transaction Fee', icon: DollarSign, color: 'text-gray-600', bg: 'bg-gray-50' }
]

export default function AccountHistory() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])

  // Get account from URL query parameter
  const accountFromUrl = searchParams.get('account')

  // Filters
  const [selectedAccount, setSelectedAccount] = useState(accountFromUrl || 'all')
  const [selectedType, setSelectedType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [showFilters, setShowFilters] = useState(true)

  // Update selectedAccount when URL changes
  useEffect(() => {
    if (accountFromUrl) {
      setSelectedAccount(accountFromUrl)
    }
  }, [accountFromUrl])

  useEffect(() => {
    if (user) {
      fetchAccounts()
      fetchTransactions()
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [transactions, selectedAccount, selectedType, searchTerm, dateRange])

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true)

      // Fetch all user transactions with account details
      const { data, error } = await supabase
        .from('account_transactions')
        .select(`
          *,
          from_account:accounts!account_transactions_from_account_id_fkey(id, name, account_type),
          to_account:accounts!account_transactions_to_account_id_fkey(id, name, account_type)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      setTransactions(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    // Account filter
    if (selectedAccount !== 'all') {
      filtered = filtered.filter(tx =>
        tx.from_account_id === selectedAccount || tx.to_account_id === selectedAccount
      )
    }

    // Transaction type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(tx => tx.transaction_type === selectedType)
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter(tx => tx.date >= dateRange.from)
    }
    if (dateRange.to) {
      filtered = filtered.filter(tx => tx.date <= dateRange.to)
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(tx =>
        tx.description?.toLowerCase().includes(search) ||
        tx.from_account?.name?.toLowerCase().includes(search) ||
        tx.to_account?.name?.toLowerCase().includes(search)
      )
    }

    setFilteredTransactions(filtered)
  }

  const getTransactionIcon = (type) => {
    const txType = TRANSACTION_TYPES.find(t => t.value === type)
    return txType?.icon || DollarSign
  }

  const getTransactionColor = (type) => {
    const txType = TRANSACTION_TYPES.find(t => t.value === type)
    return {
      text: txType?.color || 'text-gray-600',
      bg: txType?.bg || 'bg-gray-50'
    }
  }

  // Extract account name from description for deleted accounts
  const getAccountDisplayName = (account, description, isFromAccount = true) => {
    if (account?.name) return account.name

    // Try to extract from description if account was deleted
    if (description) {
      // Pattern: "Transfer from [AccountName] (account closing)"
      const fromMatch = description.match(/Transfer from (.+?) \(account closing\)/)
      if (fromMatch && isFromAccount) {
        return `${fromMatch[1]} (Deleted)`
      }
    }

    return null
  }

  const calculateRunningBalance = () => {
    if (selectedAccount === 'all') return null

    const account = accounts.find(a => a.id === selectedAccount)
    if (!account) return null

    let runningBalance = account.current_balance

    // Calculate running balance backwards from current
    const txWithBalance = filteredTransactions.map((tx, index) => {
      const txBalance = runningBalance

      // Adjust running balance for previous transactions
      if (index < filteredTransactions.length - 1) {
        if (tx.from_account_id === selectedAccount) {
          runningBalance += parseFloat(tx.amount)
        } else if (tx.to_account_id === selectedAccount) {
          runningBalance -= parseFloat(tx.amount)
        }
      }

      return { ...tx, running_balance: txBalance }
    })

    return txWithBalance.reverse()
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'From Account', 'To Account', 'Amount', 'Description', 'Running Balance']
    const txWithBalance = calculateRunningBalance() || filteredTransactions

    const rows = txWithBalance.map(tx => [
      new Date(tx.date).toLocaleDateString('en-KE'),
      tx.transaction_type,
      getAccountDisplayName(tx.from_account, tx.description, true) || '-',
      getAccountDisplayName(tx.to_account, tx.description, false) || '-',
      tx.amount,
      tx.description || '',
      tx.running_balance || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `account-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const txWithBalance = selectedAccount !== 'all' ? calculateRunningBalance() : filteredTransactions

  const summary = {
    total: filteredTransactions.length,
    totalIn: filteredTransactions
      .filter(tx => tx.to_account_id === selectedAccount || (selectedAccount === 'all' && tx.to_account_id))
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
    totalOut: filteredTransactions
      .filter(tx => tx.from_account_id === selectedAccount || (selectedAccount === 'all' && tx.from_account_id))
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <History className="h-8 w-8 mr-3 text-blue-500 dark:text-blue-400" />
            Account History
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View and filter your account transactions</p>
        </div>
        <button
          onClick={exportToCSV}
          className="btn btn-secondary flex items-center"
          disabled={filteredTransactions.length === 0}
        >
          <Download className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <p className="text-blue-100 text-sm font-medium mb-2">Total Transactions</p>
          <p className="text-4xl font-bold">{summary.total}</p>
          <p className="text-blue-100 text-sm mt-2">
            {dateRange.from && dateRange.to &&
              `${new Date(dateRange.from).toLocaleDateString('en-KE')} - ${new Date(dateRange.to).toLocaleDateString('en-KE')}`
            }
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <p className="text-green-100 text-sm font-medium mb-2">Money In</p>
          <p className="text-4xl font-bold">{formatCurrency(summary.totalIn)}</p>
          <p className="text-green-100 text-sm mt-2 flex items-center">
            <ArrowDownRight className="h-4 w-4 mr-1" />
            Credits to account
          </p>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <p className="text-red-100 text-sm font-medium mb-2">Money Out</p>
          <p className="text-4xl font-bold">{formatCurrency(summary.totalOut)}</p>
          <p className="text-red-100 text-sm mt-2 flex items-center">
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Debits from account
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between mb-4"
        >
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {showFilters ? 'Hide' : 'Show'}
          </span>
        </button>

        {showFilters && (
          <div className="space-y-4">
            {/* Account Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="form-group">
                <label className="label">Account</label>
                <select
                  className="select"
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Transaction Type</label>
                <select
                  className="select"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  {TRANSACTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">From Date</label>
                <input
                  type="date"
                  className="input"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">To Date</label>
                <input
                  type="date"
                  className="input"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                />
              </div>
            </div>

            {/* Search */}
            <div className="form-group">
              <label className="label">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="Search by description or account name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Transactions ({filteredTransactions.length})
        </h3>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">No transactions found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {transactions.length === 0
                ? 'Start by adding accounts and making transactions'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">From</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">To</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Amount</th>
                  {selectedAccount !== 'all' && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Balance</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(txWithBalance || filteredTransactions).map((tx) => {
                  const Icon = getTransactionIcon(tx.transaction_type)
                  const colors = getTransactionColor(tx.transaction_type)
                  const isDebit = tx.from_account_id === selectedAccount

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {new Date(tx.date).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full ${colors.bg} dark:bg-opacity-20`}>
                          <Icon className={`h-4 w-4 mr-1 ${colors.text}`} />
                          <span className={`text-xs font-medium ${colors.text} capitalize`}>
                            {tx.transaction_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {tx.description || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {getAccountDisplayName(tx.from_account, tx.description, true) || (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {getAccountDisplayName(tx.to_account, tx.description, false) || (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-semibold ${
                          selectedAccount !== 'all'
                            ? (isDebit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {selectedAccount !== 'all' && (isDebit ? '-' : '+')}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      {selectedAccount !== 'all' && (
                        <td className="px-4 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(tx.running_balance)}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
