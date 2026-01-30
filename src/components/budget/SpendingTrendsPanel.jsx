import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Flame, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'
import budgetService from '../../utils/budgetService'

export default function SpendingTrendsPanel({ budgets, budgetSummary, selectedMonth, userId }) {
  const [expanded, setExpanded] = useState(true)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)

  // Determine if selected month is current month or in the future
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = selectedMonth === currentMonthKey
  const isFutureMonth = selectedMonth > currentMonthKey

  // Previous month key
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)
  const prevDate = new Date(selYear, selMonthNum - 2, 1)
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  useEffect(() => {
    if (!userId || isFutureMonth) return
    let cancelled = false

    const fetchHistory = async () => {
      setLoading(true)
      try {
        // Fetch current + previous month
        const monthDates = [
          new Date(selYear, selMonthNum - 1, 1),
          prevDate
        ]
        const data = await budgetService.getMultiMonthBudgetHistory(userId, monthDates)
        if (!cancelled) setHistory(data)
      } catch (err) {
        console.error('Error fetching spending trends:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchHistory()
    return () => { cancelled = true }
  }, [userId, selectedMonth])

  // Budget Burn Rate (current month only)
  const burnRate = useMemo(() => {
    if (!isCurrentMonth || !budgetSummary) return null
    const totalBudget = budgetSummary.totalBudget || 0
    if (totalBudget === 0) return null

    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const daysPassed = today.getDate()
    const monthElapsedPct = (daysPassed / daysInMonth) * 100
    const budgetSpentPct = ((budgetSummary.totalSpent || 0) / totalBudget) * 100

    return {
      monthElapsedPct: Math.round(monthElapsedPct),
      budgetSpentPct: Math.round(budgetSpentPct),
      isOverPacing: budgetSpentPct > monthElapsedPct,
      daysPassed,
      daysInMonth
    }
  }, [isCurrentMonth, budgetSummary])

  // Month-over-Month changes
  const momChanges = useMemo(() => {
    if (!history || !history[selectedMonth] || !history[prevMonthKey]) return []

    const currentBudgets = history[selectedMonth]?.budgets || []
    const prevBudgets = history[prevMonthKey]?.budgets || []

    // Build prev spending map
    const prevMap = {}
    prevBudgets.forEach(b => { prevMap[b.category_id] = b.spent })

    // Calculate changes
    const changes = currentBudgets
      .map(b => {
        const prevSpent = prevMap[b.category_id] || 0
        const change = b.spent - prevSpent
        const pctChange = prevSpent > 0 ? ((change / prevSpent) * 100) : (b.spent > 0 ? 100 : 0)
        return {
          categoryName: b.categoryName,
          currentSpent: b.spent,
          prevSpent,
          change,
          pctChange: Math.round(pctChange),
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
        }
      })
      .filter(c => c.change !== 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 3)

    return changes
  }, [history, selectedMonth, prevMonthKey])

  // Pace Alerts (current month only)
  const paceAlerts = useMemo(() => {
    if (!isCurrentMonth || !budgets || budgets.length === 0) return []

    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const daysPassed = today.getDate()
    if (daysPassed === 0) return []

    return budgets
      .filter(b => {
        const spent = parseFloat(b.spent || 0)
        const limit = parseFloat(b.monthly_limit || 0)
        if (limit === 0 || spent === 0) return false
        const dailyRate = spent / daysPassed
        const projected = dailyRate * daysInMonth
        return projected > limit && spent <= limit // not yet over, but projected to exceed
      })
      .map(b => {
        const spent = parseFloat(b.spent || 0)
        const limit = parseFloat(b.monthly_limit || 0)
        const dailyRate = spent / daysPassed
        const daysToExceed = Math.ceil((limit - spent) / dailyRate) + daysPassed
        const exceedDate = new Date(today.getFullYear(), today.getMonth(), Math.min(daysToExceed, daysInMonth))

        return {
          categoryName: b.categoryName || b.category,
          projected: Math.round(dailyRate * daysInMonth),
          limit,
          exceedDay: exceedDate.getDate(),
          exceedMonth: exceedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      })
      .slice(0, 3)
  }, [isCurrentMonth, budgets])

  if (isFutureMonth) return null

  const hasContent = burnRate || momChanges.length > 0 || paceAlerts.length > 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Spending Trends</h3>
        </div>
        {expanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-200 dark:border-slate-700 pt-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="spinner" />
            </div>
          ) : !hasContent ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Not enough data to show trends yet.
            </p>
          ) : (
            <>
              {/* Burn Rate */}
              {burnRate && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Flame size={14} className="text-orange-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Budget Burn Rate
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        Month elapsed
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {burnRate.monthElapsedPct}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400 dark:bg-slate-500 rounded-full"
                        style={{ width: `${burnRate.monthElapsedPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        Budget spent
                      </span>
                      <span className={`font-medium ${burnRate.isOverPacing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {burnRate.budgetSpentPct}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${burnRate.isOverPacing ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(burnRate.budgetSpentPct, 100)}%` }}
                      />
                    </div>
                    <p className={`text-xs ${burnRate.isOverPacing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {burnRate.isOverPacing
                        ? 'Spending is ahead of schedule'
                        : 'Spending is on track'}
                      {' '}(Day {burnRate.daysPassed}/{burnRate.daysInMonth})
                    </p>
                  </div>
                </div>
              )}

              {/* MoM Changes */}
              {momChanges.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-blue-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      vs Last Month
                    </span>
                  </div>
                  <div className="space-y-2">
                    {momChanges.map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate mr-2">
                          {c.categoryName}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {c.direction === 'up' ? (
                            <ArrowUpRight size={14} className="text-red-500" />
                          ) : (
                            <ArrowDownRight size={14} className="text-green-500" />
                          )}
                          <span className={`text-xs font-medium ${c.direction === 'up' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {c.direction === 'up' ? '+' : ''}{c.pctChange}%
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                            ({c.direction === 'up' ? '+' : ''}{formatCurrency(c.change)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pace Alerts */}
              {paceAlerts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Pace Alerts
                    </span>
                  </div>
                  <div className="space-y-2">
                    {paceAlerts.map((a, i) => (
                      <div key={i} className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          <span className="font-medium">{a.categoryName}</span> projected to exceed budget by {a.exceedMonth}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Projected: {formatCurrency(a.projected)} / {formatCurrency(a.limit)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
