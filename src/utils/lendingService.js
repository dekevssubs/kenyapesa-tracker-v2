/**
 * Lending Service
 *
 * Handles lending and repayment with account integration
 * Features:
 * - Account selection for lending (source account)
 * - Account selection for repayment (destination account)
 * - Integration with account_transactions table
 * - Automatic balance updates via database triggers
 * - Status tracking (pending, partial, complete, forgiven)
 * - Counterparty-centric views
 * - Forgiveness with bad debt tracking
 *
 * Category Integration (per canonical spec):
 * - Uses category_id (UUID foreign key) for all transactions
 * - Categories: 'lending', 'repayment', 'transaction-charges', 'bad-debt'
 */

export class LendingService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
    this._categoryCache = {} // Cache category IDs to avoid repeated lookups
  }

  /**
   * Get category_id from slug (with caching)
   * @param {string} slug - Category slug
   * @returns {Promise<string|null>} - Category UUID or null
   */
  async getCategoryId(slug) {
    // Check cache first
    if (this._categoryCache[slug]) {
      return this._categoryCache[slug]
    }

    try {
      const { data, error } = await this.supabase
        .from('expense_categories')
        .select('id')
        .eq('user_id', this.userId)
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        console.warn(`Category '${slug}' not found for user`)
        return null
      }

      // Cache the result
      this._categoryCache[slug] = data.id
      return data.id
    } catch (err) {
      console.error('Error getting category ID:', err)
      return null
    }
  }

  /**
   * Lending statuses
   */
  static STATUS = {
    PENDING: 'pending',
    PARTIAL: 'partial',
    COMPLETE: 'complete',
    FORGIVEN: 'forgiven'
  }

  /**
   * Create lending record with account integration
   * @param {object} lendingData - Lending data
   * @returns {Promise<object>} - {success, lendingId, accountTransactionId, feeTransactionId, error}
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
        interest_rate,
        transaction_fee,
        fee_method // 'included' or 'separate'
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

      // Calculate total amount needed (including fee if separate)
      const feeAmount = (fee_method === 'separate' && transaction_fee) ? parseFloat(transaction_fee) : 0
      const totalRequired = parseFloat(amount) + feeAmount

      // Check account balance
      const balanceCheck = await this.checkAccountBalance(lend_from_account_id, totalRequired)
      if (!balanceCheck.sufficient) {
        return {
          success: false,
          error: `Insufficient balance in ${balanceCheck.accountName}. Available: KES ${balanceCheck.balance.toFixed(2)}, Required: KES ${totalRequired.toFixed(2)}${feeAmount > 0 ? ` (${amount} + ${feeAmount} fee)` : ''}`,
          balanceCheck
        }
      }

      // Step 1: Create lending_tracker record
      // Note: interest_rate is stored in notes if provided (column doesn't exist in DB)
      const notesWithInterest = interest_rate
        ? `${notes || ''}${notes ? '\n' : ''}Interest Rate: ${interest_rate}%`.trim()
        : notes || null

      const { data: lending, error: lendingError } = await this.supabase
        .from('lending_tracker')
        .insert({
          user_id: this.userId,
          lend_from_account_id,
          person_name: person_name.trim(),
          amount: parseFloat(amount),
          amount_repaid: 0,
          date_lent: date,
          expected_return_date: due_date || null,
          repayment_status: LendingService.STATUS.PENDING,
          notes: notesWithInterest
        })
        .select('id')
        .single()

      if (lendingError) throw lendingError

      // Step 2: Get category IDs for lending and fees
      const lendingCategoryId = await this.getCategoryId('lending') ||
                                await this.getCategoryId('uncategorized')
      const feeCategoryId = await this.getCategoryId('transaction-charges') ||
                            await this.getCategoryId('bank-fees')

      // Step 3: Create account_transaction (money flows OUT of account)
      const { data: accountTransaction, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          from_account_id: lend_from_account_id, // Money flows OUT of account
          transaction_type: 'lending',
          amount: parseFloat(amount),
          date,
          category_id: lendingCategoryId,
          category: 'lending', // Keep for backwards compatibility
          description: `Lent to ${person_name}`,
          reference_id: lending.id,
          reference_type: 'lending'
        })
        .select('id')
        .single()

      if (txError) throw txError

      // Step 4: Record transaction fee if provided and separate
      let feeTransactionId = null
      if (feeAmount > 0) {
        const { data: feeTx, error: feeError } = await this.supabase
          .from('account_transactions')
          .insert({
            user_id: this.userId,
            from_account_id: lend_from_account_id,
            transaction_type: 'transaction_fee',
            amount: feeAmount,
            date,
            category_id: feeCategoryId,
            category: 'transaction-charges', // Standardized slug
            description: `M-Pesa fee for lending to ${person_name}`,
            reference_id: lending.id,
            reference_type: 'lending'
          })
          .select('id')
          .single()

        if (feeError) {
          console.warn('Failed to record transaction fee:', feeError)
          // Don't fail the whole operation if fee recording fails
        } else {
          feeTransactionId = feeTx.id
        }
      }

      // Step 4: Balance is automatically updated by database trigger

      return {
        success: true,
        lendingId: lending.id,
        accountTransactionId: accountTransaction.id,
        feeTransactionId,
        feeAmount,
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
      if (lending.repayment_status === LendingService.STATUS.COMPLETE) {
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
          repayment_status: newStatus,
          repay_to_account_id: repayToAccountId,
          notes: notes ? `${lending.notes || ''}\n[${repaymentDate}] Repayment: KES ${repaymentAmount}. ${notes}`.trim() : lending.notes
        })
        .eq('id', lendingId)
        .eq('user_id', this.userId)

      if (updateError) throw updateError

      // Step 2: Get category ID for repayment
      const repaymentCategoryId = await this.getCategoryId('repayment') ||
                                   await this.getCategoryId('uncategorized')

      // Step 3: Create account_transaction (money flows INTO account)
      const { data: accountTransaction, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          to_account_id: repayToAccountId, // Money flows INTO account
          transaction_type: 'repayment',
          amount: parseFloat(repaymentAmount),
          date: repaymentDate,
          category_id: repaymentCategoryId,
          category: 'repayment', // Keep for backwards compatibility
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
        query = query.gte('date_lent', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('date_lent', filters.endDate)
      }

      const { data: lendings, error } = await query.order('date_lent', { ascending: false })

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

        // Ensure status exists in byStatus object before accessing
        const status = lending.repayment_status || lending.status || LendingService.STATUS.PENDING
        if (summary.byStatus[status]) {
          summary.byStatus[status].count++
          summary.byStatus[status].amount += amount
          if (status === LendingService.STATUS.PARTIAL) {
            summary.byStatus[status].repaid += repaid
          }
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

  /**
   * Get lendings grouped by counterparty (person)
   * This is the counterparty-centric view
   * @returns {Promise<object>} - {success, counterparties, summary, error}
   */
  async getLendingsByCounterparty() {
    try {
      // Get all active lendings (not complete, not forgiven)
      const { data: lendings, error } = await this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('user_id', this.userId)
        .order('date_lent', { ascending: false })

      if (error) throw error

      // Group by person_name
      const counterpartyMap = new Map()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const lending of lendings || []) {
        const personName = lending.person_name
        const amount = parseFloat(lending.amount) || 0
        const repaid = parseFloat(lending.amount_repaid) || 0
        const outstanding = amount - repaid

        // Calculate overdue status
        let isOverdue = false
        let daysOverdue = 0
        const lendingDueDate = lending.expected_return_date || lending.due_date
        const lendingStatus = lending.repayment_status || lending.status
        if (lendingDueDate && lendingStatus !== LendingService.STATUS.COMPLETE && lendingStatus !== LendingService.STATUS.FORGIVEN) {
          const dueDate = new Date(lendingDueDate)
          dueDate.setHours(0, 0, 0, 0)
          if (today > dueDate) {
            isOverdue = true
            daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
          }
        }

        if (!counterpartyMap.has(personName)) {
          counterpartyMap.set(personName, {
            personName,
            loans: [],
            totalLent: 0,
            totalRepaid: 0,
            totalOutstanding: 0,
            activeLoans: 0,
            overdueLoans: 0,
            oldestLoanDate: null,
            nearestDueDate: null,
            isOverdue: false,
            maxDaysOverdue: 0
          })
        }

        const counterparty = counterpartyMap.get(personName)
        counterparty.loans.push({
          ...lending,
          // Normalize field names for UI compatibility
          status: lendingStatus,
          due_date: lendingDueDate,
          outstanding,
          isOverdue,
          daysOverdue
        })
        counterparty.totalLent += amount
        counterparty.totalRepaid += repaid
        counterparty.totalOutstanding += outstanding

        if (lendingStatus !== LendingService.STATUS.COMPLETE && lendingStatus !== LendingService.STATUS.FORGIVEN) {
          counterparty.activeLoans++
          if (isOverdue) {
            counterparty.overdueLoans++
            counterparty.isOverdue = true
            counterparty.maxDaysOverdue = Math.max(counterparty.maxDaysOverdue, daysOverdue)
          }
        }

        // Track oldest loan date
        const loanDate = new Date(lending.date_lent || lending.date)
        if (!counterparty.oldestLoanDate || loanDate < counterparty.oldestLoanDate) {
          counterparty.oldestLoanDate = loanDate
        }

        // Track nearest due date for active loans
        if (lendingDueDate && lendingStatus !== LendingService.STATUS.COMPLETE && lendingStatus !== LendingService.STATUS.FORGIVEN) {
          const dueDate = new Date(lendingDueDate)
          if (!counterparty.nearestDueDate || dueDate < counterparty.nearestDueDate) {
            counterparty.nearestDueDate = dueDate
          }
        }
      }

      // Convert to array and calculate status
      const counterparties = Array.from(counterpartyMap.values()).map(cp => ({
        ...cp,
        status: this.calculateCounterpartyStatus(cp)
      }))

      // Sort by: overdue first, then by outstanding amount
      counterparties.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        return b.totalOutstanding - a.totalOutstanding
      })

      // Calculate overall summary
      const summary = {
        totalCounterparties: counterparties.length,
        activeCounterparties: counterparties.filter(c => c.activeLoans > 0).length,
        totalLent: counterparties.reduce((sum, c) => sum + c.totalLent, 0),
        totalRepaid: counterparties.reduce((sum, c) => sum + c.totalRepaid, 0),
        totalOutstanding: counterparties.reduce((sum, c) => sum + c.totalOutstanding, 0),
        overdueCounterparties: counterparties.filter(c => c.isOverdue).length,
        totalOverdueAmount: counterparties
          .filter(c => c.isOverdue)
          .reduce((sum, c) => sum + c.totalOutstanding, 0)
      }

      return {
        success: true,
        counterparties,
        summary
      }
    } catch (error) {
      console.error('Error getting lendings by counterparty:', error)
      return {
        success: false,
        counterparties: [],
        error: error.message
      }
    }
  }

  /**
   * Calculate counterparty status based on their loans
   * @param {object} counterparty - Counterparty data
   * @returns {string} - Status (on-track, partial, overdue, complete)
   */
  calculateCounterpartyStatus(counterparty) {
    if (counterparty.totalOutstanding <= 0) {
      return 'complete'
    }
    if (counterparty.isOverdue) {
      return 'overdue'
    }
    if (counterparty.totalRepaid > 0) {
      return 'partial'
    }
    return 'pending'
  }

  /**
   * Get ledger timeline for a lending record
   * @param {string} lendingId - Lending ID
   * @returns {Promise<object>} - {success, timeline, lending, error}
   */
  async getLedgerTimeline(lendingId) {
    try {
      // Get the lending record
      const { data: lending, error: lendingError } = await this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('id', lendingId)
        .eq('user_id', this.userId)
        .single()

      if (lendingError) throw lendingError

      if (!lending) {
        return {
          success: false,
          error: 'Lending record not found'
        }
      }

      // Get all account transactions for this lending
      const { data: transactions, error: txError } = await this.supabase
        .from('account_transactions')
        .select(`
          *,
          from_account:accounts!account_transactions_from_account_id_fkey(id, name),
          to_account:accounts!account_transactions_to_account_id_fkey(id, name)
        `)
        .eq('reference_id', lendingId)
        .eq('reference_type', 'lending')
        .order('date', { ascending: true })

      if (txError) {
        // Fallback without joins if foreign key doesn't exist
        const { data: txSimple, error: txSimpleError } = await this.supabase
          .from('account_transactions')
          .select('*')
          .eq('reference_id', lendingId)
          .eq('reference_type', 'lending')
          .order('date', { ascending: true })

        if (txSimpleError) throw txSimpleError

        return {
          success: true,
          lending,
          timeline: txSimple || []
        }
      }

      return {
        success: true,
        lending,
        timeline: transactions || []
      }
    } catch (error) {
      console.error('Error getting ledger timeline:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Forgive a lending (write off as bad debt)
   * This creates a bad_debt expense entry and marks lending as forgiven
   * @param {string} lendingId - Lending ID
   * @param {string} reason - Reason for forgiveness
   * @returns {Promise<object>} - {success, badDebtTransactionId, error}
   */
  async forgiveLending(lendingId, reason = '') {
    try {
      // Get the lending record
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

      // Check if already complete or forgiven
      if (lending.repayment_status === LendingService.STATUS.COMPLETE) {
        return {
          success: false,
          error: 'This lending has already been fully repaid'
        }
      }

      if (lending.repayment_status === LendingService.STATUS.FORGIVEN) {
        return {
          success: false,
          error: 'This lending has already been forgiven'
        }
      }

      // Calculate outstanding amount to write off
      const originalAmount = parseFloat(lending.amount)
      const repaidAmount = parseFloat(lending.amount_repaid || 0)
      const writeOffAmount = originalAmount - repaidAmount

      if (writeOffAmount <= 0) {
        return {
          success: false,
          error: 'No outstanding amount to forgive'
        }
      }

      // Step 1: Get or create the Bad Debt Write-Off system account
      // This account tracks cumulative losses from forgiven debts
      const { data: writeOffAccountId, error: accountError } = await this.supabase
        .rpc('get_or_create_bad_debt_account', {
          p_user_id: this.userId
        })

      if (accountError) throw accountError

      // Step 2: Get category ID for bad debt
      const badDebtCategoryId = await this.getCategoryId('bad-debt') ||
                                await this.getCategoryId('uncategorized')

      // Step 3: Create bad_debt transaction in ledger (ledger-first architecture)
      // Money flows from lender's original account to write-off account
      // This properly records the loss while preserving ledger invariants
      const { data: badDebtTx, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          from_account_id: lending.lend_from_account_id,  // Account that lent the money
          to_account_id: writeOffAccountId,                // System account tracking losses
          transaction_type: 'bad_debt',
          amount: writeOffAmount,
          date: new Date().toISOString().split('T')[0],
          category_id: badDebtCategoryId,
          category: 'bad-debt', // Standardized slug
          description: `Debt forgiven: ${lending.person_name}${reason ? ` - ${reason}` : ''}`,
          reference_id: lendingId,
          reference_type: 'lending'
        })
        .select('id')
        .single()

      if (txError) throw txError

      // Step 3: Update lending record to forgiven status
      const { error: updateError } = await this.supabase
        .from('lending_tracker')
        .update({
          repayment_status: LendingService.STATUS.FORGIVEN,
          forgiven_at: new Date().toISOString(),
          forgiven_reason: reason || null,
          notes: lending.notes
            ? `${lending.notes}\n[Forgiven] ${new Date().toLocaleDateString()}: ${writeOffAmount} written off${reason ? ` - ${reason}` : ''}`
            : `[Forgiven] ${new Date().toLocaleDateString()}: ${writeOffAmount} written off${reason ? ` - ${reason}` : ''}`
        })
        .eq('id', lendingId)
        .eq('user_id', this.userId)

      if (updateError) throw updateError

      return {
        success: true,
        writeOffAmount,
        badDebtTransactionId: badDebtTx.id
      }
    } catch (error) {
      console.error('Error forgiving lending:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get all lendings for a specific counterparty
   * @param {string} personName - The counterparty's name
   * @returns {Promise<object>} - {success, lendings, summary, error}
   */
  async getLendingsForPerson(personName) {
    try {
      const { data: lendings, error } = await this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('user_id', this.userId)
        .eq('person_name', personName)
        .order('date_lent', { ascending: false })

      if (error) throw error

      // Get account info for each lending
      const lendingsWithAccounts = await Promise.all(
        (lendings || []).map(async (lending) => {
          let lendFromAccount = null
          let repayToAccount = null

          if (lending.lend_from_account_id) {
            const { data: account } = await this.supabase
              .from('accounts')
              .select('id, name, account_type')
              .eq('id', lending.lend_from_account_id)
              .single()
            lendFromAccount = account
          }

          if (lending.repay_to_account_id) {
            const { data: account } = await this.supabase
              .from('accounts')
              .select('id, name, account_type')
              .eq('id', lending.repay_to_account_id)
              .single()
            repayToAccount = account
          }

          const outstanding = parseFloat(lending.amount) - parseFloat(lending.amount_repaid || 0)

          return {
            ...lending,
            // Normalize field names for UI compatibility
            status: lending.repayment_status || lending.status,
            due_date: lending.expected_return_date || lending.due_date,
            lend_from_account: lendFromAccount,
            repay_to_account: repayToAccount,
            outstanding
          }
        })
      )

      // Calculate summary for this person
      const summary = {
        totalLent: lendingsWithAccounts.reduce((sum, l) => sum + parseFloat(l.amount), 0),
        totalRepaid: lendingsWithAccounts.reduce((sum, l) => sum + parseFloat(l.amount_repaid || 0), 0),
        totalOutstanding: lendingsWithAccounts.reduce((sum, l) => sum + l.outstanding, 0),
        loanCount: lendingsWithAccounts.length,
        activeLoans: lendingsWithAccounts.filter(l => {
          const status = l.repayment_status || l.status
          return status !== LendingService.STATUS.COMPLETE &&
                 status !== LendingService.STATUS.FORGIVEN
        }).length
      }

      return {
        success: true,
        lendings: lendingsWithAccounts,
        summary
      }
    } catch (error) {
      console.error('Error getting lendings for person:', error)
      return {
        success: false,
        lendings: [],
        error: error.message
      }
    }
  }

  /**
   * Get overdue lendings
   * @returns {Promise<object>} - {success, lendings, error}
   */
  async getOverdueLendings() {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: lendings, error } = await this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('user_id', this.userId)
        .in('repayment_status', [LendingService.STATUS.PENDING, LendingService.STATUS.PARTIAL])
        .lt('expected_return_date', today)
        .not('expected_return_date', 'is', null)
        .order('expected_return_date', { ascending: true })

      if (error) throw error

      // Add days overdue calculation
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)

      const overdueWithDays = (lendings || []).map(lending => {
        const dueDate = new Date(lending.expected_return_date)
        dueDate.setHours(0, 0, 0, 0)
        const daysOverdue = Math.floor((todayDate - dueDate) / (1000 * 60 * 60 * 24))
        const outstanding = parseFloat(lending.amount) - parseFloat(lending.amount_repaid || 0)

        return {
          ...lending,
          daysOverdue,
          outstanding
        }
      })

      return {
        success: true,
        lendings: overdueWithDays
      }
    } catch (error) {
      console.error('Error getting overdue lendings:', error)
      return {
        success: false,
        lendings: [],
        error: error.message
      }
    }
  }

  // ============================================================================
  // BORROWING (LOANS RECEIVED) - loan_direction = 'received'
  // ============================================================================

  /**
   * Lender types for borrowed loans
   */
  static LENDER_TYPES = {
    INDIVIDUAL: 'individual',
    CHAMA: 'chama',
    SACCO: 'sacco',
    BANK: 'bank',
    MFI: 'mfi',
    EMPLOYER: 'employer',
    OTHER: 'other'
  }

  /**
   * Create borrowed loan record (loan received)
   * Money flows INTO your account
   * @param {object} borrowingData - Borrowing data
   * @returns {Promise<object>} - {success, lendingId, accountTransactionId, error}
   */
  async createBorrowedLoan(borrowingData) {
    try {
      const {
        receive_to_account_id,
        lender_name,
        lender_type,
        amount,
        date,
        due_date,
        notes,
        interest_rate
      } = borrowingData

      // Validate required fields
      if (!receive_to_account_id) {
        return {
          success: false,
          error: 'Destination account selection is required'
        }
      }

      if (!lender_name || !lender_name.trim()) {
        return {
          success: false,
          error: 'Lender name is required'
        }
      }

      if (!amount || amount <= 0) {
        return {
          success: false,
          error: 'Valid amount is required'
        }
      }

      // Build notes with interest rate if provided
      const notesWithInterest = interest_rate
        ? `${notes || ''}${notes ? '\n' : ''}Interest Rate: ${interest_rate}%`.trim()
        : notes || null

      // Step 1: Create lending_tracker record with loan_direction = 'received'
      const { data: borrowing, error: borrowingError } = await this.supabase
        .from('lending_tracker')
        .insert({
          user_id: this.userId,
          repay_to_account_id: receive_to_account_id, // Store as repay_to for borrowed loans
          person_name: lender_name.trim(),
          amount: parseFloat(amount),
          amount_repaid: 0,
          date_lent: date,
          expected_return_date: due_date || null,
          repayment_status: LendingService.STATUS.PENDING,
          notes: notesWithInterest,
          loan_direction: 'received', // This is a loan we RECEIVED
          lender_type: lender_type || null
        })
        .select('id')
        .single()

      if (borrowingError) throw borrowingError

      // Step 2: Get category ID for loan received
      const borrowingCategoryId = await this.getCategoryId('loan-received') ||
                                   await this.getCategoryId('uncategorized')

      // Step 3: Create account_transaction (money flows INTO account)
      const { data: accountTransaction, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          to_account_id: receive_to_account_id, // Money flows INTO account
          transaction_type: 'loan_received',
          amount: parseFloat(amount),
          date,
          category_id: borrowingCategoryId,
          category: 'loan-received',
          description: `Loan received from ${lender_name}`,
          reference_id: borrowing.id,
          reference_type: 'lending'
        })
        .select('id')
        .single()

      if (txError) throw txError

      return {
        success: true,
        lendingId: borrowing.id,
        accountTransactionId: accountTransaction.id
      }
    } catch (error) {
      console.error('Error creating borrowed loan:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Record repayment for a borrowed loan (you pay back)
   * Money flows OUT of your account
   * @param {string} lendingId - Lending ID
   * @param {number} repaymentAmount - Amount being repaid
   * @param {string} payFromAccountId - Account to pay from
   * @param {string} repaymentDate - Date of repayment
   * @param {string} notes - Optional notes
   * @returns {Promise<object>} - {success, newStatus, totalRepaid, remainingAmount, accountTransactionId, error}
   */
  async recordBorrowedLoanRepayment(lendingId, repaymentAmount, payFromAccountId, repaymentDate, notes = null) {
    try {
      // Validate inputs
      if (!lendingId || !repaymentAmount || !payFromAccountId || !repaymentDate) {
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
        .eq('loan_direction', 'received')
        .single()

      if (fetchError) throw fetchError

      if (!lending) {
        return {
          success: false,
          error: 'Borrowed loan record not found'
        }
      }

      // Check if already fully repaid
      if (lending.repayment_status === LendingService.STATUS.COMPLETE) {
        return {
          success: false,
          error: 'This loan has already been fully repaid'
        }
      }

      // Check account balance
      const balanceCheck = await this.checkAccountBalance(payFromAccountId, repaymentAmount)
      if (!balanceCheck.sufficient) {
        return {
          success: false,
          error: `Insufficient balance in ${balanceCheck.accountName}. Available: KES ${balanceCheck.balance.toFixed(2)}, Required: KES ${repaymentAmount}`,
          balanceCheck
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
          repayment_status: newStatus,
          lend_from_account_id: payFromAccountId, // Store payment source for borrowed loans
          notes: notes ? `${lending.notes || ''}\n[${repaymentDate}] Payment: KES ${repaymentAmount}. ${notes}`.trim() : lending.notes
        })
        .eq('id', lendingId)
        .eq('user_id', this.userId)

      if (updateError) throw updateError

      // Step 2: Get category ID for loan repayment
      const repaymentCategoryId = await this.getCategoryId('loan-repayment') ||
                                   await this.getCategoryId('repayment') ||
                                   await this.getCategoryId('uncategorized')

      // Step 3: Create account_transaction (money flows OUT of account)
      const { data: accountTransaction, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          from_account_id: payFromAccountId, // Money flows OUT of account
          transaction_type: 'loan_repayment',
          amount: parseFloat(repaymentAmount),
          date: repaymentDate,
          category_id: repaymentCategoryId,
          category: 'loan-repayment',
          description: `Loan repayment to ${lending.person_name}${notes ? ` - ${notes}` : ''}`,
          reference_id: lendingId,
          reference_type: 'lending'
        })
        .select('id')
        .single()

      if (txError) throw txError

      return {
        success: true,
        newStatus,
        totalRepaid: newTotalRepaid,
        remainingAmount: Math.max(0, remainingAmount),
        accountTransactionId: accountTransaction.id
      }
    } catch (error) {
      console.error('Error recording borrowed loan repayment:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get all borrowed loans (loans received)
   * @param {object} filters - {status, lender_name, lender_type, startDate, endDate}
   * @returns {Promise<object>} - {success, borrowings, summary, error}
   */
  async getAllBorrowings(filters = {}) {
    try {
      let query = this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('user_id', this.userId)
        .eq('loan_direction', 'received')

      if (filters.status) {
        query = query.eq('repayment_status', filters.status)
      }

      if (filters.lender_name) {
        query = query.ilike('person_name', `%${filters.lender_name}%`)
      }

      if (filters.lender_type) {
        query = query.eq('lender_type', filters.lender_type)
      }

      if (filters.startDate) {
        query = query.gte('date_lent', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('date_lent', filters.endDate)
      }

      const { data: borrowings, error } = await query.order('date_lent', { ascending: false })

      if (error) throw error

      // Fetch account info for each borrowing
      if (borrowings && borrowings.length > 0) {
        const borrowingsWithAccounts = await Promise.all(
          borrowings.map(async (borrowing) => {
            let receiveToAccount = null
            let payFromAccount = null

            if (borrowing.repay_to_account_id) {
              const { data: account } = await this.supabase
                .from('accounts')
                .select('id, name, account_type')
                .eq('id', borrowing.repay_to_account_id)
                .single()
              receiveToAccount = account
            }

            if (borrowing.lend_from_account_id) {
              const { data: account } = await this.supabase
                .from('accounts')
                .select('id, name, account_type')
                .eq('id', borrowing.lend_from_account_id)
                .single()
              payFromAccount = account
            }

            const outstanding = parseFloat(borrowing.amount) - parseFloat(borrowing.amount_repaid || 0)

            return {
              ...borrowing,
              receive_to_account: receiveToAccount,
              pay_from_account: payFromAccount,
              outstanding
            }
          })
        )
        borrowings.splice(0, borrowings.length, ...borrowingsWithAccounts)
      }

      // Calculate summary
      const summary = {
        totalBorrowed: 0,
        totalRepaid: 0,
        totalOutstanding: 0,
        count: borrowings.length,
        byStatus: {
          [LendingService.STATUS.PENDING]: { count: 0, amount: 0 },
          [LendingService.STATUS.PARTIAL]: { count: 0, amount: 0, repaid: 0 },
          [LendingService.STATUS.COMPLETE]: { count: 0, amount: 0 }
        },
        byLenderType: {}
      }

      borrowings.forEach(borrowing => {
        const amount = parseFloat(borrowing.amount)
        const repaid = parseFloat(borrowing.amount_repaid || 0)
        const outstanding = amount - repaid

        summary.totalBorrowed += amount
        summary.totalRepaid += repaid
        summary.totalOutstanding += outstanding

        const status = borrowing.repayment_status || LendingService.STATUS.PENDING
        if (summary.byStatus[status]) {
          summary.byStatus[status].count++
          summary.byStatus[status].amount += amount
          if (status === LendingService.STATUS.PARTIAL) {
            summary.byStatus[status].repaid += repaid
          }
        }

        // Track by lender type
        const lenderType = borrowing.lender_type || 'other'
        if (!summary.byLenderType[lenderType]) {
          summary.byLenderType[lenderType] = { count: 0, amount: 0, outstanding: 0 }
        }
        summary.byLenderType[lenderType].count++
        summary.byLenderType[lenderType].amount += amount
        summary.byLenderType[lenderType].outstanding += outstanding
      })

      return {
        success: true,
        borrowings: borrowings || [],
        summary
      }
    } catch (error) {
      console.error('Error getting all borrowings:', error)
      return {
        success: false,
        borrowings: [],
        error: error.message
      }
    }
  }

  /**
   * Get borrowings grouped by lender (counterparty-centric view for borrowing)
   * @returns {Promise<object>} - {success, lenders, summary, error}
   */
  async getBorrowingsByLender() {
    try {
      const { data: borrowings, error } = await this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('user_id', this.userId)
        .eq('loan_direction', 'received')
        .order('date_lent', { ascending: false })

      if (error) throw error

      // Group by lender (person_name)
      const lenderMap = new Map()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const borrowing of borrowings || []) {
        const lenderName = borrowing.person_name
        const amount = parseFloat(borrowing.amount) || 0
        const repaid = parseFloat(borrowing.amount_repaid) || 0
        const outstanding = amount - repaid

        // Calculate overdue status
        let isOverdue = false
        let daysOverdue = 0
        const dueDate = borrowing.expected_return_date
        const status = borrowing.repayment_status
        if (dueDate && status !== LendingService.STATUS.COMPLETE && status !== LendingService.STATUS.FORGIVEN) {
          const dueDateObj = new Date(dueDate)
          dueDateObj.setHours(0, 0, 0, 0)
          if (today > dueDateObj) {
            isOverdue = true
            daysOverdue = Math.floor((today - dueDateObj) / (1000 * 60 * 60 * 24))
          }
        }

        if (!lenderMap.has(lenderName)) {
          lenderMap.set(lenderName, {
            lenderName,
            lenderType: borrowing.lender_type || 'other',
            loans: [],
            totalBorrowed: 0,
            totalRepaid: 0,
            totalOutstanding: 0,
            activeLoans: 0,
            overdueLoans: 0,
            isOverdue: false,
            maxDaysOverdue: 0
          })
        }

        const lender = lenderMap.get(lenderName)
        lender.loans.push({
          ...borrowing,
          outstanding,
          isOverdue,
          daysOverdue
        })
        lender.totalBorrowed += amount
        lender.totalRepaid += repaid
        lender.totalOutstanding += outstanding

        if (status !== LendingService.STATUS.COMPLETE && status !== LendingService.STATUS.FORGIVEN) {
          lender.activeLoans++
          if (isOverdue) {
            lender.overdueLoans++
            lender.isOverdue = true
            lender.maxDaysOverdue = Math.max(lender.maxDaysOverdue, daysOverdue)
          }
        }
      }

      // Convert to array and sort
      const lenders = Array.from(lenderMap.values())
      lenders.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        return b.totalOutstanding - a.totalOutstanding
      })

      // Calculate overall summary
      const summary = {
        totalLenders: lenders.length,
        activeLenders: lenders.filter(l => l.activeLoans > 0).length,
        totalBorrowed: lenders.reduce((sum, l) => sum + l.totalBorrowed, 0),
        totalRepaid: lenders.reduce((sum, l) => sum + l.totalRepaid, 0),
        totalOutstanding: lenders.reduce((sum, l) => sum + l.totalOutstanding, 0),
        overdueLenders: lenders.filter(l => l.isOverdue).length,
        totalOverdueAmount: lenders
          .filter(l => l.isOverdue)
          .reduce((sum, l) => sum + l.totalOutstanding, 0)
      }

      return {
        success: true,
        lenders,
        summary
      }
    } catch (error) {
      console.error('Error getting borrowings by lender:', error)
      return {
        success: false,
        lenders: [],
        error: error.message
      }
    }
  }

  /**
   * Get all lendings grouped by counterparty with direction filter
   * @param {string} direction - 'lent' or 'received' (default: 'lent')
   * @returns {Promise<object>} - {success, counterparties, summary, error}
   */
  async getLendingsByDirection(direction = 'lent') {
    if (direction === 'received') {
      return this.getBorrowingsByLender()
    }

    // Default to existing getLendingsByCounterparty for 'lent'
    // But filter by loan_direction = 'lent' or null (for backwards compatibility)
    try {
      const { data: lendings, error } = await this.supabase
        .from('lending_tracker')
        .select('*')
        .eq('user_id', this.userId)
        .or('loan_direction.eq.lent,loan_direction.is.null')
        .order('date_lent', { ascending: false })

      if (error) throw error

      // Use existing counterparty grouping logic
      const counterpartyMap = new Map()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const lending of lendings || []) {
        const personName = lending.person_name
        const amount = parseFloat(lending.amount) || 0
        const repaid = parseFloat(lending.amount_repaid) || 0
        const outstanding = amount - repaid

        let isOverdue = false
        let daysOverdue = 0
        const lendingDueDate = lending.expected_return_date || lending.due_date
        const lendingStatus = lending.repayment_status || lending.status

        if (lendingDueDate && lendingStatus !== LendingService.STATUS.COMPLETE && lendingStatus !== LendingService.STATUS.FORGIVEN) {
          const dueDate = new Date(lendingDueDate)
          dueDate.setHours(0, 0, 0, 0)
          if (today > dueDate) {
            isOverdue = true
            daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
          }
        }

        if (!counterpartyMap.has(personName)) {
          counterpartyMap.set(personName, {
            personName,
            loans: [],
            totalLent: 0,
            totalRepaid: 0,
            totalOutstanding: 0,
            activeLoans: 0,
            overdueLoans: 0,
            isOverdue: false,
            maxDaysOverdue: 0
          })
        }

        const counterparty = counterpartyMap.get(personName)
        counterparty.loans.push({
          ...lending,
          status: lendingStatus,
          due_date: lendingDueDate,
          outstanding,
          isOverdue,
          daysOverdue
        })
        counterparty.totalLent += amount
        counterparty.totalRepaid += repaid
        counterparty.totalOutstanding += outstanding

        if (lendingStatus !== LendingService.STATUS.COMPLETE && lendingStatus !== LendingService.STATUS.FORGIVEN) {
          counterparty.activeLoans++
          if (isOverdue) {
            counterparty.overdueLoans++
            counterparty.isOverdue = true
            counterparty.maxDaysOverdue = Math.max(counterparty.maxDaysOverdue, daysOverdue)
          }
        }
      }

      const counterparties = Array.from(counterpartyMap.values()).map(cp => ({
        ...cp,
        status: this.calculateCounterpartyStatus(cp)
      }))

      counterparties.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        return b.totalOutstanding - a.totalOutstanding
      })

      const summary = {
        totalCounterparties: counterparties.length,
        activeCounterparties: counterparties.filter(c => c.activeLoans > 0).length,
        totalLent: counterparties.reduce((sum, c) => sum + c.totalLent, 0),
        totalRepaid: counterparties.reduce((sum, c) => sum + c.totalRepaid, 0),
        totalOutstanding: counterparties.reduce((sum, c) => sum + c.totalOutstanding, 0),
        overdueCounterparties: counterparties.filter(c => c.isOverdue).length,
        totalOverdueAmount: counterparties
          .filter(c => c.isOverdue)
          .reduce((sum, c) => sum + c.totalOutstanding, 0)
      }

      return {
        success: true,
        counterparties,
        summary
      }
    } catch (error) {
      console.error('Error getting lendings by direction:', error)
      return {
        success: false,
        counterparties: [],
        error: error.message
      }
    }
  }
}

export default LendingService
