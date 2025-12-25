import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  BarChart3,
  Calendar,
  DollarSign,
  Percent,
  Eye,
  History
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function SavingsInvestments() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [growthData, setGrowthData] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('30d') // 7d, 30d, 90d, 1y, all

  useEffect(() => {
    if (user) {
      fetchSavingsInvestments()
      fetchGrowthData()
      fetchRecentTransactions()
    }
  }, [user, selectedPeriod])

  const fetchSavingsInvestments = async () => {
    try {
      setLoading(true)
      const { data: accountsData, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .in('account_type', ['savings', 'investment'])
        .order('created_at', { ascending: false })

      if (error) throw error

      setAccounts(accountsData || [])

      // Calculate summary
      const totalBalance = accountsData?.reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0) || 0
      const totalSavings = accountsData?.filter(a => a.account_type === 'savings').reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0) || 0
      const totalInvestments = accountsData?.filter(a => a.account_type === 'investment').reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0) || 0

      setSummary({
        totalBalance,
        totalSavings,
        totalInvestments,
        savingsCount: accountsData?.filter(a => a.account_type === 'savings').length || 0,
        investmentCount: accountsData?.filter(a => a.account_type === 'investment').length || 0
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching savings/investments:', error)
      setLoading(false)
    }
  }

  const fetchGrowthData = async () => {
    try {
      // Calculate date range based on selected period
      const now = new Date()
      let startDate = new Date()

      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        case '90d':
          startDate.setDate(now.getDate() - 90)
          break
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1)
          break
        case 'all':
          startDate = new Date('2020-01-01')
          break
      }

      // Fetch transactions for savings/investment accounts
      const { data: transactions, error } = await supabase
        .from('account_transactions')
        .select('*, to_account:accounts!account_transactions_to_account_id_fkey(account_type)')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error

      // Calculate running balance by date
      const balanceByDate = {}
      let runningBalance = 0

      transactions?.forEach(tx => {
        const date = tx.date
        const toAccountType = tx.to_account?.account_type

        // Only count transactions to savings/investment accounts
        if (toAccountType === 'savings' || toAccountType === 'investment') {
          runningBalance += parseFloat(tx.amount || 0)
          balanceByDate[date] = runningBalance
        }
      })

      // Convert to chart data
      const chartData = Object.entries(balanceByDate).map(([date, balance]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: parseFloat(balance.toFixed(2))
      }))

      setGrowthData(chartData)
    } catch (error) {
      console.error('Error fetching growth data:', error)
    }
  }

  const fetchRecentTransactions = async () => {
    try {
      // First, get savings/investment account IDs
      const { data: savingsInvestmentAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .in('account_type', ['savings', 'investment'])

      const accountIds = savingsInvestmentAccounts?.map(a => a.id) || []

      if (accountIds.length === 0) {
        setRecentTransactions([])
        return
      }

      // Then fetch transactions involving these accounts
      const { data, error } = await supabase
        .from('account_transactions')
        .select(`
          *,
          from_account:accounts!account_transactions_from_account_id_fkey(name, account_type),
          to_account:accounts!account_transactions_to_account_id_fkey(name, account_type)
        `)
        .eq('user_id', user.id)
        .or(`from_account_id.in.(${accountIds.join(',')}),to_account_id.in.(${accountIds.join(',')})`)
        .order('transaction_date', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const getAccountIcon = (type) => {
    return type === 'savings' ? <PiggyBank className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />
  }

  const pieChartData = summary ? [
    { name: 'Savings', value: summary.totalSavings, color: '#10b981' },
    { name: 'Investments', value: summary.totalInvestments, color: '#3b82f6' }
  ] : []

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
      <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl p-6 text-white dark:from-green-600 dark:to-blue-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Savings & Investments</h2>
            <p className="text-green-100 dark:text-green-200 mt-1">Track your wealth growth over time</p>
          </div>
          <Wallet className="h-16 w-16 text-white opacity-50" />
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white bg-opacity-20 dark:bg-opacity-10 rounded-lg p-4">
              <p className="text-sm text-green-100 dark:text-green-200">Total Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalBalance)}</p>
            </div>
            <div className="bg-white bg-opacity-20 dark:bg-opacity-10 rounded-lg p-4">
              <p className="text-sm text-green-100 dark:text-green-200">Savings ({summary.savingsCount} accounts)</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalSavings)}</p>
            </div>
            <div className="bg-white bg-opacity-20 dark:bg-opacity-10 rounded-lg p-4">
              <p className="text-sm text-green-100 dark:text-green-200">Investments ({summary.investmentCount} accounts)</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalInvestments)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Portfolio Distribution */}
      {summary && summary.totalBalance > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Portfolio Distribution</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Growth Chart */}
      {growthData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Balance Growth</h3>
            <div className="flex space-x-2">
              {['7d', '30d', '90d', '1y', 'all'].map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    selectedPeriod === period
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {period === 'all' ? 'All' : period.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis dataKey="date" stroke="#6b7280" className="dark:stroke-gray-400" />
              <YAxis stroke="#6b7280" className="dark:stroke-gray-400" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                className="dark:bg-gray-800 dark:border-gray-700"
              />
              <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Accounts Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Accounts</h3>
          <a
            href="/accounts"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            Manage Accounts →
          </a>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <PiggyBank className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Savings or Investment Accounts</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Create savings or investment accounts to track your wealth growth</p>
            <a
              href="/accounts"
              className="btn btn-primary inline-block"
            >
              <Plus className="h-5 w-5 mr-2 inline" />
              Create Account
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(account => {
              const balance = parseFloat(account.current_balance || 0)
              const isPositive = balance >= 0

              return (
                <div
                  key={account.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${
                      account.account_type === 'savings'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      {getAccountIcon(account.account_type)}
                    </div>
                    {account.is_primary && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>

                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{account.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 capitalize">{account.account_type}</p>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
                    <p className={`text-2xl font-bold ${
                      isPositive ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(balance)}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <a
                      href={`/account-history?account=${account.id}`}
                      className="flex-1 btn btn-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border-0"
                    >
                      <History className="h-4 w-4 mr-1" />
                      History
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentTransactions.map(tx => {
              const isDeposit = tx.to_account?.account_type === 'savings' || tx.to_account?.account_type === 'investment'

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isDeposit
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {isDeposit ? (
                        <ArrowUpCircle className="h-5 w-5" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {isDeposit ? 'Deposit' : 'Withdrawal'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isDeposit ? `To ${tx.to_account?.name}` : `From ${tx.from_account?.name}`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      isDeposit
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
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
