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
  Wallet,
  Phone,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  X,
  Clock,
  Users,
  Info
} from 'lucide-react'
import { FEE_METHODS } from '../utils/kenyaTransactionFees'

// Expanded fee taxonomy with 10 categories
const FEE_CATEGORIES = {
  [FEE_METHODS.MPESA_SEND]: {
    label: 'Send to Phone',
    shortLabel: 'Send Money',
    icon: Send,
    color: 'bg-green-500',
    colorLight: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    description: 'P2P transfers to other M-Pesa users'
  },
  [FEE_METHODS.MPESA_BUY_GOODS]: {
    label: 'Buy Goods (Till)',
    shortLabel: 'Buy Goods',
    icon: ShoppingBag,
    color: 'bg-teal-500',
    colorLight: 'bg-teal-100 dark:bg-teal-900/30',
    textColor: 'text-teal-600 dark:text-teal-400',
    description: 'Merchant payments - FREE for customers'
  },
  [FEE_METHODS.MPESA_PAYBILL]: {
    label: 'Pay Bill',
    shortLabel: 'PayBill',
    icon: Receipt,
    color: 'bg-blue-500',
    colorLight: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    description: 'Utilities, rent, subscriptions'
  },
  [FEE_METHODS.MPESA_WITHDRAW_AGENT]: {
    label: 'Withdraw Cash (Agent)',
    shortLabel: 'Agent Withdrawal',
    icon: Banknote,
    color: 'bg-orange-500',
    colorLight: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    description: 'Cash withdrawals from M-Pesa agents'
  },
  [FEE_METHODS.MPESA_WITHDRAW_ATM]: {
    label: 'Withdraw Cash (ATM)',
    shortLabel: 'ATM Withdrawal',
    icon: CreditCard,
    color: 'bg-purple-500',
    colorLight: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    description: 'Cardless ATM withdrawals'
  },
  [FEE_METHODS.MPESA_TO_BANK]: {
    label: 'Bank Transfer',
    shortLabel: 'To Bank',
    icon: Building2,
    color: 'bg-indigo-500',
    colorLight: 'bg-indigo-100 dark:bg-indigo-900/30',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    description: 'M-Pesa to bank account transfers'
  },
  airtime_purchase: {
    label: 'Airtime Purchase',
    shortLabel: 'Airtime',
    icon: Phone,
    color: 'bg-pink-500',
    colorLight: 'bg-pink-100 dark:bg-pink-900/30',
    textColor: 'text-pink-600 dark:text-pink-400',
    description: 'Airtime for self or others'
  },
  reversal: {
    label: 'Reversals',
    shortLabel: 'Reversals',
    icon: RotateCcw,
    color: 'bg-amber-500',
    colorLight: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    description: 'Failed or refunded transactions'
  },
  charges_levies: {
    label: 'Charges & Levies',
    shortLabel: 'Levies',
    icon: AlertCircle,
    color: 'bg-red-500',
    colorLight: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
    description: 'Excise duty and other charges'
  },
  [FEE_METHODS.MANUAL]: {
    label: 'Other / Unclassified',
    shortLabel: 'Other',
    icon: DollarSign,
    color: 'bg-gray-500',
    colorLight: 'bg-gray-100 dark:bg-gray-900/30',
    textColor: 'text-gray-600 dark:text-gray-400',
    description: 'Unclassified transaction fees'
  }
}

