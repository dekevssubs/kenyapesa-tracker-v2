import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../utils/calculations'
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertCircle,
  TrendingUp as TrendIcon
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

const COLORS = ['#006B3F', '#BB0000', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899']

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0
  })
  const [categoryData, setCategoryData] = useState([])
  const [monthlyComparison, setMonthlyComparison] = useState([])
  const [topExpenses, setTopExpenses] = useState([])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const currentDate = new Date()
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      // Previous month for comparison
      const prevFirstDay = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      const prevLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)

      // Current month data
      const { data: incomeData } = await supabase
        .from('income')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0])

      const { data: expenseData } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0])

      // Previous month data
      const { data: prevIncomeData } = await supabase
        .from('income')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', prevFirstDay.toISOString().split('T')[0])
        .lte('date', prevLastDay.toISOString().split('T')[0])

      const { data: prevExpenseData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', prevFirstDay.toISOString().split('T')[0])
        .lte('date', prevLastDay.toISOString().split('T')[0])

      // Calculate current month stats
      const totalIncome = incomeData?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const totalExpenses = expenseData?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const netSavings = totalIncome - totalExpenses
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome * 100) : 0

      // Calculate previous month stats
      const prevIncome = prevIncomeData?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
      const prevExpenses = prevExpenseData?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0

      setStats({
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate: savingsRate.toFixed(1),
        incomeChange: prevIncome > 0 ? (((totalIncome - prevIncome) / prevIncome) * 100).toFixed(1) : 0,
        expenseChange: prevExpenses > 0 ? (((totalExpenses - prevExpenses) / prevExpenses) * 100).toFixed(1) : 0
      })

      // Category breakdown
      const categoryMap = {}
      expenseData?.forEach(item => {
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
      setMonthlyComparison([
        { 
          month: new Date(prevFirstDay).toLocaleDateString('en-KE', { month: 'short' }),
          income: prevIncome,
          expenses: prevExpenses
        },
        { 
          month: new Date(firstDay).toLocaleDateString('en-KE', { month: 'short' }),
          income: totalIncome,
          expenses: totalExpenses
        }
      ])

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
          <h2 className="text-3xl font-bold text-gray-900">Financial Overview</h2>
          <p className="text-gray-600 mt-2 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            {new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link to="/reports" className="btn btn-primary">
          View Detailed Reports
        </Link>
      </div>

      {/* Key Metrics - Enhanced Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Income Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-xl p-3">
              <TrendingUp className="h-7 w-7" />
            </div>
            {stats.incomeChange !== 0 && (
              <div className={`flex items-center text-sm font-semibold px-3 py-1 rounded-full ${
                stats.incomeChange > 0 ? 'bg-green-400 bg-opacity-30' : 'bg-red-400 bg-opacity-30'
              }`}>
                {stats.incomeChange > 0 ? '↑' : '↓'} {Math.abs(stats.incomeChange)}%
              </div>
            )}
          </div>
          <p className="text-green-100 text-sm font-medium mb-2">Total Income</p>
          <p className="text-4xl font-bold mb-1">{formatCurrency(stats.totalIncome)}</p>
          <p className="text-green-100 text-xs">vs last month</p>
        </div>

        {/* Expenses Card */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-xl p-3">
              <TrendingDown className="h-7 w-7" />
            </div>
            {stats.expenseChange !== 0 && (
              <div className={`flex items-center text-sm font-semibold px-3 py-1 rounded-full ${
                stats.expenseChange < 0 ? 'bg-green-400 bg-opacity-30' : 'bg-red-400 bg-opacity-30'
              }`}>
                {stats.expenseChange > 0 ? '↑' : '↓'} {Math.abs(stats.expenseChange)}%
              </div>
            )}
          </div>
          <p className="text-red-100 text-sm font-medium mb-2">Total Expenses</p>
          <p className="text-4xl font-bold mb-1">{formatCurrency(stats.totalExpenses)}</p>
          <p className="text-red-100 text-xs">vs last month</p>
        </div>

        {/* Savings Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-xl p-3">
              <PiggyBank className="h-7 w-7" />
            </div>
          </div>
          <p className="text-blue-100 text-sm font-medium mb-2">Net Savings</p>
          <p className={`text-4xl font-bold mb-1 ${stats.netSavings >= 0 ? 'text-white' : 'text-red-200'}`}>
            {formatCurrency(stats.netSavings)}
          </p>
          <p className="text-blue-100 text-xs">this month</p>
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
          <p className="text-purple-100 text-xs">
            {stats.savingsRate >= 20 ? 'Excellent!' : stats.savingsRate >= 10 ? 'Good' : 'Needs improvement'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Comparison */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Monthly Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10B981" radius={[8, 8, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" radius={[8, 8, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending by Category - IMPROVED */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Spending by Category</h3>
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
                    <Tooltip formatter={(value) => formatCurrency(value)} />
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
                      <span className="text-sm font-medium text-gray-700 truncate">{cat.name}</span>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(cat.value)}</p>
                      <p className="text-xs text-gray-500">{cat.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No expense data available</p>
              <Link to="/expenses" className="text-kenya-green hover:underline text-sm mt-2 inline-block">
                Add your first expense
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Top Expenses List */}
      {topExpenses.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Top Spending Categories</h3>
            <Link to="/expenses" className="text-sm text-kenya-green hover:text-green-800 font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-4">
            {topExpenses.map((expense, index) => (
              <div key={expense.name} className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{expense.name}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-kenya-green h-2 rounded-full transition-all duration-500"
                        style={{ width: `${expense.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(expense.value)}</p>
                    <p className="text-sm text-gray-500">{expense.percentage}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights & Alerts */}
      {stats.savingsRate < 10 && (
        <div className="card bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200">
          <div className="flex items-start space-x-4">
            <div className="bg-orange-100 rounded-lg p-3">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 mb-2">⚠️ Low Savings Rate Alert</h4>
              <p className="text-gray-700 mb-4">
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