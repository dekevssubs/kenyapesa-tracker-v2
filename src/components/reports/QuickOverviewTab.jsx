import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { ReportsService } from '../../utils/reportsService'
import { Calendar, Download, PiggyBank, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

const PERIODS = [
  { value: 'month', label: 'This Month' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: '12months', label: 'Last 12 Months' },
  { value: 'year', label: 'This Year (YTD)' },
]

const COLORS = ['#006B3F', '#BB0000', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F97316']

export default function QuickOverviewTab({ dateRange: externalDateRange }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0,
    monthlyData: [],
    categoryData: [],
    incomeVsExpense: []
  })

  // Detect period from external date range
  const detectPeriodFromDateRange = (from, to) => {
    if (!from || !to) return null
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const now = new Date()
    const monthsDiff = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth())

    // Check for YTD (from January 1 of current year)
    if (fromDate.getMonth() === 0 && fromDate.getDate() === 1 && fromDate.getFullYear() === now.getFullYear()) {
      return 'year'
    }
    // Check for ~6 months
    if (monthsDiff >= 5 && monthsDiff <= 7) {
      return '6months'
    }
    // Check for ~3 months
    if (monthsDiff >= 2 && monthsDiff <= 4) {
      return '3months'
    }
    // Check for ~12 months
    if (monthsDiff >= 11 && monthsDiff <= 13) {
      return '12months'
    }
    return null
  }

  // Update internal period when external date range changes
  useEffect(() => {
    if (externalDateRange?.from && externalDateRange?.to) {
      const detectedPeriod = detectPeriodFromDateRange(externalDateRange.from, externalDateRange.to)
      if (detectedPeriod) {
        setPeriod(detectedPeriod)
      }
    }
  }, [externalDateRange])

  useEffect(() => {
    if (user) {
      fetchReportData()
    }
  }, [user, period, externalDateRange])

  const getDateRange = () => {
    // If external date range is provided, use it
    if (externalDateRange?.from && externalDateRange?.to) {
      return {
        start: externalDateRange.from,
        end: externalDateRange.to
      }
    }

    const now = new Date()
    let startDate

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
        break
      case '12months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    }
  }

  const fetchReportData = async () => {
    try {
      const { start, end } = getDateRange()

      // Use ReportsService for ledger-first queries
      const reportsService = new ReportsService(supabase, user.id)

      // Fetch from ledger (account_transactions) - excludes reversed transactions
      const [incomeResult, expenseResult, feesResult] = await Promise.all([
        reportsService.getIncomeTransactions(start, end),
        reportsService.getExpenseTransactions(start, end),
        reportsService.getTransactionFees(start, end)
      ])

      const incomeData = incomeResult.transactions || []
      const expenseData = expenseResult.transactions || []
      const feesData = feesResult.transactions || []

      // Calculate totals (expenses include fees)
      const totalIncome = incomeResult.total
      const totalExpenses = expenseResult.total + feesResult.total
      const netSavings = totalIncome - totalExpenses
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome * 100) : 0

      // Build monthly data from ledger transactions
      const monthlyMap = {}
      incomeData.forEach(item => {
        const month = item.date.slice(0, 7)
        if (!monthlyMap[month]) monthlyMap[month] = { month, income: 0, expenses: 0 }
        monthlyMap[month].income += parseFloat(item.amount)
      })
      expenseData.forEach(item => {
        const month = item.date.slice(0, 7)
        if (!monthlyMap[month]) monthlyMap[month] = { month, income: 0, expenses: 0 }
        monthlyMap[month].expenses += parseFloat(item.amount)
      })
      // Include fees in expenses
      feesData.forEach(item => {
        const month = item.date.slice(0, 7)
        if (!monthlyMap[month]) monthlyMap[month] = { month, income: 0, expenses: 0 }
        monthlyMap[month].expenses += parseFloat(item.amount)
      })

      const monthlyData = Object.values(monthlyMap)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(item => ({
          month: new Date(item.month + '-01').toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
          income: item.income,
          expenses: item.expenses,
          savings: item.income - item.expenses
        }))

      // Build category data from ledger (expenses + fees)
      const categoryMap = {}
      expenseData.forEach(item => {
        const category = item.category || 'Uncategorized'
        if (!categoryMap[category]) {
          categoryMap[category] = 0
        }
        categoryMap[category] += parseFloat(item.amount)
      })
      // Add fees to their categories
      feesData.forEach(item => {
        const category = item.category || 'Transaction Fees'
        if (!categoryMap[category]) {
          categoryMap[category] = 0
        }
        categoryMap[category] += parseFloat(item.amount)
      })

      const categoryData = Object.entries(categoryMap)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
          value,
          percentage: totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.value - a.value)

      setData({
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate: savingsRate.toFixed(1),
        monthlyData,
        categoryData,
        incomeVsExpense: monthlyData
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching report data:', error)
      setLoading(false)
    }
  }

  const handleExport = () => {
    const reportText = `
KENYAPESA TRACKER - FINANCIAL REPORT
Period: ${PERIODS.find(p => p.value === period)?.label}
Generated: ${new Date().toLocaleString('en-KE')}

========================================
SUMMARY
========================================
Total Income:        ${formatCurrency(data.totalIncome)}
Total Expenses:      ${formatCurrency(data.totalExpenses)}
Net Savings:         ${formatCurrency(data.netSavings)}
Savings Rate:        ${data.savingsRate}%

========================================
EXPENSES BY CATEGORY
========================================
${data.categoryData.map(cat =>
  `${cat.name.padEnd(20)} ${formatCurrency(cat.value).padStart(20)} (${cat.percentage}%)`
).join('\n')}

========================================
MONTHLY BREAKDOWN
========================================
${data.monthlyData.map(m =>
  `${m.month}
  Income:   ${formatCurrency(m.income)}
  Expenses: ${formatCurrency(m.expenses)}
  Savings:  ${formatCurrency(m.savings)}
`).join('\n')}

Generated by KenyaPesa Tracker
    `

    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kenyapesa-report-${period}-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
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
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-kenya-green" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Report Period</h3>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="select text-base py-3 flex-1 sm:flex-none sm:w-64"
            >
              {PERIODS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <button
              onClick={handleExport}
              className="btn btn-secondary flex items-center whitespace-nowrap"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-green-100 font-medium">Total Income</p>
            <ArrowUpRight className="h-6 w-6 text-green-200" />
          </div>
          <p className="text-4xl font-bold">{formatCurrency(data.totalIncome)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-red-100 font-medium">Total Expenses</p>
            <ArrowDownRight className="h-6 w-6 text-red-200" />
          </div>
          <p className="text-4xl font-bold">{formatCurrency(data.totalExpenses)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-blue-100 font-medium">Net Savings</p>
            <PiggyBank className="h-6 w-6 text-blue-200" />
          </div>
          <p className="text-4xl font-bold">{formatCurrency(data.netSavings)}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-purple-100 font-medium">Savings Rate</p>
            <TrendingUp className="h-6 w-6 text-purple-200" />
          </div>
          <p className="text-4xl font-bold">{data.savingsRate}%</p>
        </div>
      </div>

      {/* Income vs Expenses Chart */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-8">Income vs Expenses Trend</h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="month" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-primary)',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-primary)'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={3} name="Expenses" />
              <Line type="monotone" dataKey="savings" stroke="#3B82F6" strokeWidth={3} name="Savings" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Breakdown Bar Chart */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-8">Monthly Breakdown</h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="month" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-primary)',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-primary)'
                }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10B981" radius={[8, 8, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" radius={[8, 8, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-8">Expenses by Category</h3>
          {data.categoryData.length > 0 ? (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-12 text-center">
              <p className="text-gray-500 dark:text-gray-500">No expense data available</p>
            </div>
          )}
        </div>

        {/* Category List */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-8">Category Breakdown</h3>
          {data.categoryData.length > 0 ? (
            <div className="space-y-4">
              {data.categoryData.map((cat, index) => (
                <div key={cat.name} className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{cat.name}</span>
                  </div>
                  <div className="text-right ml-6">
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{formatCurrency(cat.value)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">{cat.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-12 text-center">
              <p className="text-gray-500 dark:text-gray-500">No categories to display</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="card bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-start space-x-6">
          <div className="bg-purple-100 dark:bg-purple-900/50 rounded-xl p-4 flex-shrink-0">
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">AI Financial Insights</h3>
            <div className="space-y-5 text-gray-700 dark:text-gray-300">
              {data.savingsRate > 20 ? (
                <div className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800">
                  <span className="text-green-600 font-bold text-xl mr-4 flex-shrink-0">✓</span>
                  <p className="leading-relaxed">
                    <strong>Excellent!</strong> Your savings rate of {data.savingsRate}% is above the recommended 20%. Keep up the great work!
                  </p>
                </div>
              ) : data.savingsRate > 10 ? (
                <div className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-xl border border-yellow-200 dark:border-yellow-800">
                  <span className="text-yellow-600 dark:text-yellow-500 font-bold text-xl mr-4 flex-shrink-0">!</span>
                  <p className="leading-relaxed">
                    Your savings rate is {data.savingsRate}%. Consider increasing it to 20% for better financial security.
                  </p>
                </div>
              ) : (
                <div className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800">
                  <span className="text-red-600 font-bold text-xl mr-4 flex-shrink-0">⚠</span>
                  <p className="leading-relaxed">
                    Your savings rate of {data.savingsRate}% is below recommended levels. Try to reduce expenses and increase savings.
                  </p>
                </div>
              )}

              {data.categoryData.length > 0 && (
                <div className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800">
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-xl mr-4 flex-shrink-0">💡</span>
                  <p className="leading-relaxed">
                    Your highest expense is <strong>{data.categoryData[0].name}</strong> at {formatCurrency(data.categoryData[0].value)} ({data.categoryData[0].percentage}%).
                    Consider if this can be optimized.
                  </p>
                </div>
              )}

              {data.netSavings < 0 && (
                <div className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800">
                  <span className="text-red-600 font-bold text-xl mr-4 flex-shrink-0">⚠</span>
                  <p className="leading-relaxed">
                    You're spending more than you earn. Review your expenses and look for areas to cut back immediately.
                  </p>
                </div>
              )}

              <div className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-xl border border-purple-200 dark:border-purple-800">
                <span className="text-purple-600 dark:text-purple-400 font-bold text-xl mr-4 flex-shrink-0">📈</span>
                <p className="leading-relaxed">
                  Based on your current pattern, you could save an additional {formatCurrency(data.totalExpenses * 0.1)} per month by reducing expenses by just 10%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
