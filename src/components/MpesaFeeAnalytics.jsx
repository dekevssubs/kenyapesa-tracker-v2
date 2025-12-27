import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Receipt,
  Send,
  Banknote,
  CreditCard,
  Building2,
  ShoppingBag,
  Wallet
} from 'lucide-react'
import { FEE_METHODS } from '../utils/kenyaTransactionFees'

// Fee method labels and icons
const FEE_METHOD_INFO = {
  [FEE_METHODS.MPESA_SEND]: { label: 'Send Money', icon: Send, color: 'bg-green-500' },
  [FEE_METHODS.MPESA_WITHDRAW_AGENT]: { label: 'Withdraw (Agent)', icon: Banknote, color: 'bg-orange-500' },
  [FEE_METHODS.MPESA_WITHDRAW_ATM]: { label: 'Withdraw (ATM)', icon: CreditCard, color: 'bg-purple-500' },
  [FEE_METHODS.MPESA_PAYBILL]: { label: 'PayBill', icon: Receipt, color: 'bg-blue-500' },
  [FEE_METHODS.MPESA_BUY_GOODS]: { label: 'Buy Goods', icon: ShoppingBag, color: 'bg-teal-500' },
  [FEE_METHODS.MPESA_TO_BANK]: { label: 'To Bank', icon: Building2, color: 'bg-indigo-500' },
  [FEE_METHODS.BANK_TRANSFER]: { label: 'Bank Transfer', icon: Building2, color: 'bg-gray-500' },
  [FEE_METHODS.AIRTEL_MONEY]: { label: 'Airtel Money', icon: Wallet, color: 'bg-red-500' },
  [FEE_METHODS.MANUAL]: { label: 'Other', icon: DollarSign, color: 'bg-gray-400' }
}

