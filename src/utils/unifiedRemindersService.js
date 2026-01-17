/**
 * Unified Reminders Service
 *
 * Aggregates all reminder types into a single view:
 * - Bills (required recurring payments from recurring_transactions where kind='bill')
 * - Subscriptions (optional recurring payments from recurring_transactions where kind='subscription')
 * - Renewal Reminders (cancel-before reminders from renewal_reminders table)
 *
 * Provides badge system and unified actions for the Reminders page.
 */

import { RenewalReminderService } from './renewalReminderService'

export class UnifiedRemindersService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
    this.renewalService = new RenewalReminderService(supabase, userId)
  }

  // Badge configurations for different reminder types
  static BADGE = {
    BILL: { type: 'bill', label: 'Bill', color: 'blue', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-300' },
    SUBSCRIPTION: { type: 'subscription', label: 'Subscription', color: 'purple', bgClass: 'bg-purple-100 dark:bg-purple-900/30', textClass: 'text-purple-700 dark:text-purple-300' },
    CANCEL_BY: { type: 'renewal', label: 'Cancel by', color: 'red', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-300' }
  }

  // Urgency configurations
  static URGENCY = {
    OVERDUE: { level: 'overdue', label: 'Overdue', color: 'red', priority: 0 },
    TODAY: { level: 'today', label: 'Due Today', color: 'red', priority: 1 },
    URGENT: { level: 'urgent', label: 'Urgent (1-3 days)', color: 'orange', priority: 2 },
    UPCOMING: { level: 'upcoming', label: 'Upcoming', color: 'green', priority: 3 }
  }

  /**
   * Get all upcoming reminders across all types
   * @param {number} daysAhead - Days to look ahead (default 14)
   * @returns {Promise<object>} - Unified list of reminders with type badges
   */
  async getAllUpcomingReminders(daysAhead = 14) {
    try {
      // Fetch from all sources in parallel
      const [recurringResult, renewalResult] = await Promise.all([
        this._getRecurringTransactions(daysAhead),
        this.renewalService.getActiveReminders(daysAhead)
      ])

      const reminders = []

      // Add bills and subscriptions from recurring_transactions
      if (recurringResult.success) {
        for (const item of recurringResult.items) {
          const badge = item.kind === 'bill'
            ? UnifiedRemindersService.BADGE.BILL
            : UnifiedRemindersService.BADGE.SUBSCRIPTION

          const daysUntil = this._calculateDaysUntil(item.next_date)

          reminders.push({
            id: item.id,
            sourceType: 'recurring_transaction',
            sourceTable: 'recurring_transactions',
            kind: item.kind || 'subscription',
            badge,
            title: item.name,
            amount: parseFloat(item.amount),
            dueDate: item.next_date,
            daysUntil,
            frequency: item.frequency,
            category: item.category,
            categoryId: item.category_id,
            paymentMethod: item.payment_method,
            isActive: item.is_active,
            autoAdd: item.auto_add,
            isUrgent: daysUntil <= 3 && daysUntil >= 0,
            isOverdue: daysUntil < 0,
            urgency: this._getUrgency(daysUntil),
            originalData: item
          })
        }
      }

      // Add renewal reminders
      if (renewalResult.success) {
        for (const item of renewalResult.reminders) {
          reminders.push({
            id: item.id,
            sourceType: 'renewal_reminder',
            sourceTable: 'renewal_reminders',
            kind: 'renewal',
            badge: UnifiedRemindersService.BADGE.CANCEL_BY,
            title: item.title,
            amount: parseFloat(item.amount_expected),
            dueDate: item.renewal_date,
            daysUntil: item.daysUntilRenewal,
            frequency: null,
            category: null,
            categoryId: null,
            paymentMethod: null,
            isActive: item.status === 'active',
            autoAdd: false,
            isUrgent: item.isUrgent,
            isOverdue: item.isOverdue,
            urgency: this._getUrgency(item.daysUntilRenewal),
            relatedExpenseId: item.related_expense_id,
            relatedRecurringId: item.related_recurring_id,
            reminderDays: item.reminder_days,
            notes: item.notes,
            originalData: item
          })
        }
      }

      // Sort by urgency priority, then by days until due
      reminders.sort((a, b) => {
        if (a.urgency.priority !== b.urgency.priority) {
          return a.urgency.priority - b.urgency.priority
        }
        return a.daysUntil - b.daysUntil
      })

      // Group by urgency
      const grouped = {
        overdue: reminders.filter(r => r.daysUntil < 0),
        today: reminders.filter(r => r.daysUntil === 0),
        urgent: reminders.filter(r => r.daysUntil >= 1 && r.daysUntil <= 3),
        upcoming: reminders.filter(r => r.daysUntil > 3)
      }

      // Calculate summary
      const summary = {
        total: reminders.length,
        byType: {
          bills: reminders.filter(r => r.kind === 'bill').length,
          subscriptions: reminders.filter(r => r.kind === 'subscription').length,
          renewals: reminders.filter(r => r.kind === 'renewal').length
        },
        byUrgency: {
          overdue: grouped.overdue.length,
          today: grouped.today.length,
          urgent: grouped.urgent.length,
          upcoming: grouped.upcoming.length
        },
        totalAmount: reminders.reduce((sum, r) => sum + r.amount, 0),
        urgentAmount: [...grouped.overdue, ...grouped.today, ...grouped.urgent]
          .reduce((sum, r) => sum + r.amount, 0)
      }

      return {
        success: true,
        reminders,
        grouped,
        summary
      }
    } catch (error) {
      console.error('Error getting unified reminders:', error)
      return {
        success: false,
        reminders: [],
        grouped: { overdue: [], today: [], urgent: [], upcoming: [] },
        summary: { total: 0, byType: {}, byUrgency: {}, totalAmount: 0 },
        error: error.message
      }
    }
  }

  /**
   * Get reminders filtered by type
   * @param {string} type - 'bill', 'subscription', or 'renewal'
   * @param {number} daysAhead - Days to look ahead
   * @returns {Promise<object>}
   */
  async getRemindersByType(type, daysAhead = 14) {
    const result = await this.getAllUpcomingReminders(daysAhead)
    if (!result.success) return result

    const filtered = result.reminders.filter(r => r.kind === type)
    return {
      success: true,
      reminders: filtered,
      summary: {
        total: filtered.length,
        totalAmount: filtered.reduce((sum, r) => sum + r.amount, 0)
      }
    }
  }

  /**
   * Get all notifications (due today across all types)
   * @returns {Promise<object>}
   */
  async getAllDueNotifications() {
    try {
      const result = await this.getAllUpcomingReminders(30)
      if (!result.success) throw new Error(result.error)

      const notifications = []

      for (const reminder of result.reminders) {
        // Check if should notify today
        let shouldNotify = false

        if (reminder.kind === 'renewal') {
          // Renewal reminders have specific notification days
          const reminderDays = reminder.reminderDays || [5, 3, 2, 1]
          shouldNotify = reminderDays.includes(reminder.daysUntil) || reminder.daysUntil === 0
        } else {
          // Bills/subscriptions notify on due day and 1-3 days before
          shouldNotify = reminder.daysUntil >= 0 && reminder.daysUntil <= 3
        }

        if (shouldNotify) {
          notifications.push({
            id: `${reminder.sourceType}-${reminder.id}`,
            type: reminder.kind,
            priority: reminder.daysUntil <= 1 ? 'high' : reminder.daysUntil <= 3 ? 'medium' : 'low',
            title: this._getNotificationTitle(reminder),
            message: this._getNotificationMessage(reminder),
            reminderId: reminder.id,
            sourceType: reminder.sourceType,
            dueDate: reminder.dueDate,
            amount: reminder.amount,
            badge: reminder.badge
          })
        }
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

      return { success: true, notifications }
    } catch (error) {
      console.error('Error getting all due notifications:', error)
      return { success: false, notifications: [], error: error.message }
    }
  }

  /**
   * Mark a recurring transaction as paid
   * @param {string} id - Recurring transaction ID
   * @param {object} paymentData - Payment details
   * @returns {Promise<object>}
   */
  async markRecurringAsPaid(id, paymentData) {
    try {
      // Get the recurring transaction
      const { data: recurring, error: fetchError } = await this.supabase
        .from('recurring_transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      // Create expense record
      const { data: expense, error: expenseError } = await this.supabase
        .from('expenses')
        .insert([{
          user_id: this.userId,
          amount: paymentData.amount || recurring.amount,
          category: recurring.category,
          category_id: recurring.category_id,
          description: paymentData.description || recurring.name,
          payment_method: paymentData.paymentMethod || recurring.payment_method,
          date: paymentData.date || new Date().toISOString().split('T')[0],
          account_id: paymentData.accountId
        }])
        .select()
        .single()

      if (expenseError) throw expenseError

      // Calculate next due date
      const nextDate = this._calculateNextDate(recurring.next_date, recurring.frequency)

      // Update recurring transaction
      const { error: updateError } = await this.supabase
        .from('recurring_transactions')
        .update({ next_date: nextDate })
        .eq('id', id)

      if (updateError) throw updateError

      return {
        success: true,
        expense,
        nextDate
      }
    } catch (error) {
      console.error('Error marking recurring as paid:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update the kind (bill/subscription) of a recurring transaction
   * @param {string} id - Recurring transaction ID
   * @param {string} kind - 'bill' or 'subscription'
   * @returns {Promise<object>}
   */
  async updateRecurringKind(id, kind) {
    try {
      if (!['bill', 'subscription'].includes(kind)) {
        return { success: false, error: 'Kind must be "bill" or "subscription"' }
      }

      const { error } = await this.supabase
        .from('recurring_transactions')
        .update({ kind })
        .eq('id', id)
        .eq('user_id', this.userId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error updating recurring kind:', error)
      return { success: false, error: error.message }
    }
  }

  // Private helper methods

  /**
   * Get recurring transactions with kind awareness
   * @private
   */
  async _getRecurringTransactions(daysAhead = 14) {
    try {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + daysAhead)

      const { data, error } = await this.supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true)
        .eq('type', 'expense')
        .lte('next_date', futureDate.toISOString().split('T')[0])
        .order('next_date', { ascending: true })

      if (error) throw error
      return { success: true, items: data || [] }
    } catch (error) {
      console.error('Error getting recurring transactions:', error)
      return { success: false, items: [], error: error.message }
    }
  }

  /**
   * Calculate days until a date
   * @private
   */
  _calculateDaysUntil(dateStr) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(dateStr)
    targetDate.setHours(0, 0, 0, 0)
    return Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24))
  }

  /**
   * Get urgency object based on days until due
   * @private
   */
  _getUrgency(daysUntil) {
    if (daysUntil < 0) return UnifiedRemindersService.URGENCY.OVERDUE
    if (daysUntil === 0) return UnifiedRemindersService.URGENCY.TODAY
    if (daysUntil <= 3) return UnifiedRemindersService.URGENCY.URGENT
    return UnifiedRemindersService.URGENCY.UPCOMING
  }

  /**
   * Calculate next date based on frequency
   * @private
   */
  _calculateNextDate(currentDate, frequency) {
    const date = new Date(currentDate)

    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1)
        break
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'biweekly':
        date.setDate(date.getDate() + 14)
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
        date.setMonth(date.getMonth() + 1)
    }

    return date.toISOString().split('T')[0]
  }

  /**
   * Get notification title based on reminder type
   * @private
   */
  _getNotificationTitle(reminder) {
    if (reminder.kind === 'renewal') {
      return `Cancel Reminder: ${reminder.title}`
    }
    if (reminder.kind === 'bill') {
      return `Bill Due: ${reminder.title}`
    }
    return `Subscription Due: ${reminder.title}`
  }

  /**
   * Get notification message based on reminder state
   * @private
   */
  _getNotificationMessage(reminder) {
    const amount = parseFloat(reminder.amount).toLocaleString('en-KE')

    if (reminder.kind === 'renewal') {
      if (reminder.daysUntil < 0) {
        return `May have renewed for KES ${amount}. Did you cancel?`
      }
      if (reminder.daysUntil === 0) {
        return `Renews TODAY for KES ${amount}! Cancel now if you don't want it.`
      }
      if (reminder.daysUntil === 1) {
        return `Renews TOMORROW for KES ${amount}. Last chance to cancel!`
      }
      return `Renews in ${reminder.daysUntil} days (KES ${amount})`
    }

    // Bills and subscriptions
    if (reminder.daysUntil < 0) {
      return `Overdue by ${Math.abs(reminder.daysUntil)} day(s) - KES ${amount}`
    }
    if (reminder.daysUntil === 0) {
      return `Due TODAY - KES ${amount}`
    }
    if (reminder.daysUntil === 1) {
      return `Due TOMORROW - KES ${amount}`
    }
    return `Due in ${reminder.daysUntil} days - KES ${amount}`
  }
}

export default UnifiedRemindersService
