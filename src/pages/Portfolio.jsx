import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { PortfolioService } from '../utils/portfolioService'
import { formatCurrency } from '../utils/calculations'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  PiggyBank,
  Building2,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Plus,
  Eye,
  Landmark,
  Smartphone,
  BarChart3,
  RefreshCw
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

export default function Portfolio() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [portfolioData, setPortfolioData] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [assetAllocation, setAssetAllocation] = useState([])
  const [netWorthHistory, setNetWorthHistory] = useState([])
  const [activeTab, setActiveTab] = useState('all') // all, cash, savings, investment

  useEffect(() => {
    if (user) {
      fetchPortfolioData()
    }
  }, [user])

  const fetchPortfolioData = async () => {
    try {
      setLoading(true)
      const portfolioService = new PortfolioService(supabase, user.id)

      const [summaryResult, activityResult, allocationResult, historyResult] = await Promise.all([
        portfolioService.getPortfolioSummary(),
        portfolioService.getRecentActivity(10),
        portfolioService.getAssetAllocation(),
        portfolioService.getNetWorthHistory(6)
      ])

      if (summaryResult.success) {
        setPortfolioData(summaryResult)
      }

      if (activityResult.success) {
        setRecentActivity(activityResult.transactions)
      }

      if (allocationResult.success) {
        setAssetAllocation(allocationResult.allocation)
      }

      if (historyResult.success) {
        setNetWorthHistory(historyResult.history)
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchPortfolioData()
    setRefreshing(false)
  }

  const getAccountIcon = (account) => {
    const category = account?.category?.toLowerCase()
    if (category === 'mpesa' || category === 'airtel_money' || category === 'tkash') {
      return <Smartphone className="h-5 w-5" />
    }
    if (category === 'bank') {
      return <Landmark className="h-5 w-5" />
    }
    if (account?.account_type === 'investment') {
      return <BarChart3 className="h-5 w-5" />
    }
    return <Wallet className="h-5 w-5" />
  }

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'income':
      case 'investment_return':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />
      case 'expense':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />
      case 'transfer':
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      case 'reversal':
        return <RefreshCw className="h-4 w-4 text-orange-500" />
      default:
        return <Wallet className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredAccounts = () => {
    if (!portfolioData?.accounts) return []
    if (activeTab === 'all') return portfolioData.accounts
    if (activeTab === 'cash') return portfolioData.accountsByType?.cash || []
    if (activeTab === 'savings') return portfolioData.accountsByType?.savings || []
    if (activeTab === 'investment') return portfolioData.accountsByType?.investment || []
    return portfolioData.accounts
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  const { summary, goals, goalsSummary, liabilities, lending } = portfolioData || {}

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Briefcase className="h-8 w-8" />
            <h2 className="text-3xl font-bold">Portfolio</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/reports"
              className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              View Reports
            </Link>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-emerald-100 text-sm">Total Assets</p>
              <TrendingUp className="h-5 w-5 text-emerald-200" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary?.totalAssets || 0)}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-emerald-100 text-sm">Total Liabilities</p>
              <TrendingDown className="h-5 w-5 text-red-300" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary?.totalLiabilities || 0)}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-emerald-100 text-sm">Net Worth</p>
              <Wallet className="h-5 w-5 text-emerald-200" />
            </div>
            <p className={`text-2xl font-bold ${(summary?.netWorth || 0) < 0 ? 'text-red-300' : ''}`}>
              {formatCurrency(summary?.netWorth || 0)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-emerald-100 text-sm">Active Goals</p>
              <Target className="h-5 w-5 text-orange-300" />
            </div>
            <p className="text-2xl font-bold">{goalsSummary?.active || 0}</p>
            <p className="text-xs text-emerald-200">
              {goalsSummary?.onTrack || 0} on track
              {goalsSummary?.paused > 0 && ` · ${goalsSummary.paused} paused`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Asset Allocation & Accounts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Allocation Chart */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Asset Allocation
            </h3>
            {assetAllocation.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-1/2 h-64">
                  <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                    <PieChart>
                      <Pie
                        data={assetAllocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {assetAllocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-3">
                  {assetAllocation.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No assets to display
              </div>
            )}
          </div>

          {/* Accounts Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Accounts
              </h3>
              <Link
                to="/accounts"
                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                Manage <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Tab Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {['all', 'cash', 'savings', 'investment'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAccounts().length > 0 ? (
                filteredAccounts().map((account) => (
                  <div
                    key={account.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          account.account_type === 'cash'
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : account.account_type === 'investment'
                            ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {getAccountIcon(account)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {account.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {account.institution_name || account.category}
                          </p>
                        </div>
                      </div>
                      {account.is_primary && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(account.current_balance || 0)}
                      </p>
                      <Link
                        to={`/account-history?account=${account.id}`}
                        className="text-xs text-gray-500 hover:text-emerald-600 flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" /> History
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  No accounts in this category
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Goals, Liabilities, Activity */}
        <div className="space-y-6">
          {/* Goals Overview */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Goals
              </h3>
              <Link
                to="/goals"
                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {goals && goals.length > 0 ? (
              <div className="space-y-4">
                {goals.slice(0, 3).map((goal) => {
                  const progress = Math.min(
                    (goal.current_amount / goal.target_amount) * 100,
                    100
                  )
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {goal.name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          goal.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {goal.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progress >= 100 ? 'bg-green-500' :
                              progress >= 75 ? 'bg-blue-500' :
                              progress >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatCurrency(goal.current_amount)}</span>
                        <span>{formatCurrency(goal.target_amount)}</span>
                      </div>
                    </div>
                  )
                })}
                {goals.length > 3 && (
                  <Link
                    to="/goals"
                    className="block text-center text-sm text-emerald-600 hover:text-emerald-700 mt-2"
                  >
                    +{goals.length - 3} more goals
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Target className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No active goals</p>
                <Link
                  to="/goals"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-emerald-600 hover:text-emerald-700"
                >
                  <Plus className="h-4 w-4" /> Create Goal
                </Link>
              </div>
            )}
          </div>

          {/* Liabilities Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Liabilities
              </h3>
              <span className="text-sm font-medium text-red-500">
                {formatCurrency(summary?.totalLiabilities || 0)}
              </span>
            </div>

            {liabilities && liabilities.length > 0 ? (
              <div className="space-y-3">
                {liabilities.slice(0, 4).map((liability) => (
                  <div
                    key={liability.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {liability.asset_name}
                        </p>
                        <p className="text-xs text-gray-500">{liability.asset_type}</p>
                      </div>
                    </div>
                    <p className="font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(liability.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No liabilities recorded</p>
              </div>
            )}
          </div>

          {/* Lending (Receivables) */}
          {lending && lending.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Money Lent Out
                </h3>
                <Link
                  to="/lending"
                  className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  View All <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {lending.slice(0, 3).map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {loan.person_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {loan.expected_return_date
                          ? `Due: ${new Date(loan.expected_return_date).toLocaleDateString()}`
                          : 'No due date'}
                      </p>
                    </div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {formatCurrency(loan.amount - (loan.amount_repaid || 0))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Recent Activity
              </h3>
              <Link
                to="/account-history"
                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(txn.transaction_type)}
                      <div>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {txn.description || txn.category || txn.transaction_type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(txn.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className={`font-medium text-sm ${
                      txn.to_account_id && !txn.from_account_id
                        ? 'text-green-600'
                        : txn.from_account_id && !txn.to_account_id
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}>
                      {txn.to_account_id && !txn.from_account_id ? '+' :
                       txn.from_account_id && !txn.to_account_id ? '-' : ''}
                      {formatCurrency(txn.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <RefreshCw className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
