/**
 * Bill Reminder Service (Redesigned)
 * Handles all bill reminder operations including CRUD, payment tracking, and status management
 */

export class BillReminderService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Create a new bill reminder from a recurrent expense
   */
  async createBillReminder({ name, description, categoryId, categorySlug, amount, frequency, nextDueDate, sourceExpenseId }) {
    try {
      const { data, error } = await this.supabase
        .from('bill_reminders')
        .insert({
          user_id: this.userId,
          name,
          description,
          category_id: categoryId,
          category_slug: categorySlug,
          amount,
          frequency,
          next_due_date: nextDueDate,
          status: 'active',
          source_expense_id: sourceExpenseId
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, billReminder: data }
    } catch (error) {
      console.error('Error creating bill reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all bill reminders for user
   */
  async getBillReminders({ status = null, includeOverdue = true } = {}) {
    try {
      let query = this.supabase
        .from('bill_reminders')
        .select(`
          *,
          expense_categories!category_id (
            id,
            name,
            slug,
            icon,
            color
          )
        `)
        .eq('user_id', this.userId)
        .order('next_due_date', { ascending: true })

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status)
        } else {
          query = query.eq('status', status)
        }
      } else if (!includeOverdue) {
        query = query.neq('status', 'cancelled')
      }

      const { data, error } = await query

      if (error) throw error

      // Calculate days until due and urgency
      const enrichedData = (data || []).map(bill => ({
        ...bill,
        category: bill.expense_categories,
        daysUntil: this.calculateDaysUntil(bill.next_due_date),
        urgency: this.getUrgency(bill.next_due_date, bill.status)
      }))

      return { success: true, billReminders: enrichedData }
    } catch (error) {
      console.error('Error fetching bill reminders:', error)
      return { success: false, error: error.message, billReminders: [] }
    }
  }

  /**
   * Get active bill reminders (not cancelled)
   */
  async getActiveBillReminders() {
    return this.getBillReminders({ status: ['active', 'paid', 'skipped', 'overdue'] })
  }

  /**
   * Get a single bill reminder by ID
   */
  async getBillReminder(id) {
    try {
      const { data, error } = await this.supabase
        .from('bill_reminders')
        .select(`
          *,
          expense_categories!category_id (
            id,
            name,
            slug,
            icon,
            color
          )
        `)
        .eq('id', id)
        .eq('user_id', this.userId)
        .single()

      if (error) throw error
      return { success: true, billReminder: data }
    } catch (error) {
      console.error('Error fetching bill reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Mark bill reminder as paid and create next cycle
   */
  async markAsPaid(billReminderId, { expenseId, paymentDate, notes = '' }) {
    try {
      // Get current bill reminder
      const { data: billReminder, error: fetchError } = await this.supabase
        .from('bill_reminders')
        .select('*')
        .eq('id', billReminderId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      // Check if already cancelled
      if (billReminder.status === 'cancelled') {
        return { success: false, error: 'Cannot mark cancelled bill as paid' }
      }

      // Check if already paid in this billing period
      const { data: existingPayment, error: paymentCheckError } = await this.supabase
        .from('payment_history')
        .select('id')
        .eq('user_id', this.userId)
        .eq('reference_type', 'bill_reminder')
        .eq('reference_id', billReminderId)
        .eq('billing_period_start', billReminder.next_due_date)
        .eq('action', 'paid')
        .maybeSingle()

      if (paymentCheckError) throw paymentCheckError

      if (existingPayment) {
        return { success: false, error: 'This bill has already been marked as paid for this billing period' }
      }

      // Calculate next due date based on payment date
      const nextDueDate = this.calculateNextDueDate(paymentDate, billReminder.frequency)

      // Calculate billing period
      const billingPeriodStart = billReminder.next_due_date
      const billingPeriodEnd = nextDueDate

      // Record in payment history
      const { error: historyError } = await this.supabase
        .from('payment_history')
        .insert({
          user_id: this.userId,
          reference_type: 'bill_reminder',
          reference_id: billReminderId,
          expense_id: expenseId,
          action: 'paid',
          billing_period_start: billingPeriodStart,
          billing_period_end: billingPeriodEnd,
          amount_paid: billReminder.amount,
          payment_date: paymentDate,
          notes
        })

      if (historyError) throw historyError

      // Update bill reminder with new due date and reset to active
      const { data: updatedBillReminder, error: updateError } = await this.supabase
        .from('bill_reminders')
        .update({
          status: 'active',
          next_due_date: nextDueDate,
          last_paid_date: paymentDate,
          last_paid_expense_id: expenseId,
          updated_at: new Date().toISOString()
        })
        .eq('id', billReminderId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (updateError) throw updateError

      // Update expense to link it to this bill reminder
      if (expenseId) {
        await this.supabase
          .from('expenses')
          .update({
            is_recurrent: true,
            recurrence_type: 'bill',
            linked_bill_reminder_id: billReminderId
          })
          .eq('id', expenseId)
          .eq('user_id', this.userId)
      }

      return {
        success: true,
        billReminder: updatedBillReminder,
        nextDueDate,
        message: `Payment recorded. Next due: ${nextDueDate}`
      }
    } catch (error) {
      console.error('Error marking bill as paid:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Skip a bill cycle
   */
  async skipCycle(billReminderId, { reason = '' } = {}) {
    try {
      // Get current bill reminder
      const { data: billReminder, error: fetchError } = await this.supabase
        .from('bill_reminders')
        .select('*')
        .eq('id', billReminderId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      if (billReminder.status === 'cancelled') {
        return { success: false, error: 'Cannot skip cancelled bill' }
      }

      if (billReminder.status === 'overdue') {
        return { success: false, error: 'Cannot skip overdue bill. Please resolve the overdue payment first.' }
      }

      // Check if already actioned in this billing period (paid or skipped)
      const { data: existingAction, error: actionCheckError } = await this.supabase
        .from('payment_history')
        .select('id, action')
        .eq('user_id', this.userId)
        .eq('reference_type', 'bill_reminder')
        .eq('reference_id', billReminderId)
        .eq('billing_period_start', billReminder.next_due_date)
        .in('action', ['paid', 'skipped'])
        .maybeSingle()

      if (actionCheckError) throw actionCheckError

      if (existingAction) {
        return { success: false, error: `This bill has already been ${existingAction.action} for this billing period` }
      }

      // Calculate next due date from current due date
      const nextDueDate = this.calculateNextDueDate(billReminder.next_due_date, billReminder.frequency)

      // Record in payment history
      const { error: historyError } = await this.supabase
        .from('payment_history')
        .insert({
          user_id: this.userId,
          reference_type: 'bill_reminder',
          reference_id: billReminderId,
          expense_id: null,
          action: 'skipped',
          billing_period_start: billReminder.next_due_date,
          billing_period_end: nextDueDate,
          amount_paid: null,
          payment_date: new Date().toISOString().split('T')[0],
          notes: reason
        })

      if (historyError) throw historyError

      // Update bill reminder
      const { data: updatedBillReminder, error: updateError } = await this.supabase
        .from('bill_reminders')
        .update({
          status: 'active',
          next_due_date: nextDueDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', billReminderId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (updateError) throw updateError

      return {
        success: true,
        billReminder: updatedBillReminder,
        nextDueDate,
        message: `Cycle skipped. Next due: ${nextDueDate}`
      }
    } catch (error) {
      console.error('Error skipping bill:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Cancel a bill reminder permanently
   */
  async cancelBillReminder(billReminderId, { reason = '' } = {}) {
    try {
      // Get current bill reminder
      const { data: billReminder, error: fetchError } = await this.supabase
        .from('bill_reminders')
        .select('*')
        .eq('id', billReminderId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      if (billReminder.status === 'cancelled') {
        return { success: false, error: 'Bill is already cancelled' }
      }

      // Record in payment history
      const { error: historyError } = await this.supabase
        .from('payment_history')
        .insert({
          user_id: this.userId,
          reference_type: 'bill_reminder',
          reference_id: billReminderId,
          expense_id: null,
          action: 'cancelled',
          billing_period_start: billReminder.next_due_date,
          billing_period_end: null,
          amount_paid: null,
          payment_date: new Date().toISOString().split('T')[0],
          notes: reason
        })

      if (historyError) throw historyError

      // Update bill reminder
      const { data: updatedBillReminder, error: updateError } = await this.supabase
        .from('bill_reminders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', billReminderId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (updateError) throw updateError

      return {
        success: true,
        billReminder: updatedBillReminder,
        message: 'Bill cancelled successfully'
      }
    } catch (error) {
      console.error('Error cancelling bill:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update overdue status for all bill reminders
   */
  async updateOverdueStatus() {
    try {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]

      const { error } = await this.supabase
        .from('bill_reminders')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .lt('next_due_date', twoDaysAgoStr)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error updating overdue status:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get bill reminder summary statistics
   */
  async getSummary() {
    try {
      const { billReminders } = await this.getActiveBillReminders()

      const summary = {
        totalMonthly: 0,
        totalYearly: 0,
        active: 0,
        overdue: 0,
        upcomingThisWeek: 0,
        byCategory: {}
      }

      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(today.getDate() + 7)

      for (const bill of billReminders) {
        if (bill.status === 'cancelled') continue

        // Count by status
        if (bill.status === 'overdue') summary.overdue++
        else summary.active++

        // Check if due this week
        const dueDate = new Date(bill.next_due_date)
        if (dueDate >= today && dueDate <= nextWeek) {
          summary.upcomingThisWeek++
        }

        // Calculate monthly equivalent
        const monthlyAmount = bill.frequency === 'yearly'
          ? parseFloat(bill.amount) / 12
          : parseFloat(bill.amount)
        summary.totalMonthly += monthlyAmount
        summary.totalYearly += bill.frequency === 'yearly'
          ? parseFloat(bill.amount)
          : parseFloat(bill.amount) * 12

        // Group by category
        const categoryName = bill.category?.name || bill.category_slug || 'Uncategorized'
        if (!summary.byCategory[categoryName]) {
          summary.byCategory[categoryName] = { count: 0, totalMonthly: 0 }
        }
        summary.byCategory[categoryName].count++
        summary.byCategory[categoryName].totalMonthly += monthlyAmount
      }

      return { success: true, summary }
    } catch (error) {
      console.error('Error getting bill summary:', error)
      return { success: false, error: error.message, summary: {} }
    }
  }

  // Helper methods
  calculateNextDueDate(fromDate, frequency) {
    const date = new Date(fromDate)
    if (frequency === 'yearly') {
      date.setFullYear(date.getFullYear() + 1)
    } else {
      date.setMonth(date.getMonth() + 1)
    }
    return date.toISOString().split('T')[0]
  }

  calculateDaysUntil(dueDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  }

  getUrgency(dueDate, status) {
    if (status === 'cancelled') return { level: 'cancelled', label: 'Cancelled' }
    if (status === 'paid') return { level: 'paid', label: 'Paid' }
    if (status === 'skipped') return { level: 'skipped', label: 'Skipped' }

    const daysUntil = this.calculateDaysUntil(dueDate)

    if (daysUntil < 0) return { level: 'overdue', label: `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue` }
    if (daysUntil === 0) return { level: 'today', label: 'Due today' }
    if (daysUntil === 1) return { level: 'urgent', label: 'Tomorrow' }
    if (daysUntil <= 3) return { level: 'urgent', label: `In ${daysUntil} days` }
    if (daysUntil <= 7) return { level: 'upcoming', label: `In ${daysUntil} days` }
    return { level: 'future', label: new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  }
}
