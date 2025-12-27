import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../utils/calculations'
import { useBudgetAlerts } from '../hooks/useBudgetAlerts'
import { useRecurringExpenses } from '../hooks/useRecurringExpenses'
import PendingExpensesReview from '../components/expenses/PendingExpensesReview'
import PeriodSelector from '../components/dashboard/PeriodSelector'
import TwelveMonthTrendWidget from '../components/dashboard/TwelveMonthTrendWidget'
import YTDProgressWidget from '../components/dashboard/YTDProgressWidget'
import FinancialHealthScoreWidget from '../components/dashboard/FinancialHealthScoreWidget'
import {
  PERIOD_TYPES,
  getPeriodRange,
  getComparisonPeriod,
  getYoYPeriod,
  calculatePercentageChange,
  getYTDRange,
  projectAnnualValue,
  formatComparison
} from '../utils/periodUtils'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertCircle,
  TrendingUp as TrendIcon,
  Trophy,
  Medal,
  Award,
  BarChart3
} from 'lucide-react'
import { getCategoryIcon } from '../utils/iconMappings'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

const COLORS = ['#006B3F', '#BB0000', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_TYPES.THIS_MONTH)
  const [customRange, setCustomRange] = useState({ from: '', to: '' })
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0
  })
  const [comparisons, setComparisons] = useState({
    mom: {}, // Month-over-month
    yoy: {}, // Year-over-year
    ytd: {}  // Year-to-date
  })
  const [categoryData, setCategoryData] = useState([])
  const [monthlyComparison, setMonthlyComparison] = useState([])
  const [topExpenses, setTopExpenses] = useState([])

  // Budget alerts and recurring expenses hooks
  useBudgetAlerts()
  const { pendingCount, refreshPendingCount } = useRecurringExpenses()

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user, selectedPeriod, customRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Get current period range
      const currentPeriod = getPeriodRange(selectedPeriod, customRange)

      // Get comparison period (MoM)
      const comparisonPeriod = getComparisonPeriod(selectedPeriod)

      // Get year-over-year period
      const yoyPeriod = getYoYPeriod(currentPeriod.startDate, currentPeriod.endDate)

      // Get year-to-date
      const ytdPeriod = getYTDRange()

      // Fetch current period data
      const [incomeData, expenseData] = await Promise.all([
        supabase
          .from('income')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', currentPeriod.startDate)
          .lte('date', currentPeriod.endDate),
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', currentPeriod.startDate)
          .lte('date', currentPeriod.endDate)
      ])

      // Fetch comparison period data (if available)
      let comparisonData = { income: [], expenses: [] }
      if (comparisonPeriod) {
        const [compIncomeData, compExpenseData] = await Promise.all([
          supabase
            .from('income')
            .select('amount')
            .eq('user_id', user.id)
            .gte('date', comparisonPeriod.startDate)
            .lte('date', comparisonPeriod.endDate),
          supabase
            .from('expenses')
            .select('amount')
            .eq('user_id', user.id)
            .gte('date', comparisonPeriod.startDate)
            .lte('date', comparisonPeriod.endDate)
        ])
        comparisonData = {
          income: compIncomeData.data || [],
          expenses: compExpenseData.data || []
        }
      }

      // Fetch YoY data
      const [yoyIncomeData, yoyExpenseData] = await Promise.all([
        supabase
          .from('income')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', yoyPeriod.startDate)
          .lte('date', yoyPeriod.endDate),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', yoyPeriod.startDate)
          .lte('date', yoyPeriod.endDate)
      ])

      // Fetch YTD data
      const [ytdIncomeData, ytdExpenseData] = await Promise.all([
        supabase
          .from('income')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', ytdPeriod.startDate)
          .lte('date', ytdPeriod.endDate),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', ytdPeriod.startDate)
          .lte('date', ytdPeriod.endDate)
      ])

      // Calculate current period stats
      const totalIncome = incomeData.data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const totalExpenses = expenseData.data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const netSavings = totalIncome - totalExpenses
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome * 100) : 0

      // Calculate comparison period stats
      const compIncome = comparisonData.income?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const compExpenses = comparisonData.expenses?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const compSavings = compIncome - compExpenses

      // Calculate YoY stats
      const yoyIncome = yoyIncomeData.data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const yoyExpenses = yoyExpenseData.data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const yoySavings = yoyIncome - yoyExpenses

      // Calculate YTD stats
      const ytdIncome = ytdIncomeData.data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const ytdExpenses = ytdExpenseData.data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const ytdSavings = ytdIncome - ytdExpenses

      setStats({
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate: savingsRate.toFixed(1),
        periodLabel: currentPeriod.label
      })

      setComparisons({
        mom: {
          incomeChange: calculatePercentageChange(totalIncome, compIncome),
          expenseChange: calculatePercentageChange(totalExpenses, compExpenses),
          savingsChange: calculatePercentageChange(netSavings, compSavings),
          label: comparisonPeriod?.label || ''
        },
        yoy: {
          incomeChange: calculatePercentageChange(totalIncome, yoyIncome),
          expenseChange: calculatePercentageChange(totalExpenses, yoyExpenses),
          savingsChange: calculatePercentageChange(netSavings, yoySavings),
          label: yoyPeriod.label
        },
        ytd: {
          income: ytdIncome,
          expenses: ytdExpenses,
          savings: ytdSavings,
          projectedAnnualIncome: projectAnnualValue(ytdIncome, ytdPeriod.daysElapsed, ytdPeriod.daysInYear),
          projectedAnnualExpenses: projectAnnualValue(ytdExpenses, ytdPeriod.daysElapsed, ytdPeriod.daysInYear),
          daysElapsed: ytdPeriod.daysElapsed,
          daysInYear: ytdPeriod.daysInYear
        }
      })

      // Category breakdown
      const categoryMap = {}
      expenseData.data?.forEach(item => {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = 0
        }
        categoryMap[item.category] += parseFloat(item.amount)
      })

      const categoryArray = Object.entries(categoryMap)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          percentage: totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.value - a.value)

      setCategoryData(categoryArray.slice(0, 6))
      setTopExpenses(categoryArray.slice(0, 5))

      // Monthly comparison
      if (comparisonPeriod) {
        setMonthlyComparison([
          {
            month: comparisonPeriod.label,
            income: compIncome,
            expenses: compExpenses
          },
          {
            month: currentPeriod.label,
            income: totalIncome,
            expenses: totalExpenses
          }
        ])
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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

  return (
    <div className="space-y-8">
      {/* Header with Period */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Financial Overview</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            {stats.periodLabel || 'Loading...'}
          </p>
        </div>
        <Link to="/reports" className="btn btn-primary">
          View Detailed Reports
        </Link>
      </div>

      {/* Period Selector */}
      <PeriodSelector
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
      />

      {/* Pending Expenses Review */}
      <PendingExpensesReview onUpdate={refreshPendingCount} />

      {/* Key Metrics - Enhanced Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Income Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-xl p-3">
              <TrendingUp className="h-7 w-7" />
            </div>
            {comparisons.mom.incomeChange !== 0 && (
              <div className={`flex items-center text-sm font-semibold px-3 py-1 rounded-full ${
                comparisons.mom.incomeChange > 0 ? 'bg-green-400 bg-opacity-30' : 'bg-red-400 bg-opacity-30'
              }`}>
                {comparisons.mom.incomeChange > 0 ? '↑' : '↓'} {Math.abs(comparisons.mom.incomeChange).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-green-100 text-sm font-medium mb-2">Total Income</p>
          <p className="text-4xl font-bold mb-1">{formatCurrency(stats.totalIncome)}</p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-100">vs {comparisons.mom.label}:</span>
              <span className="font-semibold">{comparisons.mom.incomeChange > 0 ? '+' : ''}{comparisons.mom.incomeChange.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-100">vs {comparisons.yoy.label}:</span>
              <span className="font-semibold">{comparisons.yoy.incomeChange > 0 ? '+' : ''}{comparisons.yoy.incomeChange.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-100">YTD Total:</span>
              <span className="font-semibold">{formatCurrency(comparisons.ytd.income)}</span>
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-xl p-3">
              <TrendingDown className="h-7 w-7" />
            </div>
            {comparisons.mom.expenseChange !== 0 && (
              <div className={`flex items-center text-sm font-semibold px-3 py-1 rounded-full ${
                comparisons.mom.expenseChange < 0 ? 'bg-green-400 bg-opacity-30' : 'bg-red-400 bg-opacity-30'
              }`}>
                {comparisons.mom.expenseChange > 0 ? '↑' : '↓'} {Math.abs(comparisons.mom.expenseChange).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-red-100 text-sm font-medium mb-2">Total Expenses</p>
          <p className="text-4xl font-bold mb-1">{formatCurrency(stats.totalExpenses)}</p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-100">vs {comparisons.mom.label}:</span>
              <span className="font-semibold">{comparisons.mom.expenseChange > 0 ? '+' : ''}{comparisons.mom.expenseChange.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-100">vs {comparisons.yoy.label}:</span>
              <span className="font-semibold">{comparisons.yoy.expenseChange > 0 ? '+' : ''}{comparisons.yoy.expenseChange.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-100">YTD Total:</span>
              <span className="font-semibold">{formatCurrency(comparisons.ytd.expenses)}</span>
            </div>
          </div>
        </div>

        {/* Savings Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-xl p-3">
              <PiggyBank className="h-7 w-7" />
            </div>
            {comparisons.mom.savingsChange !== 0 && (
              <div className={`flex items-center text-sm font-semibold px-3 py-1 rounded-full ${
                comparisons.mom.savingsChange > 0 ? 'bg-green-400 bg-opacity-30' : 'bg-red-400 bg-opacity-30'
              }`}>
                {comparisons.mom.savingsChange > 0 ? '↑' : '↓'} {Math.abs(comparisons.mom.savingsChange).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-blue-100 text-sm font-medium mb-2">Net Savings</p>
          <p className={`text-4xl font-bold mb-1 ${stats.netSavings >= 0 ? 'text-white' : 'text-red-200'}`}>
            {formatCurrency(stats.netSavings)}
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-100">vs {comparisons.mom.label}:</span>
              <span className="font-semibold">{comparisons.mom.savingsChange > 0 ? '+' : ''}{comparisons.mom.savingsChange.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-100">vs {comparisons.yoy.label}:</span>
              <span className="font-semibold">{comparisons.yoy.savingsChange > 0 ? '+' : ''}{comparisons.yoy.savingsChange.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-100">YTD Savings:</span>
              <span className="font-semibold">{formatCurrency(comparisons.ytd.savings)}</span>
            </div>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-xl p-3">
              <TrendIcon className="h-7 w-7" />
            </div>
          </div>
          <p className="text-purple-100 text-sm font-medium mb-2">Savings Rate</p>
          <p className="text-4xl font-bold mb-1">{stats.savingsRate}%</p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-100">Rating:</span>
              <span className="font-semibold">
                {stats.savingsRate >= 30 ? 'Excellent ⭐⭐⭐⭐⭐' :
                 stats.savingsRate >= 20 ? 'Very Good ⭐⭐⭐⭐' :
                 stats.savingsRate >= 10 ? 'Good ⭐⭐⭐' :
                 stats.savingsRate >= 5 ? 'Fair ⭐⭐' :
                 'Needs Work ⭐'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-100">Projected Annual:</span>
              <span className="font-semibold">{formatCurrency(comparisons.ytd.projectedAnnualIncome - comparisons.ytd.projectedAnnualExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Comparison */}
        <div className="card bg-white dark:bg-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Monthly Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyComparison}>
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

        {/* Spending by Category - IMPROVED */}
        <div className="card bg-white dark:bg-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Spending by Category</h3>
          {categoryData.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Pie Chart - Smaller */}
              <div className="col-span-2 lg:col-span-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
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

              {/* Category List - Better Spacing */}
              <div className="col-span-2 lg:col-span-1 space-y-3">
                {categoryData.slice(0, 5).map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{cat.name}</span>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(cat.value)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{cat.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-500">No expense data available</p>
              <Link to="/expenses" className="text-kenya-green hover:underline text-sm mt-2 inline-block">
                Add your first expense
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Top Expenses List */}
      {topExpenses.length > 0 && (
        <div className="card bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Top Spending Categories</h3>
            <Link to="/expenses" className="text-sm text-kenya-green hover:text-green-800 dark:hover:text-green-600 font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-4">
            {topExpenses.map((expense, index) => {
              const CategoryIcon = getCategoryIcon(expense.name.toLowerCase())
              const RankIcon = index === 0 ? Trophy : index === 1 ? Medal : index === 2 ? Award : BarChart3
              const rankColor = index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-blue-500'

              return (
                <div key={expense.name} className="flex items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="relative">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                        <CategoryIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                      </div>
                      <div className={`absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow`}>
                        <RankIcon className={`h-4 w-4 ${rankColor}`} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{expense.name}</p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-kenya-green h-2 rounded-full transition-all duration-500"
                          style={{ width: `${expense.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(expense.value)}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{expense.percentage}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 12-Month Trend Chart */}
      <TwelveMonthTrendWidget />

      {/* YTD Progress */}
      <YTDProgressWidget comparisons={comparisons} stats={stats} />

      {/* Financial Health Score */}
      <FinancialHealthScoreWidget stats={stats} comparisons={comparisons} />

      {/* Insights & Alerts */}
      {stats.savingsRate < 10 && (
        <div className="card bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 border-2 border-orange-200 dark:border-orange-800">
          <div className="flex items-start space-x-4">
            <div className="bg-orange-100 dark:bg-orange-900/50 rounded-lg p-3">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">⚠️ Low Savings Rate Alert</h4>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Your savings rate is {stats.savingsRate}%, which is below the recommended 20%.
                Consider reviewing your expenses to increase savings.
              </p>
              <div className="flex space-x-4">
                <Link to="/budget" className="btn btn-primary text-sm">
                  Set Budget Goals
                </Link>
                <Link to="/expenses" className="btn btn-secondary text-sm">
                  Review Expenses
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}