export default function MpesaFeeAnalytics({ period = 'month', dateRange }) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(period)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => {
    if (user) {
      fetchTransactionsWithFees()
    }
  }, [user, selectedPeriod, dateRange])

  const fetchTransactionsWithFees = async () => {
    setLoading(true)
    try {
      // Calculate date range based on period or use provided dateRange
      let startDate, endDate
      const now = new Date()

      if (dateRange?.from && dateRange?.to) {
        startDate = dateRange.from
        endDate = dateRange.to
      } else {
        switch (selectedPeriod) {
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0]
            break
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            break
          case 'quarter':
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split('T')[0]
            break
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
            break
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        }
        endDate = new Date().toISOString().split('T')[0]
      }

      // Query from ledger (account_transactions) for transaction fees
      const { data: feeTransactions, error: feeError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('transaction_type', 'transaction_fee')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (feeError) throw feeError

      // Also get expenses with fees
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gt('transaction_fee', 0)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (expError) throw expError

      // Combine and deduplicate
      const allTransactions = [
        ...(feeTransactions || []).map(t => ({
          ...t,
          source: 'ledger',
          fee: parseFloat(t.amount) || 0,
          fee_method: t.category?.includes('Send') ? FEE_METHODS.MPESA_SEND :
                      t.category?.includes('Withdraw') ? FEE_METHODS.MPESA_WITHDRAW_AGENT :
                      t.description?.toLowerCase().includes('paybill') ? FEE_METHODS.MPESA_PAYBILL :
                      FEE_METHODS.MANUAL
        })),
        ...(expenses || []).map(e => ({
          ...e,
          source: 'expense',
          fee: parseFloat(e.transaction_fee) || 0,
          fee_method: e.fee_method || FEE_METHODS.MANUAL
        }))
      ]

      setTransactions(allTransactions)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const totalFees = transactions.reduce((sum, t) => sum + (t.fee || 0), 0)
    const totalAmount = transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
    const transactionsWithFees = transactions.filter(t => t.fee > 0)
    const freeTransactions = transactions.filter(t => t.fee === 0)

    // Fee breakdown by category with full details
    const categoryMap = {}
    transactions.forEach(t => {
      const method = t.fee_method || FEE_METHODS.MANUAL
      if (!categoryMap[method]) {
        categoryMap[method] = {
          method,
          totalFees: 0,
          transactionCount: 0,
          transactions: [],
          counterparties: new Set(),
          dailyFees: {}
        }
      }

      categoryMap[method].totalFees += t.fee || 0
      categoryMap[method].transactionCount++
      categoryMap[method].transactions.push(t)

      // Track counterparties
      if (t.description) {
        const recipient = t.description.replace(/^(Sent to|Paid to|Transfer to)\s*/i, '').split(' ')[0]
        if (recipient) categoryMap[method].counterparties.add(recipient)
      }

      // Track daily fees
      const date = t.date
      categoryMap[method].dailyFees[date] = (categoryMap[method].dailyFees[date] || 0) + (t.fee || 0)
    })

    // Convert to array with calculated fields
    const feeByCategory = Object.entries(categoryMap)
      .map(([method, data]) => ({
        ...data,
        avgFee: data.transactionCount > 0 ? data.totalFees / data.transactionCount : 0,
        percentage: totalFees > 0 ? (data.totalFees / totalFees * 100) : 0,
        topCounterparties: Array.from(data.counterparties).slice(0, 5),
        ...FEE_CATEGORIES[method]
      }))
      .filter(c => c.transactionCount > 0)
      .sort((a, b) => b.totalFees - a.totalFees)

    // Calculate averages
    const avgFeePerTransaction = transactionsWithFees.length > 0
      ? totalFees / transactionsWithFees.length
      : 0
    const feePercentage = totalAmount > 0 ? (totalFees / totalAmount * 100) : 0

    // Calculate potential savings (all fees could be saved with Buy Goods)
    const potentialSavings = totalFees

    // Identify highest fee category for tips
    const highestFeeCategory = feeByCategory[0]

    return {
      totalFees,
      totalAmount,
      transactionsWithFees: transactionsWithFees.length,
      freeTransactions: freeTransactions.length,
      totalTransactions: transactions.length,
      feeByCategory,
      avgFeePerTransaction,
      feePercentage,
      potentialSavings,
      highestFeeCategory
    }
  }, [transactions])

  // Generate context-aware tips based on data
  const contextualTips = useMemo(() => {
    const tips = []

    if (analytics.highestFeeCategory) {
      const cat = analytics.highestFeeCategory

      // Send Money specific tip
      if (cat.method === FEE_METHODS.MPESA_SEND && cat.percentage > 30) {
        tips.push({
          icon: Send,
          title: 'High Send Money Fees',
          message: `${cat.percentage.toFixed(0)}% of your fees are from Send Money. Consider using Buy Goods (Till) where possible - it's FREE!`,
          priority: 'high'
        })
      }

      // Withdrawal specific tip
      if ([FEE_METHODS.MPESA_WITHDRAW_AGENT, FEE_METHODS.MPESA_WITHDRAW_ATM].includes(cat.method)) {
        const avgWithdrawal = cat.totalFees / cat.transactionCount
        if (cat.transactionCount > 5) {
          tips.push({
            icon: Banknote,
            title: 'Combine Withdrawals',
            message: `You made ${cat.transactionCount} withdrawals averaging ${formatCurrency(avgWithdrawal)} each in fees. One larger withdrawal costs less than multiple small ones.`,
            priority: 'medium'
          })
        }
      }

      // PayBill tip
      if (cat.method === FEE_METHODS.MPESA_PAYBILL && cat.totalFees > 100) {
        tips.push({
          icon: Receipt,
          title: 'Consider Bank Standing Orders',
          message: `You paid ${formatCurrency(cat.totalFees)} in PayBill fees. For recurring payments, bank standing orders may be cheaper.`,
          priority: 'low'
        })
      }
    }

    // General tip if no specific tips
    if (tips.length === 0 && analytics.totalFees > 0) {
      tips.push({
        icon: ShoppingBag,
        title: 'Use Buy Goods (Till)',
        message: `Buy Goods payments are FREE for customers. Where possible, pay merchants via Till instead of Send Money.`,
        priority: 'medium'
      })
    }

    // Zero fees celebration
    if (analytics.totalFees === 0 && analytics.totalTransactions > 0) {
      tips.push({
        icon: TrendingUp,
        title: 'Zero Fees!',
        message: `You've made ${analytics.totalTransactions} transactions without paying any fees. Keep it up!`,
        priority: 'success'
      })
    }

    return tips
  }, [analytics])

  // Handle category drill-down
  const handleCategoryClick = (category) => {
    setSelectedCategory(category)
    setShowDrawer(true)
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
      {/* Period Selector */}
      {!dateRange && (
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
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-100 text-xs font-medium">Total Fees Paid</span>
            <TrendingDown className="h-4 w-4 text-red-200" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.totalFees)}</p>
          <p className="text-red-200 text-xs mt-1">
            {analytics.feePercentage.toFixed(1)}% of spending
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100 text-xs font-medium">Total Transactions</span>
            <BarChart3 className="h-4 w-4 text-green-200" />
          </div>
          <p className="text-2xl font-bold">{analytics.totalTransactions}</p>
          <p className="text-green-200 text-xs mt-1">
            {analytics.freeTransactions} free ({analytics.totalTransactions > 0 ? ((analytics.freeTransactions / analytics.totalTransactions) * 100).toFixed(0) : 0}%)
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-xs font-medium">Avg Fee/Transaction</span>
            <DollarSign className="h-4 w-4 text-blue-200" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.avgFeePerTransaction)}</p>
          <p className="text-blue-200 text-xs mt-1">
            {analytics.transactionsWithFees} paid transactions
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 rounded-xl p-4 text-white">
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

      {/* Fee Breakdown Table */}
      <div className="card bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <PieChart className="h-4 w-4 text-green-500 mr-2" />
            Fee Breakdown by Transaction Type
          </h4>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Info className="h-3 w-3 mr-1" />
            Click for details
          </div>
        </div>

        {analytics.feeByCategory.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No transaction fees for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2">Transaction Type</th>
                  <th className="text-right py-3 px-2">Total Fees</th>
                  <th className="text-right py-3 px-2 hidden sm:table-cell"># Txns</th>
                  <th className="text-right py-3 px-2 hidden md:table-cell">Avg Fee</th>
                  <th className="text-right py-3 px-2">% of Total</th>
                  <th className="py-3 px-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {analytics.feeByCategory.map((category) => {
                  const Icon = category.icon || DollarSign
                  return (
                    <tr
                      key={category.method}
                      onClick={() => handleCategoryClick(category)}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center">
                          <div className={`p-2 ${category.color} rounded-lg mr-3`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {category.shortLabel || category.label}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(category.totalFees)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right hidden sm:table-cell">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {category.transactionCount}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right hidden md:table-cell">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatCurrency(category.avgFee)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {category.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                            <div
                              className={`${category.color} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${Math.min(category.percentage, 100)}%` }}
                            />
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Show unclassified warning if significant */}
        {analytics.feeByCategory.some(c => c.method === FEE_METHODS.MANUAL && c.percentage > 20) && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 mr-2" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Data quality note:</strong> A significant portion of fees are unclassified.
                Consider updating transaction categories for better insights.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Context-Aware Money Saving Tips */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
        <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-4 flex items-center">
          <Lightbulb className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
          Smart Savings Tips
          <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-500">
            Based on your transactions
          </span>
        </h4>

        <div className="space-y-3">
          {contextualTips.map((tip, index) => {
            const TipIcon = tip.icon
            return (
              <div
                key={index}
                className={`flex items-start p-3 rounded-lg ${
                  tip.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                  tip.priority === 'success' ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' :
                  'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className={`p-1.5 rounded-lg mr-3 ${
                  tip.priority === 'high' ? 'bg-red-100 dark:bg-red-900/50' :
                  tip.priority === 'success' ? 'bg-green-200 dark:bg-green-800' :
                  'bg-green-100 dark:bg-green-900/30'
                }`}>
                  <TipIcon className={`h-4 w-4 ${
                    tip.priority === 'high' ? 'text-red-600 dark:text-red-400' :
                    tip.priority === 'success' ? 'text-green-600 dark:text-green-400' :
                    'text-green-600 dark:text-green-400'
                  }`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    tip.priority === 'high' ? 'text-red-800 dark:text-red-300' :
                    tip.priority === 'success' ? 'text-green-800 dark:text-green-300' :
                    'text-green-800 dark:text-green-300'
                  }`}>
                    {tip.title}
                  </p>
                  <p className={`text-xs mt-1 ${
                    tip.priority === 'high' ? 'text-red-700 dark:text-red-400' :
                    tip.priority === 'success' ? 'text-green-700 dark:text-green-400' :
                    'text-green-700 dark:text-green-400'
                  }`}>
                    {tip.message}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {analytics.potentialSavings > 0 && (
          <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
            <p className="text-sm text-green-800 dark:text-green-300">
              You could save up to <strong>{formatCurrency(analytics.potentialSavings)}</strong> this {selectedPeriod || 'period'} by using Buy Goods for all purchases!
            </p>
          </div>
        )}
      </div>

      {/* Drill-Down Drawer */}
      {showDrawer && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex justify-end">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md h-full overflow-y-auto animate-slideIn">
            {/* Drawer Header */}
            <div className={`p-4 ${selectedCategory.colorLight} border-b border-gray-200 dark:border-gray-700`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 ${selectedCategory.color} rounded-lg mr-3`}>
                    {selectedCategory.icon && <selectedCategory.icon className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selectedCategory.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedCategory.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Fees</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(selectedCategory.totalFees)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {selectedCategory.transactionCount}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Average Fee</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(selectedCategory.avgFee)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">% of Total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {selectedCategory.percentage.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Top Counterparties */}
            {selectedCategory.topCounterparties?.length > 0 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-gray-500" />
                  Top Recipients
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCategory.topCounterparties.map((cp, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                    >
                      {cp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction List */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                Recent Transactions
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedCategory.transactions?.slice(0, 15).map((tx, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {tx.description || tx.category || 'Transaction'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(tx.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Fee: {formatCurrency(tx.fee)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category-Specific Tip */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start">
                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Tip for {selectedCategory.shortLabel}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      {selectedCategory.method === FEE_METHODS.MPESA_SEND
                        ? 'For recurring payments, consider using Buy Goods (Till) or bank transfers which may be cheaper.'
                        : selectedCategory.method === FEE_METHODS.MPESA_WITHDRAW_AGENT
                        ? 'Combine multiple withdrawals into one larger withdrawal to save on fees.'
                        : selectedCategory.method === FEE_METHODS.MPESA_PAYBILL
                        ? 'For recurring bills, consider bank standing orders which may have lower fees.'
                        : 'Review these transactions to identify opportunities for fee reduction.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
