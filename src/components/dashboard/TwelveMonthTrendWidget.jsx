import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { getMonthlyRanges } from '../../utils/periodUtils'
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function TwelveMonthTrendWidget() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [trendData, setTrendData] = useState([])
  const [chartType, setChartType] = useState('area') // 'area' or 'line'
  const [summary, setSummary] = useState({
    avgIncome: 0,
    avgExpenses: 0,
    avgSavings: 0,
    trend: 'up' // up or down
  })

  useEffect(() => {
    if (user) {
      fetchTrendData()
    }
  }, [user])

  const fetchTrendData = async () => {
    try {
      setLoading(true)
      const monthlyRanges = getMonthlyRanges(12)

      // Fetch data for each month
      const monthlyData = await Promise.all(
        monthlyRanges.map(async (range) => {
          const [incomeData, expenseData] = await Promise.all([
            supabase
              .from('income')
              .select('amount')
              .eq('user_id', user.id)
              .gte('date', range.startDate)
              .lte('date', range.endDate),
            supabase
              .from('expenses')
              .select('amount')
              .eq('user_id', user.id)
              .gte('date', range.startDate)
              .lte('date', range.endDate)
          ])

          const income = incomeData.data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
          const expenses = expenseData.data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
          const savings = income - expenses

          return {
            month: range.monthShort,
            monthLong: range.monthLong,
            income,
            expenses,
            savings,
            savingsRate: income > 0 ? ((savings / income) * 100).toFixed(1) : 0
          }
        })
      )

      setTrendData(monthlyData)

      // Calculate summary statistics
      const totalMonths = monthlyData.length
      const avgIncome = monthlyData.reduce((sum, m) => sum + m.income, 0) / totalMonths
      const avgExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0) / totalMonths
      const avgSavings = monthlyData.reduce((sum, m) => sum + m.savings, 0) / totalMonths

      // Determine trend (compare last 3 months vs previous 3 months)
      const last3Months = monthlyData.slice(-3)
      const prev3Months = monthlyData.slice(-6, -3)
      const last3Avg = last3Months.reduce((sum, m) => sum + m.savings, 0) / 3
      const prev3Avg = prev3Months.reduce((sum, m) => sum + m.savings, 0) / 3

      setSummary({
        avgIncome,
        avgExpenses,
        avgSavings,
        trend: last3Avg >= prev3Avg ? 'up' : 'down',
        trendPercentage: prev3Avg > 0 ? (((last3Avg - prev3Avg) / prev3Avg) * 100).toFixed(1) : 0
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching trend data:', error)
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{payload[0]?.payload?.monthLong}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-sm text-green-600 dark:text-green-400">Income:</span>
              <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(payload[0]?.payload?.income || 0)}</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-sm text-red-600 dark:text-red-400">Expenses:</span>
              <span className="font-semibold text-red-700 dark:text-red-400">{formatCurrency(payload[0]?.payload?.expenses || 0)}</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-sm text-blue-600 dark:text-blue-400">Savings:</span>
              <span className="font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(payload[0]?.payload?.savings || 0)}</span>
            </div>
            <div className="flex items-center justify-between space-x-4 pt-1 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Savings Rate:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{payload[0]?.payload?.savingsRate}%</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
            12-Month Financial Trend
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Income, expenses, and savings over the past year</p>
        </div>

        {/* Chart Type Toggle */}
        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              chartType === 'area'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Area
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              chartType === 'line'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Line
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Avg Monthly Income</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(summary.avgIncome)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Avg Monthly Expenses</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(summary.avgExpenses)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 flex items-center">
            Avg Monthly Savings
            {summary.trend === 'up' ? (
              <TrendingUp className="h-3 w-3 ml-1 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-3 w-3 ml-1 text-red-600 dark:text-red-400" />
            )}
          </p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(summary.avgSavings)}</p>
          <p className={`text-xs mt-1 font-medium ${
            summary.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {summary.trend === 'up' ? '↑' : '↓'} {Math.abs(summary.trendPercentage)}% vs prev 3 months
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis
                dataKey="month"
                stroke="var(--text-secondary)"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="var(--text-secondary)"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncome)"
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#EF4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorExpenses)"
                name="Expenses"
              />
              <Area
                type="monotone"
                dataKey="savings"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSavings)"
                name="Savings"
              />
            </AreaChart>
          ) : (
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis
                dataKey="month"
                stroke="var(--text-secondary)"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="var(--text-secondary)"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 4 }}
                activeDot={{ r: 6 }}
                name="Income"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ fill: '#EF4444', r: 4 }}
                activeDot={{ r: 6 }}
                name="Expenses"
              />
              <Line
                type="monotone"
                dataKey="savings"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Savings"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      {trendData.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Key Insights</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  Highest income: <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {trendData.reduce((max, m) => m.income > max.income ? m : max, trendData[0]).monthLong}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(trendData.reduce((max, m) => m.income > max.income ? m : max, trendData[0]).income)}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  Highest expenses: <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {trendData.reduce((max, m) => m.expenses > max.expenses ? m : max, trendData[0]).monthLong}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(trendData.reduce((max, m) => m.expenses > max.expenses ? m : max, trendData[0]).expenses)}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  Best savings: <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {trendData.reduce((max, m) => m.savings > max.savings ? m : max, trendData[0]).monthLong}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(trendData.reduce((max, m) => m.savings > max.savings ? m : max, trendData[0]).savings)}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5"></div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  Best savings rate: <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {trendData.reduce((max, m) => parseFloat(m.savingsRate) > parseFloat(max.savingsRate) ? m : max, trendData[0]).monthLong}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {trendData.reduce((max, m) => parseFloat(m.savingsRate) > parseFloat(max.savingsRate) ? m : max, trendData[0]).savingsRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
