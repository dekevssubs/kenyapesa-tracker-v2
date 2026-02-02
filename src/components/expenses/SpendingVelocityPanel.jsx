import { useState, useMemo } from 'react'
import { Zap, ChevronDown, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'

export default function SpendingVelocityPanel({ expenses }) {
  const [expanded, setExpanded] = useState(true)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const daysPassed = now.getDate()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  // Previous month info
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1)
  const daysInLastMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate()

  const insights = useMemo(() => {
    const thisMonthExpenses = expenses.filter(e => {
      if (e.is_reversed) return false
      const d = new Date(e.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })

    const lastMonthExpenses = expenses.filter(e => {
      if (e.is_reversed) return false
      const d = new Date(e.date)
      return d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear()
    })

    const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0) + parseFloat(e.transaction_fee || 0), 0)
    const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0) + parseFloat(e.transaction_fee || 0), 0)

    // Daily spending rate
    const dailyRate = daysPassed > 0 ? thisMonthTotal / daysPassed : 0
    const lastMonthDailyRate = daysInLastMonth > 0 ? lastMonthTotal / daysInLastMonth : 0
    const rateChange = lastMonthDailyRate > 0
      ? ((dailyRate - lastMonthDailyRate) / lastMonthDailyRate) * 100
      : 0

    // Monthly projection
    const projection = dailyRate * daysInMonth
    const projectionExceedsLast = lastMonthTotal > 0 && projection > lastMonthTotal
    const excessAmount = projectionExceedsLast ? projection - lastMonthTotal : 0

    // Biggest expense this month
    const biggest = thisMonthExpenses.length > 0
      ? thisMonthExpenses.reduce((max, e) => {
          const total = parseFloat(e.amount || 0) + parseFloat(e.transaction_fee || 0)
          return total > (parseFloat(max.amount || 0) + parseFloat(max.transaction_fee || 0)) ? e : max
        }, thisMonthExpenses[0])
      : null

    // Active spending days
    const uniqueDays = new Set(thisMonthExpenses.map(e => new Date(e.date).getDate()))
    const activeDays = uniqueDays.size

    return {
      thisMonthTotal,
      lastMonthTotal,
      dailyRate,
      lastMonthDailyRate,
      rateChange,
      projection,
      projectionExceedsLast,
      excessAmount,
      biggest,
      activeDays,
      daysPassed
    }
  }, [expenses, currentMonth, currentYear, daysPassed, daysInMonth, daysInLastMonth])

  const hasContent = insights.thisMonthTotal > 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-yellow-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Spending Velocity</h3>
        </div>
        {expanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-200 dark:border-slate-700 pt-4">
          {!hasContent ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No spending data this month yet.
            </p>
          ) : (
            <>
              {/* Daily Spending Rate */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-blue-500" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Daily Spending Rate
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Today's pace</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(insights.dailyRate)}/day
                      </span>
                      {insights.lastMonthDailyRate > 0 && (
                        <span className={`text-xs font-medium ${insights.rateChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {insights.rateChange > 0 ? '+' : ''}{insights.rateChange.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {insights.lastMonthDailyRate > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Last month avg</span>
                        <span>{formatCurrency(insights.lastMonthDailyRate)}/day</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${insights.rateChange > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min((insights.dailyRate / Math.max(insights.dailyRate, insights.lastMonthDailyRate)) * 100, 100)}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Monthly Projection */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {insights.projectionExceedsLast ? (
                    <AlertTriangle size={14} className="text-amber-500" />
                  ) : (
                    <TrendingDown size={14} className="text-green-500" />
                  )}
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Monthly Projection
                  </span>
                </div>
                <div className={`p-3 rounded-lg border ${
                  insights.projectionExceedsLast
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                }`}>
                  <p className={`text-sm font-semibold ${
                    insights.projectionExceedsLast
                      ? 'text-amber-800 dark:text-amber-200'
                      : 'text-green-800 dark:text-green-200'
                  }`}>
                    {formatCurrency(insights.projection)}
                  </p>
                  {insights.projectionExceedsLast ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Projected to exceed last month by {formatCurrency(insights.excessAmount)}
                    </p>
                  ) : insights.lastMonthTotal > 0 ? (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      On track to spend less than last month ({formatCurrency(insights.lastMonthTotal)})
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Based on current daily rate
                    </p>
                  )}
                </div>
              </div>

              {/* Biggest Expense */}
              {insights.biggest && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-purple-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Biggest Expense
                    </span>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-purple-800 dark:text-purple-200 capitalize truncate">
                          {insights.biggest.category || 'Uncategorized'}
                        </p>
                        {insights.biggest.description && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                            {insights.biggest.description}
                          </p>
                        )}
                        <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                          {new Date(insights.biggest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-purple-900 dark:text-purple-100 ml-3 flex-shrink-0">
                        {formatCurrency(parseFloat(insights.biggest.amount || 0) + parseFloat(insights.biggest.transaction_fee || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Spending Days */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-teal-500" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Active Spending Days
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Days with expenses</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {insights.activeDays} / {insights.daysPassed}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{ width: `${insights.daysPassed > 0 ? (insights.activeDays / insights.daysPassed) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {insights.daysPassed > 0 ? Math.round((insights.activeDays / insights.daysPassed) * 100) : 0}% of days elapsed
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
