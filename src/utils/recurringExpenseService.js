/**
 * Recurring Expense Automation Service
 * Handles automatic creation of pending expenses from recurring transactions
 */

export class RecurringExpenseService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Main check function - call on app load or daily
   * Creates pending expenses for due recurring transactions
   */
  async checkAndCreatePendingExpenses() {
    try {
      // Fetch active recurring transactions with auto_add enabled
      const { data: activeRecurring, error } = await this.supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('type', 'expense')
        .eq('is_active', true)
        .eq('auto_add', true)

      if (error) {
        console.error('Error fetching recurring transactions:', error)
        return []
      }

      if (!activeRecurring || activeRecurring.length === 0) {
        return []
      }

      const created = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const recurring of activeRecurring) {
        const nextDate = new Date(recurring.next_date)
        nextDate.setHours(0, 0, 0, 0)

        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24))

        // Check if within auto-creation window
        const createWindow = recurring.auto_create_days_before || 0

        if (daysDiff <= createWindow && daysDiff >= 0) {
          // Check if already created for this date
          const alreadyExists = await this.checkIfPendingExists(recurring.id, recurring.next_date)

          if (!alreadyExists) {
            const pending = await this.createPendingExpense(recurring)
            if (pending) {
              created.push(pending)
            }
          }
        }
      }

      return created
    } catch (error) {
      console.error('Error in checkAndCreatePendingExpenses:', error)
      return []
    }
  }

  /**
   * Check if pending expense already exists for this recurring transaction and date
   */
  async checkIfPendingExists(recurringId, date) {
    try {
      const { data, error } = await this.supabase
        .from('pending_expenses')
        .select('id')
        .eq('recurring_transaction_id', recurringId)
        .eq('date', date)
        .maybeSingle()

      if (error) {
        console.error('Error checking pending expense:', error)
        return false
      }

      return data !== null
    } catch (error) {
      console.error('Error in checkIfPendingExists:', error)
      return false
    }
  }

  /**
   * Create a pending expense from recurring transaction
   */
  async createPendingExpense(recurring) {
    try {
      const { data, error } = await this.supabase
        .from('pending_expenses')
        .insert([{
          user_id: this.userId,
          recurring_transaction_id: recurring.id,
          amount: recurring.amount,
          category: recurring.category,
          description: `Auto-created: ${recurring.name}`,
          payment_method: recurring.payment_method || 'mpesa',
          date: recurring.next_date,
          status: 'pending'
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating pending expense:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in createPendingExpense:', error)
      return null
    }
  }

  /**
   * Approve a pending expense - creates actual expense and updates recurring
   */
  async approvePendingExpense(pendingId) {
    try {
      // Get pending expense details
      const { data: pending, error: fetchError } = await this.supabase
        .from('pending_expenses')
        .select('*')
        .eq('id', pendingId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError || !pending) {
        return { success: false, error: 'Pending expense not found' }
      }

      // Create actual expense
      const { data: expense, error: expenseError } = await this.supabase
        .from('expenses')
        .insert([{
          user_id: this.userId,
          amount: pending.amount,
          category: pending.category,
          description: pending.description,
          payment_method: pending.payment_method,
          date: pending.date
        }])
        .select()
        .single()

      if (expenseError) {
        return { success: false, error: expenseError.message }
      }

      // Mark pending as approved
      await this.supabase
        .from('pending_expenses')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', pendingId)

      // Update recurring transaction's next_date
      if (pending.recurring_transaction_id) {
        await this.updateRecurringNextDate(pending.recurring_transaction_id)
      }

      return { success: true, expense }
    } catch (error) {
      console.error('Error in approvePendingExpense:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Approve all pending expenses at once
   */
  async approveAllPending() {
    try {
      const { data: pendingList, error } = await this.supabase
        .from('pending_expenses')
        .select('id')
        .eq('user_id', this.userId)
        .eq('status', 'pending')

      if (error || !pendingList) {
        return { success: false, error: 'Failed to fetch pending expenses' }
      }

      const results = []
      for (const pending of pendingList) {
        const result = await this.approvePendingExpense(pending.id)
        results.push(result)
      }

      const successCount = results.filter(r => r.success).length
      return {
        success: true,
        approved: successCount,
        total: results.length
      }
    } catch (error) {
      console.error('Error in approveAllPending:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Reject a pending expense - marks as rejected, doesn't create expense
   */
  async rejectPendingExpense(pendingId) {
    try {
      const { error } = await this.supabase
        .from('pending_expenses')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', pendingId)
        .eq('user_id', this.userId)

      return { success: !error, error: error?.message }
    } catch (error) {
      console.error('Error in rejectPendingExpense:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update pending expense amount before approval
   */
  async updatePendingAmount(pendingId, newAmount) {
    try {
      const { error } = await this.supabase
        .from('pending_expenses')
        .update({ amount: newAmount })
        .eq('id', pendingId)
        .eq('user_id', this.userId)
        .eq('status', 'pending')

      return { success: !error, error: error?.message }
    } catch (error) {
      console.error('Error in updatePendingAmount:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update recurring transaction's next_date after expense is created
   */
  async updateRecurringNextDate(recurringId) {
    try {
      // Get current recurring transaction
      const { data: recurring, error: fetchError } = await this.supabase
        .from('recurring_transactions')
        .select('*')
        .eq('id', recurringId)
        .single()

      if (fetchError || !recurring) {
        console.error('Error fetching recurring transaction:', fetchError)
        return false
      }

      // Calculate next date based on frequency
      const nextDate = this.calculateNextDate(recurring.next_date, recurring.frequency)

      // Update the recurring transaction
      const { error: updateError } = await this.supabase
        .from('recurring_transactions')
        .update({
          next_date: nextDate,
          last_auto_created_at: new Date().toISOString()
        })
        .eq('id', recurringId)

      if (updateError) {
        console.error('Error updating recurring next_date:', updateError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateRecurringNextDate:', error)
      return false
    }
  }

  /**
   * Calculate next date based on frequency
   */
  calculateNextDate(currentDate, frequency) {
    const date = new Date(currentDate)

    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1)
        break
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
      default:
        console.warn(`Unknown frequency: ${frequency}`)
        date.setMonth(date.getMonth() + 1) // Default to monthly
    }

    return date.toISOString().split('T')[0]
  }

  /**
   * Get all pending expenses for user
   */
  async getPendingExpenses() {
    try {
      const { data, error } = await this.supabase
        .from('pending_expenses')
        .select(`
          *,
          recurring_transactions (
            name,
            frequency
          )
        `)
        .eq('user_id', this.userId)
        .eq('status', 'pending')
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching pending expenses:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getPendingExpenses:', error)
      return []
    }
  }

  /**
   * Get count of pending expenses
   */
  async getPendingCount() {
    try {
      const { count, error } = await this.supabase
        .from('pending_expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userId)
        .eq('status', 'pending')

      if (error) {
        console.error('Error getting pending count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error in getPendingCount:', error)
      return 0
    }
  }
}
