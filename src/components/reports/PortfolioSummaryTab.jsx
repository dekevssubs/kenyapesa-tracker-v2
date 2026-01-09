import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { Briefcase, TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, Building2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']

const ACCOUNT_TYPE_ICONS = {
  cash: Wallet,
  bank: Building2,
  investment: TrendingUp,
  savings: PiggyBank,
  credit: CreditCard,
  loan: CreditCard
}

export default function PortfolioSummaryTab() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [summary, setSummary] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    assetAllocation: []
  })

  useEffect(() => {
    if (user) {
      fetchPortfolioData()
    }
  }, [user])

  const fetchPortfolioData = async () => {
    try {
      setLoading(true)

      // Fetch all accounts
      const { data: accountsData, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('current_balance', { ascending: false })

      if (error) throw error

      setAccounts(accountsData || [])

      // Calculate totals
      let totalAssets = 0
      let totalLiabilities = 0
      const allocationMap = {}

      accountsData?.forEach(account => {
        const balance = parseFloat(account.current_balance) || 0
        const type = account.account_type || 'other'

        if (['cash', 'bank', 'investment', 'savings'].includes(type)) {
          totalAssets += balance

          // Track allocation
          if (!allocationMap[type]) {
            allocationMap[type] = 0
          }
          allocationMap[type] += balance
        } else if (['credit', 'loan'].includes(type)) {
          totalLiabilities += Math.abs(balance)
        }
      })

      const assetAllocation = Object.entries(allocationMap)
        .map(([type, value]) => ({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          value,
          percentage: totalAssets > 0 ? ((value / totalAssets) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.value - a.value)

      setSummary({
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
        assetAllocation
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching portfolio data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p>No accounts found</p>
            <p className="text-sm mt-2">Add accounts to see your portfolio summary</p>
          </div>
        </div>
      </div>
    )
  }

  const assetAccounts = accounts.filter(a => ['cash', 'bank', 'investment', 'savings'].includes(a.account_type))
  const liabilityAccounts = accounts.filter(a => ['credit', 'loan'].includes(a.account_type))

  return (
    <div className="space-y-6">
      {/* Net Worth Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800">
          <div className="flex items-center mb-2">
            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">Total Assets</p>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">{formatCurrency(summary.totalAssets)}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">{assetAccounts.length} account(s)</p>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-800">
          <div className="flex items-center mb-2">
            <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">Total Liabilities</p>
          </div>
          <p className="text-3xl font-bold text-red-900 dark:text-red-100">{formatCurrency(summary.totalLiabilities)}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">{liabilityAccounts.length} account(s)</p>
        </div>

        <div className={`card bg-gradient-to-br ${
          summary.netWorth >= 0
            ? 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-800'
            : 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-center mb-2">
            <Briefcase className={`h-6 w-6 mr-2 ${
              summary.netWorth >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-amber-600 dark:text-amber-400'
            }`} />
            <p className={`text-sm font-medium ${
              summary.netWorth >= 0
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-amber-700 dark:text-amber-300'
            }`}>Net Worth</p>
          </div>
          <p className={`text-3xl font-bold ${
            summary.netWorth >= 0
              ? 'text-blue-900 dark:text-blue-100'
              : 'text-amber-900 dark:text-amber-100'
          }`}>{formatCurrency(summary.netWorth)}</p>
          <p className={`text-xs mt-2 ${
            summary.netWorth >= 0
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}>Assets - Liabilities</p>
        </div>
      </div>

      {/* Asset Allocation */}
      {summary.assetAllocation.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Asset Allocation</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={summary.assetAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percentage }) => {
                    const RADIAN = Math.PI / 180
                    const radius = outerRadius * 1.15
                    const x = cx + radius * Math.cos(-midAngle * RADIAN)
                    const y = cy + radius * Math.sin(-midAngle * RADIAN)
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="var(--text-primary)"
                        textAnchor={x > cx ? 'start' : 'end'}
                        dominantBaseline="central"
                        className="text-xs font-medium"
                      >
                        {`${name} ${percentage}%`}
                      </text>
                    )
                  }}
                >
                  {summary.assetAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Allocation Breakdown</h3>
            <div className="space-y-4">
              {summary.assetAllocation.map((item, index) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.percentage}% of assets</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Accounts Grid */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">All Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => {
            const IconComponent = ACCOUNT_TYPE_ICONS[account.account_type] || Wallet
            const isLiability = ['credit', 'loan'].includes(account.account_type)

            return (
              <div
                key={account.id}
                className={`p-4 rounded-lg border ${
                  isLiability
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <IconComponent className={`h-5 w-5 mr-2 ${
                      isLiability
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{account.name}</span>
                  </div>
                </div>
                <p className={`text-xl font-bold ${
                  isLiability
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {formatCurrency(Math.abs(parseFloat(account.current_balance) || 0))}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {account.account_type?.charAt(0).toUpperCase() + account.account_type?.slice(1)}
                  {account.institution_name && ` • ${account.institution_name}`}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lending Receivables (if any) */}
      <LendingReceivables userId={user.id} />
    </div>
  )
}

// Sub-component for lending receivables
function LendingReceivables({ userId }) {
  const [lendings, setLendings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLendings()
  }, [userId])

  const fetchLendings = async () => {
    try {
      // Use overall_status column (not status) per lending_tracker schema
      const { data, error } = await supabase
        .from('lending_tracker')
        .select('*')
        .eq('user_id', userId)
        .in('overall_status', ['pending', 'partial'])
        .order('date_lent', { ascending: false })

      if (error) throw error
      setLendings(data || [])
    } catch (error) {
      console.error('Error fetching lendings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || lendings.length === 0) return null

  const totalOutstanding = lendings.reduce((sum, l) => {
    return sum + (parseFloat(l.amount) - parseFloat(l.amount_repaid || 0))
  }, 0)

  return (
    <div className="card bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-800">
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Lending Receivables</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Money lent out that counts as assets
      </p>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-amber-700 dark:text-amber-300">Total Outstanding</span>
        <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatCurrency(totalOutstanding)}</span>
      </div>
      <div className="space-y-2">
        {lendings.slice(0, 5).map(lending => (
          <div key={lending.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">{lending.person_name}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatCurrency(parseFloat(lending.amount) - parseFloat(lending.amount_repaid || 0))}
            </span>
          </div>
        ))}
        {lendings.length > 5 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            +{lendings.length - 5} more
          </p>
        )}
      </div>
    </div>
  )
}
