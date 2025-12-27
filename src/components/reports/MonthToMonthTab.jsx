import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { ReportsService } from '../../utils/reportsService'
import { TrendingUp, TrendingDown, Calendar, BarChart3, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function MonthToMonthTab({ dateRange }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState([])
  const [insights, setInsights] = useState({
    bestMonth: null,
    worstMonth: null,
    avgIncome: 0,
    avgExpenses: 0,
    avgSavings: 0,
    trend: 'stable'
  })

  useEffect(() => {
    if (user && dateRange.from && dateRange.to) {
      fetchMonthlyData()
    }
  }, [user, dateRange])

  const fetchMonthlyData = async () => {
    try {
      setLoading(true)

      // Generate array of months in the date range
      const startDate = new Date(dateRange.from)
      const endDate = new Date(dateRange.to)
      const months = []

      let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      while (currentDate <= endDate) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

        months.push({
          year: currentDate.getFullYear(),
          month: currentDate.getMonth(),
          monthName: currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
          monthShort: currentDate.toLocaleString('default', { month: 'short' }),
          startDate: monthStart.toISOString().split('T')[0],
          endDate: monthEnd.toISOString().split('T')[0]
        })

        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      // Use ReportsService for ledger-first queries (excludes reversed transactions)
      const reportsService = new ReportsService(supabase, user.id)

      // Fetch data for each month from ledger
      const monthlyResults = await Promise.all(
        months.map(async (month) => {
          const [incomeResult, expenseResult, feesResult] = await Promise.all([
            reportsService.getIncomeTransactions(month.startDate, month.endDate),
            reportsService.getExpenseTransactions(month.startDate, month.endDate),
            reportsService.getTransactionFees(month.startDate, month.endDate)
          ])

          const income = incomeResult.total
          const expenses = expenseResult.total + feesResult.total // Include fees in expenses
          const savings = income - expenses
          const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0

          return {
            ...month,
            income,
            expenses,
            savings,
            savingsRate: parseFloat(savingsRate)
          }
        })
      )

      // Calculate month-over-month changes
      const dataWithChanges = monthlyResults.map((month, index) => {
        if (index === 0) {
          return {
            ...month,
            incomeChange: 0,
            expenseChange: 0,
            savingsChange: 0
          }
        }

        const prevMonth = monthlyResults[index - 1]
        const incomeChange = prevMonth.income > 0
          ? ((month.income - prevMonth.income) / prevMonth.income) * 100
          : 0
        const expenseChange = prevMonth.expenses > 0
          ? ((month.expenses - prevMonth.expenses) / prevMonth.expenses) * 100
          : 0
        const savingsChange = prevMonth.savings !== 0
          ? ((month.savings - prevMonth.savings) / Math.abs(prevMonth.savings)) * 100
          : 0

        return {
          ...month,
          incomeChange: parseFloat(incomeChange.toFixed(1)),
          expenseChange: parseFloat(expenseChange.toFixed(1)),
          savingsChange: parseFloat(savingsChange.toFixed(1))
        }
      })

      setMonthlyData(dataWithChanges)

      // Calculate insights
      if (dataWithChanges.length > 0) {
        const avgIncome = dataWithChanges.reduce((sum, m) => sum + m.income, 0) / dataWithChanges.length
        const avgExpenses = dataWithChanges.reduce((sum, m) => sum + m.expenses, 0) / dataWithChanges.length
        const avgSavings = dataWithChanges.reduce((sum, m) => sum + m.savings, 0) / dataWithChanges.length

        const bestMonth = dataWithChanges.reduce((best, current) =>
          current.savings > best.savings ? current : best
        )
        const worstMonth = dataWithChanges.reduce((worst, current) =>
          current.savings < worst.savings ? current : worst
        )

        // Determine trend (compare first 3 months vs last 3 months)
        let trend = 'stable'
        if (dataWithChanges.length >= 6) {
          const firstThreeAvg = dataWithChanges.slice(0, 3).reduce((sum, m) => sum + m.savings, 0) / 3
          const lastThreeAvg = dataWithChanges.slice(-3).reduce((sum, m) => sum + m.savings, 0) / 3
          const trendChange = ((lastThreeAvg - firstThreeAvg) / Math.abs(firstThreeAvg)) * 100

          if (trendChange > 10) trend = 'improving'
          else if (trendChange < -10) trend = 'declining'
        }

        setInsights({
          bestMonth,
          worstMonth,
          avgIncome,
          avgExpenses,
          avgSavings,
          trend
        })
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching monthly data:', error)
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

  if (monthlyData.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p>No data available for the selected period</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Average Income</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(insights.avgIncome)}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">per month</p>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">Average Expenses</p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrency(insights.avgExpenses)}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">per month</p>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">Average Savings</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(insights.avgSavings)}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">per month</p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">Savings Trend</p>
          <div className="flex items-center mt-2">
            {insights.trend === 'improving' && (
              <>
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                <p className="text-xl font-bold text-green-900 dark:text-green-100">Improving</p>
              </>
            )}
            {insights.trend === 'declining' && (
              <>
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-xl font-bold text-red-900 dark:text-red-100">Declining</p>
              </>
            )}
            {insights.trend === 'stable' && (
              <>
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <p className="text-xl font-bold text-blue-900 dark:text-blue-100">Stable</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Best and Worst Months */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Best Performing Month</h3>
          </div>
          {insights.bestMonth && (
            <div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">{insights.bestMonth.monthName}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Income:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(insights.bestMonth.income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Expenses:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(insights.bestMonth.expenses)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Savings:</span>
                  <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(insights.bestMonth.savings)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-200 dark:border-amber-800">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Needs Improvement</h3>
          </div>
          {insights.worstMonth && (
            <div>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-2">{insights.worstMonth.monthName}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Income:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(insights.worstMonth.income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Expenses:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(insights.worstMonth.expenses)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Savings:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(insights.worstMonth.savings)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Monthly Financial Trends</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis dataKey="monthShort" stroke="var(--text-secondary)" />
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
            <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
            <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
            <Line type="monotone" dataKey="savings" stroke="#3B82F6" strokeWidth={2} name="Savings" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Comparison Bar Chart */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Income vs Expenses by Month</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis dataKey="monthShort" stroke="var(--text-secondary)" />
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
            <Bar dataKey="income" fill="#10B981" name="Income" />
            <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Monthly Table */}
      <div className="card overflow-x-auto">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Month-by-Month Breakdown</h3>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Income</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">vs Prev</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">vs Prev</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Savings</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Savings Rate</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {monthlyData.map((month, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {month.monthName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(month.income)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {index === 0 ? (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  ) : (
                    <span className={month.incomeChange >= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                      {month.incomeChange > 0 ? '+' : ''}{month.incomeChange}%
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(month.expenses)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {index === 0 ? (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  ) : (
                    <span className={month.expenseChange <= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                      {month.expenseChange > 0 ? '+' : ''}{month.expenseChange}%
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className={month.savings >= 0 ? 'text-green-700 dark:text-green-400 font-bold' : 'text-red-700 dark:text-red-400 font-bold'}>
                    {formatCurrency(month.savings)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className={`font-semibold ${
                    month.savingsRate >= 20 ? 'text-green-600 dark:text-green-400' :
                    month.savingsRate >= 10 ? 'text-blue-600 dark:text-blue-400' :
                    month.savingsRate >= 0 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {month.savingsRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-800 font-semibold">
            <tr>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">Average</td>
              <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">{formatCurrency(insights.avgIncome)}</td>
              <td className="px-6 py-4"></td>
              <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">{formatCurrency(insights.avgExpenses)}</td>
              <td className="px-6 py-4"></td>
              <td className="px-6 py-4 text-sm text-right text-green-700 dark:text-green-400">{formatCurrency(insights.avgSavings)}</td>
              <td className="px-6 py-4 text-sm text-right text-blue-600 dark:text-blue-400">
                {insights.avgIncome > 0 ? ((insights.avgSavings / insights.avgIncome) * 100).toFixed(1) : 0}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
