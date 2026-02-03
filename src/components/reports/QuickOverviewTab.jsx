import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { ReportsService } from '../../utils/reportsService'
import { Calendar, Download, PiggyBank, ArrowUpRight, ArrowDownRight, TrendingUp, CheckCircle, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

// Custom Tooltip component for dark mode support
const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className={`px-3 py-2 rounded-lg shadow-lg border ${
      isDark
        ? 'bg-gray-800 border-gray-700 text-gray-100'
        : 'bg-white border-gray-200 text-gray-900'
    }`}>
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }} className="text-sm">
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

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
  const { isDark } = useTheme()
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

      {/* Summary Cards - Enhanced with trend indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/90 font-medium text-sm">Total Income</p>
            <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight">{formatCurrency(data.totalIncome)}</p>
          <div className="flex items-center mt-2 text-sm">
            <TrendingUp className="h-3.5 w-3.5 mr-1" />
            <span className="text-white/80">
              {data.monthlyData.length > 0 ? `${data.monthlyData.length} months` : 'This period'}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/90 font-medium text-sm">Total Expenses</p>
            <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight">{formatCurrency(data.totalExpenses)}</p>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-white/80">
              {data.categoryData.length} categories
            </span>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${data.netSavings >= 0 ? 'from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700' : 'from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700'} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer group`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/90 font-medium text-sm">Net Savings</p>
            <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight">{formatCurrency(data.netSavings)}</p>
          <div className="flex items-center mt-2 text-sm">
            {data.netSavings >= 0 ? (
              <>
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                <span className="text-white/80">Positive balance</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                <span className="text-white/80">Deficit</span>
              </>
            )}
          </div>
        </div>

        <div className={`bg-gradient-to-br ${parseFloat(data.savingsRate) >= 20 ? 'from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700' : parseFloat(data.savingsRate) >= 10 ? 'from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700' : 'from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-700'} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer group`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/90 font-medium text-sm">Savings Rate</p>
            <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight">{data.savingsRate}%</p>
          <div className="flex items-center mt-2 text-sm">
            {parseFloat(data.savingsRate) >= 20 ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                <span className="text-white/80">Excellent</span>
              </>
            ) : parseFloat(data.savingsRate) >= 10 ? (
              <span className="text-white/80">Target: 20%</span>
            ) : (
              <span className="text-white/80">Below target</span>
            )}
          </div>
        </div>
      </div>

      {/* Income vs Expenses Chart */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-8">Income vs Expenses Trend</h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis dataKey="month" stroke={isDark ? '#9CA3AF' : '#6B7280'} />
              <YAxis stroke={isDark ? '#9CA3AF' : '#6B7280'} />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Legend wrapperStyle={{ color: isDark ? '#D1D5DB' : '#374151' }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis dataKey="month" stroke={isDark ? '#9CA3AF' : '#6B7280'} />
              <YAxis stroke={isDark ? '#9CA3AF' : '#6B7280'} />
              <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={false} />
              <Legend wrapperStyle={{ color: isDark ? '#D1D5DB' : '#374151' }} />
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
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percentage }) => {
                      const RADIAN = Math.PI / 180
                      const radius = outerRadius * 1.1
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
                          {`${name}: ${percentage}%`}
                        </text>
                      )
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
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

      {/* AI Insights - Dark theme consistent */}
      <div className="card bg-gray-50 dark:bg-gray-800 border-l-4 border-l-purple-500">
        <div className="flex items-start space-x-5">
          <div className="bg-purple-100 dark:bg-purple-900/50 rounded-xl p-3 flex-shrink-0">
            <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">Financial Insights</h3>
            <div className="space-y-4">
              {data.savingsRate > 20 ? (
                <div className="flex items-start p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-l-4 border-l-green-500">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm leading-relaxed text-green-800 dark:text-green-300">
                    <strong>Excellent!</strong> Your savings rate of {data.savingsRate}% is above the recommended 20%. Keep up the great work!
                  </p>
                </div>
              ) : data.savingsRate > 10 ? (
                <div className="flex items-start p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-l-4 border-l-amber-500">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
                    Your savings rate is {data.savingsRate}%. Consider increasing it to 20% for better financial security.
                  </p>
                </div>
              ) : (
                <div className="flex items-start p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-l-4 border-l-red-500">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm leading-relaxed text-red-800 dark:text-red-300">
                    Your savings rate of {data.savingsRate}% is below recommended levels. Try to reduce expenses and increase savings.
                  </p>
                </div>
              )}

              {data.categoryData.length > 0 && (
                <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-l-4 border-l-blue-500">
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-300">
                    Your highest expense is <strong>{data.categoryData[0].name}</strong> at {formatCurrency(data.categoryData[0].value)} ({data.categoryData[0].percentage}%).
                    Consider if this can be optimized.
                  </p>
                </div>
              )}

              {data.netSavings < 0 && (
                <div className="flex items-start p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-l-4 border-l-red-500">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm leading-relaxed text-red-800 dark:text-red-300">
                    You're spending more than you earn. Review your expenses and look for areas to cut back immediately.
                  </p>
                </div>
              )}

              <div className="flex items-start p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-l-4 border-l-purple-500">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm leading-relaxed text-purple-800 dark:text-purple-300">
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
