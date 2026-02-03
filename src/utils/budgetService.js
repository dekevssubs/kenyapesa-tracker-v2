/**
 * Budget Service - Ledger-First Implementation
 *
 * Purpose: Calculate budget spending from the authoritative ledger (account_transactions)
 *
 * Core Principles (from canonical spec):
 * - Ledger expenses only (read from account_transactions, not legacy expenses table)
 * - Transfers excluded (transaction_type = 'transfer' must be excluded)
 * - Equality ≠ overspend (spent = 100% is "at limit", not "over")
 * - Forecasted spend (advisory): ledger history + reminders
 * - Actual spend: ledger only
 * - Budgets trigger only on actuals
 * - Budgets observe spending; they do not control it
 */

import { supabase } from './supabase'

/**
 * Format a local Date to YYYY-MM-DD string without timezone conversion.
 * Using toISOString() shifts dates in timezones ahead of UTC (e.g., Kenya UTC+3),
 * causing midnight local time to become the previous day in UTC.
 */
function formatLocalDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Get actual spending for a category (ledger-first)
 * @param {UUID} userId - User ID
 * @param {string} categorySlug - Category slug (e.g., 'food', 'transport')
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {number} Total spent in category (includes transaction fees if applicable)
 */
export async function getCategoryActualSpending(userId, categorySlug, startDate, endDate) {
  try {
    // Get category ID from slug
    const { data: categoryId, error: catError } = await supabase
      .rpc('get_category_id', {
        p_user_id: userId,
        p_slug: categorySlug
      })

    if (catError || !categoryId) {
      console.error('Error getting category ID:', catError)
      return 0
    }

    // Query account_transactions ledger for actual spending
    // Include:
    // - transaction_type = 'expense' (main expenses)
    // - transaction_type = 'transaction_fee' (if in fees category)
    // Exclude:
    // - transaction_type = 'transfer' (transfers are not expenses)
    // - transaction_type = 'reversal' (reversals are metadata)
    // - Transactions that have been reversed (check for reversal references)

    const { data: transactions, error } = await supabase
      .from('account_transactions')
      .select(`
        id,
        amount,
        transaction_type,
        category_id,
        category,
        date,
        reference_type
      `)
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .in('transaction_type', ['expense', 'transaction_fee'])
      .gte('date', formatLocalDate(startDate))
      .lte('date', formatLocalDate(endDate))

    if (error) {
      console.error('Error fetching category spending:', error)
      return 0
    }

    if (!transactions || transactions.length === 0) return 0

    // Filter out reversed transactions
    // A transaction is reversed if there exists a reversal transaction referencing it
    const reversedTransactionIds = await getReversedTransactionIds(userId, transactions.map(t => t.id))

    // Apply exclusion rules (transfers, savings, investments, etc.)
    const validTransactions = transactions.filter(t => {
      // Exclude reversed transactions
      if (reversedTransactionIds.has(t.id)) return false

      // Exclude transactions per canonical budget rules
      if (shouldExcludeFromBudget(t)) return false

      return true
    })

    // Sum up the amounts
    const total = validTransactions.reduce((sum, t) => {
      return sum + parseFloat(t.amount || 0)
    }, 0)

    return total
  } catch (err) {
    console.error('Error calculating category spending:', err)
    return 0
  }
}

/**
 * Get IDs of transactions that have been reversed
 * @param {UUID} userId - User ID
 * @param {UUID[]} transactionIds - Transaction IDs to check
 * @returns {Set<UUID>} Set of transaction IDs that have been reversed
 */
async function getReversedTransactionIds(userId, transactionIds) {
  if (!transactionIds || transactionIds.length === 0) return new Set()

  try {
    // Query for reversal transactions that reference these transactions
    const { data: reversals, error } = await supabase
      .from('account_transactions')
      .select('reference_id')
      .eq('user_id', userId)
      .eq('transaction_type', 'reversal')
      .eq('reference_type', 'expense_reversal')
      .in('reference_id', transactionIds)

    if (error || !reversals) return new Set()

    return new Set(reversals.map(r => r.reference_id))
  } catch (err) {
    console.error('Error checking reversed transactions:', err)
    return new Set()
  }
}

/**
 * Get total actual spending across all categories (ledger-first)
 * Excludes transfers and reversed transactions
 * @param {UUID} userId - User ID
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {number} Total spent
 */
