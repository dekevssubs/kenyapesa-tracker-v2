import { useState, useMemo } from 'react'
import { ArrowLeftRight, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, Plus, Minus } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'

export default function MonthComparisonPanel({ expenses }) {
  const [expanded, setExpanded] = useState(true)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1)
  const prevMonth = prevMonthDate.getMonth()
  const prevYear = prevMonthDate.getFullYear()

  const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'short' })
  const prevMonthLabel = prevMonthDate.toLocaleDateString('en-US', { month: 'short' })

  const insights = useMemo(() => {
    const thisMonthExpenses = expenses.filter(e => {
      if (e.is_reversed) return false
      const d = new Date(e.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })

    const lastMonthExpenses = expenses.filter(e => {
      if (e.is_reversed) return false
      const d = new Date(e.date)
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear
    })

    const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0) + parseFloat(e.transaction_fee || 0), 0)
    const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0) + parseFloat(e.transaction_fee || 0), 0)

    const absoluteChange = thisMonthTotal - lastMonthTotal
    const percentageChange = lastMonthTotal > 0 ? (absoluteChange / lastMonthTotal) * 100 : 0

    // Category totals
    const thisMonthCats = {}
    thisMonthExpenses.forEach(e => {
      const cat = e.category || 'uncategorized'
      thisMonthCats[cat] = (thisMonthCats[cat] || 0) + parseFloat(e.amount || 0) + parseFloat(e.transaction_fee || 0)
    })

    const lastMonthCats = {}
    lastMonthExpenses.forEach(e => {
      const cat = e.category || 'uncategorized'
      lastMonthCats[cat] = (lastMonthCats[cat] || 0) + parseFloat(e.amount || 0) + parseFloat(e.transaction_fee || 0)
    })

    // All categories from both months
    const allCats = new Set([...Object.keys(thisMonthCats), ...Object.keys(lastMonthCats)])

    const categoryDeltas = Array.from(allCats)
      .map(cat => ({
        category: cat,
        thisMonth: thisMonthCats[cat] || 0,
        lastMonth: lastMonthCats[cat] || 0,
        change: (thisMonthCats[cat] || 0) - (lastMonthCats[cat] || 0)
      }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5)

    // New categories (this month only)
    const newCategories = Object.keys(thisMonthCats).filter(c => !lastMonthCats[c])

    // Stopped categories (last month only)
    const stoppedCategories = Object.keys(lastMonthCats).filter(c => !thisMonthCats[c])

    return {
      thisMonthTotal,
      lastMonthTotal,
      absoluteChange,
      percentageChange,
      categoryDeltas,
      newCategories,
      stoppedCategories,
      hasLastMonth: lastMonthTotal > 0
    }
  }, [expenses, currentMonth, currentYear, prevMonth, prevYear])

  const hasContent = insights.thisMonthTotal > 0 || insights.lastMonthTotal > 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Month Comparison</h3>
        </div>
        {expanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-200 dark:border-slate-700 pt-4">
          {!hasContent ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No spending data to compare yet.
            </p>
          ) : (
            <>
              {/* Total Comparison */}
              <div>
                <div className={`p-3 rounded-lg border ${
                  insights.absoluteChange > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : insights.absoluteChange < 0
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{currentMonthLabel}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(insights.thisMonthTotal)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{prevMonthLabel}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(insights.lastMonthTotal)}
                      </p>
                    </div>
                  </div>
                  {insights.hasLastMonth && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-600/50">
                      {insights.absoluteChange > 0 ? (
                        <ArrowUpRight size={14} className="text-red-500" />
                      ) : insights.absoluteChange < 0 ? (
                        <ArrowDownRight size={14} className="text-green-500" />
                      ) : null}
                      <span className={`text-sm font-medium ${
                        insights.absoluteChange > 0
                          ? 'text-red-600 dark:text-red-400'
                          : insights.absoluteChange < 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {insights.absoluteChange > 0 ? '+' : ''}{formatCurrency(insights.absoluteChange)}
                        {' '}({insights.absoluteChange > 0 ? '+' : ''}{insights.percentageChange.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                  {!insights.hasLastMonth && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/50 dark:border-slate-600/50">
                      No data from last month for comparison
                    </p>
                  )}
                </div>
              </div>

              {/* Category Deltas */}
              {insights.categoryDeltas.length > 0 && insights.hasLastMonth && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Category Changes
                  </span>
                  <div className="mt-2 space-y-2">
                    {insights.categoryDeltas.map(({ category, thisMonth, lastMonth, change }) => (
                      <div key={category} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize truncate mr-2 flex-1">
                          {category}
                        </span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-slate-500 dark:text-slate-400 w-20 text-right">
                            {formatCurrency(thisMonth)}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 w-20 text-right">
                            {formatCurrency(lastMonth)}
                          </span>
                          <div className="flex items-center gap-0.5 w-16 justify-end">
                            {change > 0 ? (
                              <ArrowUpRight size={12} className="text-red-500" />
                            ) : change < 0 ? (
                              <ArrowDownRight size={12} className="text-green-500" />
                            ) : null}
                            <span className={`text-xs font-medium ${
                              change > 0 ? 'text-red-600 dark:text-red-400' : change < 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-500'
                            }`}>
                              {change > 0 ? '+' : ''}{formatCurrency(change)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Categories */}
              {insights.newCategories.length > 0 && insights.hasLastMonth && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Plus size={14} className="text-blue-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      New This Month
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.newCategories.map(cat => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full capitalize"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stopped Categories */}
              {insights.stoppedCategories.length > 0 && insights.hasLastMonth && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Minus size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Stopped From Last Month
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.stoppedCategories.map(cat => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-full capitalize"
                      >
                        {cat}
                      </span>
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
