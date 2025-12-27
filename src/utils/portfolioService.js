/**
 * Portfolio Service
 *
 * Aggregates data from accounts, net_worth, goals, and account_transactions
 * to provide a unified view of the user's financial position.
 *
 * Core Principles:
 * - Money lives in Accounts
 * - Net Worth is derived (Assets - Liabilities)
 * - Goals observe accounts, don't hold money
 * - account_transactions is the source of truth
 */

export class PortfolioService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Get complete portfolio summary
   * Returns all data needed for the Portfolio page
   */
  async getPortfolioSummary() {
    try {
      const [
        accountsResult,
        manualAssetsResult,
        liabilitiesResult,
        goalsResult,
        lendingResult
      ] = await Promise.all([
        this.getAccountsSummary(),
        this.getManualAssets(),
        this.getLiabilities(),
        this.getGoalsSummary(),
        this.getLendingReceivables()
      ])

      // Calculate totals
      const accountsTotal = accountsResult.success ? accountsResult.total : 0
      const manualAssetsTotal = manualAssetsResult.success ? manualAssetsResult.total : 0
      const lendingTotal = lendingResult.success ? lendingResult.total : 0
      const liabilitiesTotal = liabilitiesResult.success ? liabilitiesResult.total : 0

      const totalAssets = accountsTotal + manualAssetsTotal + lendingTotal
      const totalLiabilities = liabilitiesTotal
      const netWorth = totalAssets - totalLiabilities

      return {
        success: true,
        summary: {
          totalAssets,
          totalLiabilities,
          netWorth,
          accountsTotal,
          manualAssetsTotal,
          lendingTotal
        },
        accounts: accountsResult.success ? accountsResult.accounts : [],
        accountsByType: accountsResult.success ? accountsResult.byType : {},
        manualAssets: manualAssetsResult.success ? manualAssetsResult.assets : [],
        liabilities: liabilitiesResult.success ? liabilitiesResult.liabilities : [],
        goals: goalsResult.success ? goalsResult.goals : [],
        goalsSummary: goalsResult.success ? goalsResult.summary : {},
        lending: lendingResult.success ? lendingResult.loans : []
      }
    } catch (error) {
      console.error('Error fetching portfolio summary:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get accounts summary grouped by type
   * Source: accounts table (cash, savings, investment)
   */
  async getAccountsSummary() {
    try {
      const { data, error } = await this.supabase
        .from('accounts')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('current_balance', { ascending: false })

      if (error) throw error

      const accounts = data || []

      // Group by type
      const byType = {
        cash: accounts.filter(a => a.account_type === 'cash'),
        savings: accounts.filter(a => a.account_type === 'virtual' || a.category === 'sacco' || a.category === 'fixed_deposit'),
        investment: accounts.filter(a => a.account_type === 'investment')
      }

      // Calculate totals
      const total = accounts.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0)
      const cashTotal = byType.cash.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0)
      const savingsTotal = byType.savings.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0)
      const investmentTotal = byType.investment.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0)

      return {
        success: true,
        accounts,
        byType,
        total,
        totals: {
          cash: cashTotal,
          savings: savingsTotal,
          investment: investmentTotal
        }
      }
    } catch (error) {
      console.error('Error fetching accounts summary:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get manual assets from net_worth table
   * These are assets not tracked as accounts (property, vehicles, etc.)
   * Note: net_worth table uses 'asset_type' and 'amount' columns
   */
  async getManualAssets() {
    try {
      const { data, error } = await this.supabase
        .from('net_worth')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_liability', false)
        .in('asset_type', ['property', 'vehicle', 'other_asset'])
        .order('amount', { ascending: false })

      if (error) throw error

      const assets = data || []
      const total = assets.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0)

      return {
        success: true,
        assets,
        total
      }
    } catch (error) {
      console.error('Error fetching manual assets:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get liabilities from net_worth table
   * Note: net_worth table uses 'asset_type' and 'amount' columns
   */
  async getLiabilities() {
    try {
      const { data, error } = await this.supabase
        .from('net_worth')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_liability', true)
        .order('amount', { ascending: false })

      if (error) throw error

      const liabilities = data || []
      const total = liabilities.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0)

      return {
        success: true,
        liabilities,
        total
      }
    } catch (error) {
      console.error('Error fetching liabilities:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get goals summary
   * Goals observe accounts - they don't hold money
   */
  async getGoalsSummary() {
    try {
      const { data, error } = await this.supabase
        .from('goals')
        .select(`
          *,
          linked_account:accounts!goals_linked_account_id_fkey(id, name, current_balance, account_type, category)
        `)
        .eq('user_id', this.userId)
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false })

      if (error) throw error

      const goals = data || []

      // Calculate summary
      const activeGoals = goals.filter(g => g.status === 'active')
      const totalTargetAmount = activeGoals.reduce((sum, g) => sum + parseFloat(g.target_amount || 0), 0)
      const totalCurrentAmount = activeGoals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0)
      const onTrackCount = activeGoals.filter(g => {
        if (!g.deadline) return true
        const progress = (g.current_amount / g.target_amount) * 100
        const daysRemaining = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        const expectedProgress = g.deadline ? ((new Date() - new Date(g.created_at)) / (new Date(g.deadline) - new Date(g.created_at))) * 100 : 0
        return progress >= expectedProgress * 0.8 || daysRemaining > 30
      }).length

      return {
        success: true,
        goals,
        summary: {
          total: goals.length,
          active: activeGoals.length,
          paused: goals.filter(g => g.status === 'paused').length,
          onTrack: onTrackCount,
          totalTargetAmount,
          totalCurrentAmount,
          overallProgress: totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0
        }
      }
    } catch (error) {
      console.error('Error fetching goals summary:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get lending receivables (money lent out = assets)
   */
  async getLendingReceivables() {
    try {
      const { data, error } = await this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('user_id', this.userId)
        .in('repayment_status', ['pending', 'partial'])
        .order('date_lent', { ascending: false })

      if (error) throw error

      const loans = data || []
      const total = loans.reduce((sum, l) => {
        const amount = parseFloat(l.amount || 0)
        const repaid = parseFloat(l.amount_repaid || 0)
        return sum + (amount - repaid)
      }, 0)

      return {
        success: true,
        loans,
        total
      }
    } catch (error) {
      console.error('Error fetching lending receivables:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get recent portfolio activity
   * Unified transaction feed from account_transactions
   */
  async getRecentActivity(limit = 15) {
    try {
      const { data, error } = await this.supabase
        .from('account_transactions')
        .select(`
          *,
          from_account:accounts!account_transactions_from_account_id_fkey(id, name, account_type, category),
          to_account:accounts!account_transactions_to_account_id_fkey(id, name, account_type, category)
        `)
        .eq('user_id', this.userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return {
        success: true,
        transactions: data || []
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get net worth history for trend chart
   */
  async getNetWorthHistory(months = 6) {
    try {
      // Get historical snapshots from net_worth_history if it exists
      // Otherwise, calculate from transactions

      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)

      // For now, calculate current values and show trend
      // In a full implementation, you'd store monthly snapshots
      const { data: transactions, error } = await this.supabase
        .from('account_transactions')
        .select('date, amount, transaction_type, from_account_id, to_account_id')
        .eq('user_id', this.userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error

      // Group by month and calculate running balance changes
      const monthlyData = {}
      const txns = transactions || []

      txns.forEach(txn => {
        const monthKey = txn.date.substring(0, 7) // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expense: 0, net: 0 }
        }

        const amount = parseFloat(txn.amount || 0)
        if (txn.transaction_type === 'income' || txn.transaction_type === 'investment_return') {
          monthlyData[monthKey].income += amount
          monthlyData[monthKey].net += amount
        } else if (txn.transaction_type === 'expense') {
          monthlyData[monthKey].expense += amount
          monthlyData[monthKey].net -= amount
        }
      })

      // Convert to array for charting
      const history = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data
      }))

      return {
        success: true,
        history
      }
    } catch (error) {
      console.error('Error fetching net worth history:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get asset allocation data for pie chart
   */
  async getAssetAllocation() {
    try {
      const accountsResult = await this.getAccountsSummary()
      const manualResult = await this.getManualAssets()
      const lendingResult = await this.getLendingReceivables()

      if (!accountsResult.success) throw new Error(accountsResult.error)

      const allocation = [
        { name: 'Cash & Wallets', value: accountsResult.totals.cash, color: '#10B981' },
        { name: 'Savings', value: accountsResult.totals.savings, color: '#3B82F6' },
        { name: 'Investments', value: accountsResult.totals.investment, color: '#8B5CF6' },
      ]

      if (manualResult.success && manualResult.total > 0) {
        allocation.push({ name: 'Property & Other', value: manualResult.total, color: '#F59E0B' })
      }

      if (lendingResult.success && lendingResult.total > 0) {
        allocation.push({ name: 'Receivables', value: lendingResult.total, color: '#EC4899' })
      }

      // Filter out zero values
      const filteredAllocation = allocation.filter(a => a.value > 0)
      const total = filteredAllocation.reduce((sum, a) => sum + a.value, 0)

      return {
        success: true,
        allocation: filteredAllocation,
        total
      }
    } catch (error) {
      console.error('Error fetching asset allocation:', error)
      return { success: false, error: error.message }
    }
  }
}

export default PortfolioService