export async function getTotalActualSpending(userId, startDate, endDate) {
  try {
    // Query all expense and transaction_fee transactions in period
    const { data: transactions, error } = await supabase
      .from('account_transactions')
      .select(`
        id,
        amount,
        transaction_type,
        reference_type
      `)
      .eq('user_id', userId)
      .in('transaction_type', ['expense', 'transaction_fee'])
      .gte('date', formatLocalDate(startDate))
      .lte('date', formatLocalDate(endDate))

    if (error) {
      console.error('Error fetching total spending:', error)
      return 0
    }

    if (!transactions || transactions.length === 0) return 0

    // Filter out reversed transactions
    const reversedTransactionIds = await getReversedTransactionIds(userId, transactions.map(t => t.id))
    const validTransactions = transactions.filter(t => !reversedTransactionIds.has(t.id))

    // Sum up amounts
    const total = validTransactions.reduce((sum, t) => {
      return sum + parseFloat(t.amount || 0)
    }, 0)

    return total
  } catch (err) {
    console.error('Error calculating total spending:', err)
    return 0
  }
}

/**
 * Get forecasted spending for a category (advisory only)
 * Forecast = ledger history (moving average) + pending bill reminders
 * @param {UUID} userId - User ID
 * @param {string} categorySlug - Category slug
 * @param {Date} forecastDate - Date to forecast for (usually current month)
 * @returns {Object} { forecasted, actual, pending, confidence }
 */
export async function getCategoryForecastedSpending(userId, categorySlug, forecastDate) {
  try {
    // Get category ID
    const { data: categoryId, error: catError } = await supabase
      .rpc('get_category_id', {
        p_user_id: userId,
        p_slug: categorySlug
      })

    if (catError || !categoryId) return { forecasted: 0, actual: 0, pending: 0, confidence: 0 }

    // 1. Get actual spending so far this month
    const monthStart = new Date(forecastDate.getFullYear(), forecastDate.getMonth(), 1)
    const monthEnd = new Date(forecastDate.getFullYear(), forecastDate.getMonth() + 1, 0)
    const actual = await getCategoryActualSpending(userId, categorySlug, monthStart, monthEnd)

    // 2. Get pending bill reminders for this category
    const { data: reminders, error: remindersError } = await supabase
      .from('bill_reminders')
      .select('amount')
      .eq('user_id', userId)
      .eq('category_slug', categorySlug)
      .eq('status', 'active')
      .gte('next_due_date', formatLocalDate(monthStart))
      .lte('next_due_date', formatLocalDate(monthEnd))

    const pending = reminders && !remindersError
      ? reminders.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
      : 0

    // 3. Calculate 3-month moving average for confidence
    const threeMonthsAgo = new Date(forecastDate)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const historicalSpending = await getCategoryActualSpending(userId, categorySlug, threeMonthsAgo, monthStart)
    const movingAverage = historicalSpending / 3

    // 4. Forecasted = actual so far + pending + (moving average * days remaining / days in month)
    const today = new Date()
    const daysInMonth = monthEnd.getDate()
    const daysPassed = today.getDate()
    const daysRemaining = Math.max(0, daysInMonth - daysPassed)
    const projectedRemainder = (movingAverage / daysInMonth) * daysRemaining

    const forecasted = actual + pending + projectedRemainder

    // 5. Confidence based on historical data availability
    const confidence = historicalSpending > 0 ? 0.75 : 0.25

    return {
      forecasted: Math.max(0, forecasted),
      actual,
      pending,
      confidence
    }
  } catch (err) {
    console.error('Error calculating forecasted spending:', err)
    return { forecasted: 0, actual: 0, pending: 0, confidence: 0 }
  }
}

/**
 * Get budget status based on spending
 * Per spec: Equality ≠ overspend
 * @param {number} spent - Amount spent
 * @param {number} limit - Budget limit
 * @returns {Object} { status, color, message, percentage }
 */
