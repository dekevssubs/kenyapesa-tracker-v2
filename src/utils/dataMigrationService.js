/**
 * Data Migration Service
 * Handles backfilling existing income/expense data into account_transactions
 * Run this ONCE for existing users after accounts foundation is set up
 */

export class DataMigrationService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Check if user needs migration (has income/expense but no accounts)
   */
  async needsMigration() {
    try {
      // Check if user has any accounts
      const { data: accounts, error: accountsError } = await this.supabase
        .from('accounts')
        .select('id')
        .eq('user_id', this.userId)
        .limit(1)

      if (accountsError) throw accountsError

      // Check if user has income or expenses
      const { data: income, error: incomeError } = await this.supabase
        .from('income')
        .select('id')
        .eq('user_id', this.userId)
        .limit(1)

      if (incomeError) throw incomeError

      const { data: expenses, error: expensesError } = await this.supabase
        .from('expenses')
        .select('id')
        .eq('user_id', this.userId)
        .limit(1)

      if (expensesError) throw expensesError

      const hasAccounts = accounts && accounts.length > 0
      const hasHistoricalData = (income && income.length > 0) || (expenses && expenses.length > 0)

      return !hasAccounts && hasHistoricalData
    } catch (error) {
      console.error('Error checking migration status:', error)
      return false
    }
  }

  /**
   * Check if migration has already been completed
   */
  async isMigrationComplete() {
    try {
      const { data, error } = await this.supabase
        .from('migration_history')
        .select('id')
        .eq('migration_name', '008_backfill_account_transactions')
        .single()

      if (error && error.code !== 'PGRST116') throw error // Ignore "not found" error

      return !!data
    } catch (error) {
      console.error('Error checking migration history:', error)
      return false
    }
  }

  /**
   * Create default primary account for migration
   */
  async createDefaultAccount() {
    try {
      // Check if primary account already exists
      const { data: existing, error: checkError } = await this.supabase
        .from('accounts')
        .select('id')
        .eq('user_id', this.userId)
        .eq('is_primary', true)
        .eq('account_type', 'cash')
        .single()

      if (checkError && checkError.code !== 'PGRST116') throw checkError

      if (existing) {
        return { success: true, accountId: existing.id, created: false }
      }

      // Create new primary account
      const { data, error } = await this.supabase
        .from('accounts')
        .insert({
          user_id: this.userId,
          name: 'Main Account (Auto-Created)',
          account_type: 'cash',
          category: 'mpesa',
          institution_name: 'M-Pesa',
          current_balance: 0,
          is_primary: true,
          notes: 'Auto-created during data migration. This account represents your primary cash account for historical transactions.'
        })
        .select('id')
        .single()

      if (error) throw error

      return { success: true, accountId: data.id, created: true }
    } catch (error) {
      console.error('Error creating default account:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Backfill income records into account_transactions
   */
  async backfillIncome(accountId) {
    try {
      // Get all income records that haven't been migrated
      const { data: incomeRecords, error: fetchError } = await this.supabase
        .from('income')
        .select('*')
        .eq('user_id', this.userId)
        .order('date', { ascending: true })

      if (fetchError) throw fetchError

      if (!incomeRecords || incomeRecords.length === 0) {
        return { success: true, count: 0 }
      }

      // Check which income records already have transactions
      const { data: existingTransactions, error: checkError } = await this.supabase
        .from('account_transactions')
        .select('reference_id, reference_type')
        .eq('user_id', this.userId)
        .eq('reference_type', 'income')

      if (checkError) throw checkError

      const existingIds = new Set(existingTransactions?.map(t => t.reference_id) || [])

      // Filter out already migrated records
      const recordsToMigrate = incomeRecords.filter(income => !existingIds.has(income.id))

      if (recordsToMigrate.length === 0) {
        return { success: true, count: 0 }
      }

      // Create account_transactions for income (flows INTO account)
      const transactions = recordsToMigrate.map(income => ({
        user_id: this.userId,
        to_account_id: accountId, // Income goes TO the account
        transaction_type: 'income',
        amount: income.amount,
        date: income.date,
        category: income.source,
        description: income.description || `Income from ${income.source}`,
        reference_id: income.id,
        reference_type: 'income'
      }))

      const { error: insertError } = await this.supabase
        .from('account_transactions')
        .insert(transactions)

      if (insertError) throw insertError

      return { success: true, count: transactions.length }
    } catch (error) {
      console.error('Error backfilling income:', error)
      return { success: false, error: error.message, count: 0 }
    }
  }

  /**
   * Backfill expense records into account_transactions
   */
  async backfillExpenses(accountId) {
    try {
      // Get all expense records that haven't been migrated
      const { data: expenseRecords, error: fetchError } = await this.supabase
        .from('expenses')
        .select('*')
        .eq('user_id', this.userId)
        .order('date', { ascending: true })

      if (fetchError) throw fetchError

      if (!expenseRecords || expenseRecords.length === 0) {
        return { success: true, count: 0 }
      }

      // Check which expense records already have transactions
      const { data: existingTransactions, error: checkError } = await this.supabase
        .from('account_transactions')
        .select('reference_id, reference_type')
        .eq('user_id', this.userId)
        .eq('reference_type', 'expense')

      if (checkError) throw checkError

      const existingIds = new Set(existingTransactions?.map(t => t.reference_id) || [])

      // Filter out already migrated records
      const recordsToMigrate = expenseRecords.filter(expense => !existingIds.has(expense.id))

      if (recordsToMigrate.length === 0) {
        return { success: true, count: 0 }
      }

      // Create account_transactions for expenses (flows OUT OF account)
      const transactions = recordsToMigrate.map(expense => ({
        user_id: this.userId,
        from_account_id: accountId, // Expense comes FROM the account
        transaction_type: 'expense',
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        description: expense.description || `Expense for ${expense.category}`,
        reference_id: expense.id,
        reference_type: 'expense'
      }))

      const { error: insertError } = await this.supabase
        .from('account_transactions')
        .insert(transactions)

      if (insertError) throw insertError

      return { success: true, count: transactions.length }
    } catch (error) {
      console.error('Error backfilling expenses:', error)
      return { success: false, error: error.message, count: 0 }
    }
  }

  /**
   * Recalculate account balance based on transactions
   */
  async recalculateBalance(accountId) {
    try {
      // Get all transactions where this account is involved
      const { data: transactions, error: fetchError } = await this.supabase
        .from('account_transactions')
        .select('from_account_id, to_account_id, amount')
        .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)

      if (fetchError) throw fetchError

      // Calculate balance: money IN - money OUT
      const balance = transactions.reduce((total, tx) => {
        if (tx.to_account_id === accountId) {
          // Money coming IN to this account
          return total + parseFloat(tx.amount)
        } else if (tx.from_account_id === accountId) {
          // Money going OUT of this account
          return total - parseFloat(tx.amount)
        }
        return total
      }, 0)

      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({ current_balance: balance })
        .eq('id', accountId)

      if (updateError) throw updateError

      return { success: true, balance }
    } catch (error) {
      console.error('Error recalculating balance:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Record migration completion
   */
  async recordMigration(recordsAffected) {
    try {
      const { error } = await this.supabase
        .from('migration_history')
        .insert({
          migration_name: '008_backfill_account_transactions',
          records_affected: recordsAffected,
          status: 'completed'
        })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error recording migration:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get migration summary
   */
  async getMigrationSummary() {
    try {
      const { data: accounts, error: accountsError } = await this.supabase
        .from('accounts')
        .select(`
          id,
          name,
          account_type,
          current_balance,
          is_primary
        `)
        .eq('user_id', this.userId)
        .eq('is_primary', true)
        .eq('account_type', 'cash')
        .single()

      if (accountsError) throw accountsError

      if (!accounts) {
        return { success: false, error: 'No primary account found' }
      }

      // Get transactions where this account is involved
      const { data: transactions, error: txError } = await this.supabase
        .from('account_transactions')
        .select('transaction_type, from_account_id, to_account_id, amount, date')
        .or(`from_account_id.eq.${accounts.id},to_account_id.eq.${accounts.id}`)

      if (txError) throw txError

      const summary = {
        accountName: accounts.name,
        currentBalance: accounts.current_balance,
        totalTransactions: transactions.length,
        incomeCount: transactions.filter(t => t.transaction_type === 'income').length,
        expenseCount: transactions.filter(t => t.transaction_type === 'expense').length,
        totalIncome: transactions
          .filter(t => t.to_account_id === accounts.id)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        totalExpenses: transactions
          .filter(t => t.from_account_id === accounts.id)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        earliestTransaction: transactions.length > 0
          ? transactions.reduce((min, t) => t.date < min ? t.date : min, transactions[0].date)
          : null,
        latestTransaction: transactions.length > 0
          ? transactions.reduce((max, t) => t.date > max ? t.date : max, transactions[0].date)
          : null
      }

      return { success: true, summary }
    } catch (error) {
      console.error('Error getting migration summary:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Run complete migration process
   */
  async runMigration() {
    try {
      const results = {
        steps: [],
        success: false,
        totalRecords: 0
      }

      // Step 1: Check if migration needed
      const needsMigration = await this.needsMigration()
      const isComplete = await this.isMigrationComplete()

      if (isComplete) {
        return {
          success: false,
          error: 'Migration has already been completed for this user',
          alreadyComplete: true
        }
      }

      // Step 2: Create default account
      results.steps.push({ step: 'Creating default account', status: 'in_progress' })
      const accountResult = await this.createDefaultAccount()

      if (!accountResult.success) {
        results.steps[results.steps.length - 1].status = 'failed'
        results.steps[results.steps.length - 1].error = accountResult.error
        return results
      }

      results.steps[results.steps.length - 1].status = 'completed'
      results.steps[results.steps.length - 1].accountId = accountResult.accountId
      results.steps[results.steps.length - 1].created = accountResult.created

      const accountId = accountResult.accountId

      // Step 3: Backfill income
      results.steps.push({ step: 'Backfilling income records', status: 'in_progress' })
      const incomeResult = await this.backfillIncome(accountId)

      if (!incomeResult.success) {
        results.steps[results.steps.length - 1].status = 'failed'
        results.steps[results.steps.length - 1].error = incomeResult.error
        return results
      }

      results.steps[results.steps.length - 1].status = 'completed'
      results.steps[results.steps.length - 1].count = incomeResult.count
      results.totalRecords += incomeResult.count

      // Step 4: Backfill expenses
      results.steps.push({ step: 'Backfilling expense records', status: 'in_progress' })
      const expenseResult = await this.backfillExpenses(accountId)

      if (!expenseResult.success) {
        results.steps[results.steps.length - 1].status = 'failed'
        results.steps[results.steps.length - 1].error = expenseResult.error
        return results
      }

      results.steps[results.steps.length - 1].status = 'completed'
      results.steps[results.steps.length - 1].count = expenseResult.count
      results.totalRecords += expenseResult.count

      // Step 5: Recalculate balance
      results.steps.push({ step: 'Recalculating account balance', status: 'in_progress' })
      const balanceResult = await this.recalculateBalance(accountId)

      if (!balanceResult.success) {
        results.steps[results.steps.length - 1].status = 'failed'
        results.steps[results.steps.length - 1].error = balanceResult.error
        return results
      }

      results.steps[results.steps.length - 1].status = 'completed'
      results.steps[results.steps.length - 1].balance = balanceResult.balance

      // Step 6: Record migration
      results.steps.push({ step: 'Recording migration', status: 'in_progress' })
      const recordResult = await this.recordMigration(results.totalRecords)

      if (!recordResult.success) {
        results.steps[results.steps.length - 1].status = 'failed'
        results.steps[results.steps.length - 1].error = recordResult.error
        // Don't return here - migration is functionally complete
      } else {
        results.steps[results.steps.length - 1].status = 'completed'
      }

      // Step 7: Get summary
      const summaryResult = await this.getMigrationSummary()
      if (summaryResult.success) {
        results.summary = summaryResult.summary
      }

      results.success = true
      return results
    } catch (error) {
      console.error('Error running migration:', error)
      return {
        success: false,
        error: error.message,
        steps: []
      }
    }
  }
}
