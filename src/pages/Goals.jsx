import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { GoalService } from '../utils/goalService'
import { formatCurrency } from '../utils/calculations'
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  PauseCircle,
  PlayCircle,
  Ban,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'

export default function Goals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showAbandonModal, setShowAbandonModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [goalContributions, setGoalContributions] = useState([])

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    deadline: '',
    description: '',
    category: 'savings',
    linked_account_id: ''
  })

  const [contributeData, setContributeData] = useState({
    amount: '',
    from_account_id: '',
    notes: ''
  })

  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    to_account_id: '',
    reason: ''
  })

  const [abandonData, setAbandonData] = useState({
    reason: '',
    refund_to_account_id: ''
  })

  const [filterStatus, setFilterStatus] = useState('active')

  useEffect(() => {
    if (user) {
      fetchGoals()
      fetchAccounts()
    }
  }, [user, filterStatus])

  const fetchGoals = async () => {
    try {
      setLoading(true)
      const goalService = new GoalService(supabase, user.id)
      const result = await goalService.getAllGoals({ status: filterStatus === 'all' ? null : filterStatus })

      if (result.success) {
        setGoals(result.goals)
        setSummary(result.summary)
      } else {
        console.error('Error fetching goals:', result.error)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching goals:', error)
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const goalService = new GoalService(supabase, user.id)
      const result = await goalService.getAccountsForGoals()

      if (result.success) {
        setAccounts(result.accounts)
        // Auto-select primary or first account
        const primaryAccount = result.accounts.find(a => a.is_primary) || result.accounts[0]
        if (primaryAccount && !formData.linked_account_id) {
          setFormData(prev => ({ ...prev, linked_account_id: primaryAccount.id }))
        }
        if (primaryAccount && !contributeData.from_account_id) {
          setContributeData(prev => ({ ...prev, from_account_id: primaryAccount.id }))
        }
        if (primaryAccount && !withdrawData.to_account_id) {
          setWithdrawData(prev => ({ ...prev, to_account_id: primaryAccount.id }))
        }
        if (primaryAccount && !abandonData.refund_to_account_id) {
          setAbandonData(prev => ({ ...prev, refund_to_account_id: primaryAccount.id }))
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const handleCreateGoal = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.target_amount || !formData.linked_account_id) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const goalService = new GoalService(supabase, user.id)
      const result = await goalService.createGoal(formData)

      if (result.success) {
        alert('Goal created successfully!')
        setShowAddModal(false)
        setFormData({
          name: '',
          target_amount: '',
          deadline: '',
          description: '',
          category: 'savings',
          linked_account_id: accounts.find(a => a.is_primary)?.id || accounts[0]?.id || ''
        })
        fetchGoals()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating goal:', error)
      alert('Failed to create goal')
    }
  }

  const handleContribute = async (e) => {
    e.preventDefault()

    if (!contributeData.amount || !contributeData.from_account_id) {
      alert('Please enter amount and select source account')
      return
    }

    try {
      const goalService = new GoalService(supabase, user.id)
      const result = await goalService.makeContribution(
        selectedGoal.id,
        parseFloat(contributeData.amount),
        contributeData.from_account_id,
        new Date().toISOString().split('T')[0],
        contributeData.notes
      )

      if (result.success) {
        alert(`Contribution successful! New balance: ${formatCurrency(result.newBalance)}`)
        setShowContributeModal(false)
        setContributeData({ amount: '', from_account_id: contributeData.from_account_id, notes: '' })
        fetchGoals()
        fetchAccounts()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error making contribution:', error)
      alert('Failed to make contribution')
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()

    if (!withdrawData.amount || !withdrawData.to_account_id) {
      alert('Please enter amount and select destination account')
      return
    }

    if (!confirm(`Withdraw ${formatCurrency(withdrawData.amount)} from this goal?`)) return

    try {
      const goalService = new GoalService(supabase, user.id)
      const result = await goalService.makeWithdrawal(
        selectedGoal.id,
        parseFloat(withdrawData.amount),
        withdrawData.to_account_id,
        withdrawData.reason
      )

      if (result.success) {
        alert(`Withdrawal successful! New balance: ${formatCurrency(result.newBalance)}`)
        setShowWithdrawModal(false)
        setWithdrawData({ amount: '', to_account_id: withdrawData.to_account_id, reason: '' })
        fetchGoals()
        fetchAccounts()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error making withdrawal:', error)
      alert('Failed to make withdrawal')
    }
  }

  const handleAbandon = async (e) => {
    e.preventDefault()

    if (!confirm('Are you sure you want to abandon this goal? This action cannot be undone.')) return

    try {
      const goalService = new GoalService(supabase, user.id)
      const result = await goalService.abandonGoal(
        selectedGoal.id,
        abandonData.reason,
        abandonData.refund_to_account_id
      )

      if (result.success) {
        const message = result.refundedAmount > 0
          ? `Goal abandoned. ${formatCurrency(result.refundedAmount)} has been refunded to your account.`
          : 'Goal abandoned successfully.'
        alert(message)
        setShowAbandonModal(false)
        setAbandonData({ reason: '', refund_to_account_id: abandonData.refund_to_account_id })
        fetchGoals()
        fetchAccounts()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error abandoning goal:', error)
      alert('Failed to abandon goal')
    }
  }

  const handlePauseResume = async (goal) => {
    const goalService = new GoalService(supabase, user.id)
    const result = goal.status === 'paused'
      ? await goalService.resumeGoal(goal.id)
      : await goalService.pauseGoal(goal.id)

    if (result.success) {
      alert(goal.status === 'paused' ? 'Goal resumed!' : 'Goal paused!')
      fetchGoals()
    } else {
      alert(`Error: ${result.error}`)
    }
  }

  const handleDelete = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const goalService = new GoalService(supabase, user.id)
      const result = await goalService.deleteGoal(goalId)

      if (result.success) {
        alert('Goal deleted successfully!')
        fetchGoals()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
      alert('Failed to delete goal')
    }
  }

  const viewGoalDetails = async (goal) => {
    setSelectedGoal(goal)
    setShowDetailsModal(true)

    const goalService = new GoalService(supabase, user.id)
    const result = await goalService.getGoalWithContributions(goal.id)

    if (result.success) {
      setGoalContributions(result.contributions)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'abandoned': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <TrendingUp className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'paused': return <PauseCircle className="h-4 w-4" />
      case 'abandoned': return <Ban className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100)
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
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Financial Goals</h2>
            <p className="text-blue-100 dark:text-blue-200 mt-1">Set aspirational targets - vacations, purchases, big dreams!</p>
          </div>
          <Target className="h-16 w-16 text-white opacity-50" />
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white bg-opacity-20 dark:bg-opacity-10 rounded-lg p-4">
              <p className="text-sm text-blue-100 dark:text-blue-200">Active Goals</p>
              <p className="text-2xl font-bold">{summary.active}</p>
            </div>
            <div className="bg-white bg-opacity-20 dark:bg-opacity-10 rounded-lg p-4">
              <p className="text-sm text-blue-100 dark:text-blue-200">Completed</p>
              <p className="text-2xl font-bold">{summary.completed}</p>
            </div>
            <div className="bg-white bg-opacity-20 dark:bg-opacity-10 rounded-lg p-4">
              <p className="text-sm text-blue-100 dark:text-blue-200">Total Target</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalTargetAmount)}</p>
            </div>
            <div className="bg-white bg-opacity-20 dark:bg-opacity-10 rounded-lg p-4">
              <p className="text-sm text-blue-100 dark:text-blue-200">Total Saved</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalSavedAmount)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium ${filterStatus === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-2 rounded-lg font-medium ${filterStatus === 'active' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg font-medium ${filterStatus === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilterStatus('paused')}
            className={`px-4 py-2 rounded-lg font-medium ${filterStatus === 'paused' ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Paused
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Goal
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <Target className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Goals Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Start setting financial goals to track your savings progress</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
            const progress = calculateProgress(parseFloat(goal.current_amount || 0), parseFloat(goal.target_amount))
            const isOverdue = goal.deadline && new Date(goal.deadline) < new Date() && goal.status === 'active'

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Goal Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{goal.name}</h3>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                        {getStatusIcon(goal.status)}
                        <span className="ml-1 capitalize">{goal.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          progress >= 100 ? 'bg-green-500' :
                          progress >= 75 ? 'bg-blue-500' :
                          progress >= 50 ? 'bg-yellow-500' :
                          'bg-orange-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Amount Info */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(goal.current_amount || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Target</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(goal.target_amount)}</p>
                    </div>
                  </div>

                  {/* Deadline & Account */}
                  <div className="space-y-2 mb-4">
                    {goal.deadline && (
                      <div className="flex items-center text-sm">
                        <Calendar className={`h-4 w-4 mr-2 ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
                        <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                          {isOverdue ? 'Overdue: ' : 'Due: '}
                          {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {goal.linked_account && (
                      <div className="flex items-center text-sm">
                        <Wallet className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">{goal.linked_account.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6 flex flex-wrap gap-2">
                  {goal.status === 'active' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedGoal(goal)
                          setShowContributeModal(true)
                        }}
                        className="flex-1 btn btn-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 border-0"
                      >
                        <ArrowUpCircle className="h-4 w-4 mr-1" />
                        Contribute
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGoal(goal)
                          setShowWithdrawModal(true)
                        }}
                        className="flex-1 btn btn-sm bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 border-0"
                      >
                        <ArrowDownCircle className="h-4 w-4 mr-1" />
                        Withdraw
                      </button>
                    </>
                  )}
                  {(goal.status === 'active' || goal.status === 'paused') && (
                    <button
                      onClick={() => handlePauseResume(goal)}
                      className="btn btn-sm bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 border-0"
                    >
                      {goal.status === 'paused' ? (
                        <><PlayCircle className="h-4 w-4 mr-1" />Resume</>
                      ) : (
                        <><PauseCircle className="h-4 w-4 mr-1" />Pause</>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => viewGoalDetails(goal)}
                    className="btn btn-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-0"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Details
                  </button>
                  {goal.status === 'active' && (
                    <button
                      onClick={() => {
                        setSelectedGoal(goal)
                        setShowAbandonModal(true)
                      }}
                      className="btn btn-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border-0"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Abandon
                    </button>
                  )}
                  {goal.status === 'abandoned' && (
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="btn btn-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border-0"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full my-8 animate-slideIn shadow-2xl">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-xl z-10">
              <div className="flex items-center">
                <Target className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Goal</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-6 pt-4 max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Goal Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Vacation to Mombasa"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Amount (KES) <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="50000"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Savings Account <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <select
                  required
                  value={formData.linked_account_id}
                  onChange={(e) => setFormData({ ...formData, linked_account_id: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Select account...</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.account_type}) - {formatCurrency(account.current_balance)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Account where goal funds will be saved</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input w-full"
                >
                  <option value="savings">Savings</option>
                  <option value="vacation">Vacation</option>
                  <option value="emergency">Emergency Fund</option>
                  <option value="purchase">Major Purchase</option>
                  <option value="education">Education</option>
                  <option value="investment">Investment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Why is this goal important?"
                  rows="3"
                  className="input w-full"
                ></textarea>
              </div>
            </form>

            <div className="flex space-x-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleCreateGoal}
                className="flex-1 btn btn-primary"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full animate-slideIn shadow-2xl">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <ArrowUpCircle className="h-6 w-6 text-green-500 dark:text-green-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Contribute to Goal</h3>
              </div>
              <button
                onClick={() => setShowContributeModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 pt-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{selectedGoal.name}</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Current: {formatCurrency(selectedGoal.current_amount || 0)}</p>
                  <p>Target: {formatCurrency(selectedGoal.target_amount)}</p>
                  <p>Remaining: {formatCurrency(parseFloat(selectedGoal.target_amount) - parseFloat(selectedGoal.current_amount || 0))}</p>
                </div>
              </div>

              <form onSubmit={handleContribute} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount (KES) <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={contributeData.amount}
                    onChange={(e) => setContributeData({ ...contributeData, amount: e.target.value })}
                    placeholder="1000"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    From Account <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={contributeData.from_account_id}
                    onChange={(e) => setContributeData({ ...contributeData, from_account_id: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Select source account...</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(account.current_balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={contributeData.notes}
                    onChange={(e) => setContributeData({ ...contributeData, notes: e.target.value })}
                    placeholder="Any notes about this contribution..."
                    rows="2"
                    className="input w-full"
                  ></textarea>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowContributeModal(false)}
                    className="flex-1 btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn btn-primary bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                  >
                    Contribute
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full animate-slideIn shadow-2xl">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <ArrowDownCircle className="h-6 w-6 text-orange-500 dark:text-orange-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Withdraw from Goal</h3>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 pt-4">
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4 mb-4 border border-orange-200 dark:border-orange-800">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{selectedGoal.name}</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Available to withdraw: {formatCurrency(selectedGoal.current_amount || 0)}</p>
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount (KES) <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    max={selectedGoal.current_amount || 0}
                    step="0.01"
                    value={withdrawData.amount}
                    onChange={(e) => setWithdrawData({ ...withdrawData, amount: e.target.value })}
                    placeholder="500"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    To Account <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={withdrawData.to_account_id}
                    onChange={(e) => setWithdrawData({ ...withdrawData, to_account_id: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Select destination account...</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(account.current_balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    value={withdrawData.reason}
                    onChange={(e) => setWithdrawData({ ...withdrawData, reason: e.target.value })}
                    placeholder="Why are you withdrawing these funds?"
                    rows="2"
                    className="input w-full"
                  ></textarea>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn btn-primary bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
                  >
                    Withdraw
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Abandon Goal Modal */}
      {showAbandonModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full animate-slideIn shadow-2xl">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Ban className="h-6 w-6 text-red-500 dark:text-red-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Abandon Goal</h3>
              </div>
              <button
                onClick={() => setShowAbandonModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 pt-4">
              <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 p-4 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-400 mb-1">Warning</h4>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      Abandoning this goal cannot be undone.
                      {parseFloat(selectedGoal.current_amount || 0) > 0 &&
                        ` ${formatCurrency(selectedGoal.current_amount)} will be refunded to the selected account.`
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{selectedGoal.name}</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Current saved: {formatCurrency(selectedGoal.current_amount || 0)}</p>
                  <p>Target: {formatCurrency(selectedGoal.target_amount)}</p>
                </div>
              </div>

              <form onSubmit={handleAbandon} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason for Abandoning <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    value={abandonData.reason}
                    onChange={(e) => setAbandonData({ ...abandonData, reason: e.target.value })}
                    placeholder="Why are you abandoning this goal?"
                    rows="3"
                    className="input w-full"
                  ></textarea>
                </div>

                {parseFloat(selectedGoal.current_amount || 0) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Refund To Account <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <select
                      required
                      value={abandonData.refund_to_account_id}
                      onChange={(e) => setAbandonData({ ...abandonData, refund_to_account_id: e.target.value })}
                      className="input w-full"
                    >
                      <option value="">Select account...</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} - {formatCurrency(account.current_balance)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAbandonModal(false)}
                    className="flex-1 btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn btn-primary bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    Abandon Goal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Goal Details Modal */}
      {showDetailsModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full my-8 animate-slideIn shadow-2xl">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-xl z-10">
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Goal Details</h3>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 pt-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Goal Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-800">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{selectedGoal.name}</h4>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedGoal.status)} mb-4`}>
                  {getStatusIcon(selectedGoal.status)}
                  <span className="ml-1 capitalize">{selectedGoal.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Current Amount</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(selectedGoal.current_amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Target Amount</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(selectedGoal.target_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Progress</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {calculateProgress(parseFloat(selectedGoal.current_amount || 0), parseFloat(selectedGoal.target_amount)).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(parseFloat(selectedGoal.target_amount) - parseFloat(selectedGoal.current_amount || 0))}
                    </p>
                  </div>
                </div>

                {selectedGoal.deadline && (
                  <div className="mt-4 flex items-center">
                    <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Deadline: {new Date(selectedGoal.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {selectedGoal.linked_account && (
                  <div className="mt-2 flex items-center">
                    <Wallet className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Savings Account: {selectedGoal.linked_account.name}
                    </span>
                  </div>
                )}

                {selectedGoal.description && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">{selectedGoal.description}</p>
                  </div>
                )}
              </div>

              {/* Contribution History */}
              <div>
                <h5 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Contribution History</h5>
                {goalContributions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No contributions yet</p>
                ) : (
                  <div className="space-y-3">
                    {goalContributions.map(contribution => (
                      <div
                        key={contribution.id}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm dark:hover:shadow-gray-900/50 transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {contribution.transaction_type === 'contribution' ? (
                              <ArrowUpCircle className="h-5 w-5 text-green-500 dark:text-green-400 mr-3" />
                            ) : contribution.transaction_type === 'withdrawal' ? (
                              <ArrowDownCircle className="h-5 w-5 text-orange-500 dark:text-orange-400 mr-3" />
                            ) : (
                              <Ban className="h-5 w-5 text-red-500 dark:text-red-400 mr-3" />
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {contribution.transaction_type === 'contribution' ? 'Contribution' :
                                 contribution.transaction_type === 'withdrawal' ? 'Withdrawal' : 'Refund'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(contribution.contribution_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              contribution.transaction_type === 'contribution' ? 'text-green-600 dark:text-green-400' :
                              contribution.transaction_type === 'withdrawal' ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {contribution.transaction_type === 'contribution' ? '+' : '-'}
                              {formatCurrency(contribution.amount)}
                            </p>
                            {contribution.from_account && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {contribution.transaction_type === 'contribution' ? 'From: ' : 'To: '}
                                {contribution.from_account.name}
                              </p>
                            )}
                          </div>
                        </div>
                        {contribution.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 pl-8">{contribution.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-xl">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
