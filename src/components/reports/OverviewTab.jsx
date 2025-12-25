import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { TrendingUp, TrendingDown, DollarSign, PieChart, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts'

const COLORS = ['#006B3F', '#BB0000', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']

export default function OverviewTab({ dateRange }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0,
    transactionCount: 0,
    avgDailyExpense: 0,
    topCategory: '',
    topCategoryAmount: 0
  })
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const [monthlyData, setMonthlyData] = useState([])

  useEffect(() => {
    if (user && dateRange.from && dateRange.to) {
      fetchOverviewData()
    }
  }, [user, dateRange])

  const fetchOverviewData = async () => {
    try {
      setLoading(true)

      // Fetch income and expenses for the period
      const [incomeData, expenseData] = await Promise.all([
        supabase
          .from('income')
          .select('amount, date')
          .eq('user_id', user.id)
          .gte('date', dateRange.from)
          .lte('date', dateRange.to),
        supabase
          .from('expenses')
          .select('amount, category, date')
          .eq('user_id', user.id)
          .gte('date', dateRange.from)
          .lte('date', dateRange.to)
      ])

      const totalIncome = incomeData.data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const totalExpenses = expenseData.data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const netSavings = totalIncome - totalExpenses
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0

      // Calculate days in period
      const fromDate = new Date(dateRange.from)
      const toDate = new Date(dateRange.to)
      const daysInPeriod = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1

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

      setCategoryBreakdown(categoryArray)

      const topCategory = categoryArray[0] || { name: 'None', value: 0 }

      setOverview({
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        transactionCount: (incomeData.data?.length || 0) + (expenseData.data?.length || 0),
        avgDailyExpense: totalExpenses / daysInPeriod,
        topCategory: topCategory.name,
        topCategoryAmount: topCategory.value
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching overview data:', error)
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-sm text-green-700 font-medium mb-1">Total Income</p>
          <p className="text-3xl font-bold text-green-800">{formatCurrency(overview.totalIncome)}</p>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-sm text-red-700 font-medium mb-1">Total Expenses</p>
          <p className="text-3xl font-bold text-red-800">{formatCurrency(overview.totalExpenses)}</p>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-sm text-blue-700 font-medium mb-1">Net Savings</p>
          <p className="text-3xl font-bold text-blue-800">{formatCurrency(overview.netSavings)}</p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <PieChart className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-sm text-purple-700 font-medium mb-1">Savings Rate</p>
          <p className="text-3xl font-bold text-purple-800">{overview.savingsRate}%</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{overview.transactionCount}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Avg Daily Expense</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.avgDailyExpense)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Top Category</p>
            <p className="text-lg font-bold text-gray-900 truncate">{overview.topCategory}</p>
            <p className="text-xs text-gray-600">{formatCurrency(overview.topCategoryAmount)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Categories</p>
            <p className="text-2xl font-bold text-gray-900">{categoryBreakdown.length}</p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Spending by Category</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={categoryBreakdown.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                  >
                    {categoryBreakdown.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </RePieChart>
              </ResponsiveContainer>
            </div>

            {/* Category List */}
            <div className="space-y-3">
              {categoryBreakdown.slice(0, 10).map((cat, index) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(cat.value)}</p>
                    <p className="text-xs text-gray-500">{cat.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Period Summary */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-100 rounded-lg p-3">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 mb-2">Period Summary</h4>
            <p className="text-sm text-gray-700 mb-3">
              Report for {new Date(dateRange.from).toLocaleDateString('en-KE', { month: 'long', day: 'numeric', year: 'numeric' })}
              {' to '}
              {new Date(dateRange.to).toLocaleDateString('en-KE', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Income-to-Expense Ratio</p>
                <p className="text-lg font-bold text-gray-900">
                  {overview.totalExpenses > 0 ? (overview.totalIncome / overview.totalExpenses).toFixed(2) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Financial Health</p>
                <p className="text-lg font-bold text-gray-900">
                  {overview.savingsRate >= 20 ? 'Excellent ⭐' : overview.savingsRate >= 10 ? 'Good 👍' : 'Fair ⚠️'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="text-lg font-bold text-gray-900">
                  {overview.netSavings >= 0 ? 'Surplus ✓' : 'Deficit ✗'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
