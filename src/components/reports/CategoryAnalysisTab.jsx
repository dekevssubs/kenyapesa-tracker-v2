import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { PieChart as PieChartIcon, TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const COLORS = ['#006B3F', '#BB0000', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F97316', '#06B6D4', '#84CC16']

export default function CategoryAnalysisTab({ dateRange }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [categoryData, setCategoryData] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryTrends, setCategoryTrends] = useState([])
  const [insights, setInsights] = useState({
    topCategory: null,
    fastestGrowing: null,
    mostConsistent: null,
    needsAttention: null
  })

  useEffect(() => {
    if (user && dateRange.from && dateRange.to) {
      fetchCategoryAnalysis()
    }
  }, [user, dateRange])

  useEffect(() => {
    if (selectedCategory && user && dateRange.from && dateRange.to) {
      fetchCategoryTrends()
    }
  }, [selectedCategory, user, dateRange])

  const fetchCategoryAnalysis = async () => {
    try {
      setLoading(true)

      // Fetch all expenses in the date range
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('amount, category, date, description')
        .eq('user_id', user.id)
        .gte('date', dateRange.from)
        .lte('date', dateRange.to)
        .order('date', { ascending: true })

      if (!expenseData || expenseData.length === 0) {
        setLoading(false)
        return
      }

      // Group by category
      const categoryMap = {}
      const categoryTransactions = {}

      expenseData.forEach(item => {
        const category = item.category || 'Uncategorized'
        if (!categoryMap[category]) {
          categoryMap[category] = 0
          categoryTransactions[category] = []
        }
        categoryMap[category] += parseFloat(item.amount)
        categoryTransactions[category].push(item)
      })

      const totalExpenses = Object.values(categoryMap).reduce((sum, val) => sum + val, 0)

      // Create category array with statistics
      const categoryArray = Object.entries(categoryMap)
        .map(([name, amount]) => {
          const transactions = categoryTransactions[name]
          const transactionCount = transactions.length
          const avgTransaction = amount / transactionCount
          const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0

          return {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            amount,
            percentage: parseFloat(percentage.toFixed(1)),
            transactionCount,
            avgTransaction,
            transactions
          }
        })
        .sort((a, b) => b.amount - a.amount)

      setCategoryData(categoryArray)

      // Calculate insights
      const topCategory = categoryArray[0]

      // For fastest growing, we need to compare with previous period
      const periodDays = Math.ceil((new Date(dateRange.to) - new Date(dateRange.from)) / (1000 * 60 * 60 * 24))
      const prevFrom = new Date(dateRange.from)
      prevFrom.setDate(prevFrom.getDate() - periodDays)
      const prevTo = new Date(dateRange.to)
      prevTo.setDate(prevTo.getDate() - periodDays)

      const { data: prevExpenseData } = await supabase
        .from('expenses')
        .select('amount, category')
        .eq('user_id', user.id)
        .gte('date', prevFrom.toISOString().split('T')[0])
        .lte('date', prevTo.toISOString().split('T')[0])

      const prevCategoryMap = {}
      prevExpenseData?.forEach(item => {
        const category = item.category || 'Uncategorized'
        prevCategoryMap[category] = (prevCategoryMap[category] || 0) + parseFloat(item.amount)
      })

      // Calculate growth rates
      const growthRates = categoryArray.map(cat => {
        const prevAmount = prevCategoryMap[cat.name.toLowerCase()] || 0
        const growth = prevAmount > 0 ? ((cat.amount - prevAmount) / prevAmount) * 100 : 0
        return { ...cat, growth }
      })

      const fastestGrowing = growthRates
        .filter(cat => cat.growth > 0)
        .sort((a, b) => b.growth - a.growth)[0]

      const needsAttention = growthRates
        .filter(cat => cat.growth > 20 && cat.amount > totalExpenses * 0.05) // Growing fast and significant
        .sort((a, b) => b.growth - a.growth)[0]

      // Most consistent: lowest variance in transaction amounts
      const mostConsistent = categoryArray
        .filter(cat => cat.transactionCount >= 3)
        .map(cat => {
          const amounts = cat.transactions.map(t => parseFloat(t.amount))
          const mean = cat.avgTransaction
          const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length
          const stdDev = Math.sqrt(variance)
          const coefficientOfVariation = mean > 0 ? (stdDev / mean) : 0
          return { ...cat, coefficientOfVariation }
        })
        .sort((a, b) => a.coefficientOfVariation - b.coefficientOfVariation)[0]

      setInsights({
        topCategory,
        fastestGrowing,
        mostConsistent,
        needsAttention
      })

      // Auto-select top category
      if (categoryArray.length > 0) {
        setSelectedCategory(categoryArray[0].name)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching category analysis:', error)
      setLoading(false)
    }
  }

  const fetchCategoryTrends = async () => {
    try {
      // Get monthly breakdown for selected category
      const startDate = new Date(dateRange.from)
      const endDate = new Date(dateRange.to)
      const months = []

      let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      while (currentDate <= endDate) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

        months.push({
          monthName: currentDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
          monthShort: currentDate.toLocaleString('default', { month: 'short' }),
          startDate: monthStart.toISOString().split('T')[0],
          endDate: monthEnd.toISOString().split('T')[0]
        })

        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      const trendData = await Promise.all(
        months.map(async (month) => {
          const { data } = await supabase
            .from('expenses')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category', selectedCategory.toLowerCase())
            .gte('date', month.startDate)
            .lte('date', month.endDate)

          const amount = data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
          const transactionCount = data?.length || 0

          return {
            month: month.monthShort,
            monthFull: month.monthName,
            amount,
            transactionCount,
            avgTransaction: transactionCount > 0 ? amount / transactionCount : 0
          }
        })
      )

      setCategoryTrends(trendData)
    } catch (error) {
      console.error('Error fetching category trends:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  if (categoryData.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <PieChartIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No expense data available for the selected period</p>
          </div>
        </div>
      </div>
    )
  }

  const totalExpenses = categoryData.reduce((sum, cat) => sum + cat.amount, 0)

  return (
    <div className="space-y-6">
      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Top Category */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center mb-2">
            <Target className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-sm text-blue-700 font-medium">Top Category</p>
          </div>
          {insights.topCategory && (
            <>
              <p className="text-xl font-bold text-blue-900 mb-1">{insights.topCategory.name}</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(insights.topCategory.amount)}</p>
              <p className="text-xs text-blue-600 mt-2">{insights.topCategory.percentage}% of total spending</p>
            </>
          )}
        </div>

        {/* Fastest Growing */}
        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center mb-2">
            <TrendingUp className="h-5 w-5 text-orange-600 mr-2" />
            <p className="text-sm text-orange-700 font-medium">Fastest Growing</p>
          </div>
          {insights.fastestGrowing ? (
            <>
              <p className="text-xl font-bold text-orange-900 mb-1">{insights.fastestGrowing.name}</p>
              <p className="text-2xl font-bold text-orange-900">+{insights.fastestGrowing.growth.toFixed(1)}%</p>
              <p className="text-xs text-orange-600 mt-2">vs previous period</p>
            </>
          ) : (
            <p className="text-sm text-gray-600">No growth data</p>
          )}
        </div>

        {/* Most Consistent */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center mb-2">
            <BarChart3 className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-sm text-green-700 font-medium">Most Consistent</p>
          </div>
          {insights.mostConsistent ? (
            <>
              <p className="text-xl font-bold text-green-900 mb-1">{insights.mostConsistent.name}</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(insights.mostConsistent.avgTransaction)}</p>
              <p className="text-xs text-green-600 mt-2">avg per transaction</p>
            </>
          ) : (
            <p className="text-sm text-gray-600">Not enough data</p>
          )}
        </div>

        {/* Needs Attention */}
        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center mb-2">
            <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-700 font-medium">Needs Attention</p>
          </div>
          {insights.needsAttention ? (
            <>
              <p className="text-xl font-bold text-red-900 mb-1">{insights.needsAttention.name}</p>
              <p className="text-2xl font-bold text-red-900">+{insights.needsAttention.growth.toFixed(1)}%</p>
              <p className="text-xs text-red-600 mt-2">growing rapidly</p>
            </>
          ) : (
            <p className="text-sm text-gray-600">All categories stable</p>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Category Distribution</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={categoryData.slice(0, 10)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="amount"
              >
                {categoryData.slice(0, 10).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category List */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">All Categories</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {categoryData.map((cat, index) => (
              <div
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedCategory === cat.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-semibold text-gray-900">{cat.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(cat.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{cat.transactionCount} transactions</span>
                  <span>{cat.percentage}% of total</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Details */}
      {selectedCategory && categoryTrends.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {selectedCategory} - Monthly Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'amount') return formatCurrency(value)
                  if (name === 'avgTransaction') return formatCurrency(value)
                  return value
                }}
              />
              <Legend />
              <Bar dataKey="amount" fill="#3B82F6" name="Total Spent" />
            </BarChart>
          </ResponsiveContainer>

          {/* Transaction Details */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Transaction Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              {categoryTrends.map((trend, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">{trend.monthFull}</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(trend.amount)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {trend.transactionCount} transactions
                  </p>
                  {trend.avgTransaction > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Avg: {formatCurrency(trend.avgTransaction)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="card bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Overall Category Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Categories</p>
            <p className="text-2xl font-bold text-gray-900">{categoryData.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">
              {categoryData.reduce((sum, cat) => sum + cat.transactionCount, 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Avg per Category</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalExpenses / categoryData.length)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
