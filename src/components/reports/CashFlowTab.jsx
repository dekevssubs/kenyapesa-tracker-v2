import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { ReportsService } from '../../utils/reportsService'
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function CashFlowTab({ dateRange }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [cashFlowData, setCashFlowData] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [insights, setInsights] = useState({
    totalInflow: 0,
    totalOutflow: 0,
    netCashFlow: 0,
    avgDailyInflow: 0,
    avgDailyOutflow: 0,
    positiveFlowDays: 0,
    negativeFlowDays: 0,
    largestInflow: null,
    largestOutflow: null,
    cashFlowHealth: 'good'
  })

  useEffect(() => {
    if (user && dateRange.from && dateRange.to) {
      fetchCashFlowData()
    }
  }, [user, dateRange])

  const fetchCashFlowData = async () => {
    try {
      setLoading(true)

      // Use ReportsService for ledger-first queries
      const reportsService = new ReportsService(supabase, user.id)

      // Fetch from ledger (account_transactions) - excludes reversed transactions
      const [incomeResult, expenseResult, feesResult] = await Promise.all([
        reportsService.getIncomeTransactions(dateRange.from, dateRange.to),
        reportsService.getExpenseTransactions(dateRange.from, dateRange.to),
        reportsService.getTransactionFees(dateRange.from, dateRange.to)
      ])

      const incomeTransactions = incomeResult.transactions || []
      const expenseTransactions = expenseResult.transactions || []
      const feeTransactions = feesResult.transactions || []

      // Combine and sort by date (fees count as outflow)
      const allTransactions = [
        ...incomeTransactions.map(t => ({ ...t, type: 'income', amount: parseFloat(t.amount) })),
        ...expenseTransactions.map(t => ({ ...t, type: 'expense', amount: parseFloat(t.amount) })),
        ...feeTransactions.map(t => ({ ...t, type: 'expense', amount: parseFloat(t.amount) }))
      ].sort((a, b) => new Date(a.date) - new Date(b.date))

      // Calculate cumulative cash flow
      let cumulativeFlow = 0
      const flowData = allTransactions.map(transaction => {
        const flowAmount = transaction.type === 'income' ? transaction.amount : -transaction.amount
        cumulativeFlow += flowAmount
        return {
          date: transaction.date,
          type: transaction.type,
          amount: transaction.amount,
          flowAmount,
          cumulativeFlow,
          description: transaction.description || transaction.category
        }
      })

      setCashFlowData(flowData)

      // Generate daily aggregates
      const startDate = new Date(dateRange.from)
      const endDate = new Date(dateRange.to)
      const dailyMap = new Map()

      // Initialize all days
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        dailyMap.set(dateStr, {
          date: dateStr,
          dateFormatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          inflow: 0,
          outflow: 0,
          netFlow: 0,
          cumulativeFlow: 0
        })
      }

      // Aggregate transactions by day
      let runningTotal = 0
      flowData.forEach(transaction => {
        const day = dailyMap.get(transaction.date)
        if (day) {
          if (transaction.type === 'income') {
            day.inflow += transaction.amount
          } else {
            day.outflow += transaction.amount
          }
          day.netFlow = day.inflow - day.outflow
        }
      })

      // Calculate cumulative flow for each day
      const dailyArray = Array.from(dailyMap.values()).sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      )

      dailyArray.forEach(day => {
        runningTotal += day.netFlow
        day.cumulativeFlow = runningTotal
      })

      setDailyData(dailyArray)

      // Generate weekly aggregates
      const weeklyMap = new Map()
      dailyArray.forEach(day => {
        const date = new Date(day.date)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0]

        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, {
            weekStart: weekKey,
            weekLabel: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            inflow: 0,
            outflow: 0,
            netFlow: 0
          })
        }

        const week = weeklyMap.get(weekKey)
        week.inflow += day.inflow
        week.outflow += day.outflow
        week.netFlow = week.inflow - week.outflow
      })

      const weeklyArray = Array.from(weeklyMap.values()).sort((a, b) =>
        new Date(a.weekStart) - new Date(b.weekStart)
      )
      setWeeklyData(weeklyArray)

      // Calculate insights
      const totalInflow = dailyArray.reduce((sum, day) => sum + day.inflow, 0)
      const totalOutflow = dailyArray.reduce((sum, day) => sum + day.outflow, 0)
      const netCashFlow = totalInflow - totalOutflow

      const daysCount = dailyArray.length
      const avgDailyInflow = totalInflow / daysCount
      const avgDailyOutflow = totalOutflow / daysCount

      const positiveFlowDays = dailyArray.filter(day => day.netFlow > 0).length
      const negativeFlowDays = dailyArray.filter(day => day.netFlow < 0).length

      // Find largest transactions from ledger data
      const largestInflow = incomeTransactions
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0]

      const allOutflows = [...expenseTransactions, ...feeTransactions]
      const largestOutflow = allOutflows
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0]

      // Determine cash flow health
      let cashFlowHealth = 'good'
      if (netCashFlow < 0) {
        cashFlowHealth = 'poor'
      } else if (netCashFlow < totalInflow * 0.1) {
        cashFlowHealth = 'fair'
      } else if (netCashFlow >= totalInflow * 0.2) {
        cashFlowHealth = 'excellent'
      }

      setInsights({
        totalInflow,
        totalOutflow,
        netCashFlow,
        avgDailyInflow,
        avgDailyOutflow,
        positiveFlowDays,
        negativeFlowDays,
        largestInflow,
        largestOutflow,
        cashFlowHealth
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching cash flow data:', error)
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

  if (dailyData.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p>No cash flow data available for the selected period</p>
          </div>
        </div>
      </div>
    )
  }

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent': return 'text-green-600 dark:text-green-400'
      case 'good': return 'text-blue-600 dark:text-blue-400'
      case 'fair': return 'text-yellow-600 dark:text-yellow-400'
      case 'poor': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getHealthBgColor = (health) => {
    switch (health) {
      case 'excellent': return 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800'
      case 'good': return 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-800'
      case 'fair': return 'from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-200 dark:border-yellow-800'
      case 'poor': return 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-800'
      default: return 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800">
          <div className="flex items-center mb-2">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">Total Inflow</p>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">{formatCurrency(insights.totalInflow)}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            Avg: {formatCurrency(insights.avgDailyInflow)}/day
          </p>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-800">
          <div className="flex items-center mb-2">
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">Total Outflow</p>
          </div>
          <p className="text-3xl font-bold text-red-900 dark:text-red-100">{formatCurrency(insights.totalOutflow)}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            Avg: {formatCurrency(insights.avgDailyOutflow)}/day
          </p>
        </div>

        <div className={`card bg-gradient-to-br ${getHealthBgColor(insights.cashFlowHealth)}`}>
          <div className="flex items-center mb-2">
            <DollarSign className={`h-5 w-5 mr-2 ${getHealthColor(insights.cashFlowHealth)}`} />
            <p className={`text-sm font-medium ${getHealthColor(insights.cashFlowHealth)}`}>Net Cash Flow</p>
          </div>
          <p className={`text-3xl font-bold ${getHealthColor(insights.cashFlowHealth)}`}>
            {formatCurrency(insights.netCashFlow)}
          </p>
          <p className={`text-xs mt-2 ${getHealthColor(insights.cashFlowHealth)}`}>
            Health: {insights.cashFlowHealth.toUpperCase()}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-800">
          <div className="flex items-center mb-2">
            <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
            <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">Cash Flow Days</p>
          </div>
          <div className="flex items-center space-x-4 mt-2">
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{insights.positiveFlowDays}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Positive</p>
            </div>
            <div className="border-l border-purple-300 dark:border-purple-700 h-12"></div>
            <div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{insights.negativeFlowDays}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Negative</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cumulative Cash Flow Chart */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Cumulative Cash Flow</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis dataKey="dateFormatted" stroke="var(--text-secondary)" />
            <YAxis stroke="var(--text-secondary)" />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                borderRadius: '8px'
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulativeFlow"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#colorFlow)"
              name="Cumulative Cash Flow"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Inflow vs Outflow */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Daily Cash Flow</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis dataKey="dateFormatted" stroke="var(--text-secondary)" />
            <YAxis stroke="var(--text-secondary)" />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="inflow" stroke="#10B981" strokeWidth={2} name="Inflow" />
            <Line type="monotone" dataKey="outflow" stroke="#EF4444" strokeWidth={2} name="Outflow" />
            <Line type="monotone" dataKey="netFlow" stroke="#3B82F6" strokeWidth={2} name="Net Flow" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Summary */}
      {weeklyData.length > 1 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Weekly Cash Flow Summary</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="weekLabel" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="inflow" fill="#10B981" name="Inflow" />
              <Bar dataKey="outflow" fill="#EF4444" name="Outflow" />
              <Bar dataKey="netFlow" fill="#3B82F6" name="Net Flow" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Key Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Largest Inflow */}
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800">
          <div className="flex items-center mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Largest Inflow</h3>
          </div>
          {insights.largestInflow ? (
            <div className="space-y-2">
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">{formatCurrency(insights.largestInflow.amount)}</p>
              <div className="text-sm">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Category:</span> {insights.largestInflow.category || 'N/A'}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Date:</span>{' '}
                  {new Date(insights.largestInflow.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                {insights.largestInflow.description && (
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    <span className="font-semibold">Note:</span> {insights.largestInflow.description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No inflow data</p>
          )}
        </div>

        {/* Largest Outflow */}
        <div className="card bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-red-200 dark:border-red-800">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Largest Outflow</h3>
          </div>
          {insights.largestOutflow ? (
            <div className="space-y-2">
              <p className="text-3xl font-bold text-red-900 dark:text-red-100">{formatCurrency(insights.largestOutflow.amount)}</p>
              <div className="text-sm">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Category:</span> {insights.largestOutflow.category || 'N/A'}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Date:</span>{' '}
                  {new Date(insights.largestOutflow.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                {insights.largestOutflow.description && (
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    <span className="font-semibold">Note:</span> {insights.largestOutflow.description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No outflow data</p>
          )}
        </div>
      </div>

      {/* Cash Flow Health Assessment */}
      <div className={`card bg-gradient-to-r ${getHealthBgColor(insights.cashFlowHealth)}`}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Cash Flow Health Assessment</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            {insights.cashFlowHealth === 'excellent' || insights.cashFlowHealth === 'good' ? (
              <CheckCircle className={`h-6 w-6 mr-3 ${getHealthColor(insights.cashFlowHealth)}`} />
            ) : (
              <AlertCircle className={`h-6 w-6 mr-3 ${getHealthColor(insights.cashFlowHealth)}`} />
            )}
            <div>
              <p className={`font-bold text-lg ${getHealthColor(insights.cashFlowHealth)}`}>
                {insights.cashFlowHealth.toUpperCase()} Cash Flow
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {insights.cashFlowHealth === 'excellent' && 'Your cash flow is exceptional! You\'re saving over 20% of your income.'}
                {insights.cashFlowHealth === 'good' && 'Your cash flow is healthy with positive net savings.'}
                {insights.cashFlowHealth === 'fair' && 'Your cash flow is acceptable but could be improved. Savings are below 10%.'}
                {insights.cashFlowHealth === 'poor' && 'Warning: Negative cash flow detected. Expenses exceed income.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Inflow/Outflow Ratio</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {insights.totalOutflow > 0 ? (insights.totalInflow / insights.totalOutflow).toFixed(2) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Savings Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {insights.totalInflow > 0 ? ((insights.netCashFlow / insights.totalInflow) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Positive Days</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                {((insights.positiveFlowDays / dailyData.length) * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Negative Days</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-400">
                {((insights.negativeFlowDays / dailyData.length) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