export default function MpesaFeeAnalytics({ period = 'month' }) {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  useEffect(() => {
    if (user) {
      fetchExpensesWithFees()
    }
  }, [user, selectedPeriod])

  const fetchExpensesWithFees = async () => {
    setLoading(true)
    try {
      // Calculate date range based on period
      const now = new Date()
      let startDate

      switch (selectedPeriod) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalFees = expenses.reduce((sum, e) => sum + (parseFloat(e.transaction_fee) || 0), 0)
    const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
    const transactionsWithFees = expenses.filter(e => parseFloat(e.transaction_fee) > 0)
    const freeTransactions = expenses.filter(e => parseFloat(e.transaction_fee) === 0)

    // Fee breakdown by method
    const feeByMethod = {}
    const countByMethod = {}
    expenses.forEach(e => {
      const method = e.fee_method || FEE_METHODS.MANUAL
      feeByMethod[method] = (feeByMethod[method] || 0) + (parseFloat(e.transaction_fee) || 0)
      countByMethod[method] = (countByMethod[method] || 0) + 1
    })

    // Sort by fee amount
    const sortedMethods = Object.entries(feeByMethod)
      .sort(([, a], [, b]) => b - a)
      .map(([method, fee]) => ({
        method,
        fee,
        count: countByMethod[method],
        percentage: totalFees > 0 ? (fee / totalFees * 100) : 0,
        ...FEE_METHOD_INFO[method]
      }))

    // Fee trend (daily)
    const dailyFees = {}
    expenses.forEach(e => {
      const date = e.date
      dailyFees[date] = (dailyFees[date] || 0) + (parseFloat(e.transaction_fee) || 0)
    })

    // Average fee per transaction
    const avgFeePerTransaction = transactionsWithFees.length > 0
      ? totalFees / transactionsWithFees.length
      : 0

    // Fee as percentage of spending
    const feePercentage = totalAmount > 0 ? (totalFees / totalAmount * 100) : 0

    // Potential savings (if all transactions used Buy Goods)
    const potentialSavings = totalFees // All fees could be saved with Buy Goods

    return {
      totalFees,
      totalAmount,
      transactionsWithFees: transactionsWithFees.length,
      freeTransactions: freeTransactions.length,
      totalTransactions: expenses.length,
      feeByMethod: sortedMethods,
      dailyFees,
      avgFeePerTransaction,
      feePercentage,
      potentialSavings
    }
  }, [expenses])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Receipt className="h-5 w-5 text-green-500 mr-2" />
          M-Pesa Fee Analytics
        </h3>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {['week', 'month', 'quarter', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedPeriod === p
                  ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-100 text-xs font-medium">Total Fees Paid</span>
            <TrendingDown className="h-4 w-4 text-red-200" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.totalFees)}</p>
          <p className="text-red-200 text-xs mt-1">
            {analytics.feePercentage.toFixed(1)}% of spending
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100 text-xs font-medium">Total Transactions</span>
            <BarChart3 className="h-4 w-4 text-green-200" />
          </div>
          <p className="text-2xl font-bold">{analytics.totalTransactions}</p>
          <p className="text-green-200 text-xs mt-1">
            {analytics.freeTransactions} free ({analytics.totalTransactions > 0 ? ((analytics.freeTransactions / analytics.totalTransactions) * 100).toFixed(0) : 0}%)
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-xs font-medium">Avg Fee/Transaction</span>
            <DollarSign className="h-4 w-4 text-blue-200" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.avgFeePerTransaction)}</p>
          <p className="text-blue-200 text-xs mt-1">
            {analytics.transactionsWithFees} paid transactions
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-100 text-xs font-medium">Potential Savings</span>
            <Lightbulb className="h-4 w-4 text-amber-200" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.potentialSavings)}</p>
          <p className="text-amber-200 text-xs mt-1">
            Using Buy Goods (Till)
          </p>
        </div>
      </div>

      {/* Fee Breakdown by Method */}
      <div className="card">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <PieChart className="h-4 w-4 text-green-500 mr-2" />
          Fee Breakdown by Transaction Type
        </h4>

        {analytics.feeByMethod.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No transaction data for this period
          </p>
        ) : (
          <div className="space-y-3">
            {analytics.feeByMethod.map(({ method, fee, count, percentage, label, icon: Icon, color }) => (
              <div key={method} className="flex items-center">
                <div className={`p-2 ${color} rounded-lg mr-3`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {label || method}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-2">
                      {formatCurrency(fee)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                      <div
                        className={`${color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
                      {count} txns
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Money Saving Tips */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/30 dark:to-teal-900/30 rounded-xl p-4 border border-green-200 dark:border-green-800">
        <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center">
          <Lightbulb className="h-4 w-4 text-green-600 dark:text-green-500 mr-2" />
          Money Saving Tips
        </h4>
        <div className="space-y-2">
          <div className="flex items-start">
            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400">
              <strong>Use Buy Goods (Till)</strong> for payments - it&apos;s FREE for customers!
            </p>
          </div>
          <div className="flex items-start">
            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400">
              <strong>Send amounts under KES 100</strong> - no transaction fee charged
            </p>
          </div>
          <div className="flex items-start">
            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400">
              <strong>Combine small withdrawals</strong> - one larger withdrawal costs less than multiple small ones
            </p>
          </div>
          <div className="flex items-start">
            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400">
              <strong>Withdraw at Agent vs ATM</strong> - Agent withdrawals are often cheaper for amounts under KES 2,500
            </p>
          </div>
        </div>

        {analytics.potentialSavings > 0 && (
          <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-700">
            <p className="text-sm text-green-800 dark:text-green-300">
              You could have saved <strong>{formatCurrency(analytics.potentialSavings)}</strong> this {selectedPeriod} by using Buy Goods for all purchases!
            </p>
          </div>
        )}
      </div>

      {/* Recent Transactions with Fees */}
      {expenses.filter(e => parseFloat(e.transaction_fee) > 0).length > 0 && (
        <div className="card">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Calendar className="h-4 w-4 text-green-500 mr-2" />
            Recent Transactions with Fees
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {expenses
              .filter(e => parseFloat(e.transaction_fee) > 0)
              .slice(0, 10)
              .map((expense) => {
                const methodInfo = FEE_METHOD_INFO[expense.fee_method] || FEE_METHOD_INFO[FEE_METHODS.MANUAL]
                const Icon = methodInfo.icon

                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center min-w-0">
                      <div className={`p-1.5 ${methodInfo.color} rounded-lg mr-2`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                          {expense.description || expense.category}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {new Date(expense.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(expense.amount)}
                      </p>
                      <p className="text-[10px] text-red-600 dark:text-red-400">
                        Fee: {formatCurrency(expense.transaction_fee)}
                      </p>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
