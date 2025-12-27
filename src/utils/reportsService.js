/**
 * Reports Service
 *
 * Centralized service for all ledger queries used by Reports.
 * Reads from account_transactions (the ledger) as the single source of truth.
 *
 * Core Principles:
 * - Ledger-first: All data comes from account_transactions
 * - Reversal-aware: Excludes reversed transactions from totals
 * - Read-only: Reports never mutate data
 * - Deterministic: Same inputs produce same outputs
 */

export class ReportsService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Get all transactions with optional filters
   * This is the core query method used by Transaction Explorer
   */
  async getTransactions(options = {}) {
    const {
      startDate,
      endDate,
      types = null,           // Array of transaction_types to include
      accountId = null,       // Filter by specific account
      category = null,        // Filter by category
      includeReversals = true // Whether to include reversal transactions
    } = options

    try {
      let query = this.supabase
        .from('account_transactions')
        .select(`
          *,
          from_account:accounts!account_transactions_from_account_id_fkey(id, name, account_type, category),
          to_account:accounts!account_transactions_to_account_id_fkey(id, name, account_type, category)
        `)
        .eq('user_id', this.userId)

      // Date filtering
      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }

      // Transaction type filtering
      if (types && types.length > 0) {
        query = query.in('transaction_type', types)
      }

      // Account filtering (either from or to)
      if (accountId) {
        query = query.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
      }

      // Category filtering
      if (category) {
        query = query.eq('category', category)
      }

      // Exclude reversal transactions if requested
      if (!includeReversals) {
        query = query.neq('transaction_type', 'reversal')
      }

      const { data, error } = await query.order('date', { ascending: false })

      if (error) throw error

      // Get reversed transaction IDs to mark them
      const reversedIds = await this.getReversedTransactionIds(startDate, endDate)

      // Mark transactions that have been reversed
      const transactions = (data || []).map(txn => ({
        ...txn,
        isReversed: reversedIds.has(txn.reference_id)
      }))

      return {
        success: true,
        transactions
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return { success: false, error: error.message, transactions: [] }
    }
  }

  /**
   * Get IDs of transactions that have been reversed
   * Used to mark original transactions as reversed in the UI
   */
  async getReversedTransactionIds(startDate, endDate) {
    try {
      let query = this.supabase
        .from('account_transactions')
        .select('reference_id')
        .eq('user_id', this.userId)
        .eq('transaction_type', 'reversal')
        .in('reference_type', ['expense_reversal', 'income_reversal'])

      if (startDate) {
        query = query.gte('date', startDate)
      }

      const { data, error } = await query

      if (error) throw error

      return new Set((data || []).map(r => r.reference_id).filter(Boolean))
    } catch (error) {
      console.error('Error fetching reversed IDs:', error)
      return new Set()
    }
  }

  /**
   * Get income transactions (excludes reversed income)
   */
  async getIncomeTransactions(startDate, endDate) {
    try {
      // First get reversed income IDs
      const { data: reversals } = await this.supabase
        .from('account_transactions')
        .select('reference_id')
        .eq('user_id', this.userId)
        .eq('transaction_type', 'reversal')
        .eq('reference_type', 'income_reversal')

      const reversedIds = new Set((reversals || []).map(r => r.reference_id).filter(Boolean))

      // Get income transactions
      const { data, error } = await this.supabase
        .from('account_transactions')
        .select(`
          *,
          to_account:accounts!account_transactions_to_account_id_fkey(id, name, account_type, category)
        `)
        .eq('user_id', this.userId)
        .eq('transaction_type', 'income')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (error) throw error

      // Filter out reversed income
      const transactions = (data || []).filter(txn => !reversedIds.has(txn.reference_id))

      return {
        success: true,
        transactions,
        total: transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      }
    } catch (error) {
      console.error('Error fetching income transactions:', error)
      return { success: false, error: error.message, transactions: [], total: 0 }
    }
  }

  /**
   * Get expense transactions (excludes reversed expenses)
   */
  async getExpenseTransactions(startDate, endDate) {
    try {
      // First get reversed expense IDs
      const { data: reversals } = await this.supabase
        .from('account_transactions')
        .select('reference_id')
        .eq('user_id', this.userId)
        .eq('transaction_type', 'reversal')
        .eq('reference_type', 'expense_reversal')

      const reversedIds = new Set((reversals || []).map(r => r.reference_id).filter(Boolean))

      // Get expense transactions
      const { data, error } = await this.supabase
        .from('account_transactions')
        .select(`
          *,
          from_account:accounts!account_transactions_from_account_id_fkey(id, name, account_type, category)
        `)
        .eq('user_id', this.userId)
        .eq('transaction_type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (error) throw error

      // Filter out reversed expenses
      const transactions = (data || []).filter(txn => !reversedIds.has(txn.reference_id))

      return {
        success: true,
        transactions,
        total: transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      }
    } catch (error) {
      console.error('Error fetching expense transactions:', error)
      return { success: false, error: error.message, transactions: [], total: 0 }
    }
  }

  /**
   * Get transaction fees
   */
  async getTransactionFees(startDate, endDate) {
    try {
      const { data, error } = await this.supabase
        .from('account_transactions')
        .select(`
          *,
          from_account:accounts!account_transactions_from_account_id_fkey(id, name, account_type, category)
        `)
        .eq('user_id', this.userId)
        .eq('transaction_type', 'transaction_fee')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (error) throw error

      const transactions = data || []

      return {
        success: true,
        transactions,
        total: transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      }
    } catch (error) {
      console.error('Error fetching transaction fees:', error)
      return { success: false, error: error.message, transactions: [], total: 0 }
    }
  }

  /**
   * Get reversal transactions (for Transaction Explorer visibility)
   */
  async getReversals(startDate, endDate) {
    try {
      const { data, error } = await this.supabase
        .from('account_transactions')
        .select(`
          *,
          from_account:accounts!account_transactions_from_account_id_fkey(id, name, account_type, category),
          to_account:accounts!account_transactions_to_account_id_fkey(id, name, account_type, category)
        `)
        .eq('user_id', this.userId)
        .eq('transaction_type', 'reversal')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (error) throw error

      return {
        success: true,
        transactions: data || [],
        total: (data || []).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      }
    } catch (error) {
      console.error('Error fetching reversals:', error)
      return { success: false, error: error.message, transactions: [], total: 0 }
    }
  }

  /**
   * Get cash flow summary for a period
   * Returns: inflows, outflows, netFlow, daily data
   */
  async getCashFlowSummary(startDate, endDate) {
    try {
      const [incomeResult, expenseResult, feesResult] = await Promise.all([
        this.getIncomeTransactions(startDate, endDate),
        this.getExpenseTransactions(startDate, endDate),
        this.getTransactionFees(startDate, endDate)
      ])

      const inflows = incomeResult.total
      const outflows = expenseResult.total + feesResult.total
      const netFlow = inflows - outflows

      // Combine all transactions for daily breakdown
      const allTransactions = [
        ...incomeResult.transactions.map(t => ({ ...t, flowType: 'inflow', flowAmount: parseFloat(t.amount) })),
        ...expenseResult.transactions.map(t => ({ ...t, flowType: 'outflow', flowAmount: -parseFloat(t.amount) })),
        ...feesResult.transactions.map(t => ({ ...t, flowType: 'outflow', flowAmount: -parseFloat(t.amount) }))
      ].sort((a, b) => new Date(a.date) - new Date(b.date))

      // Group by date for daily flow
      const dailyFlow = {}
      allTransactions.forEach(txn => {
        const date = txn.date
        if (!dailyFlow[date]) {
          dailyFlow[date] = { date, inflow: 0, outflow: 0, net: 0 }
        }
        if (txn.flowType === 'inflow') {
          dailyFlow[date].inflow += parseFloat(txn.amount)
        } else {
          dailyFlow[date].outflow += parseFloat(txn.amount)
        }
        dailyFlow[date].net = dailyFlow[date].inflow - dailyFlow[date].outflow
      })

      // Calculate cumulative flow
      let cumulative = 0
      const dailyData = Object.values(dailyFlow)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(day => {
          cumulative += day.net
          return { ...day, cumulative }
        })

      return {
        success: true,
        summary: {
          inflows,
          outflows,
          netFlow,
          inflowOutflowRatio: outflows > 0 ? (inflows / outflows).toFixed(2) : 'N/A'
        },
        dailyData,
        transactions: allTransactions
      }
    } catch (error) {
      console.error('Error calculating cash flow:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get category breakdown for expenses
   */
  async getCategoryBreakdown(startDate, endDate) {
    try {
      const [expenseResult, feesResult] = await Promise.all([
        this.getExpenseTransactions(startDate, endDate),
        this.getTransactionFees(startDate, endDate)
      ])

      // Combine expenses and fees
      const allExpenses = [...expenseResult.transactions, ...feesResult.transactions]
      const total = allExpenses.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

      // Group by category
      const categoryMap = {}
      allExpenses.forEach(txn => {
        const category = txn.category || 'Uncategorized'
        if (!categoryMap[category]) {
          categoryMap[category] = { category, total: 0, count: 0, transactions: [] }
        }
        categoryMap[category].total += parseFloat(txn.amount || 0)
        categoryMap[category].count += 1
        categoryMap[category].transactions.push(txn)
      })

      // Convert to array and add percentages
      const categories = Object.values(categoryMap)
        .map(cat => ({
          ...cat,
          percentage: total > 0 ? ((cat.total / total) * 100).toFixed(1) : 0,
          average: cat.count > 0 ? (cat.total / cat.count).toFixed(2) : 0
        }))
        .sort((a, b) => b.total - a.total)

      return {
        success: true,
        categories,
        total,
        categoryCount: categories.length
      }
    } catch (error) {
      console.error('Error calculating category breakdown:', error)
      return { success: false, error: error.message, categories: [], total: 0 }
    }
  }

  /**
   * Get monthly trends data
   */
  async getMonthlyTrends(startDate, endDate) {
    try {
      const [incomeResult, expenseResult, feesResult] = await Promise.all([
        this.getIncomeTransactions(startDate, endDate),
        this.getExpenseTransactions(startDate, endDate),
        this.getTransactionFees(startDate, endDate)
      ])

      // Group by month
      const monthlyMap = {}

      // Process income
      incomeResult.transactions.forEach(txn => {
        const month = txn.date.substring(0, 7) // YYYY-MM
        if (!monthlyMap[month]) {
          monthlyMap[month] = { month, income: 0, expenses: 0, fees: 0, savings: 0, transactions: 0 }
        }
        monthlyMap[month].income += parseFloat(txn.amount || 0)
        monthlyMap[month].transactions += 1
      })

      // Process expenses
      expenseResult.transactions.forEach(txn => {
        const month = txn.date.substring(0, 7)
        if (!monthlyMap[month]) {
          monthlyMap[month] = { month, income: 0, expenses: 0, fees: 0, savings: 0, transactions: 0 }
        }
        monthlyMap[month].expenses += parseFloat(txn.amount || 0)
        monthlyMap[month].transactions += 1
      })

      // Process fees
      feesResult.transactions.forEach(txn => {
        const month = txn.date.substring(0, 7)
        if (!monthlyMap[month]) {
          monthlyMap[month] = { month, income: 0, expenses: 0, fees: 0, savings: 0, transactions: 0 }
        }
        monthlyMap[month].fees += parseFloat(txn.amount || 0)
        monthlyMap[month].transactions += 1
      })

      // Calculate savings and format
      const months = Object.values(monthlyMap)
        .map(m => ({
          ...m,
          totalExpenses: m.expenses + m.fees,
          savings: m.income - m.expenses - m.fees,
          savingsRate: m.income > 0 ? (((m.income - m.expenses - m.fees) / m.income) * 100).toFixed(1) : 0,
          monthLabel: new Date(m.month + '-01').toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      // Calculate month-over-month changes
      for (let i = 1; i < months.length; i++) {
        const prev = months[i - 1]
        const curr = months[i]
        curr.incomeChange = prev.income > 0 ? (((curr.income - prev.income) / prev.income) * 100).toFixed(1) : 0
        curr.expenseChange = prev.totalExpenses > 0 ? (((curr.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100).toFixed(1) : 0
      }

      return {
        success: true,
        months,
        totals: {
          income: incomeResult.total,
          expenses: expenseResult.total,
          fees: feesResult.total,
          totalExpenses: expenseResult.total + feesResult.total,
          savings: incomeResult.total - expenseResult.total - feesResult.total
        }
      }
    } catch (error) {
      console.error('Error calculating monthly trends:', error)
      return { success: false, error: error.message, months: [] }
    }
  }

  /**
   * Get yearly trends data
   */
  async getYearlyTrends(startDate, endDate) {
    try {
      const [incomeResult, expenseResult, feesResult] = await Promise.all([
        this.getIncomeTransactions(startDate, endDate),
        this.getExpenseTransactions(startDate, endDate),
        this.getTransactionFees(startDate, endDate)
      ])

      // Group by year
      const yearlyMap = {}

      // Process all transactions
      const processTransactions = (transactions, type) => {
        transactions.forEach(txn => {
          const year = txn.date.substring(0, 4) // YYYY
          if (!yearlyMap[year]) {
            yearlyMap[year] = { year, income: 0, expenses: 0, fees: 0, transactions: 0 }
          }
          yearlyMap[year][type] += parseFloat(txn.amount || 0)
          yearlyMap[year].transactions += 1
        })
      }

      processTransactions(incomeResult.transactions, 'income')
      processTransactions(expenseResult.transactions, 'expenses')
      processTransactions(feesResult.transactions, 'fees')

      // Calculate totals and format
      const years = Object.values(yearlyMap)
        .map(y => ({
          ...y,
          totalExpenses: y.expenses + y.fees,
          savings: y.income - y.expenses - y.fees,
          savingsRate: y.income > 0 ? (((y.income - y.expenses - y.fees) / y.income) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => a.year.localeCompare(b.year))

      // Calculate year-over-year changes
      for (let i = 1; i < years.length; i++) {
        const prev = years[i - 1]
        const curr = years[i]
        curr.incomeGrowth = prev.income > 0 ? (((curr.income - prev.income) / prev.income) * 100).toFixed(1) : 0
        curr.expenseGrowth = prev.totalExpenses > 0 ? (((curr.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100).toFixed(1) : 0
        curr.savingsGrowth = prev.savings !== 0 ? (((curr.savings - prev.savings) / Math.abs(prev.savings)) * 100).toFixed(1) : 0
      }

      return {
        success: true,
        years
      }
    } catch (error) {
      console.error('Error calculating yearly trends:', error)
      return { success: false, error: error.message, years: [] }
    }
  }

  /**
   * Get report summary for Quick Overview
   */
  async getReportSummary(startDate, endDate) {
    try {
      const [incomeResult, expenseResult, feesResult, categoryResult] = await Promise.all([
        this.getIncomeTransactions(startDate, endDate),
        this.getExpenseTransactions(startDate, endDate),
        this.getTransactionFees(startDate, endDate),
        this.getCategoryBreakdown(startDate, endDate)
      ])

      const totalIncome = incomeResult.total
      const totalExpenses = expenseResult.total + feesResult.total
      const netSavings = totalIncome - totalExpenses
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0

      // Calculate transaction count and average
      const totalTransactions = incomeResult.transactions.length + expenseResult.transactions.length + feesResult.transactions.length

      // Get days with expenses for average daily expense
      const expenseDates = new Set([
        ...expenseResult.transactions.map(t => t.date),
        ...feesResult.transactions.map(t => t.date)
      ])
      const daysWithExpenses = expenseDates.size || 1
      const avgDailyExpense = totalExpenses / daysWithExpenses

      // Top spending category
      const topCategory = categoryResult.categories[0] || null

      return {
        success: true,
        summary: {
          totalIncome,
          totalExpenses,
          netSavings,
          savingsRate: parseFloat(savingsRate),
          totalTransactions,
          avgDailyExpense,
          topCategory: topCategory ? {
            name: topCategory.category,
            amount: topCategory.total,
            percentage: topCategory.percentage
          } : null
        },
        income: incomeResult,
        expenses: expenseResult,
        fees: feesResult,
        categories: categoryResult
      }
    } catch (error) {
      console.error('Error fetching report summary:', error)
      return { success: false, error: error.message }
    }
  }
}

export default ReportsService
