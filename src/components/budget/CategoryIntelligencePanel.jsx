import { useState, useEffect, useMemo } from 'react'
import { Brain, ChevronDown, ChevronRight, AlertCircle, TrendingDown, Plus, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'
import budgetService from '../../utils/budgetService'

// Format 'YYYY-MM' to short month label like 'Jan 25'
function shortMonthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function CategoryIntelligencePanel({ budgets, selectedMonth, userId, onCreateBudget }) {
  const [expanded, setExpanded] = useState(true)
  const [history, setHistory] = useState(null)
  const [unbudgeted, setUnbudgeted] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      try {
        // Build last 6 months of dates
        const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)
        const monthDates = []
        for (let i = 0; i < 6; i++) {
          monthDates.push(new Date(selYear, selMonthNum - 1 - i, 1))
        }

        const [historyData, unbudgetedData] = await Promise.all([
          budgetService.getMultiMonthBudgetHistory(userId, monthDates),
          budgetService.getUnbudgetedSpending(
            userId,
            selectedMonth,
            (budgets || []).map(b => b.category_id)
          )
        ])

        if (!cancelled) {
          setHistory(historyData)
          setUnbudgeted(unbudgetedData)
        }
      } catch (err) {
        console.error('Error fetching category intelligence:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [userId, selectedMonth, budgets])

  // Frequently overspent: categories over budget in 2+ of last 6 months
  // Collects the actual spent/limit per month so the user can verify
  const frequentlyOverspent = useMemo(() => {
    if (!history) return []

    const monthKeys = Object.keys(history).sort()
    // { categoryId: { name, months: [{ monthKey, spent, limit }], overMonths: [{ monthKey, spent, limit }] } }
    const catData = {}

    monthKeys.forEach(mk => {
      const monthData = history[mk]
      if (!monthData?.budgets) return
      monthData.budgets.forEach(b => {
        if (!catData[b.category_id]) {
          catData[b.category_id] = { name: b.categoryName, months: [], overMonths: [] }
        }
        const entry = {
          monthKey: mk,
          spent: b.spent,
          limit: parseFloat(b.monthly_limit)
        }
        catData[b.category_id].months.push(entry)
        if (b.percentage > 100) {
          catData[b.category_id].overMonths.push(entry)
        }
      })
    })

    return Object.entries(catData)
      .filter(([, v]) => v.overMonths.length >= 2)
      .map(([id, v]) => ({
        categoryId: id,
        categoryName: v.name,
        overCount: v.overMonths.length,
        totalMonths: v.months.length,
        // The actual months where overspending occurred — verifiable data
        overMonths: v.overMonths,
        // Total overspend amount across all over months
        totalOverspend: v.overMonths.reduce((sum, m) => sum + (m.spent - m.limit), 0)
      }))
      .sort((a, b) => b.overCount - a.overCount)
  }, [history])

  // Underutilized: categories averaging <50% spend of limit
  // Collects actual spent/limit per month for transparency
  const underutilized = useMemo(() => {
    if (!history) return []

    const monthKeys = Object.keys(history).sort()
    // { categoryId: { name, months: [{ monthKey, spent, limit }] } }
    const catData = {}

    monthKeys.forEach(mk => {
      const monthData = history[mk]
      if (!monthData?.budgets) return
      monthData.budgets.forEach(b => {
        if (!catData[b.category_id]) {
          catData[b.category_id] = { name: b.categoryName, months: [] }
        }
        catData[b.category_id].months.push({
          monthKey: mk,
          spent: b.spent,
          limit: parseFloat(b.monthly_limit),
          pct: b.percentage
        })
      })
    })

    return Object.entries(catData)
      .filter(([, v]) => {
        if (v.months.length < 2) return false
        const avgPct = v.months.reduce((s, m) => s + m.pct, 0) / v.months.length
        return avgPct < 50
      })
      .map(([id, v]) => {
        const totalSpent = v.months.reduce((s, m) => s + m.spent, 0)
        const totalLimit = v.months.reduce((s, m) => s + m.limit, 0)
        const avgPct = Math.round(v.months.reduce((s, m) => s + m.pct, 0) / v.months.length)
        return {
          categoryId: id,
          categoryName: v.name,
          avgPct,
          totalSpent,
          totalLimit,
          monthCount: v.months.length,
          // The actual per-month breakdown
          months: v.months
        }
      })
      .sort((a, b) => a.avgPct - b.avgPct)
  }, [history])

  const hasContent = frequentlyOverspent.length > 0 || underutilized.length > 0 || unbudgeted.length > 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-purple-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Category Intelligence</h3>
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
              Not enough data for insights yet. Keep budgeting to see patterns.
            </p>
          ) : (
            <>
              {/* Frequently Overspent */}
              {frequentlyOverspent.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} className="text-red-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Frequently Overspent
                    </span>
                  </div>
                  <div className="space-y-3">
                    {frequentlyOverspent.map((item, i) => (
                      <div key={i} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-red-800 dark:text-red-200">
                            {item.categoryName}
                          </span>
                          <span className="text-xs text-red-600 dark:text-red-400">
                            Over {item.overCount}/{item.totalMonths} months
                          </span>
                        </div>
                        {/* Per-month breakdown: the actual data */}
                        <div className="space-y-1">
                          {item.overMonths.map((m, j) => (
                            <div key={j} className="flex items-center justify-between text-xs">
                              <span className="text-red-700 dark:text-red-300">
                                {shortMonthLabel(m.monthKey)}
                              </span>
                              <span className="text-red-700 dark:text-red-300">
                                {formatCurrency(m.spent)} / {formatCurrency(m.limit)}
                                <span className="ml-1 font-medium">
                                  (+{formatCurrency(m.spent - m.limit)})
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-red-200 dark:border-red-700/50 flex justify-between text-xs font-medium text-red-800 dark:text-red-200">
                          <span>Total overspend</span>
                          <span>{formatCurrency(item.totalOverspend)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Underutilized */}
              {underutilized.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={14} className="text-blue-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Underutilized Budgets
                    </span>
                  </div>
                  <div className="space-y-3">
                    {underutilized.map((item, i) => (
                      <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                            {item.categoryName}
                          </span>
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            Avg {item.avgPct}% used over {item.monthCount} months
                          </span>
                        </div>
                        {/* Per-month breakdown: the actual data */}
                        <div className="space-y-1">
                          {item.months.map((m, j) => (
                            <div key={j} className="flex items-center justify-between text-xs">
                              <span className="text-blue-700 dark:text-blue-300">
                                {shortMonthLabel(m.monthKey)}
                              </span>
                              <span className="text-blue-700 dark:text-blue-300">
                                {formatCurrency(m.spent)} / {formatCurrency(m.limit)}
                                <span className="ml-1 text-blue-500 dark:text-blue-400">
                                  ({Math.round(m.pct)}%)
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-blue-200 dark:border-blue-700/50 flex justify-between text-xs font-medium text-blue-800 dark:text-blue-200">
                          <span>Total: {formatCurrency(item.totalSpent)} of {formatCurrency(item.totalLimit)} budgeted</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unbudgeted Spending */}
              {unbudgeted.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag size={14} className="text-amber-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Unbudgeted Spending
                    </span>
                  </div>
                  <div className="space-y-2">
                    {unbudgeted.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                            {item.categoryName}
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {formatCurrency(item.spent)} spent this month
                          </p>
                        </div>
                        {onCreateBudget && (
                          <button
                            onClick={() => onCreateBudget(item.categoryId)}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-md transition-colors"
                          >
                            <Plus size={12} />
                            Budget
                          </button>
                        )}
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
