import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { ReportsService } from '../../utils/reportsService'
import { Calendar, TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function YearToYearTab() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [yearlyData, setYearlyData] = useState([])
  const [selectedYears, setSelectedYears] = useState([])
  const [availableYears, setAvailableYears] = useState([])

  useEffect(() => {
    if (user) {
      fetchAvailableYears()
    }
  }, [user])

  useEffect(() => {
    if (user && selectedYears.length > 0) {
      fetchYearlyData()
    }
  }, [user, selectedYears])

  const fetchAvailableYears = async () => {
    try {
      // Get the earliest transaction date from the ledger
      const { data: earliestTransaction } = await supabase
        .from('account_transactions')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .limit(1)

      const earliestDate = earliestTransaction?.[0]?.date
        ? new Date(earliestTransaction[0].date)
        : new Date()

      const currentYear = new Date().getFullYear()
      const startYear = earliestDate.getFullYear()

      const years = []
      for (let year = startYear; year <= currentYear; year++) {
        years.push(year)
      }

      setAvailableYears(years.reverse()) // Most recent first

      // Auto-select last 3 years or all available years
      const yearsToSelect = years.slice(0, Math.min(3, years.length))
      setSelectedYears(yearsToSelect)
    } catch (error) {
      console.error('Error fetching available years:', error)
      setLoading(false)
    }
  }

  const fetchYearlyData = async () => {
    try {
      setLoading(true)

      // Use ReportsService for ledger-first queries
      const reportsService = new ReportsService(supabase, user.id)

      const yearlyResults = await Promise.all(
        selectedYears.map(async (year) => {
          const yearStart = `${year}-01-01`
          const yearEnd = `${year}-12-31`

          // Fetch from ledger (excludes reversed transactions)
          const [incomeResult, expenseResult, feesResult] = await Promise.all([
            reportsService.getIncomeTransactions(yearStart, yearEnd),
            reportsService.getExpenseTransactions(yearStart, yearEnd),
            reportsService.getTransactionFees(yearStart, yearEnd)
          ])

          const income = incomeResult.total
          const expenses = expenseResult.total + feesResult.total // Include fees
          const savings = income - expenses
          const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0

          // Calculate monthly averages
          const monthlyIncome = income / 12
          const monthlyExpenses = expenses / 12
          const monthlySavings = savings / 12

          // Top expense category for the year
          const categoryMap = {}
          ;[...expenseResult.transactions, ...feesResult.transactions].forEach(item => {
            const category = item.category || 'Uncategorized'
            categoryMap[category] = (categoryMap[category] || 0) + parseFloat(item.amount)
          })
          const topCategory = Object.entries(categoryMap)
            .sort(([, a], [, b]) => b - a)[0]

          const transactionCount = incomeResult.transactions.length +
                                   expenseResult.transactions.length +
                                   feesResult.transactions.length

          return {
            year,
            income,
            expenses,
            savings,
            savingsRate: parseFloat(savingsRate),
            monthlyIncome,
            monthlyExpenses,
            monthlySavings,
            topCategory: topCategory ? topCategory[0] : 'None',
            topCategoryAmount: topCategory ? topCategory[1] : 0,
            transactionCount
          }
        })
      )

      // Sort by year descending
      yearlyResults.sort((a, b) => b.year - a.year)

      // Calculate year-over-year changes
      const dataWithChanges = yearlyResults.map((yearData, index) => {
        if (index === yearlyResults.length - 1) {
          return {
            ...yearData,
            incomeGrowth: 0,
            expenseGrowth: 0,
            savingsGrowth: 0
          }
        }

        const prevYear = yearlyResults[index + 1]
        const incomeGrowth = prevYear.income > 0
          ? ((yearData.income - prevYear.income) / prevYear.income) * 100
          : 0
        const expenseGrowth = prevYear.expenses > 0
          ? ((yearData.expenses - prevYear.expenses) / prevYear.expenses) * 100
          : 0
        const savingsGrowth = prevYear.savings !== 0
          ? ((yearData.savings - prevYear.savings) / Math.abs(prevYear.savings)) * 100
          : 0

        return {
          ...yearData,
          incomeGrowth: parseFloat(incomeGrowth.toFixed(1)),
          expenseGrowth: parseFloat(expenseGrowth.toFixed(1)),
          savingsGrowth: parseFloat(savingsGrowth.toFixed(1))
        }
      })

      setYearlyData(dataWithChanges)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching yearly data:', error)
      setLoading(false)
    }
  }

  const toggleYearSelection = (year) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter(y => y !== year))
      }
    } else {
      setSelectedYears([...selectedYears, year].sort((a, b) => b - a))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  if (yearlyData.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p>No data available for year-to-year comparison</p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate overall statistics
  const totalIncome = yearlyData.reduce((sum, y) => sum + y.income, 0)
  const totalExpenses = yearlyData.reduce((sum, y) => sum + y.expenses, 0)
  const totalSavings = yearlyData.reduce((sum, y) => sum + y.savings, 0)
  const avgSavingsRate = yearlyData.reduce((sum, y) => sum + y.savingsRate, 0) / yearlyData.length

  return (
    <div className="space-y-6">
      {/* Year Selection */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Select Years to Compare</h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">{selectedYears.length} year(s) selected</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => toggleYearSelection(year)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedYears.includes(year)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Total Income</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(totalIncome)}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">{yearlyData.length} year(s)</p>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">{yearlyData.length} year(s)</p>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">Total Savings</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(totalSavings)}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">{yearlyData.length} year(s)</p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">Avg Savings Rate</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{avgSavingsRate.toFixed(1)}%</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">across all years</p>
        </div>
      </div>

      {/* Year-over-Year Growth Chart */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Annual Financial Comparison</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={[...yearlyData].reverse()}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis dataKey="year" stroke="var(--text-secondary)" />
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
            <Bar dataKey="savings" fill="#3B82F6" name="Savings" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Growth Trends Chart */}
      {yearlyData.length > 1 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Year-over-Year Growth Rates</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[...yearlyData].reverse().filter((_, idx) => idx > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="year" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                formatter={(value) => `${value.toFixed(1)}%`}
                contentStyle={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="incomeGrowth" stroke="#10B981" strokeWidth={2} name="Income Growth %" />
              <Line type="monotone" dataKey="expenseGrowth" stroke="#EF4444" strokeWidth={2} name="Expense Growth %" />
              <Line type="monotone" dataKey="savingsGrowth" stroke="#3B82F6" strokeWidth={2} name="Savings Growth %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Yearly Table */}
      <div className="card overflow-x-auto">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Detailed Year-by-Year Breakdown</h3>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Year</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Income</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">YoY Growth</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">YoY Growth</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Savings</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Savings Rate</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transactions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {yearlyData.map((year) => (
              <tr key={year.year} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">
                  {year.year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(year.income)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {year.incomeGrowth === 0 ? (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  ) : (
                    <div className="flex items-center justify-end">
                      {year.incomeGrowth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 mr-1" />
                      )}
                      <span className={year.incomeGrowth >= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                        {year.incomeGrowth > 0 ? '+' : ''}{year.incomeGrowth}%
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(year.expenses)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {year.expenseGrowth === 0 ? (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  ) : (
                    <div className="flex items-center justify-end">
                      {year.expenseGrowth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" />
                      )}
                      <span className={year.expenseGrowth <= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                        {year.expenseGrowth > 0 ? '+' : ''}{year.expenseGrowth}%
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className={year.savings >= 0 ? 'text-green-700 dark:text-green-400 font-bold' : 'text-red-700 dark:text-red-400 font-bold'}>
                    {formatCurrency(year.savings)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className={`font-semibold ${
                    year.savingsRate >= 20 ? 'text-green-600 dark:text-green-400' :
                    year.savingsRate >= 10 ? 'text-blue-600 dark:text-blue-400' :
                    year.savingsRate >= 0 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {year.savingsRate}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {year.transactionCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Annual Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {yearlyData.map(year => (
          <div key={year.year} className="card bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{year.year} Highlights</h3>
              <Calendar className="h-6 w-6 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Monthly Avg Income:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(year.monthlyIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Monthly Avg Expenses:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(year.monthlyExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Monthly Avg Savings:</span>
                <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(year.monthlySavings)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="text-gray-700 dark:text-gray-300">Top Spending Category:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{year.topCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Amount:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(year.topCategoryAmount)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
