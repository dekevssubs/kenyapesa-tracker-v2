/**
 * Budget Alert Monitoring Service
 * Monitors budget spending and triggers toast notifications at thresholds
 */

export class BudgetAlertService {
  constructor(supabase, userId, showToast) {
    this.supabase = supabase
    this.userId = userId
    this.showToast = showToast // Toast notification function from ToastContext
  }

  /**
   * Main monitoring function - call on app load or periodically
   * Checks all budgets and triggers alerts if thresholds exceeded
   */
  async checkAllBudgets() {
    try {
      // Fetch all active budgets for current month
      const { data: budgets, error: budgetError } = await this.supabase
        .from('budgets')
        .select('*')
        .eq('user_id', this.userId)

      if (budgetError) {
        console.error('Error fetching budgets:', budgetError)
        return []
      }

      if (!budgets || budgets.length === 0) {
        return []
      }

      const alerts = []

      for (const budget of budgets) {
        const spent = await this.calculateCategorySpent(budget.category, budget.month)
        const budgetLimit = parseFloat(budget.monthly_limit || 0)
        const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0

        // Check thresholds: 75%, 90%, 100%
        let alertType = null
        let alertMessage = null
        let toastType = null

        if (percentage >= 100) {
          alertType = 'exceeded'
          alertMessage = `Budget exceeded for ${budget.category}! You've spent KES ${spent.toFixed(2)} of KES ${budgetLimit.toFixed(2)}`
          toastType = 'error'
        } else if (percentage >= 90) {
          alertType = 'warning_90'
          alertMessage = `90% budget alert: ${budget.category} (${percentage.toFixed(1)}% spent)`
          toastType = 'warning'
        } else if (percentage >= 75) {
          alertType = 'warning_75'
          alertMessage = `75% budget alert: ${budget.category} (${percentage.toFixed(1)}% spent)`
          toastType = 'warning'
        }

        if (alertType) {
          // Check if alert already sent in last 24 hours (prevent spam)
          const shouldAlert = await this.shouldSendAlert(budget.id, alertType)

          if (shouldAlert) {
            // Log the alert
            await this.logAlert(budget.id, alertType, spent, percentage)

            // Show toast notification
            if (this.showToast) {
              const title = alertType === 'exceeded' ? 'Budget Exceeded!' : 'Budget Alert'
              this.showToast(title, alertMessage, toastType, 7000)
            }

            alerts.push({
              budgetId: budget.id,
              category: budget.category,
              alertType,
              spent,
              budgetAmount: budgetLimit,
              percentage
            })
          }
        }
      }

      return alerts
    } catch (error) {
      console.error('Error in checkAllBudgets:', error)
      return []
    }
  }

  /**
   * Calculate total spent for a category in a given month
   */
  async calculateCategorySpent(category, month) {
    try {
      // Validate inputs
      if (!category) {
        return 0
      }

      // Get the start date for the query
      let startDate = month
      if (!month || typeof month !== 'string') {
        // Default to first of current month
        const now = new Date()
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      } else if (month.length === 7) {
        // Format: "YYYY-MM" - add day
        startDate = month + '-01'
      }

      const { data: expenses, error } = await this.supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', this.userId)
        .eq('category', category)
        .gte('date', startDate)
        .lt('date', this.getNextMonth(month))

      if (error) {
        console.error('Error calculating spent:', error)
        return 0
      }

      const total = (expenses || []).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
      return total
    } catch (error) {
      console.error('Error in calculateCategorySpent:', error)
      return 0
    }
  }

  /**
   * Check if alert should be sent (not sent in last 24 hours)
   */
  async shouldSendAlert(budgetId, alertType) {
    try {
      const twentyFourHoursAgo = new Date()
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

      // Use limit(1) instead of maybeSingle() to avoid error when multiple rows exist
      const { data, error } = await this.supabase
        .from('budget_alerts')
        .select('id')
        .eq('budget_id', budgetId)
        .eq('alert_type', alertType)
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .limit(1)

      if (error) {
        console.error('Error checking alert history:', error)
        return true // Default to sending alert if check fails
      }

      return !data || data.length === 0 // Send alert if no recent alert found
    } catch (error) {
      console.error('Error in shouldSendAlert:', error)
      return true
    }
  }

