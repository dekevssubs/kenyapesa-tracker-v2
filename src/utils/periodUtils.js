/**
 * Period Utilities for Date Range Calculations and Comparisons
 * Supports month-to-month, year-to-year, and custom period analysis
 */

export const PERIOD_TYPES = {
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_QUARTER: 'this_quarter',
  LAST_QUARTER: 'last_quarter',
  THIS_YEAR: 'this_year',
  LAST_YEAR: 'last_year',
  CUSTOM: 'custom'
}

/**
 * Get date range for a specific period type
 * @param {string} periodType - One of PERIOD_TYPES
 * @param {object} customRange - Optional custom range {from, to}
 * @returns {object} - {startDate, endDate, label}
 */
export function getPeriodRange(periodType, customRange = null) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  switch (periodType) {
    case PERIOD_TYPES.THIS_MONTH: {
      const startDate = new Date(currentYear, currentMonth, 1)
      const endDate = new Date(currentYear, currentMonth + 1, 0)
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        label: now.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
      }
    }

    case PERIOD_TYPES.LAST_MONTH: {
      const startDate = new Date(currentYear, currentMonth - 1, 1)
      const endDate = new Date(currentYear, currentMonth, 0)
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        label: startDate.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
      }
    }

    case PERIOD_TYPES.THIS_QUARTER: {
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3
      const startDate = new Date(currentYear, quarterStartMonth, 1)
      const endDate = new Date(currentYear, quarterStartMonth + 3, 0)
      const quarter = Math.floor(currentMonth / 3) + 1
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        label: `Q${quarter} ${currentYear}`
      }
    }

    case PERIOD_TYPES.LAST_QUARTER: {
      const lastQuarterStartMonth = Math.floor(currentMonth / 3) * 3 - 3
      const year = lastQuarterStartMonth < 0 ? currentYear - 1 : currentYear
      const startMonth = lastQuarterStartMonth < 0 ? lastQuarterStartMonth + 12 : lastQuarterStartMonth
      const startDate = new Date(year, startMonth, 1)
      const endDate = new Date(year, startMonth + 3, 0)
      const quarter = Math.floor(startMonth / 3) + 1
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        label: `Q${quarter} ${year}`
      }
    }

    case PERIOD_TYPES.THIS_YEAR: {
      const startDate = new Date(currentYear, 0, 1)
      const endDate = new Date(currentYear, 11, 31)
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        label: `${currentYear}`
      }
    }

    case PERIOD_TYPES.LAST_YEAR: {
      const startDate = new Date(currentYear - 1, 0, 1)
      const endDate = new Date(currentYear - 1, 11, 31)
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        label: `${currentYear - 1}`
      }
    }

    case PERIOD_TYPES.CUSTOM: {
      if (!customRange || !customRange.from || !customRange.to) {
        throw new Error('Custom range requires from and to dates')
      }
      return {
        startDate: customRange.from,
        endDate: customRange.to,
        label: `${new Date(customRange.from).toLocaleDateString('en-KE')} - ${new Date(customRange.to).toLocaleDateString('en-KE')}`
      }
    }

    default:
      return getPeriodRange(PERIOD_TYPES.THIS_MONTH)
  }
}

/**
 * Get comparison period (for MoM, YoY comparisons)
 * @param {string} periodType - Current period type
 * @returns {object} - Comparison period range
 */
export function getComparisonPeriod(periodType) {
  switch (periodType) {
    case PERIOD_TYPES.THIS_MONTH:
      return getPeriodRange(PERIOD_TYPES.LAST_MONTH)

    case PERIOD_TYPES.LAST_MONTH: {
      const now = new Date()
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0)
      return {
        startDate: twoMonthsAgo.toISOString().split('T')[0],
        endDate: twoMonthsAgoEnd.toISOString().split('T')[0],
        label: twoMonthsAgo.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
      }
    }

    case PERIOD_TYPES.THIS_QUARTER:
      return getPeriodRange(PERIOD_TYPES.LAST_QUARTER)

    case PERIOD_TYPES.THIS_YEAR:
      return getPeriodRange(PERIOD_TYPES.LAST_YEAR)

    default:
      return null
  }
}

/**
 * Get year-over-year comparison period
 * @param {string} startDate - Start date of current period
 * @param {string} endDate - End date of current period
 * @returns {object} - YoY comparison period
 */
export function getYoYPeriod(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const yoyStart = new Date(start.getFullYear() - 1, start.getMonth(), start.getDate())
  const yoyEnd = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())

  return {
    startDate: yoyStart.toISOString().split('T')[0],
    endDate: yoyEnd.toISOString().split('T')[0],
    label: `${yoyStart.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })} - ${yoyEnd.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}`
  }
}

/**
 * Calculate percentage change
 * @param {number} current - Current period value
 * @param {number} previous - Previous period value
 * @returns {number} - Percentage change
 */
