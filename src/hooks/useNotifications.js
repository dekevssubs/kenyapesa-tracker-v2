import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { BudgetAlertService } from '../utils/budgetAlertService'
import { BillReminderService } from '../utils/billReminderService'

// Storage keys for notification state persistence
const DISMISSED_KEY = 'kenyapesa_dismissed_notifications'
const ACTIONED_KEY = 'kenyapesa_actioned_notifications'
const DISMISSED_EXPIRY_HOURS = 2 // Dismissed notifications reappear after 2 hours

/**
 * Get dismissed notifications from localStorage
 */
const getDismissedNotifications = () => {
  try {
    const data = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}')
    const now = Date.now()
    // Filter out expired dismissals
    const valid = {}
    Object.entries(data).forEach(([id, expiry]) => {
      if (expiry > now) valid[id] = expiry
    })
    // Clean up expired entries
    if (Object.keys(valid).length !== Object.keys(data).length) {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(valid))
    }
    return valid
  } catch {
    return {}
  }
}

/**
 * Get actioned notifications from localStorage
 */
const getActionedNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem(ACTIONED_KEY) || '{}')
  } catch {
    return {}
  }
}

/**
 * Save dismissed notification with expiry
 */
const saveDismissedNotification = (id) => {
  const dismissed = getDismissedNotifications()
  const expiry = Date.now() + (DISMISSED_EXPIRY_HOURS * 60 * 60 * 1000)
  dismissed[id] = expiry
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
}

/**
 * Save actioned notification (persists until condition changes)
 */
const saveActionedNotification = (id, timestamp) => {
  const actioned = getActionedNotifications()
  actioned[id] = timestamp
  localStorage.setItem(ACTIONED_KEY, JSON.stringify(actioned))
}

/**
 * Clear actioned notification
 */
const clearActionedNotification = (id) => {
  const actioned = getActionedNotifications()
  delete actioned[id]
  localStorage.setItem(ACTIONED_KEY, JSON.stringify(actioned))
}

/**
 * Unified Notification Hook
 * Aggregates notifications from multiple sources:
 * - Budget alerts (75%, 90%, exceeded)
 * - Bill reminders (due today, tomorrow, upcoming)
 * - Goal milestones
 * - Low balance warnings
 * - Overdue lending
 *
 * Features:
 * - urgentOnly mode: Only shows items due in 2 days or less (high priority)
 * - Dismissed notifications reappear after 2 hours unless actioned
 * - Actioned notifications stay hidden until underlying condition changes
 */