export function getBudgetStatus(spent, limit) {
  const percentage = (spent / limit) * 100

  // Per spec: Status thresholds
  // - Over budget: spent > 100%
  // - At limit: spent = 100% (exactly on budget, not over)
  // - Almost at limit: 80% ≤ spent < 100%
  // - On track: spent < 80%

  if (percentage > 100) {
    return {
      status: 'over',
      color: 'red',
      message: 'Over budget!',
      percentage
    }
  }

  if (percentage === 100) {
    return {
      status: 'at-limit',
      color: 'blue',
      message: 'At budget limit',
      percentage
    }
  }

  if (percentage >= 80) {
    return {
      status: 'warning',
      color: 'yellow',
      message: 'Almost at limit',
      percentage
    }
  }

  return {
    status: 'good',
    color: 'green',
    message: 'On track',
    percentage
  }
}

/**
 * Get all budgets with spending data for a month
 * @param {UUID} userId - User ID
 * @param {Date} month - Month to get budgets for
 * @returns {Array} Budgets with spending data
 */
export async function getBudgetsWithSpending(userId, month) {
  try {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)

    // Format month as YYYY-MM-01 without timezone conversion issues
    const year = month.getFullYear()
    const monthNum = String(month.getMonth() + 1).padStart(2, '0')
    const monthString = `${year}-${monthNum}-01`

    console.log('📅 Fetching budgets for month:', monthString)

    // Get budgets for the month with category data
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select(`
        id,
        category_id,
        monthly_limit,
        month,
        created_at,
        updated_at,
        expense_categories!category_id (
          id,
          slug,
          name,
          parent_category_id
        )
      `)
      .eq('user_id', userId)
      .eq('month', monthString)

    if (budgetsError) {
      console.error('❌ Error fetching budgets:', budgetsError)
      return []
    }

    console.log('📊 Raw budgets from DB:', budgets?.length || 0, budgets)

    if (!budgets || budgets.length === 0) {
      console.log('ℹ️ No budgets found for month:', monthString)
      return []
    }

    // Enrich each budget with spending data
    const enrichedBudgets = await Promise.all(
      budgets.map(async (budget) => {
        // Extract category data from join
        const categorySlug = budget.expense_categories?.slug
        const categoryName = budget.expense_categories?.name

        console.log('🔍 Processing budget:', {
          id: budget.id,
          category_id: budget.category_id,
          expense_categories: budget.expense_categories,
          categorySlug,
          categoryName
        })

        if (!categorySlug) {
          console.warn('⚠️ Budget missing category data:', budget.id, 'category_id:', budget.category_id)
          return null
        }

        const spent = await getCategoryActualSpending(userId, categorySlug, monthStart, monthEnd)
        const status = getBudgetStatus(spent, parseFloat(budget.monthly_limit))
        const forecast = await getCategoryForecastedSpending(userId, categorySlug, month)

        return {
          id: budget.id,
          category_id: budget.category_id,
          category: categorySlug, // For backward compatibility
          categorySlug,
          categoryName,
          monthly_limit: budget.monthly_limit,
          month: budget.month,
          created_at: budget.created_at,
          updated_at: budget.updated_at,
          spent,
          remaining: Math.max(0, parseFloat(budget.monthly_limit) - spent),
          overspend: Math.max(0, spent - parseFloat(budget.monthly_limit)),
          status: status.status,
          statusColor: status.color,
          statusMessage: status.message,
          percentage: status.percentage,
          forecasted: forecast.forecasted,
          forecastConfidence: forecast.confidence
        }
      })
    )

    // Filter out any null entries (budgets with missing category data)
    return enrichedBudgets.filter(b => b !== null)
  } catch (err) {
    console.error('Error getting budgets with spending:', err)
    return []
  }
}

/**
 * Check if a transaction should be excluded from budget calculations
 * Per canonical spec: "Transfers, savings, and investments are excluded from budgets"
 * @param {Object} transaction - Transaction object
 * @returns {boolean} True if should be excluded
 */
export function shouldExcludeFromBudget(transaction) {
  // Exclude transfers (per canonical spec)
  if (transaction.transaction_type === 'transfer') return true

  // Exclude reversals (metadata only)
  if (transaction.transaction_type === 'reversal') return true

  // Exclude investment-related transactions (not expenses)
  // Per canonical spec: "investments are excluded from budgets"
  if (['investment_deposit', 'investment_withdrawal', 'investment_return'].includes(transaction.transaction_type)) {
    return true
  }

  // Exclude lending transactions (not expenses)
  if (['lending', 'repayment'].includes(transaction.transaction_type)) return true

  // Exclude savings-related transactions (legacy category protection)
  // Per canonical spec: "savings...are excluded from budgets"
  // Note: New category system doesn't have "savings" category, but protect against legacy data
  if (transaction.category && transaction.category.toLowerCase() === 'savings') return true

  // Exclude bad debt write-offs (not operating expenses)
  if (transaction.transaction_type === 'bad_debt_write_off') return true

  return false
}

