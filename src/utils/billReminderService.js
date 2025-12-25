/**
 * Bill Reminder Service
 *
 * Auto-generates bill reminders from existing recurring_transactions table
 * Features:
 * - No separate table needed - uses recurring_transactions as single source of truth
 * - Categorizes bills by urgency (due today, urgent 1-3 days, upcoming 4-7 days)
 * - Supports notifications for upcoming payments
 * - Integrates with existing subscription/recurring expense system
 */

export class BillReminderService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Urgency levels for bill reminders
   */
  static URGENCY = {
    DUE_TODAY: 'due_today',
    URGENT: 'urgent', // 1-3 days
    UPCOMING: 'upcoming' // 4-7 days
  }

  /**
   * Get upcoming bills categorized by urgency
   * @param {number} daysAhead - Number of days to look ahead (default: 7)
   * @returns {Promise<object>} - {success, bills, summary, error}
   */
  async getUpcomingBills(daysAhead = 7) {
    try {
      // Query recurring transactions that are:
      // - Active (is_active = true)
      // - Expenses (type = 'expense')
      // - Due within daysAhead days
      const { data: bills, error } = await this.supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true)
        .eq('type', 'expense')
        .gte('days_until_due', 0) // Not overdue
        .lte('days_until_due', daysAhead)
        .order('days_until_due', { ascending: true })

      if (error) throw error

      // Categorize bills by urgency
      const categorized = {
        dueToday: [],
        urgent: [],
        upcoming: []
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      bills.forEach(bill => {
        const daysUntil = parseInt(bill.days_until_due || 0)

        if (daysUntil === 0) {
          categorized.dueToday.push({
            ...bill,
            urgency: BillReminderService.URGENCY.DUE_TODAY,
            urgencyLabel: 'Due Today',
            urgencyColor: 'red'
          })
        } else if (daysUntil >= 1 && daysUntil <= 3) {
          categorized.urgent.push({
            ...bill,
            urgency: BillReminderService.URGENCY.URGENT,
            urgencyLabel: `Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
            urgencyColor: 'amber'
          })
        } else if (daysUntil >= 4 && daysUntil <= 7) {
          categorized.upcoming.push({
            ...bill,
            urgency: BillReminderService.URGENCY.UPCOMING,
            urgencyLabel: `Due in ${daysUntil} days`,
            urgencyColor: 'gray'
          })
        }
      })

      // Calculate summary
      const summary = {
        total: bills.length,
        dueToday: categorized.dueToday.length,
        urgent: categorized.urgent.length,
        upcoming: categorized.upcoming.length,
        totalAmount: bills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0),
        amountDueToday: categorized.dueToday.reduce((sum, bill) => sum + parseFloat(bill.amount), 0),
        amountUrgent: categorized.urgent.reduce((sum, bill) => sum + parseFloat(bill.amount), 0),
        amountUpcoming: categorized.upcoming.reduce((sum, bill) => sum + parseFloat(bill.amount), 0)
      }

      return {
        success: true,
        bills: categorized,
        allBills: bills,
        summary
      }
    } catch (error) {
      console.error('Error getting upcoming bills:', error)
      return {
        success: false,
        bills: { dueToday: [], urgent: [], upcoming: [] },
        summary: { total: 0, dueToday: 0, urgent: 0, upcoming: 0 },
        error: error.message
      }
    }
  }

  /**
   * Get bill notifications (for display in notifications area)
   * @returns {Promise<object>} - {success, notifications, error}
   */
  async getBillNotifications() {
    try {
      const billsData = await this.getUpcomingBills(3) // Next 3 days only for notifications
      if (!billsData.success) throw new Error(billsData.error)

      const notifications = []

      // Due today notifications (high priority)
      billsData.bills.dueToday.forEach(bill => {
        notifications.push({
          id: `bill-${bill.id}-today`,
          type: 'bill_due_today',
          priority: 'high',
          title: `Bill Due Today: ${bill.name}`,
          message: `${bill.name} payment of KES ${parseFloat(bill.amount).toFixed(2)} is due today`,
          amount: bill.amount,
          billId: bill.id,
          dueDate: bill.next_date,
          urgency: BillReminderService.URGENCY.DUE_TODAY
        })
      })

      // Urgent notifications (1 day)
      const tomorrowBills = billsData.bills.urgent.filter(b => b.days_until_due === 1)
      tomorrowBills.forEach(bill => {
        notifications.push({
          id: `bill-${bill.id}-tomorrow`,
          type: 'bill_due_tomorrow',
          priority: 'medium',
          title: `Bill Due Tomorrow: ${bill.name}`,
          message: `${bill.name} payment of KES ${parseFloat(bill.amount).toFixed(2)} is due tomorrow`,
          amount: bill.amount,
          billId: bill.id,
          dueDate: bill.next_date,
          urgency: BillReminderService.URGENCY.URGENT
        })
      })

      // 3-day warnings (lower priority)
      const threeDayBills = billsData.bills.urgent.filter(b => b.days_until_due === 3)
      threeDayBills.forEach(bill => {
        notifications.push({
          id: `bill-${bill.id}-3days`,
          type: 'bill_due_soon',
          priority: 'low',
          title: `Reminder: ${bill.name}`,
          message: `${bill.name} payment of KES ${parseFloat(bill.amount).toFixed(2)} is due in 3 days`,
          amount: bill.amount,
          billId: bill.id,
          dueDate: bill.next_date,
          urgency: BillReminderService.URGENCY.URGENT
        })
      })

      return {
        success: true,
        notifications,
        count: notifications.length
      }
    } catch (error) {
      console.error('Error getting bill notifications:', error)
      return {
        success: false,
        notifications: [],
        count: 0,
        error: error.message
      }
    }
  }

  /**
   * Get overdue bills (recurring transactions with next_date in the past)
   * @returns {Promise<object>} - {success, overdueBills, summary, error}
   */
  async getOverdueBills() {
    try {
      const { data: bills, error } = await this.supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true)
        .eq('type', 'expense')
        .lt('days_until_due', 0) // Overdue (negative days)
        .order('days_until_due', { ascending: true }) // Most overdue first

      if (error) throw error

      // Add overdue info to each bill
      const overdueBills = bills.map(bill => ({
        ...bill,
        daysOverdue: Math.abs(bill.days_until_due),
        urgency: 'overdue',
        urgencyLabel: `Overdue by ${Math.abs(bill.days_until_due)} day${Math.abs(bill.days_until_due) > 1 ? 's' : ''}`,
        urgencyColor: 'red'
      }))

      const summary = {
        total: overdueBills.length,
        totalAmount: overdueBills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0)
      }

      return {
        success: true,
        overdueBills,
        summary
      }
    } catch (error) {
      console.error('Error getting overdue bills:', error)
      return {
        success: false,
        overdueBills: [],
        summary: { total: 0, totalAmount: 0 },
        error: error.message
      }
    }
  }

  /**
   * Get bill reminder summary for dashboard widget
   * @returns {Promise<object>} - {success, summary, error}
   */
  async getBillReminderSummary() {
    try {
      const [upcomingData, overdueData] = await Promise.all([
        this.getUpcomingBills(7),
        this.getOverdueBills()
      ])

      if (!upcomingData.success) throw new Error(upcomingData.error)
      if (!overdueData.success) throw new Error(overdueData.error)

      const summary = {
        overdue: {
          count: overdueData.summary.total,
          amount: overdueData.summary.totalAmount
        },
        dueToday: {
          count: upcomingData.summary.dueToday,
          amount: upcomingData.summary.amountDueToday
        },
        urgent: {
          count: upcomingData.summary.urgent,
          amount: upcomingData.summary.amountUrgent
        },
        upcoming: {
          count: upcomingData.summary.upcoming,
          amount: upcomingData.summary.amountUpcoming
        },
        total: {
          count: overdueData.summary.total + upcomingData.summary.total,
          amount: overdueData.summary.totalAmount + upcomingData.summary.totalAmount
        }
      }

      return {
        success: true,
        summary
      }
    } catch (error) {
      console.error('Error getting bill reminder summary:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Mark bill as paid (creates expense and updates next_date)
   * @param {string} billId - Recurring transaction ID
   * @param {string} paymentDate - Date payment was made
   * @param {string} accountId - Account used for payment (optional)
   * @returns {Promise<object>} - {success, expenseId, nextDate, error}
   */
  async markBillAsPaid(billId, paymentDate, accountId = null) {
    try {
      // Get bill details
      const { data: bill, error: fetchError } = await this.supabase
        .from('recurring_transactions')
        .select('*')
        .eq('id', billId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      // Create expense record
      const expenseData = {
        user_id: this.userId,
        amount: bill.amount,
        category: bill.category,
        description: bill.name,
        date: paymentDate,
        payment_method: bill.payment_method || 'cash'
      }

      if (accountId) {
        expenseData.account_id = accountId
      }

      const { data: expense, error: expenseError } = await this.supabase
        .from('expenses')
        .insert(expenseData)
        .select('id')
        .single()

      if (expenseError) throw expenseError

      // Calculate next occurrence date based on frequency
      const nextDate = this.calculateNextDate(bill.next_date, bill.frequency)

      // Update recurring transaction with new next_date
      const { error: updateError } = await this.supabase
        .from('recurring_transactions')
        .update({ next_date: nextDate })
        .eq('id', billId)

      if (updateError) throw updateError

      return {
        success: true,
        expenseId: expense.id,
        nextDate
      }
    } catch (error) {
      console.error('Error marking bill as paid:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Calculate next occurrence date based on frequency
   * @param {string} currentDate - Current next_date
   * @param {string} frequency - 'daily', 'weekly', 'monthly', 'yearly'
   * @returns {string} - Next date in YYYY-MM-DD format
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
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
      default:
        // Default to monthly
        date.setMonth(date.getMonth() + 1)
    }

    return date.toISOString().split('T')[0] // YYYY-MM-DD
  }

  /**
   * Snooze a bill reminder (postpone next_date)
   * @param {string} billId - Recurring transaction ID
   * @param {number} days - Number of days to snooze
   * @returns {Promise<object>} - {success, newDate, error}
   */
  async snoozeBillReminder(billId, days) {
    try {
      // Get current bill
      const { data: bill, error: fetchError } = await this.supabase
        .from('recurring_transactions')
        .select('next_date')
        .eq('id', billId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      // Calculate new date
      const currentDate = new Date(bill.next_date)
      currentDate.setDate(currentDate.getDate() + days)
      const newDate = currentDate.toISOString().split('T')[0]

      // Update next_date
      const { error: updateError } = await this.supabase
        .from('recurring_transactions')
        .update({ next_date: newDate })
        .eq('id', billId)

      if (updateError) throw updateError

      return {
        success: true,
        newDate
      }
    } catch (error) {
      console.error('Error snoozing bill reminder:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Dismiss a bill reminder (deactivate recurring transaction)
   * @param {string} billId - Recurring transaction ID
   * @returns {Promise<object>} - {success, error}
   */
  async dismissBillReminder(billId) {
    try {
      const { error } = await this.supabase
        .from('recurring_transactions')
        .update({ is_active: false })
        .eq('id', billId)
        .eq('user_id', this.userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error dismissing bill reminder:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default BillReminderService