export function useNotifications() {
  const { user } = useAuth()
  const [allNotifications, setAllNotifications] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [urgentOnly, setUrgentOnly] = useState(true) // Default to urgent only

  /**
   * Check if notification should be hidden (actioned)
   */
  const isNotificationActioned = useCallback((notification) => {
    const actioned = getActionedNotifications()
    const actionedTime = actioned[notification.id]
    if (!actionedTime) return false

    // If the notification timestamp is newer than when it was actioned,
    // the condition has changed (e.g., new budget exceeded), so show again
    return new Date(notification.timestamp) <= new Date(actionedTime)
  }, [])

  /**
   * Check if notification should be temporarily hidden (dismissed)
   */
  const isNotificationDismissed = useCallback((notification) => {
    const dismissed = getDismissedNotifications()
    return !!dismissed[notification.id]
  }, [])

  /**
   * Filter notifications based on urgent mode and dismissed/actioned status
   */
  const filterNotifications = useCallback((notifs, showUrgentOnly) => {
    return notifs.filter(n => {
      // Skip actioned notifications
      if (isNotificationActioned(n)) return false

      // Skip temporarily dismissed notifications
      if (isNotificationDismissed(n)) return false

      // Urgent only mode: show high priority and medium priority items
      // due within 2 days (overdue, due today, tomorrow, day after)
      if (showUrgentOnly) {
        if (n.priority === 'high') return true
        if (n.priority === 'medium') {
          // Check if it's within 2 days
          const daysUntil = n.metadata?.daysUntil
          const daysOverdue = n.metadata?.daysOverdue
          if (daysOverdue !== undefined && daysOverdue >= 0) return true
          if (daysUntil !== undefined && daysUntil <= 2) return true
          // Budget exceeded/critical should show
          if (n.type === 'budget_exceeded' || n.type === 'budget_critical') return true
          return false
        }
        return false // Skip low priority in urgent mode
      }

      return true
    })
  }, [isNotificationActioned, isNotificationDismissed])

  /**
   * Fetch all notifications from various sources
   */
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setAllNotifications([])
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const fetchedNotifications = []

      // 1. Budget Alerts
      const budgetAlerts = await fetchBudgetAlerts()
      fetchedNotifications.push(...budgetAlerts)

      // 2. Bill Reminders
      const billReminders = await fetchBillReminders()
      fetchedNotifications.push(...billReminders)

      // 3. Goal Milestones
      const goalNotifications = await fetchGoalNotifications()
      fetchedNotifications.push(...goalNotifications)

      // 4. Low Balance Warnings
      const balanceWarnings = await fetchBalanceWarnings()
      fetchedNotifications.push(...balanceWarnings)

      // 5. Overdue Lending
      const lendingReminders = await fetchLendingReminders()
      fetchedNotifications.push(...lendingReminders)

      // Sort by priority and timestamp
      fetchedNotifications.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return new Date(b.timestamp) - new Date(a.timestamp)
      })

      // Store all notifications
      setAllNotifications(fetchedNotifications)

      // Filter based on current mode
      const filtered = filterNotifications(fetchedNotifications, urgentOnly)
      setNotifications(filtered)
      setUnreadCount(filtered.filter(n => !n.isRead).length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user, urgentOnly, filterNotifications])

  /**
   * Fetch budget alert notifications
   */
  const fetchBudgetAlerts = async () => {
    try {
      const budgetService = new BudgetAlertService(supabase, user.id, null)
      const statuses = await budgetService.getAllBudgetStatuses()

      const alerts = []
      statuses.forEach(({ budget, spent, percentage, status }) => {
        if (status === 'exceeded') {
          alerts.push({
            id: `budget-exceeded-${budget.id}`,
            type: 'budget_exceeded',
            priority: 'high',
            title: `Budget Exceeded: ${budget.category}`,
            message: `You've spent KES ${spent.toFixed(2)} of KES ${budget.monthly_limit} (${percentage.toFixed(1)}%)`,
            icon: 'alert-triangle',
            color: 'red',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl: '/budget',
            metadata: { budgetId: budget.id, category: budget.category }
          })
        } else if (status === 'critical') {
          alerts.push({
            id: `budget-critical-${budget.id}`,
            type: 'budget_critical',
            priority: 'medium',
            title: `Budget Warning: ${budget.category}`,
            message: `You've used ${percentage.toFixed(1)}% of your ${budget.category} budget`,
            icon: 'alert-circle',
            color: 'amber',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl: '/budget',
            metadata: { budgetId: budget.id, category: budget.category }
          })
        } else if (status === 'warning') {
          alerts.push({
            id: `budget-warning-${budget.id}`,
            type: 'budget_warning',
            priority: 'low',
            title: `Budget Alert: ${budget.category}`,
            message: `You've used ${percentage.toFixed(1)}% of your ${budget.category} budget`,
            icon: 'info',
            color: 'blue',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl: '/budget',
            metadata: { budgetId: budget.id, category: budget.category }
          })
        }
      })

      return alerts
    } catch (error) {
      console.error('Error fetching budget alerts:', error)
      return []
    }
  }

  /**
   * Fetch bill reminder notifications
   */
  const fetchBillReminders = async () => {
    try {
      const billService = new BillReminderService(supabase, user.id)
      const { success, notifications: billNotifs } = await billService.getBillNotifications()

      if (!success) return []

      return billNotifs.map(notif => ({
        ...notif,
        isRead: false,
        icon: 'calendar',
        color: notif.priority === 'high' ? 'red' : notif.priority === 'medium' ? 'amber' : 'blue',
        timestamp: new Date().toISOString(),
        actionUrl: '/bills'
      }))
    } catch (error) {
      console.error('Error fetching bill reminders:', error)
      return []
    }
  }

  /**
   * Fetch goal milestone notifications
   */
  const fetchGoalNotifications = async () => {
    try {
      const { data: goals, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (error) throw error

      const notifications = []
      const today = new Date()

      goals.forEach(goal => {
        const currentAmount = parseFloat(goal.current_amount || 0)
        const targetAmount = parseFloat(goal.target_amount || 0)
        const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0

        // Milestone achievements
        if (progress >= 100 && goal.target_date) {
          notifications.push({
            id: `goal-complete-${goal.id}`,
            type: 'goal_complete',
            priority: 'high',
            title: `Goal Achieved: ${goal.name}`,
            message: `Congratulations! You've reached your goal of KES ${targetAmount.toFixed(2)}`,
            icon: 'trophy',
            color: 'green',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl: '/goals',
            metadata: { goalId: goal.id }
          })
        } else if (progress >= 90) {
          notifications.push({
            id: `goal-near-${goal.id}`,
            type: 'goal_milestone',
            priority: 'medium',
            title: `Goal Almost Complete: ${goal.name}`,
            message: `You're at ${progress.toFixed(1)}% of your ${goal.name} goal!`,
            icon: 'trending-up',
            color: 'green',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl: '/goals',
            metadata: { goalId: goal.id }
          })
        } else if (progress >= 75) {
          notifications.push({
            id: `goal-progress-${goal.id}`,
            type: 'goal_milestone',
            priority: 'low',
            title: `Goal Progress: ${goal.name}`,
            message: `Great progress! You're at ${progress.toFixed(1)}% of your goal`,
            icon: 'target',
            color: 'blue',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl: '/goals',
            metadata: { goalId: goal.id }
          })
        }

        // Deadline warnings
        if (goal.target_date) {
          const targetDate = new Date(goal.target_date)
          const daysUntil = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24))

          if (daysUntil <= 7 && daysUntil > 0 && progress < 100) {
            notifications.push({
              id: `goal-deadline-${goal.id}`,
              type: 'goal_deadline',
              priority: 'medium',
              title: `Goal Deadline Approaching: ${goal.name}`,
              message: `Only ${daysUntil} day${daysUntil > 1 ? 's' : ''} left to reach your goal (${progress.toFixed(1)}% complete)`,
              icon: 'clock',
              color: 'amber',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionUrl: '/goals',
              metadata: { goalId: goal.id, daysUntil }
            })
          }
        }
      })

      return notifications
    } catch (error) {
      console.error('Error fetching goal notifications:', error)
      return []
    }
  }

  /**
   * Fetch low balance warnings
   */
  const fetchBalanceWarnings = async () => {
    try {
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error

      const warnings = []
      accounts.forEach(account => {
        const balance = parseFloat(account.balance || 0)
        const minBalance = parseFloat(account.minimum_balance || 0)

        if (balance < minBalance) {
          warnings.push({
            id: `low-balance-${account.id}`,
            type: 'low_balance',
            priority: 'high',
            title: `Low Balance: ${account.name}`,
            message: `Balance (KES ${balance.toFixed(2)}) is below minimum (KES ${minBalance.toFixed(2)})`,
            icon: 'alert-triangle',
            color: 'red',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl: '/accounts',
            metadata: { accountId: account.id }
          })
        } else if (balance < minBalance * 1.5) {
          warnings.push({
            id: `balance-warning-${account.id}`,
            type: 'balance_warning',
            priority: 'medium',
            title: `Balance Warning: ${account.name}`,
            message: `Balance (KES ${balance.toFixed(2)}) is approaching minimum`,
            icon: 'alert-circle',
            color: 'amber',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl: '/accounts',
            metadata: { accountId: account.id }
          })
        }
      })

      return warnings
    } catch (error) {
      console.error('Error fetching balance warnings:', error)
      return []
    }
  }

  /**
   * Fetch overdue lending reminders
   * Note: lending_tracker table uses 'repayment_status' and 'expected_return_date' columns
   */
  const fetchLendingReminders = async () => {
    try {
      // Query uses repayment_status column (from migration schema)
      // Also supports 'status' column (from lendingService schema) for compatibility
      const { data: loans, error } = await supabase
        .from('lending_tracker')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      // Filter for active loans (pending or partial status)
      const activeLoans = (loans || []).filter(loan => {
        const status = loan.repayment_status || loan.status
        return status === 'pending' || status === 'partial'
      })

      const reminders = []
      const today = new Date()

      activeLoans.forEach(loan => {
        // Support both column naming conventions
        const dueDateStr = loan.expected_return_date || loan.due_date
        if (dueDateStr) {
          const dueDate = new Date(dueDateStr)
          const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))

          // Calculate outstanding amount
          const originalAmount = parseFloat(loan.amount)
          const repaidAmount = parseFloat(loan.amount_repaid || 0)
          const outstandingAmount = originalAmount - repaidAmount

          // Use person_name (migration) or borrower_name (alternative)
          const personName = loan.person_name || loan.borrower_name || 'Unknown'

          if (daysOverdue > 0) {
            reminders.push({
              id: `loan-overdue-${loan.id}`,
              type: 'loan_overdue',
              priority: 'high',
              title: `Loan Overdue: ${personName}`,
              message: `KES ${outstandingAmount.toFixed(2)} overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
              icon: 'hand-coins',
              color: 'red',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionUrl: '/lending',
              metadata: { loanId: loan.id, daysOverdue }
            })
          } else if (daysOverdue >= -7 && daysOverdue < 0) {
            const daysUntil = Math.abs(daysOverdue)
            reminders.push({
              id: `loan-due-soon-${loan.id}`,
              type: 'loan_due_soon',
              priority: 'medium',
              title: `Loan Due Soon: ${personName}`,
              message: `KES ${outstandingAmount.toFixed(2)} due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
              icon: 'hand-coins',
              color: 'amber',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionUrl: '/lending',
              metadata: { loanId: loan.id, daysUntil }
            })
          }
        }
      })

      return reminders
    } catch (error) {
      console.error('Error fetching lending reminders:', error)
      return []
    }
  }

  /**
   * Mark notification as read and navigate (actioned)
   * This permanently hides the notification until condition changes
   */
  const markAsRead = useCallback((notificationId) => {
    const notification = notifications.find(n => n.id === notificationId)
    if (notification) {
      // Save as actioned (persists until condition changes)
      saveActionedNotification(notificationId, new Date().toISOString())
    }
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [notifications])

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }, [])

  /**
   * Dismiss a specific notification temporarily (will reappear after 2 hours)
   * User must click through (action) to permanently hide until condition changes
   */
  const clearNotification = useCallback((notificationId) => {
    // Save as temporarily dismissed
    saveDismissedNotification(notificationId)

    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId)
      if (notification && !notification.isRead) {
        setUnreadCount(count => Math.max(0, count - 1))
      }
      return prev.filter(n => n.id !== notificationId)
    })
  }, [])

  /**
   * Clear all notifications temporarily
   */
  const clearAll = useCallback(() => {
    // Save all as temporarily dismissed
    notifications.forEach(n => saveDismissedNotification(n.id))
    setNotifications([])
    setUnreadCount(0)
  }, [notifications])

  /**
   * Toggle between urgent only and all notifications
   */
  const toggleUrgentOnly = useCallback(() => {
    setUrgentOnly(prev => !prev)
  }, [])

  /**
   * Set urgent only mode explicitly
   */
  const setUrgentOnlyMode = useCallback((value) => {
    setUrgentOnly(value)
  }, [])

  // Auto-fetch on mount and when user changes
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Re-filter when urgentOnly mode changes
  useEffect(() => {
    const filtered = filterNotifications(allNotifications, urgentOnly)
    setNotifications(filtered)
    setUnreadCount(filtered.filter(n => !n.isRead).length)
  }, [urgentOnly, allNotifications, filterNotifications])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Count all notifications (regardless of filter) for badge comparison
  const totalCount = allNotifications.filter(n =>
    !isNotificationActioned(n) && !isNotificationDismissed(n)
  ).length

  return {
    notifications,
    allNotifications,
    unreadCount,
    totalCount,
    loading,
    urgentOnly,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    toggleUrgentOnly,
    setUrgentOnlyMode
  }
}