/**
 * Get category hierarchy (parent categories with subcategories)
 * @param {UUID} userId - User ID
 * @returns {Array} Array of parent categories with nested subcategories
 */
export async function getCategoryHierarchy(userId) {
  try {
    // Get all categories for user
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching category hierarchy:', error)
      return []
    }

    // Separate parents and children
    const parents = categories.filter(c => !c.parent_category_id)
    const children = categories.filter(c => c.parent_category_id)

    // Build hierarchy
    const hierarchy = parents.map(parent => ({
      ...parent,
      subcategories: children
        .filter(c => c.parent_category_id === parent.id)
        .sort((a, b) => a.display_order - b.display_order)
    }))

    return hierarchy
  } catch (err) {
    console.error('Error getting category hierarchy:', err)
    return []
  }
}

/**
 * Get total budget summary (server-side calculation)
 * @param {UUID} userId - User ID
 * @param {Date} month - Month to get summary for
 * @returns {Object} { totalBudget, totalSpent, totalRemaining, totalOverspend }
 */
export async function getTotalBudgetSummary(userId, month) {
  try {
    const budgets = await getBudgetsWithSpending(userId, month)

    const summary = budgets.reduce((acc, budget) => {
      acc.totalBudget += parseFloat(budget.monthly_limit || 0)
      acc.totalSpent += parseFloat(budget.spent || 0)
      acc.totalRemaining += parseFloat(budget.remaining || 0)
      acc.totalOverspend += parseFloat(budget.overspend || 0)
      return acc
    }, {
      totalBudget: 0,
      totalSpent: 0,
      totalRemaining: 0,
      totalOverspend: 0
    })

    return summary
  } catch (err) {
    console.error('Error getting total budget summary:', err)
    return {
      totalBudget: 0,
      totalSpent: 0,
      totalRemaining: 0,
      totalOverspend: 0
    }
  }
}

/**
 * Get overspent budgets (server-side calculation)
 * @param {UUID} userId - User ID
 * @param {Date} month - Month to check
 * @returns {Array} Array of budgets with status = 'over'
 */
export async function getOverspentBudgets(userId, month) {
  try {
    const budgets = await getBudgetsWithSpending(userId, month)
    return budgets.filter(budget => budget.status === 'over')
  } catch (err) {
    console.error('Error getting overspent budgets:', err)
    return []
  }
}

/**
 * Get warning budgets (approaching limit) (server-side calculation)
 * @param {UUID} userId - User ID
 * @param {Date} month - Month to check
 * @returns {Array} Array of budgets with status = 'warning'
 */
export async function getWarningBudgets(userId, month) {
  try {
    const budgets = await getBudgetsWithSpending(userId, month)
    return budgets.filter(budget => budget.status === 'warning')
  } catch (err) {
    console.error('Error getting warning budgets:', err)
    return []
  }
}

/**
 * Get category by slug (helper function)
 * @param {UUID} userId - User ID
 * @param {string} slug - Category slug
 * @returns {Object} Category object
 */
export async function getCategoryBySlug(userId, slug) {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) return null
    return data
  } catch (err) {
    console.error('Error getting category by slug:', err)
    return null
  }
}

/**
 * Get all active categories (flat list)
 * @param {UUID} userId - User ID
 * @returns {Array} Array of all active categories
 */
export async function getAllCategories(userId) {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error getting categories:', err)
    return []
  }
}

/**
 * Get budgetable categories (excludes transfers, savings, investments per canonical spec)
 * Returns only SUBCATEGORIES (budgets link to leaf nodes, not parents)
 * @param {UUID} userId - User ID
 * @returns {Array} Array of categories that can be budgeted
 */