export function calculatePercentageChange(current, previous) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

/**
 * Get month-to-month data for the last N months
 * @param {number} months - Number of months to retrieve
 * @returns {array} - Array of month ranges
 */
export function getMonthlyRanges(months = 12) {
  const now = new Date()
  const ranges = []

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)

    ranges.push({
      month: monthDate.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
      monthShort: monthDate.toLocaleDateString('en-KE', { month: 'short' }),
      monthLong: monthDate.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      year: monthDate.getFullYear(),
      monthIndex: monthDate.getMonth()
    })
  }

  return ranges
}

/**
 * Get year-to-date range
 * @returns {object} - YTD range
 */
export function getYTDRange() {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), 0, 1)

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
    label: `YTD ${now.getFullYear()}`,
    daysElapsed: Math.floor((now - startDate) / (1000 * 60 * 60 * 24)),
    daysInYear: isLeapYear(now.getFullYear()) ? 366 : 365
  }
}

/**
 * Check if a year is a leap year
 * @param {number} year
 * @returns {boolean}
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

/**
 * Get quarter information
 * @param {Date} date
 * @returns {object} - Quarter info
 */
export function getQuarterInfo(date = new Date()) {
  const month = date.getMonth()
  const quarter = Math.floor(month / 3) + 1
  const quarterStartMonth = (quarter - 1) * 3

  return {
    quarter,
    label: `Q${quarter} ${date.getFullYear()}`,
    startMonth: quarterStartMonth,
    endMonth: quarterStartMonth + 2,
    startDate: new Date(date.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0],
    endDate: new Date(date.getFullYear(), quarterStartMonth + 3, 0).toISOString().split('T')[0]
  }
}

/**
 * Format comparison text
 * @param {number} change - Percentage change
 * @param {boolean} inverse - If true, negative is good (for expenses)
 * @returns {object} - {text, color, icon}
 */
export function formatComparison(change, inverse = false) {
  const absChange = Math.abs(change)
  const isPositive = change > 0
  const isGood = inverse ? !isPositive : isPositive

  return {
    text: `${isPositive ? '+' : ''}${change.toFixed(1)}%`,
    color: isGood ? 'text-green-600' : 'text-red-600',
    bgColor: isGood ? 'bg-green-50' : 'bg-red-50',
    icon: isPositive ? '↑' : '↓',
    label: change === 0 ? 'No change' : (isGood ? 'Better' : 'Worse')
  }
}

/**
 * Calculate savings rate
 * @param {number} income - Total income
 * @param {number} expenses - Total expenses
 * @returns {number} - Savings rate percentage
 */
export function calculateSavingsRate(income, expenses) {
  if (income === 0) return 0
  return ((income - expenses) / income) * 100
}

/**
 * Get financial health rating based on savings rate
 * @param {number} savingsRate - Savings rate percentage
 * @returns {object} - {rating, label, color}
 */
export function getFinancialHealthRating(savingsRate) {
  if (savingsRate >= 30) {
    return { rating: 5, label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-500' }
  } else if (savingsRate >= 20) {
    return { rating: 4, label: 'Very Good', color: 'text-blue-600', bgColor: 'bg-blue-500' }
  } else if (savingsRate >= 10) {
    return { rating: 3, label: 'Good', color: 'text-yellow-600', bgColor: 'bg-yellow-500' }
  } else if (savingsRate >= 5) {
    return { rating: 2, label: 'Fair', color: 'text-orange-600', bgColor: 'bg-orange-500' }
  } else {
    return { rating: 1, label: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-500' }
  }
}

/**
 * Calculate projected annual value based on YTD data
 * @param {number} ytdValue - Year-to-date value
 * @param {number} daysElapsed - Days elapsed in the year
 * @param {number} daysInYear - Total days in the year
 * @returns {number} - Projected annual value
 */
export function projectAnnualValue(ytdValue, daysElapsed, daysInYear) {
  if (daysElapsed === 0) return 0
  return (ytdValue / daysElapsed) * daysInYear
}

/**
 * Get period display name
 * @param {string} periodType - Period type
 * @returns {string} - Display name
 */
export function getPeriodDisplayName(periodType) {
  const names = {
    [PERIOD_TYPES.THIS_MONTH]: 'This Month',
    [PERIOD_TYPES.LAST_MONTH]: 'Last Month',
    [PERIOD_TYPES.THIS_QUARTER]: 'This Quarter',
    [PERIOD_TYPES.LAST_QUARTER]: 'Last Quarter',
    [PERIOD_TYPES.THIS_YEAR]: 'This Year',
    [PERIOD_TYPES.LAST_YEAR]: 'Last Year',
    [PERIOD_TYPES.CUSTOM]: 'Custom Range'
  }
  return names[periodType] || 'This Month'
}