  /**
   * Log alert to database
   */
  async logAlert(budgetId, alertType, spentAmount, percentage) {
    try {
      const { error } = await this.supabase
        .from('budget_alerts')
        .insert([{
          user_id: this.userId,
          budget_id: budgetId,
          alert_type: alertType,
          spent_amount: spentAmount,
          budget_percentage: percentage
        }])

      if (error) {
        console.error('Error logging alert:', error)
      }
    } catch (error) {
      console.error('Error in logAlert:', error)
    }
  }

  /**
   * Get alert history for a specific budget
   */
  async getAlertHistory(budgetId, limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('budget_alerts')
        .select('*')
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching alert history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getAlertHistory:', error)
      return []
    }
  }

  /**
   * Get all recent alerts for user
   */
  async getRecentAlerts(limit = 20) {
    try {
      const { data, error } = await this.supabase
        .from('budget_alerts')
        .select(`
          *,
          budgets (
            category,
            amount,
            month
          )
        `)
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent alerts:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getRecentAlerts:', error)
      return []
    }
  }

  /**
   * Calculate budget status for a specific budget
   */
  async getBudgetStatus(budgetId) {
    try {
      const { data: budget, error: budgetError } = await this.supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .eq('user_id', this.userId)
        .single()

      if (budgetError || !budget) {
        return null
      }

      const spent = await this.calculateCategorySpent(budget.category, budget.month)
      const budgetLimit = parseFloat(budget.monthly_limit || 0)
      const remaining = budgetLimit - spent
      const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0

      let status = 'good'
      if (percentage >= 100) {
        status = 'exceeded'
      } else if (percentage >= 90) {
        status = 'critical'
      } else if (percentage >= 75) {
        status = 'warning'
      }

      return {
        budget,
        spent,
        remaining,
        percentage,
        status
      }
    } catch (error) {
      console.error('Error in getBudgetStatus:', error)
      return null
    }
  }

  /**
   * Get summary of all budgets with status
   */
  async getAllBudgetStatuses() {
    try {
      const { data: budgets, error } = await this.supabase
        .from('budgets')
        .select('*')
        .eq('user_id', this.userId)

      if (error || !budgets) {
        return []
      }

      const statuses = await Promise.all(
        budgets.map(async (budget) => {
          const spent = await this.calculateCategorySpent(budget.category, budget.month)
          const budgetLimit = parseFloat(budget.monthly_limit || 0)
          const remaining = budgetLimit - spent
          const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0

          let status = 'good'
          if (percentage >= 100) {
            status = 'exceeded'
          } else if (percentage >= 90) {
            status = 'critical'
          } else if (percentage >= 75) {
            status = 'warning'
          }

          return {
            budget,
            spent,
            remaining,
            percentage,
            status
          }
        })
      )

      return statuses
    } catch (error) {
      console.error('Error in getAllBudgetStatuses:', error)
      return []
    }
  }

  /**
   * Helper: Get next month date string
   */
  getNextMonth(monthStr) {
    // Handle null/undefined/empty month strings
    if (!monthStr || typeof monthStr !== 'string') {
      // Default to current month if no valid month provided
      const now = new Date()
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return nextMonth.toISOString().split('T')[0].slice(0, 7) + '-01'
    }

    // Handle different date formats
    let dateStr = monthStr
    if (monthStr.length === 7) {
      // Format: "YYYY-MM" - add day
      dateStr = monthStr + '-01'
    } else if (monthStr.length === 10) {
      // Format: "YYYY-MM-DD" - use as is
      dateStr = monthStr
    }

    const date = new Date(dateStr)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Default to next month from now if invalid
      const now = new Date()
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return nextMonth.toISOString().split('T')[0].slice(0, 7) + '-01'
    }

    date.setMonth(date.getMonth() + 1)
    return date.toISOString().split('T')[0].slice(0, 7) + '-01'
  }
}

/**
 * Helper function to check budgets and show alerts
 * Usage: await checkBudgetsAndAlert(userId, supabase, showToast)
 */
export async function checkBudgetsAndAlert(userId, supabase, showToast) {
  const service = new BudgetAlertService(supabase, userId, showToast)
  return await service.checkAllBudgets()
}
