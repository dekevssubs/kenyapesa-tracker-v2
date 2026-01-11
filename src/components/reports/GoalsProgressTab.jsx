import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { Target, Calendar, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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
          {entry.name}: {entry.dataKey === 'progress' ? `${entry.value}%` : formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

export default function GoalsProgressTab() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState([])
  const [summary, setSummary] = useState({
    totalGoals: 0,
    completedGoals: 0,
    inProgressGoals: 0,
    totalTarget: 0,
    totalCurrent: 0,
    avgProgress: 0
  })

  useEffect(() => {
    if (user) {
      fetchGoalsData()
    }
  }, [user])

  /**
   * Calculate goal balance from goal_allocations table
   * This is the canonical way to get a goal's current amount
   */
  const calculateGoalBalance = async (goalId) => {
    try {
      const { data: allocations, error } = await supabase
        .from('goal_allocations')
        .select('amount')
        .eq('goal_id', goalId)

      if (error) throw error

      if (!allocations || allocations.length === 0) {
        return 0
      }

      return allocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0)
    } catch (error) {
      console.error('Error calculating goal balance:', error)
      return 0
    }
  }

  const fetchGoalsData = async () => {
    try {
      setLoading(true)

      // Fetch all goals with linked accounts
      const { data: goalsData, error } = await supabase
        .from('goals')
        .select(`
          *,
          linked_account:accounts!goals_linked_account_id_fkey (
            id,
            name,
            current_balance
          )
        `)
        .eq('user_id', user.id)
        .order('deadline', { ascending: true, nullsFirst: false })

      if (error) throw error

      // Calculate actual goal progress from goal_allocations
      // CANONICAL GOAL ALLOCATION ARCHITECTURE:
      // - Goals are virtual accounts tracking allocations within real accounts
      // - current_amount = SUM(goal_allocations.amount), NOT account.current_balance
      // - One account can have multiple goals, each with its own allocation
      const goalsWithProgress = await Promise.all(
        (goalsData || []).map(async (goal) => {
          // Get the actual allocated amount for this specific goal
          const allocatedAmount = await calculateGoalBalance(goal.id)

          const targetAmount = parseFloat(goal.target_amount) || 0
          const progress = targetAmount > 0 ? (allocatedAmount / targetAmount) * 100 : 0
          const remaining = Math.max(0, targetAmount - allocatedAmount)

          // Calculate days remaining
          const today = new Date()
          const targetDate = goal.deadline ? new Date(goal.deadline) : null
          const daysRemaining = targetDate
            ? Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24))
            : null

          // Determine status based on goal.status field first, then calculate display status
          let displayStatus = 'in-progress'
          if (goal.status === 'completed' || progress >= 100) {
            displayStatus = 'completed'
          } else if (goal.status === 'abandoned') {
            displayStatus = 'abandoned'
          } else if (goal.status === 'paused') {
            displayStatus = 'paused'
          } else if (daysRemaining !== null && daysRemaining < 0) {
            displayStatus = 'overdue'
          } else if (daysRemaining !== null && daysRemaining <= 30 && progress < 80) {
            displayStatus = 'at-risk'
          }

          return {
            ...goal,
            currentAmount: allocatedAmount,
            linkedAccountName: goal.linked_account?.name,
            linkedAccountBalance: goal.linked_account?.current_balance,
            progress: Math.min(100, progress),
            remaining,
            daysRemaining,
            status: displayStatus
          }
        })
      )

      setGoals(goalsWithProgress)

      // Calculate summary
      const totalGoals = goalsWithProgress.length
      const completedGoals = goalsWithProgress.filter(g => g.status === 'completed').length
      const inProgressGoals = goalsWithProgress.filter(g => g.status === 'in-progress').length
      const totalTarget = goalsWithProgress.reduce((sum, g) => sum + (parseFloat(g.target_amount) || 0), 0)
      const totalCurrent = goalsWithProgress.reduce((sum, g) => sum + g.currentAmount, 0)
      const avgProgress = totalGoals > 0
        ? goalsWithProgress.reduce((sum, g) => sum + g.progress, 0) / totalGoals
        : 0

      setSummary({
        totalGoals,
        completedGoals,
        inProgressGoals,
        totalTarget,
        totalCurrent,
        avgProgress
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching goals data:', error)
      setLoading(false)
    }
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-500 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          label: 'Completed'
        }
      case 'overdue':
        return {
          icon: AlertTriangle,
          color: 'text-red-500 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          label: 'Overdue'
        }
      case 'at-risk':
        return {
          icon: Clock,
          color: 'text-amber-500 dark:text-amber-400',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
          label: 'At Risk'
        }
      case 'paused':
        return {
          icon: Clock,
          color: 'text-yellow-500 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          label: 'Paused'
        }
      case 'abandoned':
        return {
          icon: AlertTriangle,
          color: 'text-gray-500 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          label: 'Abandoned'
        }
      default:
        return {
          icon: TrendingUp,
          color: 'text-blue-500 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'In Progress'
        }
    }
  }

  const getProgressColor = (progress) => {
    if (progress >= 100) return '#10B981'
    if (progress >= 75) return '#3B82F6'
    if (progress >= 50) return '#F59E0B'
    return '#EF4444'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p>No goals found</p>
            <p className="text-sm mt-2">Create savings goals to track your progress here</p>
          </div>
        </div>
      </div>
    )
  }

  // Chart data - top 10 goals by target amount
  const chartData = goals
    .slice(0, 10)
    .map(goal => ({
      name: goal.name?.length > 15 ? goal.name.slice(0, 15) + '...' : goal.name,
      target: parseFloat(goal.target_amount) || 0,
      current: goal.currentAmount,
      progress: goal.progress
    }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-center mb-2">
            <Target className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Goals</p>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{summary.totalGoals}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            {summary.completedGoals} completed, {summary.inProgressGoals} in progress
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">Total Target</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatCurrency(summary.totalTarget)}</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">across all goals</p>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">Total Saved</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(summary.totalCurrent)}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            {summary.totalTarget > 0 ? ((summary.totalCurrent / summary.totalTarget) * 100).toFixed(1) : 0}% of target
          </p>
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">Avg Progress</p>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{summary.avgProgress.toFixed(1)}%</p>
          <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2 mt-2">
            <div
              className="h-2 rounded-full bg-amber-500"
              style={{ width: `${Math.min(summary.avgProgress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Goals Progress Chart */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Goals Overview</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
            <XAxis type="number" stroke={isDark ? '#9CA3AF' : '#6B7280'} />
            <YAxis type="category" dataKey="name" width={120} stroke={isDark ? '#9CA3AF' : '#6B7280'} />
            <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={false} />
            <Bar dataKey="target" fill="#94A3B8" name="Target" />
            <Bar dataKey="current" name="Current">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getProgressColor(entry.progress)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Goals List */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">All Goals</h3>
        <div className="space-y-4">
          {goals.map(goal => {
            const statusConfig = getStatusConfig(goal.status)
            const StatusIcon = statusConfig.icon

            return (
              <div
                key={goal.id}
                className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{goal.name}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </span>
                    </div>
                    {goal.linkedAccountName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Linked to: {goal.linkedAccountName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(goal.currentAmount)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      of {formatCurrency(parseFloat(goal.target_amount) || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${goal.progress}%`,
                          backgroundColor: getProgressColor(goal.progress)
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-14 text-right">
                    {goal.progress.toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-4">
                    {goal.deadline && (
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(goal.deadline).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                    {goal.daysRemaining !== null && (
                      <span className={goal.daysRemaining < 0 ? 'text-red-500 dark:text-red-400' : ''}>
                        {goal.daysRemaining < 0
                          ? `${Math.abs(goal.daysRemaining)} days overdue`
                          : goal.daysRemaining === 0
                          ? 'Due today'
                          : `${goal.daysRemaining} days left`}
                      </span>
                    )}
                  </div>
                  <span className={goal.remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}>
                    {goal.remaining > 0 ? `${formatCurrency(goal.remaining)} remaining` : 'Goal reached!'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* At-Risk Goals Alert */}
      {goals.filter(g => g.status === 'at-risk' || g.status === 'overdue').length > 0 && (
        <div className="card bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-900/30 dark:to-amber-900/30 border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100">Goals Needing Attention</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                The following goals are at risk or overdue:
              </p>
              <ul className="mt-2 space-y-1">
                {goals.filter(g => g.status === 'at-risk' || g.status === 'overdue').map(goal => (
                  <li key={goal.id} className="text-sm text-red-700 dark:text-red-300">
                    <span className="font-medium">{goal.name}</span>: {goal.progress.toFixed(0)}% complete
                    {goal.daysRemaining !== null && (
                      <span>
                        {goal.daysRemaining < 0
                          ? ` (${Math.abs(goal.daysRemaining)} days overdue)`
                          : ` (${goal.daysRemaining} days left)`}
                      </span>
                    )}
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
