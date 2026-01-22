/**
 * Account Service
 * Handles all account-related operations including balance management,
 * transactions, and investment tracking
 */

export class AccountService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  // ============================================================================
  // ACCOUNT MANAGEMENT
  // ============================================================================

  /**
   * Create a new account
   */
  async createAccount(accountData) {
    try {
      const { data, error } = await this.supabase
        .from('accounts')
        .insert([{
          user_id: this.userId,
          ...accountData,
          current_balance: accountData.current_balance || 0
        }])
        .select()
        .single()

      if (error) throw error
      return { success: true, account: data }
    } catch (error) {
      console.error('Error creating account:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all accounts for user
   */
  async getAccounts(activeOnly = true) {
    try {
      let query = this.supabase
        .from('accounts')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching accounts:', error)
      return []
    }
  }

  /**
   * Get single account by ID
   */
  async getAccount(accountId) {
    try {
      const { data, error } = await this.supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', this.userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching account:', error)
      return null
    }
  }

  /**
   * Get primary account
   */
  async getPrimaryAccount() {
    try {
      const { data, error} = await this.supabase
        .from('accounts')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_primary', true)
        .eq('is_active', true)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching primary account:', error)
      return null
    }
  }

  /**
   * Update account
   */
  async updateAccount(accountId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('accounts')
        .update(updates)
        .eq('id', accountId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (error) throw error
      return { success: true, account: data }
    } catch (error) {
      console.error('Error updating account:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete account (soft delete - mark as inactive)
   */
  async deleteAccount(accountId) {
    try {
      // Check if it's the primary account
      const account = await this.getAccount(accountId)
      if (account?.is_primary) {
        return { success: false, error: 'Cannot delete primary account' }
      }

      // Check if account has balance
      if (account?.current_balance > 0) {
        return { success: false, error: 'Cannot delete account with balance. Transfer funds first.' }
      }

      const { error } = await this.supabase
        .from('accounts')
        .update({ is_active: false })
        .eq('id', accountId)
        .eq('user_id', this.userId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting account:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Set account as primary
   */
  async setPrimaryAccount(accountId) {
    try {
      const { data, error } = await this.supabase
        .from('accounts')
        .update({ is_primary: true })
        .eq('id', accountId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (error) throw error
      return { success: true, account: data }
    } catch (error) {
      console.error('Error setting primary account:', error)
      return { success: false, error: error.message }
    }
  }

  // ============================================================================
  // ACCOUNT TRANSACTIONS
  // ============================================================================

  /**
   * Create a transaction
   */
  async createTransaction(transactionData) {
    try {
      const { data, error } = await this.supabase
        .from('account_transactions')
        .insert([{
          user_id: this.userId,
          ...transactionData
        }])
        .select()
        .single()

      if (error) throw error
      return { success: true, transaction: data }
    } catch (error) {
      console.error('Error creating transaction:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get account transactions
   */
  async getAccountTransactions(accountId, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('account_transactions')
        .select('*')
        .eq('user_id', this.userId)
        .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }

  /**
   * Get all transactions for user
   */
  async getAllTransactions(limit = 100) {
    try {
      const { data, error } = await this.supabase
        .from('account_transactions')
        .select('*, from_account:accounts!from_account_id(name), to_account:accounts!to_account_id(name)')
        .eq('user_id', this.userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all transactions:', error)
      return []
    }
  }

  /**
   * Transfer money between accounts
   * @param {string} fromAccountId - Source account ID
   * @param {string} toAccountId - Destination account ID
   * @param {number} amount - Transfer amount
   * @param {string} description - Optional description
   * @param {number} transactionFee - Optional transaction fee (will be recorded separately)
   */
  async transferBetweenAccounts(fromAccountId, toAccountId, amount, description = '', transactionFee = 0) {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Create the main transfer transaction
      const result = await this.createTransaction({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        transaction_type: 'transfer',
        amount: parseFloat(amount),
        description,
        date: today
      })

      if (!result.success) {
        return result
      }

      // If there's a transaction fee, record it as a separate transaction
      if (transactionFee && parseFloat(transactionFee) > 0) {
        const feeResult = await this.createTransaction({
          from_account_id: fromAccountId,
          to_account_id: null, // Fee goes nowhere (deducted from source)
          transaction_type: 'transaction_fee',
          amount: parseFloat(transactionFee),
          description: `Transfer fee${description ? ': ' + description : ''}`,
          date: today,
          notes: `Fee for transfer of ${amount} to account`
        })

        if (!feeResult.success) {
          console.error('Failed to record transaction fee:', feeResult.error)
          // Transfer succeeded but fee recording failed - still return success
          // but log the error
        }
      }

      return result
    } catch (error) {
      console.error('Error transferring funds:', error)
      return { success: false, error: error.message }
    }
  }

  // ============================================================================
  // INVESTMENT RETURNS
  // ============================================================================

  /**
   * Record investment return (interest, dividend, etc.)
   */
  async recordInvestmentReturn(returnData) {
    try {
      const { data, error } = await this.supabase
        .from('investment_returns')
        .insert([{
          user_id: this.userId,
          ...returnData
        }])
        .select()
        .single()

      if (error) throw error
      return { success: true, return: data }
    } catch (error) {
      console.error('Error recording investment return:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get investment returns for an account
   */
  async getInvestmentReturns(accountId) {
    try {
      const { data, error } = await this.supabase
        .from('investment_returns')
        .select('*')
        .eq('user_id', this.userId)
        .eq('account_id', accountId)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching investment returns:', error)
      return []
    }
  }

  // ============================================================================
  // BALANCE CALCULATIONS
  // ============================================================================

  /**
   * Calculate total balance by account type
   */
  async getBalanceByType() {
    try {
      const accounts = await this.getAccounts()

      const balances = {
        cash: 0,
        investment: 0,
        virtual: 0,
        loan: 0,
        total: 0
      }

      accounts.forEach(account => {
        const balance = parseFloat(account.current_balance)
        balances[account.account_type] = (balances[account.account_type] || 0) + balance
        // For total, add positive balances and subtract loan balances (which are negative)
        balances.total += balance
      })

      return balances
    } catch (error) {
      console.error('Error calculating balances:', error)
      return { cash: 0, investment: 0, virtual: 0, loan: 0, total: 0 }
    }
  }

  /**
   * Get available spending balance
   * (Cash accounts - committed expenses - goal allocations)
   */
  async getAvailableBalance() {
    try {
      const balances = await this.getBalanceByType()

      // TODO: Deduct committed expenses (upcoming bills, subscriptions)
      // TODO: Deduct goal allocations

      return {
        liquidCash: balances.cash,
        investments: balances.investment,
        virtual: balances.virtual,
        available: balances.cash, // For now, all cash is available
        total: balances.total
      }
    } catch (error) {
      console.error('Error calculating available balance:', error)
      return { liquidCash: 0, investments: 0, virtual: 0, available: 0, total: 0 }
    }
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * Get account summary statistics
   */
  async getAccountSummary() {
    try {
      const accounts = await this.getAccounts()
      const balances = await this.getBalanceByType()

      return {
        totalAccounts: accounts.length,
        cashAccounts: accounts.filter(a => a.account_type === 'cash').length,
        investmentAccounts: accounts.filter(a => a.account_type === 'investment').length,
        balances,
        accounts
      }
    } catch (error) {
      console.error('Error getting account summary:', error)
      return null
    }
  }

  /**
   * Get investment performance
   */
  async getInvestmentPerformance() {
    try {
      const investmentAccounts = (await this.getAccounts()).filter(
        a => a.account_type === 'investment'
      )

      const performance = []

      for (const account of investmentAccounts) {
        const returns = await this.getInvestmentReturns(account.id)
        const totalReturns = returns.reduce((sum, r) => sum + parseFloat(r.amount), 0)

        performance.push({
          account,
          totalReturns,
          returnCount: returns.length
        })
      }

      return performance
    } catch (error) {
      console.error('Error calculating investment performance:', error)
      return []
    }
  }
}

/**
 * Helper function to create account transaction from income
 */
export async function createIncomeTransaction(userId, supabase, incomeId, amount, toAccountId, date) {
  try {
    const { error } = await supabase
      .from('account_transactions')
      .insert([{
        user_id: userId,
        to_account_id: toAccountId,
        transaction_type: 'income',
        amount: parseFloat(amount),
        reference_id: incomeId,
        reference_type: 'income',
        date
      }])

    return { success: !error, error: error?.message }
  } catch (error) {
    console.error('Error creating income transaction:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Helper function to create account transaction from expense
 */
export async function createExpenseTransaction(userId, supabase, expenseId, amount, fromAccountId, date, category, description) {
  try {
    const { error } = await supabase
      .from('account_transactions')
      .insert([{
        user_id: userId,
        from_account_id: fromAccountId,
        transaction_type: 'expense',
        amount: parseFloat(amount),
        category,
        description,
        reference_id: expenseId,
        reference_type: 'expense',
        date
      }])

    return { success: !error, error: error?.message }
  } catch (error) {
    console.error('Error creating expense transaction:', error)
    return { success: false, error: error.message }
  }
}