export async function getBudgetableCategories(userId) {
  try {
    // Get all categories
    const { data: allCategories, error } = await supabase
      .from('expense_categories')
      .select(`
        id,
        slug,
        name,
        parent_category_id,
        is_system,
        is_active,
        display_order
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    if (!allCategories || allCategories.length === 0) {
      console.warn('No categories found for user:', userId)
      return []
    }

    // Separate parents and subcategories
    const parents = allCategories.filter(c => !c.parent_category_id)
    const subcategories = allCategories.filter(c => c.parent_category_id)

    // Excluded slugs per canonical spec (non-budgetable categories)
    const excludedSlugs = [
      'transfers',
      'savings-transfer',
      'investment',
      'lending',
      'repayment',
      'bad-debt',
      'account-transfer'
    ]

    // Filter out excluded subcategories
    const budgetableSubcategories = subcategories
      .filter(c => !excludedSlugs.includes(c.slug))
      .map(sub => {
        const parent = parents.find(p => p.id === sub.parent_category_id)
        return {
          category_id: sub.id,
          category_slug: sub.slug,
          category_name: sub.name,
          parent_id: sub.parent_category_id,
          parent_name: parent?.name || null,
          is_subcategory: true
        }
      })

    // Also include parent categories that have NO subcategories (standalone categories)
    const standaloneParents = parents
      .filter(parent => {
        const hasChildren = subcategories.some(sub => sub.parent_category_id === parent.id)
        return !hasChildren && !excludedSlugs.includes(parent.slug)
      })
      .map(parent => ({
        category_id: parent.id,
        category_slug: parent.slug,
        category_name: parent.name,
        parent_id: null,
        parent_name: null,
        is_subcategory: false
      }))

    const result = [...budgetableSubcategories, ...standaloneParents]
    return result
  } catch (err) {
    console.error('Error getting budgetable categories:', err)
    return []
  }
}

/**
 * Batch-fetch budgets + spending for multiple months in minimal queries.
 * @param {UUID} userId - User ID
 * @param {Date[]} monthDates - Array of Date objects (first day of each month)
 * @returns {Object} { [monthKey]: { budgets: [...], totalBudget, totalSpent } }
 */
export async function getMultiMonthBudgetHistory(userId, monthDates) {
  try {
    if (!monthDates || monthDates.length === 0) return {}

    // Build month strings and date range
    const monthStrings = monthDates.map(d => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      return `${y}-${m}-01`
    })

    const sortedDates = [...monthDates].sort((a, b) => a - b)
    const rangeStart = new Date(sortedDates[0].getFullYear(), sortedDates[0].getMonth(), 1)
    const lastDate = sortedDates[sortedDates.length - 1]
    const rangeEnd = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0)

    // 1. One query: all budgets across requested months
    const { data: allBudgets, error: budgetErr } = await supabase
      .from('budgets')
      .select(`
        id, category_id, monthly_limit, month,
        expense_categories!category_id ( id, slug, name )
      `)
      .eq('user_id', userId)
      .in('month', monthStrings)

    if (budgetErr) {
      console.error('Error fetching multi-month budgets:', budgetErr)
      return {}
    }

    // 2. One query: all expense transactions across the full date range
    const { data: allTransactions, error: txErr } = await supabase
      .from('account_transactions')
      .select('id, amount, transaction_type, category_id, date, reference_type')
      .eq('user_id', userId)
      .in('transaction_type', ['expense', 'transaction_fee'])
      .gte('date', formatLocalDate(rangeStart))
      .lte('date', formatLocalDate(rangeEnd))

    if (txErr) {
      console.error('Error fetching multi-month transactions:', txErr)
      return {}
    }

    // 3. Exclude reversed transactions
    const allTxIds = (allTransactions || []).map(t => t.id)
    const reversedIds = await getReversedTransactionIds(userId, allTxIds)

    const validTransactions = (allTransactions || []).filter(t => {
      if (reversedIds.has(t.id)) return false
      if (shouldExcludeFromBudget(t)) return false
      return true
    })

    // 4. Group spending by category_id + month
    const spendingMap = {} // { 'YYYY-MM': { categoryId: amount } }
    validTransactions.forEach(t => {
      const txMonth = t.date.substring(0, 7) // 'YYYY-MM'
      if (!spendingMap[txMonth]) spendingMap[txMonth] = {}
      if (!spendingMap[txMonth][t.category_id]) spendingMap[txMonth][t.category_id] = 0
      spendingMap[txMonth][t.category_id] += parseFloat(t.amount || 0)
    })

    // 5. Build result
    const result = {}
    monthStrings.forEach(ms => {
      const monthKey = ms.substring(0, 7) // 'YYYY-MM'
      const monthBudgets = (allBudgets || []).filter(b => b.month === ms)

      let totalBudget = 0
      let totalSpent = 0
      const enriched = monthBudgets.map(b => {
        const limit = parseFloat(b.monthly_limit || 0)
        const spent = spendingMap[monthKey]?.[b.category_id] || 0
        totalBudget += limit
        totalSpent += spent
        return {
          id: b.id,
          category_id: b.category_id,
          categorySlug: b.expense_categories?.slug,
          categoryName: b.expense_categories?.name,
          monthly_limit: b.monthly_limit,
          spent,
          percentage: limit > 0 ? (spent / limit) * 100 : 0,
          status: spent > limit ? 'over' : spent >= limit * 0.8 ? 'warning' : 'good'
        }
      })

      result[monthKey] = { budgets: enriched, totalBudget, totalSpent }
    })

    return result
  } catch (err) {
    console.error('Error in getMultiMonthBudgetHistory:', err)
    return {}
  }
}

/**
 * Get spending in categories that have no budget for the given month.
 * @param {UUID} userId - User ID
 * @param {string} monthStr - 'YYYY-MM' format
 * @param {UUID[]} budgetedCategoryIds - IDs of categories that already have budgets
 * @returns {Array} [{ categoryId, categoryName, categorySlug, spent }]
 */
export async function getUnbudgetedSpending(userId, monthStr, budgetedCategoryIds) {
  try {
    const [yearStr, monthNumStr] = monthStr.split('-')
    const year = parseInt(yearStr, 10)
    const monthNum = parseInt(monthNumStr, 10)
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`
    const endDate = new Date(year, monthNum, 0) // last day of month
    const endDateStr = formatLocalDate(endDate)

    // Get all expense transactions for the month
    const { data: transactions, error } = await supabase
      .from('account_transactions')
      .select('id, amount, transaction_type, category_id, date, reference_type')
      .eq('user_id', userId)
      .in('transaction_type', ['expense', 'transaction_fee'])
      .gte('date', startDate)
      .lte('date', endDateStr)

    if (error || !transactions) return []

    // Exclude reversed
    const reversedIds = await getReversedTransactionIds(userId, transactions.map(t => t.id))
    const valid = transactions.filter(t => {
      if (reversedIds.has(t.id)) return false
      if (shouldExcludeFromBudget(t)) return false
      return true
    })

    // Group by category_id, excluding budgeted ones
    const budgetedSet = new Set(budgetedCategoryIds || [])
    const categorySpending = {}
    valid.forEach(t => {
      if (!t.category_id || budgetedSet.has(t.category_id)) return
      if (!categorySpending[t.category_id]) categorySpending[t.category_id] = 0
      categorySpending[t.category_id] += parseFloat(t.amount || 0)
    })

    const categoryIds = Object.keys(categorySpending)
    if (categoryIds.length === 0) return []

    // Fetch category names
    const { data: cats } = await supabase
      .from('expense_categories')
      .select('id, name, slug')
      .in('id', categoryIds)

    const catMap = {}
    ;(cats || []).forEach(c => { catMap[c.id] = c })

    return categoryIds
      .map(cid => ({
        categoryId: cid,
        categoryName: catMap[cid]?.name || 'Unknown',
        categorySlug: catMap[cid]?.slug || 'other',
        spent: categorySpending[cid]
      }))
      .sort((a, b) => b.spent - a.spent)
  } catch (err) {
    console.error('Error in getUnbudgetedSpending:', err)
    return []
  }
}

export default {
  getCategoryActualSpending,
  getTotalActualSpending,
  getCategoryForecastedSpending,
  getBudgetStatus,
  getBudgetsWithSpending,
  shouldExcludeFromBudget,
  getCategoryHierarchy,
  getTotalBudgetSummary,
  getOverspentBudgets,
  getWarningBudgets,
  getCategoryBySlug,
  getAllCategories,
  getBudgetableCategories,
  getMultiMonthBudgetHistory,
  getUnbudgetedSpending
}
