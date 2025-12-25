/**
 * Lending Service
 *
 * Handles lending and repayment with account integration
 * Features:
 * - Account selection for lending (source account)
 * - Account selection for repayment (destination account)
 * - Integration with account_transactions table
 * - Automatic balance updates via database triggers
 * - Status tracking (pending, partial, complete)
 */

export class LendingService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Lending statuses
   */
  static STATUS = {
    PENDING: 'pending',
    PARTIAL: 'partial',
    COMPLETE: 'complete'
  }

  /**
   * Create lending record with account integration
   * @param {object} lendingData - Lending data
   * @returns {Promise<object>} - {success, lendingId, accountTransactionId, error}
   */
  async createLending(lendingData) {
    try {
      const {
        lend_from_account_id,
        person_name,
        amount,
        date,
        due_date,
        notes,
        interest_rate
      } = lendingData

      // Validate required fields
      if (!lend_from_account_id) {
        return {
          success: false,
          error: 'Source account selection is required'
        }
      }

      if (!person_name || !person_name.trim()) {
        return {
          success: false,
          error: 'Person name is required'
        }
      }

      if (!amount || amount <= 0) {
        return {
          success: false,
          error: 'Valid amount is required'
        }
      }

      // Check account balance
      const balanceCheck = await this.checkAccountBalance(lend_from_account_id, amount)
      if (!balanceCheck.sufficient) {
        return {
          success: false,
          error: `Insufficient balance in ${balanceCheck.accountName}. Available: KES ${balanceCheck.balance.toFixed(2)}, Required: KES ${amount}`,
          balanceCheck
        }
      }

      // Step 1: Create lending_tracker record
      const { data: lending, error: lendingError } = await this.supabase
        .from('lending_tracker')
        .insert({
          user_id: this.userId,
          lend_from_account_id,
          person_name: person_name.trim(),
          amount: parseFloat(amount),
          amount_repaid: 0,
          date,
          due_date: due_date || null,
          status: LendingService.STATUS.PENDING,
          notes: notes || null,
          interest_rate: interest_rate ? parseFloat(interest_rate) : null
        })
        .select('id')
        .single()

      if (lendingError) throw lendingError

      // Step 2: Create account_transaction (money flows OUT of account)
      const { data: accountTransaction, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          from_account_id: lend_from_account_id, // Money flows OUT of account
          transaction_type: 'lending',
          amount: parseFloat(amount),
          date,
          category: 'lending',
          description: `Lent to ${person_name}`,
          reference_id: lending.id,
          reference_type: 'lending'
        })
        .select('id')
        .single()

      if (txError) throw txError

      // Step 3: Balance is automatically updated by database trigger

      return {
        success: true,
        lendingId: lending.id,
        accountTransactionId: accountTransaction.id,
        balanceCheck
      }
    } catch (error) {
      console.error('Error creating lending:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Record repayment for a lending record
   * @param {string} lendingId - Lending ID
   * @param {number} repaymentAmount - Amount being repaid
   * @param {string} repayToAccountId - Account where repayment is deposited
   * @param {string} repaymentDate - Date of repayment
   * @param {string} notes - Optional notes
   * @returns {Promise<object>} - {success, newStatus, totalRepaid, remainingAmount, accountTransactionId, error}
   */
  async recordRepayment(lendingId, repaymentAmount, repayToAccountId, repaymentDate, notes = null) {
    try {
      // Validate inputs
      if (!lendingId || !repaymentAmount || !repayToAccountId || !repaymentDate) {
        return {
          success: false,
          error: 'Lending ID, repayment amount, account, and date are required'
        }
      }

      if (repaymentAmount <= 0) {
        return {
          success: false,
          error: 'Repayment amount must be greater than zero'
        }
      }

      // Get current lending record
      const { data: lending, error: fetchError } = await this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('id', lendingId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      if (!lending) {
        return {
          success: false,
          error: 'Lending record not found'
        }
      }

      // Check if already fully repaid
      if (lending.status === LendingService.STATUS.COMPLETE) {
        return {
          success: false,
          error: 'This lending has already been fully repaid'
        }
      }

      // Calculate new totals
      const originalAmount = parseFloat(lending.amount)
      const currentlyRepaid = parseFloat(lending.amount_repaid || 0)
      const newTotalRepaid = currentlyRepaid + parseFloat(repaymentAmount)
      const remainingAmount = originalAmount - newTotalRepaid

      // Check if repayment exceeds amount owed
      if (newTotalRepaid > originalAmount) {
        return {
          success: false,
          error: `Repayment amount (${repaymentAmount}) exceeds remaining amount owed (${originalAmount - currentlyRepaid})`
        }
      }

      // Determine new status
      let newStatus = LendingService.STATUS.PARTIAL
      if (newTotalRepaid >= originalAmount) {
        newStatus = LendingService.STATUS.COMPLETE
      }

      // Step 1: Update lending_tracker record
      const { error: updateError } = await this.supabase
        .from('lending_tracker')
        .update({
          amount_repaid: newTotalRepaid,
          status: newStatus,
          repay_to_account_id: repayToAccountId,
          notes: notes ? `${lending.notes || ''}\n[${repaymentDate}] Repayment: KES ${repaymentAmount}. ${notes}`.trim() : lending.notes
        })
        .eq('id', lendingId)
        .eq('user_id', this.userId)

      if (updateError) throw updateError

      // Step 2: Create account_transaction (money flows INTO account)
      const { data: accountTransaction, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          to_account_id: repayToAccountId, // Money flows INTO account
          transaction_type: 'repayment',
          amount: parseFloat(repaymentAmount),
          date: repaymentDate,
          category: 'repayment',
          description: `Repayment from ${lending.person_name}${notes ? ` - ${notes}` : ''}`,
          reference_id: lendingId,
          reference_type: 'lending'
        })
        .select('id')
        .single()

      if (txError) throw txError

      // Step 3: Balance is automatically updated by database trigger

      return {
        success: true,
        newStatus,
        totalRepaid: newTotalRepaid,
        remainingAmount: Math.max(0, remainingAmount),
        accountTransactionId: accountTransaction.id
      }
    } catch (error) {
      console.error('Error recording repayment:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get lending with full transaction history
   * @param {string} lendingId - Lending ID
   * @returns {Promise<object>} - {success, lending, transactions, error}
   */
  async getLendingWithTransactions(lendingId) {
    try {
      // Get lending record
      const { data: lending, error: lendingError } = await this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('id', lendingId)
        .eq('user_id', this.userId)
        .single()

      if (lendingError) throw lendingError

      // Manually fetch lend_from_account if exists
      if (lending.lend_from_account_id) {
        const { data: lendAccount } = await this.supabase
          .from('accounts')
          .select('id, name, account_type, current_balance')
          .eq('id', lending.lend_from_account_id)
          .single()

        lending.lend_from_account = lendAccount
      }

      // Manually fetch repay_to_account if exists
      if (lending.repay_to_account_id) {
        const { data: repayAccount } = await this.supabase
          .from('accounts')
          .select('id, name, account_type, current_balance')
          .eq('id', lending.repay_to_account_id)
          .single()

        lending.repay_to_account = repayAccount
      }

      // Get all associated account transactions (lending + repayments)
      const { data: transactions, error: txError } = await this.supabase
        .from('account_transactions')
        .select('*')
        .eq('reference_id', lendingId)
        .eq('reference_type', 'lending')
        .order('date', { ascending: true })

      if (txError) throw txError

      return {
        success: true,
        lending,
        transactions: transactions || []
      }
    } catch (error) {
      console.error('Error getting lending with transactions:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get all lending records with summary
   * @param {object} filters - {status, person_name, startDate, endDate}
   * @returns {Promise<object>} - {success, lendings, summary, error}
   */
  async getAllLendings(filters = {}) {
    try {
      let query = this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('user_id', this.userId)

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.person_name) {
        query = query.ilike('person_name', `%${filters.person_name}%`)
      }

      if (filters.startDate) {
        query = query.gte('date', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate)
      }

      const { data: lendings, error } = await query.order('date', { ascending: false })

      if (error) throw error

      // Manually fetch account information for each lending if account_id exists
      if (lendings && lendings.length > 0) {
        const lendingsWithAccounts = await Promise.all(
          lendings.map(async (lending) => {
            if (lending.lend_from_account_id) {
              const { data: account } = await this.supabase
                .from('accounts')
                .select('id, name, account_type')
                .eq('id', lending.lend_from_account_id)
                .single()

              return {
                ...lending,
                lend_from_account: account
              }
            }
            return lending
          })
        )
        lendings.splice(0, lendings.length, ...lendingsWithAccounts)
      }

      // Calculate summary
      const summary = {
        totalLent: 0,
        totalRepaid: 0,
        totalOutstanding: 0,
        count: lendings.length,
        byStatus: {
          [LendingService.STATUS.PENDING]: { count: 0, amount: 0 },
          [LendingService.STATUS.PARTIAL]: { count: 0, amount: 0, repaid: 0 },
          [LendingService.STATUS.COMPLETE]: { count: 0, amount: 0 }
        }
      }

      lendings.forEach(lending => {
        const amount = parseFloat(lending.amount)
        const repaid = parseFloat(lending.amount_repaid || 0)
        const outstanding = amount - repaid

        summary.totalLent += amount
        summary.totalRepaid += repaid
        summary.totalOutstanding += outstanding

        summary.byStatus[lending.status].count++
        summary.byStatus[lending.status].amount += amount
        if (lending.status === LendingService.STATUS.PARTIAL) {
          summary.byStatus[lending.status].repaid += repaid
        }
      })

      return {
        success: true,
        lendings: lendings || [],
        summary
      }
    } catch (error) {
      console.error('Error getting all lendings:', error)
      return {
        success: false,
        lendings: [],
        error: error.message
      }
    }
  }

  /**
   * Check account balance before lending
   * @param {string} accountId - Account ID
   * @param {number} amount - Amount to lend
   * @returns {Promise<object>} - {sufficient, balance, deficit, accountName}
   */
  async checkAccountBalance(accountId, amount) {
    try {
      const { data: account, error } = await this.supabase
        .from('accounts')
        .select('id, name, current_balance')
        .eq('id', accountId)
        .single()

      if (error) throw error

      if (!account) {
        return {
          sufficient: false,
          balance: 0,
          deficit: amount,
          accountName: 'Unknown Account',
          error: 'Account not found'
        }
      }

      const balance = parseFloat(account.current_balance)
      const sufficient = balance >= amount

      return {
        sufficient,
        balance,
        deficit: sufficient ? 0 : amount - balance,
        accountName: account.name
      }
    } catch (error) {
      console.error('Error checking account balance:', error)
      return {
        sufficient: false,
        balance: 0,
        deficit: amount,
        accountName: 'Unknown',
        error: error.message
      }
    }
  }

  /**
   * Get account options for lending
   * Only cash and investment accounts with balance > 0
   * @returns {Promise<object>} - {success, accounts, error}
   */
  async getAccountsForLending() {
    try {
      const { data: accounts, error } = await this.supabase
        .from('accounts')
        .select('id, name, account_type, category, current_balance, institution_name')
        .eq('user_id', this.userId)
        .in('account_type', ['cash', 'investment'])
        .order('is_primary', { ascending: false }) // Primary accounts first
        .order('current_balance', { ascending: false }) // Highest balance first

      if (error) throw error

      return {
        success: true,
        accounts: accounts || []
      }
    } catch (error) {
      console.error('Error getting accounts for lending:', error)
      return {
        success: false,
        accounts: [],
        error: error.message
      }
    }
  }

  /**
   * Delete lending record (only if no repayments made)
   * @param {string} lendingId - Lending ID
   * @returns {Promise<object>} - {success, error}
   */
  async deleteLending(lendingId) {
    try {
      // Get lending to check if any repayments have been made
      const { data: lending, error: fetchError } = await this.supabase
        .from('lending_tracker')
        .select('amount_repaid')
        .eq('id', lendingId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      if (parseFloat(lending.amount_repaid || 0) > 0) {
        return {
          success: false,
          error: 'Cannot delete lending with repayments. Consider marking as complete instead.'
        }
      }

      // Delete account transactions
      const { error: txError } = await this.supabase
        .from('account_transactions')
        .delete()
        .eq('reference_id', lendingId)
        .eq('reference_type', 'lending')

      if (txError) throw txError

      // Delete lending record
      const { error: deleteError } = await this.supabase
        .from('lending_tracker')
        .delete()
        .eq('id', lendingId)
        .eq('user_id', this.userId)

      if (deleteError) throw deleteError

      return { success: true }
    } catch (error) {
      console.error('Error deleting lending:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default LendingService
