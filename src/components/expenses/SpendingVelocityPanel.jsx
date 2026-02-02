import { useState, useMemo } from 'react'
import { Zap, ChevronDown, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Calendar, Info } from 'lucide-react'
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

    const getExpenseTotal = (e) => parseFloat(e.amount || 0) + parseFloat(e.transaction_fee || 0)

    const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + getExpenseTotal(e), 0)
    const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + getExpenseTotal(e), 0)

    // Daily spending rate
    const dailyRate = daysPassed > 0 ? thisMonthTotal / daysPassed : 0
    const lastMonthDailyRate = daysInLastMonth > 0 ? lastMonthTotal / daysInLastMonth : 0
    const rateChange = lastMonthDailyRate > 0
      ? ((dailyRate - lastMonthDailyRate) / lastMonthDailyRate) * 100
      : 0

    // Historical pace calculation — gather up to 6 prior months
    const priorMonthsMap = {}
    const nonReversedExpenses = expenses.filter(e => !e.is_reversed)
    for (const e of nonReversedExpenses) {
      const d = new Date(e.date)
      const mKey = `${d.getFullYear()}-${d.getMonth()}`
      // Skip current month
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) continue
      if (!priorMonthsMap[mKey]) {
        priorMonthsMap[mKey] = { monthTotal: 0, totalByDayN: 0, year: d.getFullYear(), month: d.getMonth() }
      }
      const amount = getExpenseTotal(e)
      priorMonthsMap[mKey].monthTotal += amount
      if (d.getDate() <= daysPassed) {
        priorMonthsMap[mKey].totalByDayN += amount
      }
    }

    // Sort by date descending and take up to 6
    const priorMonths = Object.values(priorMonthsMap)
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
      .slice(0, 6)

    const historicalMonthCount = priorMonths.length
    const historicalAvgByDayN = historicalMonthCount > 0
      ? priorMonths.reduce((sum, m) => sum + m.totalByDayN, 0) / historicalMonthCount
      : 0
    const historicalAvgMonthTotal = historicalMonthCount > 0
      ? priorMonths.reduce((sum, m) => sum + m.monthTotal, 0) / historicalMonthCount
      : 0
    const paceRatio = historicalAvgByDayN > 0 ? thisMonthTotal / historicalAvgByDayN : null

    // Early month flag
    const isEarlyMonth = daysPassed < 7

    // Monthly projection (improved)
    let projection
    if (isEarlyMonth) {
      if (historicalMonthCount > 0) {
        projection = historicalAvgMonthTotal
      } else {
        projection = lastMonthTotal
      }
    } else {
      projection = dailyRate * daysInMonth
    }

    const projectionExceedsLast = lastMonthTotal > 0 && projection > lastMonthTotal
    const excessAmount = projectionExceedsLast ? projection - lastMonthTotal : 0

    // Biggest expense this month
    const biggest = thisMonthExpenses.length > 0
      ? thisMonthExpenses.reduce((max, e) => {
          const total = getExpenseTotal(e)
          return total > getExpenseTotal(max) ? e : max
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
      daysPassed,
      isEarlyMonth,
      historicalAvgByDayN,
      historicalAvgMonthTotal,
      historicalMonthCount,
      paceRatio,
    }
  }, [expenses, currentMonth, currentYear, daysPassed, daysInMonth, daysInLastMonth])

  const hasContent = insights.thisMonthTotal > 0

  const EarlyMonthDisclaimer = () => (
    <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mt-2">
      <Info size={14} className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-blue-600 dark:text-blue-400">
        Early in the month — rates are based on limited data and may reflect recurring bills.
      </p>
    </div>
  )

  const pacePercent = insights.paceRatio !== null
    ? ((insights.paceRatio - 1) * 100)
    : null

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

                  {/* Historical pace comparison */}
                  {insights.historicalMonthCount > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>By day {daysPassed}</span>
                        <div className="flex items-center gap-1.5">
                          <span>{formatCurrency(insights.thisMonthTotal)} vs typical {formatCurrency(insights.historicalAvgByDayN)}</span>
                          {pacePercent !== null && (
                            <span className={`font-medium ${pacePercent > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {pacePercent > 0 ? '+' : ''}{pacePercent.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pacePercent !== null && pacePercent > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min((insights.thisMonthTotal / Math.max(insights.thisMonthTotal, insights.historicalAvgByDayN)) * 100, 100)}%` }}
                        />
                      </div>
                    </>
                  )}

                  {/* Fallback: show last month daily rate comparison when no historical data */}
                  {insights.historicalMonthCount === 0 && insights.lastMonthDailyRate > 0 && (
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

                  {insights.isEarlyMonth && <EarlyMonthDisclaimer />}
                </div>
              </div>

              {/* Monthly Projection */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {insights.isEarlyMonth ? (
                    <Info size={14} className="text-blue-500" />
                  ) : insights.projectionExceedsLast ? (
                    <AlertTriangle size={14} className="text-amber-500" />
                  ) : (
                    <TrendingDown size={14} className="text-green-500" />
                  )}
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Monthly Projection
                  </span>
                </div>

                {insights.isEarlyMonth ? (
                  // Early month projection — neutral blue styling
                  <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    {insights.historicalMonthCount > 0 ? (
                      <>
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                          {formatCurrency(insights.historicalAvgMonthTotal)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Based on {insights.historicalMonthCount}-month average. So far this month: {formatCurrency(insights.thisMonthTotal)}.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                          {insights.lastMonthTotal > 0 ? formatCurrency(insights.lastMonthTotal) : formatCurrency(insights.thisMonthTotal)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {insights.lastMonthTotal > 0
                            ? `Last month you spent ${formatCurrency(insights.lastMonthTotal)}. So far this month: ${formatCurrency(insights.thisMonthTotal)}.`
                            : 'Based on current daily rate'}
                        </p>
                      </>
                    )}
                    <EarlyMonthDisclaimer />
                  </div>
                ) : (
                  // Normal projection (day 7+)
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
                    {insights.historicalMonthCount > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Avg month: {formatCurrency(insights.historicalAvgMonthTotal)}
                      </p>
                    )}
                  </div>
                )}
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
