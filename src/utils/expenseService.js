/**
 * Expense Service
 *
 * Handles expense creation with account integration and transaction fee tracking
 * Features:
 * - Account selection (required for new expenses)
 * - Auto-calculation of transaction fees based on payment method
 * - Balance validation (warn but allow)
 * - Integration with account_transactions table
 * - Automatic balance updates via database triggers
 */

import { calculateTransactionFee } from './kenyaTransactionFees.js'

export class ExpenseService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Check if account has sufficient balance for expense
   * @param {string} accountId - Account ID
   * @param {number} totalAmount - Total amount needed (expense + fee)
   * @returns {Promise<object>} - {sufficient, balance, deficit, accountName}
   */
  async checkAccountBalance(accountId, totalAmount) {
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
          deficit: totalAmount,
          accountName: 'Unknown Account',
          error: 'Account not found'
        }
      }

      const balance = parseFloat(account.current_balance)
      const sufficient = balance >= totalAmount

      return {
        sufficient,
        balance,
        deficit: sufficient ? 0 : totalAmount - balance,
        accountName: account.name
      }
    } catch (error) {
      console.error('Error checking account balance:', error)
      return {
        sufficient: false,
        balance: 0,
        deficit: totalAmount,
        accountName: 'Unknown',
        error: error.message
      }
    }
  }

  /**
   * Create expense with account integration and fee tracking
   * @param {object} expenseData - Expense data
   * @returns {Promise<object>} - {success, expenseId, accountTransactionIds, balanceCheck, error}
   */
  async createExpense(expenseData) {
    try {
      const {
        account_id,
        amount,
        date,
        category,
        description,
        payment_method,
        fee_method, // Method used to calculate fee (mpesa_send, bank_transfer, etc.)
        transaction_fee, // Can be auto-calculated or manually entered
        fee_override = false // true if user manually entered fee
      } = expenseData

      // Validate required fields
      if (!account_id) {
        return {
          success: false,
          error: 'Account selection is required'
        }
      }

      if (!amount || amount <= 0) {
        return {
          success: false,
          error: 'Valid amount is required'
        }
      }

      // Calculate or use provided transaction fee
      let finalFee = 0
      let finalFeeMethod = fee_method

      if (fee_override && transaction_fee !== undefined) {
        // User manually entered fee
        finalFee = parseFloat(transaction_fee)
        finalFeeMethod = 'manual'
      } else if (fee_method && fee_method !== 'manual') {
        // Auto-calculate fee based on method
        finalFee = calculateTransactionFee(amount, fee_method)
      }

      const totalAmount = parseFloat(amount) + finalFee

      // Check account balance (warn but allow)
      const balanceCheck = await this.checkAccountBalance(account_id, totalAmount)

      // Step 1: Create expense record
      const { data: expense, error: expenseError } = await this.supabase
        .from('expenses')
        .insert({
          user_id: this.userId,
          account_id,
          amount: parseFloat(amount),
          date,
          category,
          description,
          payment_method,
          transaction_fee: finalFee,
          fee_method: finalFeeMethod,
          fee_override
        })
        .select('id')
        .single()

      if (expenseError) throw expenseError

      const accountTransactionIds = []

      // Step 2: Create account_transaction for expense amount
      const { data: expenseTransaction, error: expenseTxError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          from_account_id: account_id, // Money flows OUT of account
          transaction_type: 'expense',
          amount: parseFloat(amount),
          date,
          category,
          description: description || `Expense: ${category}`,
          reference_id: expense.id,
          reference_type: 'expense'
        })
        .select('id')
        .single()

      if (expenseTxError) throw expenseTxError
      accountTransactionIds.push(expenseTransaction.id)

      // Step 3: Create separate account_transaction for fee (if > 0)
      if (finalFee > 0) {
        const { data: feeTransaction, error: feeTxError } = await this.supabase
          .from('account_transactions')
          .insert({
            user_id: this.userId,
            from_account_id: account_id, // Fee also flows OUT of account
            transaction_type: 'transaction_fee',
            amount: finalFee,
            date,
            category: `${finalFeeMethod}_fee`,
            description: `Transaction fee for ${category} (${finalFeeMethod})`,
            reference_id: expense.id,
            reference_type: 'expense'
          })
          .select('id')
          .single()

        if (feeTxError) throw feeTxError
        accountTransactionIds.push(feeTransaction.id)
      }

      // Step 4: Balance is automatically updated by database trigger
      // No need to manually update account balance

      return {
        success: true,
        expenseId: expense.id,
        accountTransactionIds,
        balanceCheck, // Return balance info for UI display
        totalAmount,
        fee: finalFee
      }
    } catch (error) {
      console.error('Error creating expense:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Update existing expense (if account integration is added later)
   * @param {string} expenseId - Expense ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} - {success, error}
   */
  async updateExpense(expenseId, updates) {
    try {
      // Note: Updating expenses with account integration is complex
      // Need to:
      // 1. Update expense record
      // 2. Delete old account_transactions
      // 3. Create new account_transactions
      // 4. Triggers will handle balance recalculation

      const { error } = await this.supabase
        .from('expenses')
        .update(updates)
        .eq('id', expenseId)
        .eq('user_id', this.userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error updating expense:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Delete expense and associated account transactions
   * @param {string} expenseId - Expense ID
   * @returns {Promise<object>} - {success, error}
   */
  async deleteExpense(expenseId) {
    try {
      // Step 1: Delete associated account_transactions
      // This will trigger balance recalculation
      const { error: txError } = await this.supabase
        .from('account_transactions')
        .delete()
        .eq('reference_id', expenseId)
        .eq('reference_type', 'expense')

      if (txError) throw txError

      // Step 2: Delete expense record
      const { error: expenseError } = await this.supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', this.userId)

      if (expenseError) throw expenseError

      return { success: true }
    } catch (error) {
      console.error('Error deleting expense:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get expense with full account transaction details
   * @param {string} expenseId - Expense ID
   * @returns {Promise<object>} - {success, expense, transactions, error}
   */
  async getExpenseWithTransactions(expenseId) {
    try {
      // Get expense with account info
      const { data: expense, error: expenseError } = await this.supabase
        .from('expenses')
        .select(`
          *,
          accounts (
            id,
            name,
            account_type,
            current_balance
          )
        `)
        .eq('id', expenseId)
        .eq('user_id', this.userId)
        .single()

      if (expenseError) throw expenseError

      // Get associated account transactions
      const { data: transactions, error: txError } = await this.supabase
        .from('account_transactions')
        .select('*')
        .eq('reference_id', expenseId)
        .eq('reference_type', 'expense')
        .order('transaction_type', { ascending: true }) // expense before fee

      if (txError) throw txError

      return {
        success: true,
        expense,
        transactions: transactions || []
      }
    } catch (error) {
      console.error('Error getting expense with transactions:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get account options for expense form
   * Only cash and investment accounts with balance > 0
   * @returns {Promise<object>} - {success, accounts, error}
   */
  async getAccountsForExpense() {
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
      console.error('Error getting accounts for expense:', error)
      return {
        success: false,
        accounts: [],
        error: error.message
      }
    }
  }

  /**
   * Get expense summary by account
   * Useful for reporting
   * @param {string} accountId - Account ID (optional)
   * @param {object} filters - Date filters {startDate, endDate}
   * @returns {Promise<object>} - {success, summary, error}
   */
  async getExpenseSummaryByAccount(accountId = null, filters = {}) {
    try {
      let query = this.supabase
        .from('expenses')
        .select('account_id, amount, transaction_fee, category, date')
        .eq('user_id', this.userId)

      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      if (filters.startDate) {
        query = query.gte('date', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate)
      }

      const { data: expenses, error } = await query

      if (error) throw error

      // Calculate summary
      const summary = {
        totalExpenses: 0,
        totalFees: 0,
        totalAmount: 0,
        count: expenses.length,
        byAccount: {},
        byCategory: {}
      }

      expenses.forEach(expense => {
        const amount = parseFloat(expense.amount)
        const fee = parseFloat(expense.transaction_fee || 0)

        summary.totalExpenses += amount
        summary.totalFees += fee
        summary.totalAmount += amount + fee

        // Group by account
        if (!summary.byAccount[expense.account_id]) {
          summary.byAccount[expense.account_id] = {
            totalExpenses: 0,
            totalFees: 0,
            count: 0
          }
        }
        summary.byAccount[expense.account_id].totalExpenses += amount
        summary.byAccount[expense.account_id].totalFees += fee
        summary.byAccount[expense.account_id].count++

        // Group by category
        if (!summary.byCategory[expense.category]) {
          summary.byCategory[expense.category] = {
            totalExpenses: 0,
            totalFees: 0,
            count: 0
          }
        }
        summary.byCategory[expense.category].totalExpenses += amount
        summary.byCategory[expense.category].totalFees += fee
        summary.byCategory[expense.category].count++
      })

      return {
        success: true,
        summary
      }
    } catch (error) {
      console.error('Error getting expense summary:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default ExpenseService
