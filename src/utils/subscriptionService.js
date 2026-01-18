/**
 * Subscription Service
 * Handles all subscription-related operations including CRUD, payment tracking, and status management
 */

export class SubscriptionService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Create a new subscription from a recurrent expense
   */
  async createSubscription({ name, description, categoryId, categorySlug, amount, frequency, nextDueDate, sourceExpenseId }) {
    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
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
      return { success: true, subscription: data }
    } catch (error) {
      console.error('Error creating subscription:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all subscriptions for user
   */
  async getSubscriptions({ status = null, includeOverdue = true } = {}) {
    try {
      let query = this.supabase
        .from('subscriptions')
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
      const enrichedData = (data || []).map(sub => ({
        ...sub,
        category: sub.expense_categories,
        daysUntil: this.calculateDaysUntil(sub.next_due_date),
        urgency: this.getUrgency(sub.next_due_date, sub.status)
      }))

      return { success: true, subscriptions: enrichedData }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      return { success: false, error: error.message, subscriptions: [] }
    }
  }

  /**
   * Get active subscriptions (not cancelled)
   */
  async getActiveSubscriptions() {
    return this.getSubscriptions({ status: ['active', 'paid', 'skipped', 'overdue'] })
  }

  /**
   * Get a single subscription by ID
   */
  async getSubscription(id) {
    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
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
      return { success: true, subscription: data }
    } catch (error) {
      console.error('Error fetching subscription:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Mark subscription as paid and create next cycle
   */
  async markAsPaid(subscriptionId, { expenseId, paymentDate, notes = '' }) {
    try {
      // Get current subscription
      const { data: subscription, error: fetchError } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      // Check if already paid or cancelled
      if (subscription.status === 'cancelled') {
        return { success: false, error: 'Cannot mark cancelled subscription as paid' }
      }

      // Check if already paid in this billing period
      const { data: existingPayment, error: paymentCheckError } = await this.supabase
        .from('payment_history')
        .select('id')
        .eq('user_id', this.userId)
        .eq('reference_type', 'subscription')
        .eq('reference_id', subscriptionId)
        .eq('billing_period_start', subscription.next_due_date)
        .eq('action', 'paid')
        .maybeSingle()

      if (paymentCheckError) throw paymentCheckError

      if (existingPayment) {
        return { success: false, error: 'This subscription has already been marked as paid for this billing period' }
      }

      // Calculate next due date based on payment date
      const nextDueDate = this.calculateNextDueDate(paymentDate, subscription.frequency)

      // Calculate billing period
      const billingPeriodStart = subscription.next_due_date
      const billingPeriodEnd = nextDueDate

      // Record in payment history
      const { error: historyError } = await this.supabase
        .from('payment_history')
        .insert({
          user_id: this.userId,
          reference_type: 'subscription',
          reference_id: subscriptionId,
          expense_id: expenseId,
          action: 'paid',
          billing_period_start: billingPeriodStart,
          billing_period_end: billingPeriodEnd,
          amount_paid: subscription.amount,
          payment_date: paymentDate,
          notes
        })

      if (historyError) throw historyError

      // Update subscription with new due date and reset to active
      const { data: updatedSubscription, error: updateError } = await this.supabase
        .from('subscriptions')
        .update({
          status: 'active',
          next_due_date: nextDueDate,
          last_paid_date: paymentDate,
          last_paid_expense_id: expenseId,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (updateError) throw updateError

      // Update expense to link it to this subscription
      if (expenseId) {
        await this.supabase
          .from('expenses')
          .update({
            is_recurrent: true,
            recurrence_type: 'subscription',
            linked_subscription_id: subscriptionId
          })
          .eq('id', expenseId)
          .eq('user_id', this.userId)
      }

      return {
        success: true,
        subscription: updatedSubscription,
        nextDueDate,
        message: `Payment recorded. Next due: ${nextDueDate}`
      }
    } catch (error) {
      console.error('Error marking subscription as paid:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Skip a subscription cycle
   */
  async skipCycle(subscriptionId, { reason = '' } = {}) {
    try {
      // Get current subscription
      const { data: subscription, error: fetchError } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      if (subscription.status === 'cancelled') {
        return { success: false, error: 'Cannot skip cancelled subscription' }
      }

      if (subscription.status === 'overdue') {
        return { success: false, error: 'Cannot skip overdue subscription. Please resolve the overdue payment first.' }
      }

      // Check if already actioned in this billing period (paid or skipped)
      const { data: existingAction, error: actionCheckError } = await this.supabase
        .from('payment_history')
        .select('id, action')
        .eq('user_id', this.userId)
        .eq('reference_type', 'subscription')
        .eq('reference_id', subscriptionId)
        .eq('billing_period_start', subscription.next_due_date)
        .in('action', ['paid', 'skipped'])
        .maybeSingle()

      if (actionCheckError) throw actionCheckError

      if (existingAction) {
        return { success: false, error: `This subscription has already been ${existingAction.action} for this billing period` }
      }

      // Calculate next due date from current due date
      const nextDueDate = this.calculateNextDueDate(subscription.next_due_date, subscription.frequency)

      // Record in payment history
      const { error: historyError } = await this.supabase
        .from('payment_history')
        .insert({
          user_id: this.userId,
          reference_type: 'subscription',
          reference_id: subscriptionId,
          expense_id: null,
          action: 'skipped',
          billing_period_start: subscription.next_due_date,
          billing_period_end: nextDueDate,
          amount_paid: null,
          payment_date: new Date().toISOString().split('T')[0],
          notes: reason
        })

      if (historyError) throw historyError

      // Update subscription
      const { data: updatedSubscription, error: updateError } = await this.supabase
        .from('subscriptions')
        .update({
          status: 'active',
          next_due_date: nextDueDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (updateError) throw updateError

      return {
        success: true,
        subscription: updatedSubscription,
        nextDueDate,
        message: `Cycle skipped. Next due: ${nextDueDate}`
      }
    } catch (error) {
      console.error('Error skipping subscription:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Cancel a subscription permanently
   */
  async cancelSubscription(subscriptionId, { reason = '' } = {}) {
    try {
      // Get current subscription
      const { data: subscription, error: fetchError } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      if (subscription.status === 'cancelled') {
        return { success: false, error: 'Subscription is already cancelled' }
      }

      // Record in payment history
      const { error: historyError } = await this.supabase
        .from('payment_history')
        .insert({
          user_id: this.userId,
          reference_type: 'subscription',
          reference_id: subscriptionId,
          expense_id: null,
          action: 'cancelled',
          billing_period_start: subscription.next_due_date,
          billing_period_end: null,
          amount_paid: null,
          payment_date: new Date().toISOString().split('T')[0],
          notes: reason
        })

      if (historyError) throw historyError

      // Update subscription
      const { data: updatedSubscription, error: updateError } = await this.supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (updateError) throw updateError

      return {
        success: true,
        subscription: updatedSubscription,
        message: 'Subscription cancelled successfully'
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update overdue status for all subscriptions
   */
  async updateOverdueStatus() {
    try {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]

      const { error } = await this.supabase
        .from('subscriptions')
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
   * Get subscription summary statistics
   */
  async getSummary() {
    try {
      const { subscriptions } = await this.getActiveSubscriptions()

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

      for (const sub of subscriptions) {
        if (sub.status === 'cancelled') continue

        // Count by status
        if (sub.status === 'overdue') summary.overdue++
        else summary.active++

        // Check if due this week
        const dueDate = new Date(sub.next_due_date)
        if (dueDate >= today && dueDate <= nextWeek) {
          summary.upcomingThisWeek++
        }

        // Calculate monthly equivalent
        const monthlyAmount = sub.frequency === 'yearly'
          ? parseFloat(sub.amount) / 12
          : parseFloat(sub.amount)
        summary.totalMonthly += monthlyAmount
        summary.totalYearly += sub.frequency === 'yearly'
          ? parseFloat(sub.amount)
          : parseFloat(sub.amount) * 12

        // Group by category
        const categoryName = sub.category?.name || sub.category_slug || 'Uncategorized'
        if (!summary.byCategory[categoryName]) {
          summary.byCategory[categoryName] = { count: 0, totalMonthly: 0 }
        }
        summary.byCategory[categoryName].count++
        summary.byCategory[categoryName].totalMonthly += monthlyAmount
      }

      return { success: true, summary }
    } catch (error) {
      console.error('Error getting subscription summary:', error)
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
