import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'
import { Heart, TrendingUp, Shield, Target, PiggyBank, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'

export default function FinancialHealthScoreWidget({ stats, comparisons }) {
  const { user } = useAuth()
  const [healthMetrics, setHealthMetrics] = useState({
    savingsRateScore: 0,
    emergencyFundScore: 0,
    debtManagementScore: 0,
    budgetAdherenceScore: 0,
    overallScore: 0
  })
  const [emergencyFundMonths, setEmergencyFundMonths] = useState(0)

  useEffect(() => {
    if (user && stats) {
      calculateHealthScore()
    }
  }, [user, stats, comparisons])

  const calculateHealthScore = async () => {
    try {
      // 1. Savings Rate Score (0-30 points)
      const savingsRate = parseFloat(stats.savingsRate) || 0
      let savingsRateScore = 0
      if (savingsRate >= 30) savingsRateScore = 30
      else if (savingsRate >= 20) savingsRateScore = 25
      else if (savingsRate >= 10) savingsRateScore = 15
      else if (savingsRate >= 5) savingsRateScore = 8
      else savingsRateScore = 0

      // 2. Emergency Fund Score (0-25 points)
      // Check cash accounts for emergency fund
      const { data: cashAccounts } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('user_id', user.id)
        .eq('account_type', 'cash')

      const totalCash = cashAccounts?.reduce((sum, acc) => sum + parseFloat(acc.current_balance), 0) || 0
      const monthlyExpenses = stats.totalExpenses || 1
      const monthsOfExpenses = totalCash / monthlyExpenses

      setEmergencyFundMonths(monthsOfExpenses)

      let emergencyFundScore = 0
      if (monthsOfExpenses >= 6) emergencyFundScore = 25
      else if (monthsOfExpenses >= 3) emergencyFundScore = 20
      else if (monthsOfExpenses >= 1) emergencyFundScore = 12
      else if (monthsOfExpenses >= 0.5) emergencyFundScore = 6
      else emergencyFundScore = 0

      // 3. Debt Management Score (0-25 points)
      // Check lending tracker for outstanding loans
      const { data: lendingData } = await supabase
        .from('lending_tracker')
        .select('amount, amount_repaid')
        .eq('user_id', user.id)
        .eq('type', 'borrowed')
        .neq('status', 'complete')

      const totalDebt = lendingData?.reduce((sum, loan) => {
        return sum + (parseFloat(loan.amount) - parseFloat(loan.amount_repaid))
      }, 0) || 0

      const debtToIncomeRatio = stats.totalIncome > 0 ? (totalDebt / stats.totalIncome) : 0

      let debtManagementScore = 0
      if (debtToIncomeRatio === 0) debtManagementScore = 25 // No debt
      else if (debtToIncomeRatio < 0.15) debtManagementScore = 20
      else if (debtToIncomeRatio < 0.30) debtManagementScore = 15
      else if (debtToIncomeRatio < 0.50) debtManagementScore = 8
      else debtManagementScore = 0

      // 4. Budget Adherence Score (0-20 points)
      // Check if expenses are consistent or volatile
      const expenseChange = Math.abs(comparisons?.mom?.expenseChange || 0)

      let budgetAdherenceScore = 0
      if (expenseChange < 5) budgetAdherenceScore = 20 // Very consistent
      else if (expenseChange < 10) budgetAdherenceScore = 15
      else if (expenseChange < 20) budgetAdherenceScore = 10
      else if (expenseChange < 30) budgetAdherenceScore = 5
      else budgetAdherenceScore = 0

      // Calculate overall score (0-100)
      const overallScore = savingsRateScore + emergencyFundScore + debtManagementScore + budgetAdherenceScore

      setHealthMetrics({
        savingsRateScore,
        emergencyFundScore,
        debtManagementScore,
        budgetAdherenceScore,
        overallScore
      })
    } catch (error) {
      console.error('Error calculating health score:', error)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return { bg: 'bg-green-500', text: 'text-green-600', label: 'Excellent', emoji: '🌟' }
    if (score >= 65) return { bg: 'bg-blue-500', text: 'text-blue-600', label: 'Good', emoji: '👍' }
    if (score >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-600', label: 'Fair', emoji: '⚠️' }
    if (score >= 35) return { bg: 'bg-orange-500', text: 'text-orange-600', label: 'Poor', emoji: '📉' }
    return { bg: 'bg-red-500', text: 'text-red-600', label: 'Critical', emoji: '🚨' }
  }

  const scoreColor = getScoreColor(healthMetrics.overallScore)
  const circumference = 2 * Math.PI * 70
  const offset = circumference - (healthMetrics.overallScore / 100) * circumference

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Heart className="h-5 w-5 mr-2 text-red-500" />
            Financial Health Score
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Overall assessment of your financial wellbeing
          </p>
        </div>
      </div>

      {/* Overall Score Circle */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative">
          <svg className="w-48 h-48 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="96"
              cy="96"
              r="70"
              stroke="#E5E7EB"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="96"
              cy="96"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={scoreColor.text}
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-gray-900">
              {healthMetrics.overallScore}
            </span>
            <span className="text-sm text-gray-600 mt-1">out of 100</span>
            <span className="text-2xl mt-2">{scoreColor.emoji}</span>
            <span className={`text-sm font-semibold mt-1 ${scoreColor.text}`}>
              {scoreColor.label}
            </span>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-4 mb-6">
        {/* Savings Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <PiggyBank className="h-4 w-4 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Savings Rate</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {healthMetrics.savingsRateScore}/30
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(healthMetrics.savingsRateScore / 30) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Current: {stats.savingsRate}% (Target: 20%+)
          </p>
        </div>

        {/* Emergency Fund */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Emergency Fund</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {healthMetrics.emergencyFundScore}/25
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(healthMetrics.emergencyFundScore / 25) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Current: {emergencyFundMonths.toFixed(1)} months (Target: 6 months)
          </p>
        </div>

        {/* Debt Management */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-purple-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Debt Management</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {healthMetrics.debtManagementScore}/25
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(healthMetrics.debtManagementScore / 25) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {healthMetrics.debtManagementScore === 25 ? 'No debt - Excellent!' : 'Keep debt under 15% of income'}
          </p>
        </div>

        {/* Budget Adherence */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Target className="h-4 w-4 text-orange-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Budget Adherence</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {healthMetrics.budgetAdherenceScore}/20
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(healthMetrics.budgetAdherenceScore / 20) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Expense volatility: {Math.abs(comparisons?.mom?.expenseChange || 0).toFixed(1)}% (Lower is better)
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Recommendations to Improve Your Score
        </p>
        <ul className="space-y-2 text-sm text-blue-800">
          {healthMetrics.savingsRateScore < 20 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Increase your savings rate to at least 20% by reducing discretionary spending</span>
            </li>
          )}
          {healthMetrics.emergencyFundScore < 20 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Build an emergency fund covering at least 3-6 months of expenses</span>
            </li>
          )}
          {healthMetrics.debtManagementScore < 20 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Focus on paying down high-interest debt to improve debt-to-income ratio</span>
            </li>
          )}
          {healthMetrics.budgetAdherenceScore < 15 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Create and stick to a monthly budget to reduce expense volatility</span>
            </li>
          )}
          {healthMetrics.overallScore >= 80 && (
            <li className="flex items-start">
              <span className="mr-2">🎉</span>
              <span>Excellent financial health! Consider increasing investment contributions</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
