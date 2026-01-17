/**
 * Renewal Reminder Service
 *
 * Manages "Remind me to cancel" functionality for subscriptions.
 * Helps users avoid unwanted renewals by sending reminders before renewal dates.
 *
 * Key methods:
 * - createRenewalReminder: Create new reminder
 * - getActiveReminders: Fetch with computed fields
 * - getDueNotifications: Get reminders needing notification today
 * - markAsCancelled: User cancelled subscription
 * - markAsExpired: Renewal passed without action
 * - markAsRenewed: User acknowledged renewal
 */

export class RenewalReminderService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  static STATUS = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    RENEWED: 'renewed'
  }

  static DEFAULT_REMINDER_DAYS = [5, 3, 2, 1]

  /**
   * Create a new renewal reminder
   * @param {object} data - Reminder data
   * @param {string} data.title - Name of subscription/service
   * @param {string} data.renewalDate - ISO date string for renewal
   * @param {number} data.amountExpected - Expected renewal amount
   * @param {string} [data.relatedExpenseId] - Optional linked expense ID
   * @param {string} [data.relatedRecurringId] - Optional linked recurring transaction ID
   * @param {number[]} [data.reminderDays] - Days before renewal to remind
   * @param {string} [data.notes] - Optional notes
   * @returns {Promise<object>} - {success, data, error}
   */
  async createRenewalReminder(data) {
    try {
      if (!data.title || !data.renewalDate || data.amountExpected === undefined) {
        return { success: false, error: 'Title, renewal date, and amount are required' }
      }

      const { data: reminder, error } = await this.supabase
        .from('renewal_reminders')
        .insert([{
          user_id: this.userId,
          title: data.title,
          related_expense_id: data.relatedExpenseId || null,
          related_recurring_id: data.relatedRecurringId || null,
          renewal_date: data.renewalDate,
          amount_expected: data.amountExpected,
          reminder_days: data.reminderDays || RenewalReminderService.DEFAULT_REMINDER_DAYS,
          status: 'active',
          notes: data.notes || null
        }])
        .select()
        .single()

      if (error) throw error
      return { success: true, data: reminder }
    } catch (error) {
      console.error('Error creating renewal reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get a single reminder by ID
   * @param {string} reminderId - Reminder UUID
   * @returns {Promise<object>} - {success, data, error}
   */
  async getReminderById(reminderId) {
    try {
      const { data, error } = await this.supabase
        .from('renewal_reminders')
        .select('*')
        .eq('id', reminderId)
        .eq('user_id', this.userId)
        .single()

      if (error) throw error
      return { success: true, data: this._enrichReminder(data) }
    } catch (error) {
      console.error('Error getting reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get active renewal reminders ordered by renewal date
   * @param {number} daysAhead - Days to look ahead (default 30)
   * @returns {Promise<object>} - {success, reminders, summary, error}
   */
  async getActiveReminders(daysAhead = 30) {
    try {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysAhead)

      const { data, error } = await this.supabase
        .from('renewal_reminders')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .lte('renewal_date', futureDate.toISOString().split('T')[0])
        .order('renewal_date', { ascending: true })

      if (error) throw error

      const reminders = (data || []).map(r => this._enrichReminder(r))

      const summary = {
        total: reminders.length,
        urgent: reminders.filter(r => r.isUrgent).length,
        overdue: reminders.filter(r => r.isOverdue).length,
        totalAmount: reminders.reduce((sum, r) => sum + parseFloat(r.amount_expected || 0), 0)
      }

      return { success: true, reminders, summary }
    } catch (error) {
      console.error('Error getting active reminders:', error)
      return { success: false, reminders: [], summary: { total: 0 }, error: error.message }
    }
  }

  /**
   * Get all reminders (including inactive) for history view
   * @param {object} options - Filter options
   * @param {string} [options.status] - Filter by status
   * @param {number} [options.limit] - Limit results
   * @returns {Promise<object>} - {success, reminders, error}
   */
  async getAllReminders(options = {}) {
    try {
      let query = this.supabase
        .from('renewal_reminders')
        .select('*')
        .eq('user_id', this.userId)
        .order('renewal_date', { ascending: false })

      if (options.status) {
        query = query.eq('status', options.status)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error

      const reminders = (data || []).map(r => this._enrichReminder(r))
      return { success: true, reminders }
    } catch (error) {
      console.error('Error getting all reminders:', error)
      return { success: false, reminders: [], error: error.message }
    }
  }

  /**
   * Get reminders due for notification today
   * @returns {Promise<object>} - {success, notifications, error}
   */
  async getDueNotifications() {
    try {
      const result = await this.getActiveReminders(30)
      if (!result.success) throw new Error(result.error)

      const notifications = result.reminders
        .filter(r => r.shouldNotifyToday)
        .map(r => ({
          id: `renewal-${r.id}`,
          type: 'renewal_reminder',
          priority: r.daysUntilRenewal <= 1 ? 'high' : 'medium',
          title: `Cancel Reminder: ${r.title}`,
          message: this._getNotificationMessage(r),
          reminderId: r.id,
          renewalDate: r.renewal_date,
          amount: r.amount_expected
        }))

      return { success: true, notifications }
    } catch (error) {
      console.error('Error getting due notifications:', error)
      return { success: false, notifications: [], error: error.message }
    }
  }

  /**
   * Update a renewal reminder
   * @param {string} reminderId - Reminder UUID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} - {success, data, error}
   */
  async updateReminder(reminderId, updates) {
    try {
      const allowedFields = ['title', 'renewal_date', 'amount_expected', 'reminder_days', 'notes']
      const filteredUpdates = {}

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field]
        }
      }

      const { data, error } = await this.supabase
        .from('renewal_reminders')
        .update(filteredUpdates)
        .eq('id', reminderId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data: this._enrichReminder(data) }
    } catch (error) {
      console.error('Error updating reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Mark reminder as cancelled (user cancelled the subscription)
   * @param {string} reminderId - Reminder UUID
   * @returns {Promise<object>} - {success, error}
   */
  async markAsCancelled(reminderId) {
    try {
      const { error } = await this.supabase
        .from('renewal_reminders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', reminderId)
        .eq('user_id', this.userId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error marking reminder as cancelled:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Mark reminder as expired (renewal passed without action)
   * @param {string} reminderId - Reminder UUID
   * @returns {Promise<object>} - {success, error}
   */
  async markAsExpired(reminderId) {
    try {
      const { error } = await this.supabase
        .from('renewal_reminders')
        .update({ status: 'expired' })
        .eq('id', reminderId)
        .eq('user_id', this.userId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error marking reminder as expired:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Mark as renewed and optionally create reminder for next cycle
   * @param {string} reminderId - Reminder UUID
   * @param {object} options - Options for next reminder
   * @param {boolean} [options.createNextReminder] - Create reminder for next renewal
   * @param {string} [options.nextRenewalDate] - Date for next renewal
   * @returns {Promise<object>} - {success, nextReminder, error}
   */
  async markAsRenewed(reminderId, options = {}) {
    try {
      // Get current reminder details
      const { data: current, error: fetchError } = await this.supabase
        .from('renewal_reminders')
        .select('*')
        .eq('id', reminderId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      // Update current to renewed
      const { error: updateError } = await this.supabase
        .from('renewal_reminders')
        .update({ status: 'renewed' })
        .eq('id', reminderId)

      if (updateError) throw updateError

      // Create next reminder if requested
      let nextReminder = null
      if (options.createNextReminder && options.nextRenewalDate) {
        const result = await this.createRenewalReminder({
          title: current.title,
          relatedRecurringId: current.related_recurring_id,
          renewalDate: options.nextRenewalDate,
          amountExpected: current.amount_expected,
          reminderDays: current.reminder_days,
          notes: current.notes
        })
        if (result.success) {
          nextReminder = result.data
        }
      }

      return { success: true, nextReminder }
    } catch (error) {
      console.error('Error marking reminder as renewed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete a reminder
   * @param {string} reminderId - Reminder UUID
   * @returns {Promise<object>} - {success, error}
   */
  async deleteReminder(reminderId) {
    try {
      const { error } = await this.supabase
        .from('renewal_reminders')
        .delete()
        .eq('id', reminderId)
        .eq('user_id', this.userId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check and auto-expire overdue reminders
   * @returns {Promise<object>} - {success, expiredCount, expiredReminders, error}
   */
  async processExpiredReminders() {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await this.supabase
        .from('renewal_reminders')
        .update({ status: 'expired' })
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .lt('renewal_date', today)
        .select('id, title, renewal_date, amount_expected')

      if (error) throw error
      return {
        success: true,
        expiredCount: data?.length || 0,
        expiredReminders: data || []
      }
    } catch (error) {
      console.error('Error processing expired reminders:', error)
      return { success: false, expiredCount: 0, expiredReminders: [], error: error.message }
    }
  }

  /**
   * Update last notified timestamp
   * @param {string} reminderId - Reminder UUID
   * @returns {Promise<object>} - {success, error}
   */
  async updateLastNotified(reminderId) {
    try {
      const { error } = await this.supabase
        .from('renewal_reminders')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', reminderId)
        .eq('user_id', this.userId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error updating last notified:', error)
      return { success: false, error: error.message }
    }
  }

  // Private helper methods

  /**
   * Enrich reminder with computed fields
   * @private
   */
  _enrichReminder(reminder) {
    if (!reminder) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const renewalDate = new Date(reminder.renewal_date)
    renewalDate.setHours(0, 0, 0, 0)

    const daysUntil = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24))
    const reminderDays = reminder.reminder_days || RenewalReminderService.DEFAULT_REMINDER_DAYS
    const shouldNotify = reminderDays.includes(daysUntil) || daysUntil === 0

    return {
      ...reminder,
      daysUntilRenewal: daysUntil,
      shouldNotifyToday: shouldNotify,
      isUrgent: daysUntil <= 3 && daysUntil >= 0,
      isOverdue: daysUntil < 0,
      urgencyLevel: this._getUrgencyLevel(daysUntil),
      urgencyColor: this._getUrgencyColor(daysUntil)
    }
  }

  /**
   * Get urgency level based on days until renewal
   * @private
   */
  _getUrgencyLevel(daysUntil) {
    if (daysUntil < 0) return 'overdue'
    if (daysUntil === 0) return 'today'
    if (daysUntil <= 2) return 'critical'
    if (daysUntil <= 5) return 'urgent'
    return 'upcoming'
  }

  /**
   * Get urgency color based on days until renewal
   * @private
   */
  _getUrgencyColor(daysUntil) {
    if (daysUntil < 0) return 'red'
    if (daysUntil === 0) return 'red'
    if (daysUntil <= 2) return 'orange'
    if (daysUntil <= 5) return 'yellow'
    return 'green'
  }

  /**
   * Get notification message based on reminder state
   * @private
   */
  _getNotificationMessage(reminder) {
    const amount = parseFloat(reminder.amount_expected).toLocaleString('en-KE')

    if (reminder.daysUntilRenewal < 0) {
      return `${reminder.title} may have renewed for KES ${amount}. Did you cancel?`
    }
    if (reminder.daysUntilRenewal === 0) {
      return `${reminder.title} renews TODAY for KES ${amount}! Cancel now if you don't want it.`
    }
    if (reminder.daysUntilRenewal === 1) {
      return `${reminder.title} renews TOMORROW for KES ${amount}. Last chance to cancel!`
    }
    return `${reminder.title} renews in ${reminder.daysUntilRenewal} days (KES ${amount})`
  }
}

export default RenewalReminderService
