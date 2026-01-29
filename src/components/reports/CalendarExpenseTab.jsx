import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { ReportsService } from '../../utils/reportsService'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CalendarDays
} from 'lucide-react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMonthDays(year, month) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  // getDay() returns 0=Sun, we want 0=Mon
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const cells = []
  // Leading blanks
  for (let i = 0; i < startDow; i++) {
    cells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d)
  }
  return cells
}

function groupIntoWeeks(cells) {
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  // Pad last week
  const last = weeks[weeks.length - 1]
  while (last && last.length < 7) {
    last.push(null)
  }
  return weeks
}

function getIntensityClass(amount, maxAmount) {
  if (!amount || amount === 0) return ''
  const ratio = amount / maxAmount
  if (ratio < 0.2) return 'bg-green-50 dark:bg-green-900/20'
  if (ratio < 0.4) return 'bg-yellow-50 dark:bg-yellow-900/20'
  if (ratio < 0.6) return 'bg-amber-50 dark:bg-amber-900/20'
  if (ratio < 0.8) return 'bg-orange-50 dark:bg-orange-900/20'
  return 'bg-red-50 dark:bg-red-900/20'
}

function formatCategory(cat) {
  if (!cat) return 'Uncategorized'
  return cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function CalendarExpenseTab() {
  const { user } = useAuth()
  const { isDark } = useTheme()

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)
  const [viewMode, setViewMode] = useState('month')
  const [loading, setLoading] = useState(true)
  const [dailyData, setDailyData] = useState({}) // { "2025-01-05": { total, transactions: [], categories: {} } }

  const currentYear = now.getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Fetch data when year/month changes
  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      setLoading(true)
      setSelectedDay(null)
      try {
        const service = new ReportsService(supabase, user.id)
        const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
        const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

        const [expenseResult, feesResult] = await Promise.all([
          service.getExpenseTransactions(startDate, endDate),
          service.getTransactionFees(startDate, endDate)
        ])

        const allTransactions = [
          ...(expenseResult.transactions || []),
          ...(feesResult.transactions || [])
        ]

        // Group by day
        const grouped = {}
        allTransactions.forEach(txn => {
          const day = txn.date // "YYYY-MM-DD"
          if (!grouped[day]) {
            grouped[day] = { total: 0, transactions: [], categories: {} }
          }
          const amt = parseFloat(txn.amount || 0)
          grouped[day].total += amt
          grouped[day].transactions.push(txn)

          const cat = txn.category || 'uncategorized'
          if (!grouped[day].categories[cat]) {
            grouped[day].categories[cat] = { total: 0, count: 0 }
          }
          grouped[day].categories[cat].total += amt
          grouped[day].categories[cat].count += 1
        })

        setDailyData(grouped)
      } catch (err) {
        console.error('Error fetching calendar data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user, selectedYear, selectedMonth])

  // Derived data
  const { monthTotal, dailyAvg, highestDay, expenseDaysCount, maxDailyAmount } = useMemo(() => {
    const entries = Object.entries(dailyData)
    const monthTotal = entries.reduce((sum, [, d]) => sum + d.total, 0)
    const expenseDaysCount = entries.length
    const dailyAvg = expenseDaysCount > 0 ? monthTotal / expenseDaysCount : 0

    let highestDay = null
    let highestAmount = 0
    entries.forEach(([date, d]) => {
      if (d.total > highestAmount) {
        highestAmount = d.total
        highestDay = date
      }
    })

    const maxDailyAmount = highestAmount

    return { monthTotal, dailyAvg, highestDay, expenseDaysCount, maxDailyAmount }
  }, [dailyData])

  const cells = useMemo(() => getMonthDays(selectedYear, selectedMonth), [selectedYear, selectedMonth])
  const weeks = useMemo(() => groupIntoWeeks(cells), [cells])

  // Weekly totals
  const weeklyTotals = useMemo(() => {
    return weeks.map(week => {
      let total = 0
      week.forEach(day => {
        if (day) {
          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          total += dailyData[dateStr]?.total || 0
        }
      })
      return total
    })
  }, [weeks, dailyData, selectedYear, selectedMonth])

  // Navigate months
  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(y => y - 1)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(y => y + 1)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  const getDayDateStr = (day) => {
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const selectedDayData = selectedDay ? dailyData[getDayDateStr(selectedDay)] : null

  // Week view data
  const weekViewData = useMemo(() => {
    return weeks.map((week, wi) => {
      const days = week.filter(d => d !== null).map(day => {
        const dateStr = getDayDateStr(day)
        return {
          day,
          dateStr,
          data: dailyData[dateStr] || null
        }
      })
      return { weekIndex: wi + 1, days, total: weeklyTotals[wi] }
    })
  }, [weeks, dailyData, weeklyTotals])

  return (
    <div className="space-y-6">
      {/* Year/Month Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={goToPrevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center space-x-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="input text-sm py-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="input text-sm py-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <List className="h-4 w-4 mr-1.5" />
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-1">
            <DollarSign className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Month Total</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {loading ? '...' : formatCurrency(monthTotal)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingDown className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Daily Average</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {loading ? '...' : formatCurrency(dailyAvg)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Highest Day</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {loading ? '...' : highestDay
              ? new Date(highestDay).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
              : '-'}
          </p>
          {highestDay && !loading && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(maxDailyAmount)}</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-1">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Expense Days</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {loading ? '...' : expenseDaysCount}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            of {new Date(selectedYear, selectedMonth + 1, 0).getDate()} days
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading calendar data...</p>
        </div>
      ) : viewMode === 'month' ? (
        <>
          {/* Calendar Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
              {DAY_LABELS.map(label => (
                <div key={label} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {label}
                </div>
              ))}
            </div>

            {/* Week rows */}
            {weeks.map((week, wi) => (
              <div key={wi}>
                <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700/50">
                  {week.map((day, di) => {
                    if (day === null) {
                      return <div key={di} className="min-h-[80px] bg-gray-50 dark:bg-gray-900/30" />
                    }
                    const dateStr = getDayDateStr(day)
                    const dayInfo = dailyData[dateStr]
                    const amount = dayInfo?.total || 0
                    const isSelected = selectedDay === day
                    const isToday = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() && day === now.getDate()
                    const intensity = getIntensityClass(amount, maxDailyAmount)

                    return (
                      <button
                        key={di}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={`min-h-[80px] p-2 text-left border-r border-gray-100 dark:border-gray-700/50 last:border-r-0 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/10 ${intensity} ${
                          isSelected ? 'ring-2 ring-inset ring-blue-500 dark:ring-blue-400' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${
                            isToday
                              ? 'bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {day}
                          </span>
                        </div>
                        {amount > 0 && (
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 truncate">
                            {formatCurrency(amount)}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Weekly summary row */}
                {weeklyTotals[wi] > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900/40 px-4 py-1.5 border-b border-gray-200 dark:border-gray-700 flex justify-end">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Week {wi + 1} total:{' '}
                      <span className="text-gray-900 dark:text-gray-100 font-semibold">
                        {formatCurrency(weeklyTotals[wi])}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Day Detail Panel */}
          {selectedDay && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString('en-KE', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </h3>
              {selectedDayData ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total: <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(selectedDayData.total)}</span>
                      {' '}&middot;{' '}
                      {selectedDayData.transactions.length} transaction{selectedDayData.transactions.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Category Breakdown */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">By Category</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedDayData.categories)
                        .sort(([, a], [, b]) => b.total - a.total)
                        .map(([cat, info]) => (
                          <div key={cat} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatCategory(cat)}</span>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(info.total)}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({info.count})</span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Individual Transactions */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Transactions</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Description</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDayData.transactions
                            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
                            .map((txn, i) => (
                              <tr key={txn.id || i} className="border-b border-gray-100 dark:border-gray-700/50">
                                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                                  {txn.description || txn.reference_type || 'Expense'}
                                </td>
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">
                                  {formatCategory(txn.category)}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-red-600 dark:text-red-400">
                                  {formatCurrency(parseFloat(txn.amount || 0))}
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No expenses recorded on this day.</p>
              )}
            </div>
          )}
        </>
      ) : (
        /* Week View */
        <div className="space-y-4">
          {weekViewData.map(({ weekIndex, days, total }) => (
            <div key={weekIndex} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Week {weekIndex}</h3>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {total > 0 ? formatCurrency(total) : 'No expenses'}
                </span>
              </div>
              {total > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {days.filter(d => d.data).map(({ day, dateStr, data }) => (
                    <div key={day} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {new Date(dateStr).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(data.total)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(data.categories)
                          .sort(([, a], [, b]) => b.total - a.total)
                          .map(([cat, info]) => (
                            <span key={cat} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {formatCategory(cat)}: {formatCurrency(info.total)}
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                  {days.every(d => !d.data) && (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No expenses this week.</div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No expenses this week.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && Object.keys(dailyData).length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No expenses found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No expense transactions recorded for {MONTH_NAMES[selectedMonth]} {selectedYear}.
          </p>
        </div>
      )}
    </div>
  )
}
