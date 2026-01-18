/**
 * Payment History Service
 * Handles fetching and organizing payment history for subscriptions and bill reminders
 */

export class PaymentHistoryService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Get all payment history, organized by category
   */
  async getPaymentHistoryByCategory({ limit = 100 } = {}) {
    try {
      // Fetch payment history with related data
      const { data: history, error } = await this.supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', this.userId)
        .order('payment_date', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Fetch all subscriptions and bill reminders for reference
      const [subscriptionsResult, billsResult] = await Promise.all([
        this.supabase
          .from('subscriptions')
          .select(`
            id, name, amount, frequency, category_id, category_slug,
            expense_categories!category_id (id, name, slug, icon, color)
          `)
          .eq('user_id', this.userId),
        this.supabase
          .from('bill_reminders')
          .select(`
            id, name, amount, frequency, category_id, category_slug,
            expense_categories!category_id (id, name, slug, icon, color)
          `)
          .eq('user_id', this.userId)
      ])

      // Create lookup maps
      const subscriptionsMap = {}
      const billsMap = {}

      for (const sub of (subscriptionsResult.data || [])) {
        subscriptionsMap[sub.id] = sub
      }
      for (const bill of (billsResult.data || [])) {
        billsMap[bill.id] = bill
      }

      // Fetch expense details for paid items
      const expenseIds = history
        .filter(h => h.expense_id)
        .map(h => h.expense_id)

      let expensesMap = {}
      if (expenseIds.length > 0) {
        const { data: expenses } = await this.supabase
          .from('expenses')
          .select('id, amount, date, description, category')
          .in('id', expenseIds)

        for (const exp of (expenses || [])) {
          expensesMap[exp.id] = exp
        }
      }

      // Enrich history with related data
      const enrichedHistory = history.map(h => {
        const reference = h.reference_type === 'subscription'
          ? subscriptionsMap[h.reference_id]
          : billsMap[h.reference_id]

        return {
          ...h,
          reference,
          expense: h.expense_id ? expensesMap[h.expense_id] : null,
          categoryName: reference?.expense_categories?.name || reference?.category_slug || 'Uncategorized',
          categorySlug: reference?.expense_categories?.slug || reference?.category_slug || 'uncategorized',
          categoryIcon: reference?.expense_categories?.icon,
          categoryColor: reference?.expense_categories?.color
        }
      })

      // Group by category
      const byCategory = {}
      for (const item of enrichedHistory) {
        const categoryName = item.categoryName
        if (!byCategory[categoryName]) {
          byCategory[categoryName] = {
            name: categoryName,
            slug: item.categorySlug,
            icon: item.categoryIcon,
            color: item.categoryColor,
            items: [],
            totalPaid: 0,
            totalSkipped: 0,
            totalCancelled: 0
          }
        }
        byCategory[categoryName].items.push(item)

        // Update counts
        if (item.action === 'paid') {
          byCategory[categoryName].totalPaid += parseFloat(item.amount_paid || 0)
        } else if (item.action === 'skipped') {
          byCategory[categoryName].totalSkipped++
        } else if (item.action === 'cancelled') {
          byCategory[categoryName].totalCancelled++
        }
      }

      // Convert to array and sort by total paid
      const categoriesArray = Object.values(byCategory)
        .sort((a, b) => b.totalPaid - a.totalPaid)

      return {
        success: true,
        history: enrichedHistory,
        byCategory: categoriesArray,
        totals: {
          paid: enrichedHistory.filter(h => h.action === 'paid').length,
          skipped: enrichedHistory.filter(h => h.action === 'skipped').length,
          cancelled: enrichedHistory.filter(h => h.action === 'cancelled').length,
          totalAmount: enrichedHistory
            .filter(h => h.action === 'paid')
            .reduce((sum, h) => sum + parseFloat(h.amount_paid || 0), 0)
        }
      }
    } catch (error) {
      console.error('Error fetching payment history:', error)
      return { success: false, error: error.message, history: [], byCategory: [] }
    }
  }

  /**
   * Get payment history for a specific subscription or bill reminder
   */
  async getHistoryForItem(referenceType, referenceId) {
    try {
      const { data: history, error } = await this.supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', this.userId)
        .eq('reference_type', referenceType)
        .eq('reference_id', referenceId)
        .order('payment_date', { ascending: false })

      if (error) throw error

      // Fetch expense details for paid items
      const expenseIds = history
        .filter(h => h.expense_id)
        .map(h => h.expense_id)

      let expensesMap = {}
      if (expenseIds.length > 0) {
        const { data: expenses } = await this.supabase
          .from('expenses')
          .select('id, amount, date, description, category')
          .in('id', expenseIds)

        for (const exp of (expenses || [])) {
          expensesMap[exp.id] = exp
        }
      }

      // Enrich with expense data
      const enrichedHistory = history.map(h => ({
        ...h,
        expense: h.expense_id ? expensesMap[h.expense_id] : null
      }))

      return { success: true, history: enrichedHistory }
    } catch (error) {
      console.error('Error fetching item history:', error)
      return { success: false, error: error.message, history: [] }
    }
  }

  /**
   * Get payment history grouped by month
   */
  async getHistoryByMonth({ months = 6 } = {}) {
    try {
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)

      const { data: history, error } = await this.supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', this.userId)
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .order('payment_date', { ascending: false })

      if (error) throw error

      // Fetch references
      const [subscriptionsResult, billsResult] = await Promise.all([
        this.supabase
          .from('subscriptions')
          .select('id, name, amount, category_slug')
          .eq('user_id', this.userId),
        this.supabase
          .from('bill_reminders')
          .select('id, name, amount, category_slug')
          .eq('user_id', this.userId)
      ])

      const subscriptionsMap = {}
      const billsMap = {}

      for (const sub of (subscriptionsResult.data || [])) {
        subscriptionsMap[sub.id] = sub
      }
      for (const bill of (billsResult.data || [])) {
        billsMap[bill.id] = bill
      }

      // Group by month
      const byMonth = {}
      for (const item of history) {
        const date = new Date(item.payment_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

        if (!byMonth[monthKey]) {
          byMonth[monthKey] = {
            key: monthKey,
            label: monthLabel,
            items: [],
            totalPaid: 0,
            paidCount: 0,
            skippedCount: 0
          }
        }

        const reference = item.reference_type === 'subscription'
          ? subscriptionsMap[item.reference_id]
          : billsMap[item.reference_id]

        byMonth[monthKey].items.push({
          ...item,
          reference
        })

        if (item.action === 'paid') {
          byMonth[monthKey].totalPaid += parseFloat(item.amount_paid || 0)
          byMonth[monthKey].paidCount++
        } else if (item.action === 'skipped') {
          byMonth[monthKey].skippedCount++
        }
      }

      // Convert to array and sort by date (most recent first)
      const monthsArray = Object.values(byMonth)
        .sort((a, b) => b.key.localeCompare(a.key))

      return { success: true, byMonth: monthsArray }
    } catch (error) {
      console.error('Error fetching history by month:', error)
      return { success: false, error: error.message, byMonth: [] }
    }
  }

  /**
   * Get recent payment activity (last N actions)
   */
  async getRecentActivity({ limit = 10 } = {}) {
    try {
      const { data: history, error } = await this.supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Fetch references
      const subscriptionIds = history
        .filter(h => h.reference_type === 'subscription')
        .map(h => h.reference_id)
      const billIds = history
        .filter(h => h.reference_type === 'bill_reminder')
        .map(h => h.reference_id)

      const [subscriptionsResult, billsResult] = await Promise.all([
        subscriptionIds.length > 0
          ? this.supabase.from('subscriptions').select('id, name').in('id', subscriptionIds)
          : { data: [] },
        billIds.length > 0
          ? this.supabase.from('bill_reminders').select('id, name').in('id', billIds)
          : { data: [] }
      ])

      const subscriptionsMap = {}
      const billsMap = {}

      for (const sub of (subscriptionsResult.data || [])) {
        subscriptionsMap[sub.id] = sub
      }
      for (const bill of (billsResult.data || [])) {
        billsMap[bill.id] = bill
      }

      const enrichedHistory = history.map(item => ({
        ...item,
        reference: item.reference_type === 'subscription'
          ? subscriptionsMap[item.reference_id]
          : billsMap[item.reference_id]
      }))

      return { success: true, activity: enrichedHistory }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      return { success: false, error: error.message, activity: [] }
    }
  }
}
