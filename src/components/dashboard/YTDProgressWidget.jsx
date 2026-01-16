import { useState, useEffect } from 'react'
import { Calendar, TrendingUp, Target, AlertCircle } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'
import { supabase } from '../../utils/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function YTDProgressWidget({ comparisons, stats }) {
  const { user } = useAuth()
  const [topCategories, setTopCategories] = useState([])
  const [overBudgetCategories, setOverBudgetCategories] = useState([])

  useEffect(() => {
    if (user) {
      fetchSpendingInsights()
    }
  }, [user])

  const fetchSpendingInsights = async () => {
    try {
      const ytdStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      // Get top spending categories
      const { data: expenses } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('user_id', user.id)
        .gte('date', ytdStart)
        .lte('date', today)
        .is('reversed_at', null)

      if (expenses) {
        const categoryTotals = {}
        expenses.forEach(e => {
          const cat = e.category || 'Uncategorized'
          categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(e.amount)
        })

        const sorted = Object.entries(categoryTotals)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 3)

        setTopCategories(sorted)
      }

      // Get over-budget categories for current month
      const currentMonthStr = new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
      const { data: budgets } = await supabase
        .from('budgets')
        .select(`
          category_id,
          monthly_limit,
          expense_categories!category_id (
            slug,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('month', currentMonthStr)

      if (budgets && expenses) {
        const currentMonth = new Date().getMonth()
        const monthStart = new Date(new Date().getFullYear(), currentMonth, 1).toISOString().split('T')[0]

        const monthlyExpenses = {}
        expenses.forEach(e => {
          if (e.date >= monthStart) {
            const cat = e.category || 'Uncategorized'
            monthlyExpenses[cat] = (monthlyExpenses[cat] || 0) + parseFloat(e.amount)
          }
        })

        const overBudget = budgets
          .filter(b => {
            const categorySlug = b.expense_categories?.slug
            return categorySlug && monthlyExpenses[categorySlug] > parseFloat(b.monthly_limit)
          })
          .map(b => {
            const categorySlug = b.expense_categories?.slug
            const categoryName = b.expense_categories?.name || categorySlug
            return {
              name: categoryName,
              budget: parseFloat(b.monthly_limit),
              spent: monthlyExpenses[categorySlug],
              over: monthlyExpenses[categorySlug] - parseFloat(b.monthly_limit)
            }
          })
          .sort((a, b) => b.over - a.over)
          .slice(0, 2)

        setOverBudgetCategories(overBudget)
      }
    } catch (error) {
      console.error('Error fetching spending insights:', error)
    }
  }

  if (!comparisons?.ytd) {
    return null
  }

  const { ytd } = comparisons
  const yearProgress = (ytd.daysElapsed / ytd.daysInYear) * 100

  // Calculate if on track
  const incomeOnTrack = stats.totalIncome > 0 && ytd.income >= (ytd.projectedAnnualIncome * yearProgress / 100)
  const expensesOnTrack = ytd.expenses <= (ytd.projectedAnnualExpenses * yearProgress / 100)
  const savingsOnTrack = ytd.savings >= ((ytd.projectedAnnualIncome - ytd.projectedAnnualExpenses) * yearProgress / 100)

  const currentYear = new Date().getFullYear()

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
            Year-to-Date Progress {currentYear}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {ytd.daysElapsed} of {ytd.daysInYear} days completed ({yearProgress.toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Year Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Year Progress</span>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{yearProgress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 relative"
            style={{ width: `${Math.min(yearProgress, 100)}%` }}
          >
            <div className="absolute right-0 top-0 h-3 w-1 bg-blue-700 rounded-r-full"></div>
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Jan 1</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Dec 31</span>
        </div>
      </div>

      {/* YTD Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Income Progress */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Income</p>
            </div>
            {incomeOnTrack ? (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex items-center text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
              </div>
            )}
          </div>

          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {formatCurrency(ytd.income)}
          </p>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Projected Annual:</span>
              <span className="font-semibold">{formatCurrency(ytd.projectedAnnualIncome)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  incomeOnTrack ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min((ytd.income / ytd.projectedAnnualIncome) * 100, 100)}%`
                }}
              ></div>
            </div>
            <p className={`text-xs mt-1 font-medium ${
              incomeOnTrack ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {incomeOnTrack ? 'On track' : 'Behind pace'}
            </p>
          </div>
        </div>

        {/* Expenses Progress */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Expenses</p>
            </div>
            {expensesOnTrack ? (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex items-center text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
              </div>
            )}
          </div>

          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {formatCurrency(ytd.expenses)}
          </p>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Projected Annual:</span>
              <span className="font-semibold">{formatCurrency(ytd.projectedAnnualExpenses)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  expensesOnTrack ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min((ytd.expenses / ytd.projectedAnnualExpenses) * 100, 100)}%`
                }}
              ></div>
            </div>
            <p className={`text-xs mt-1 font-medium ${
              expensesOnTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {expensesOnTrack ? 'Under budget' : 'Over budget'}
            </p>
          </div>
        </div>

        {/* Savings Progress */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Savings</p>
            </div>
            {savingsOnTrack ? (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <Target className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex items-center text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
              </div>
            )}
          </div>

          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {formatCurrency(ytd.savings)}
          </p>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Projected Annual:</span>
              <span className="font-semibold">
                {formatCurrency(ytd.projectedAnnualIncome - ytd.projectedAnnualExpenses)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  savingsOnTrack ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(
                    (ytd.savings / (ytd.projectedAnnualIncome - ytd.projectedAnnualExpenses)) * 100,
                    100
                  )}%`
                }}
              ></div>
            </div>
            <p className={`text-xs mt-1 font-medium ${
              savingsOnTrack ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {savingsOnTrack ? 'On track' : 'Behind goal'}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Monthly Averages (YTD)</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Income</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">
              {formatCurrency(ytd.income / (ytd.daysElapsed / 30))}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">per month</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Expenses</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-400">
              {formatCurrency(ytd.expenses / (ytd.daysElapsed / 30))}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">per month</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Savings</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(ytd.savings / (ytd.daysElapsed / 30))}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">per month</p>
          </div>
        </div>
      </div>

      {/* Action Items */}
      {(!incomeOnTrack || !expensesOnTrack || !savingsOnTrack) && (
        <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-2" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">Action Required</p>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                {!incomeOnTrack && (
                  <li>• Increase income to stay on track for projected annual target</li>
                )}
                {!expensesOnTrack && (
                  <li className="space-y-1">
                    <span>• Reduce expenses to stay within projected annual budget</span>
                    {overBudgetCategories.length > 0 && (
                      <div className="ml-4 mt-1 p-2 bg-amber-100 dark:bg-amber-900/40 rounded text-xs">
                        <p className="font-medium mb-1">Over-budget categories this month:</p>
                        {overBudgetCategories.map((cat, idx) => (
                          <p key={idx} className="text-amber-700 dark:text-amber-300">
                            → {cat.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {formatCurrency(cat.over)} over budget
                          </p>
                        ))}
                      </div>
                    )}
                    {topCategories.length > 0 && overBudgetCategories.length === 0 && (
                      <div className="ml-4 mt-1 p-2 bg-amber-100 dark:bg-amber-900/40 rounded text-xs">
                        <p className="font-medium mb-1">Top spending categories to review:</p>
                        {topCategories.map((cat, idx) => (
                          <p key={idx} className="text-amber-700 dark:text-amber-300">
                            → {cat.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {formatCurrency(cat.total)} YTD
                          </p>
                        ))}
                      </div>
                    )}
                  </li>
                )}
                {!savingsOnTrack && (
                  <li>• Increase savings rate to meet annual savings goal</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {incomeOnTrack && expensesOnTrack && savingsOnTrack && (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start">
            <Target className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2" />
            <div>
              <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">Great Progress!</p>
              <p className="text-sm text-green-800 dark:text-green-200">
                You're on track to meet all your financial goals for {currentYear}. Keep up the excellent work!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
