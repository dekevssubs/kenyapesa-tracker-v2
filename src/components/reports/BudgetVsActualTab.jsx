import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { ReportsService } from '../../utils/reportsService'
import { Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

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

export default function BudgetVsActualTab({ dateRange }) {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [budgetData, setBudgetData] = useState([])
  const [summary, setSummary] = useState({
    totalBudget: 0,
    totalSpent: 0,
    variance: 0,
    onTrack: 0,
    overBudget: 0,
    underBudget: 0
  })

  useEffect(() => {
    if (user && dateRange.from && dateRange.to) {
      fetchBudgetVsActual()
    }
  }, [user, dateRange])

  const fetchBudgetVsActual = async () => {
    try {
      setLoading(true)

      // Fetch budgets for the period with category data via join
      // Note: budgets.month column uses 'YYYY-MM-01' format (first day of month)
      const startMonth = dateRange.from.slice(0, 7) + '-01'
      const endMonth = dateRange.to.slice(0, 7) + '-01'
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          *,
          expense_categories!category_id (
            id,
            slug,
            name
          )
        `)
        .eq('user_id', user.id)
        .gte('month', startMonth)
        .lte('month', endMonth)

      if (budgetError) throw budgetError

      // Use ReportsService for ledger queries (excludes reversed transactions)
      const reportsService = new ReportsService(supabase, user.id)
      const [expenseResult, feesResult] = await Promise.all([
        reportsService.getExpenseTransactions(dateRange.from, dateRange.to),
        reportsService.getTransactionFees(dateRange.from, dateRange.to)
      ])

      // Combine expenses and fees
      const allExpenses = [...expenseResult.transactions, ...feesResult.transactions]

      // Group actual spending by category
      const actualByCategory = {}
      allExpenses.forEach(item => {
        const category = (item.category || 'uncategorized').toLowerCase()
        actualByCategory[category] = (actualByCategory[category] || 0) + parseFloat(item.amount)
      })

      // Group budgets by category and aggregate
      // Use expense_categories.slug from the join, or fallback to category_id
      const budgetByCategory = {}
      budgets?.forEach(budget => {
        const category = (budget.expense_categories?.slug || budget.category || 'uncategorized').toLowerCase()
        if (!budgetByCategory[category]) {
          budgetByCategory[category] = { amount: 0, months: 0 }
        }
        // Use monthly_limit (not amount) per budgets table schema
        budgetByCategory[category].amount += parseFloat(budget.monthly_limit || budget.amount || 0)
        budgetByCategory[category].months++
      })

      // Combine budget and actual data
      const allCategories = new Set([
        ...Object.keys(budgetByCategory),
        ...Object.keys(actualByCategory)
      ])

      const comparisonData = Array.from(allCategories).map(category => {
        const budgeted = budgetByCategory[category]?.amount || 0
        const actual = actualByCategory[category] || 0
        const variance = budgeted - actual
        const variancePercent = budgeted > 0 ? ((actual - budgeted) / budgeted) * 100 : 0

        let status = 'on-track'
        if (budgeted > 0) {
          if (actual > budgeted) status = 'over'
          else if (actual < budgeted * 0.8) status = 'under'
        }

        return {
          category: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
          budgeted,
          actual,
          variance,
          variancePercent: parseFloat(variancePercent.toFixed(1)),
          status
        }
      }).filter(item => item.budgeted > 0 || item.actual > 0)
        .sort((a, b) => b.actual - a.actual)

      setBudgetData(comparisonData)

      // Calculate summary
      const totalBudget = comparisonData.reduce((sum, item) => sum + item.budgeted, 0)
      const totalSpent = comparisonData.reduce((sum, item) => sum + item.actual, 0)
      const onTrack = comparisonData.filter(item => item.status === 'on-track').length
      const overBudget = comparisonData.filter(item => item.status === 'over').length
      const underBudget = comparisonData.filter(item => item.status === 'under').length

      setSummary({
        totalBudget,
        totalSpent,
        variance: totalBudget - totalSpent,
        onTrack,
        overBudget,
        underBudget
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching budget vs actual:', error)
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'over':
        return <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
      case 'under':
        return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
      default:
        return <Target className="h-5 w-5 text-blue-500 dark:text-blue-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'over':
        return '#EF4444'
      case 'under':
        return '#10B981'
      default:
        return '#3B82F6'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  if (budgetData.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p>No budget data available for the selected period</p>
            <p className="text-sm mt-2">Create budgets in the Budget page to see comparisons here</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Total Budget</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(summary.totalBudget)}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">{budgetData.length} categories</p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatCurrency(summary.totalSpent)}</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
            {summary.totalBudget > 0 ? ((summary.totalSpent / summary.totalBudget) * 100).toFixed(1) : 0}% of budget
          </p>
        </div>

        <div className={`card bg-gradient-to-br ${
          summary.variance >= 0
            ? 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800'
            : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-800'
        }`}>
          <p className={`text-sm font-medium mb-1 ${
            summary.variance >= 0
              ? 'text-green-700 dark:text-green-300'
              : 'text-red-700 dark:text-red-300'
          }`}>Variance</p>
          <p className={`text-2xl font-bold ${
            summary.variance >= 0
              ? 'text-green-900 dark:text-green-100'
              : 'text-red-900 dark:text-red-100'
          }`}>
            {summary.variance >= 0 ? '+' : ''}{formatCurrency(summary.variance)}
          </p>
          <p className={`text-xs mt-2 ${
            summary.variance >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {summary.variance >= 0 ? 'Under budget' : 'Over budget'}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">Budget Status</p>
          <div className="flex items-center space-x-4 mt-2">
            <div className="text-center">
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{summary.underBudget}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Under</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{summary.onTrack}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">On Track</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{summary.overBudget}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Over</p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget vs Actual Chart */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Budget vs Actual by Category</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={budgetData.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
            <XAxis type="number" stroke={isDark ? '#9CA3AF' : '#6B7280'} />
            <YAxis type="category" dataKey="category" width={120} stroke={isDark ? '#9CA3AF' : '#6B7280'} />
            <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={false} />
            <Legend wrapperStyle={{ color: isDark ? '#D1D5DB' : '#374151' }} />
            <Bar dataKey="budgeted" fill="#94A3B8" name="Budget" />
            <Bar dataKey="actual" name="Actual">
              {budgetData.slice(0, 10).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Category Table */}
      <div className="card overflow-x-auto">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Category Breakdown</h3>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Budgeted</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actual</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Variance</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">% Used</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {budgetData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(item.budgeted)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(item.actual)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className={item.variance >= 0
                    ? 'text-green-600 dark:text-green-400 font-semibold'
                    : 'text-red-600 dark:text-red-400 font-semibold'
                  }>
                    {item.variance >= 0 ? '+' : ''}{formatCurrency(item.variance)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.actual > item.budgeted ? 'bg-red-500' :
                          item.actual > item.budgeted * 0.8 ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((item.actual / item.budgeted) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 w-12 text-right">
                      {item.budgeted > 0 ? ((item.actual / item.budgeted) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getStatusIcon(item.status)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-800 font-semibold">
            <tr>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">Total</td>
              <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">{formatCurrency(summary.totalBudget)}</td>
              <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">{formatCurrency(summary.totalSpent)}</td>
              <td className="px-6 py-4 text-sm text-right">
                <span className={summary.variance >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                }>
                  {summary.variance >= 0 ? '+' : ''}{formatCurrency(summary.variance)}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">
                {summary.totalBudget > 0 ? ((summary.totalSpent / summary.totalBudget) * 100).toFixed(0) : 0}%
              </td>
              <td className="px-6 py-4"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Alerts Section */}
      {budgetData.some(item => item.status === 'over') && (
        <div className="card bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100">Over Budget Categories</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                The following categories have exceeded their budget:
              </p>
              <ul className="mt-2 space-y-1">
                {budgetData.filter(item => item.status === 'over').map((item, index) => (
                  <li key={index} className="text-sm text-red-700 dark:text-red-300">
                    <span className="font-medium">{item.category}</span>: {formatCurrency(Math.abs(item.variance))} over
                    ({item.variancePercent > 0 ? '+' : ''}{item.variancePercent}%)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
