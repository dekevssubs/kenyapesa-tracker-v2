/**
 * Email Notification Service
 *
 * Integrates with existing notification services to queue important email alerts.
 * Non-destructive - works alongside existing in-app notifications.
 *
 * Email Types:
 * - Bill overdue alerts (high priority)
 * - Budget exceeded alerts (high priority)
 * - Goal achieved notifications (medium priority)
 * - Low balance warnings (optional)
 * - Weekly summary digest
 */

import { supabase } from '../utils/supabase'
import { queueEmail, getEmailPreferences } from './emailService'

/**
 * Check and queue email for budget exceeded alerts
 * Should be called after budget alerts are detected
 *
 * @param {string} userId - User ID
 * @param {Array} alerts - Budget alerts from BudgetAlertService
 */
export async function queueBudgetExceededEmails(userId, alerts) {
  try {
    // Get user email preferences
    const prefs = await getEmailPreferences()

    // Skip if emails disabled or budget emails disabled
    if (!prefs.emails_enabled || !prefs.budget_exceeded_emails) {
      return { queued: 0, skipped: alerts.length }
    }

    let queued = 0
    let skipped = 0

    // Only queue for exceeded budgets (100%+)
    const exceededAlerts = alerts.filter(a => a.alertType === 'exceeded')

    for (const alert of exceededAlerts) {
      // Check if we already queued an email for this budget today
      const alreadyQueued = await checkRecentEmailQueued(
        userId,
        'budget_exceeded',
        { budgetId: alert.budgetId }
      )

      if (alreadyQueued) {
        skipped++
        continue
      }

      try {
        await queueEmail('budget_exceeded', {
          category: alert.category,
          budgetLimit: alert.budgetAmount,
          spent: alert.spent,
          percentage: Math.round(alert.percentage)
        }, 2) // Priority 2 (high)

        queued++
      } catch (err) {
        console.error('Failed to queue budget email:', err)
        skipped++
      }
    }

    return { queued, skipped }
  } catch (error) {
    console.error('Error in queueBudgetExceededEmails:', error)
    return { queued: 0, skipped: alerts.length, error }
  }
}

/**
 * Check and queue email for overdue bill alerts
 * Should be called when checking bill reminders
 *
 * @param {string} userId - User ID
 * @param {Array} overdueBills - Overdue bills from BillReminderService
 */
export async function queueBillOverdueEmails(userId, overdueBills) {
  try {
    // Get user email preferences
    const prefs = await getEmailPreferences()

    // Skip if emails disabled or bill emails disabled
    if (!prefs.emails_enabled || !prefs.bill_overdue_emails) {
      return { queued: 0, skipped: overdueBills.length }
    }

    let queued = 0
    let skipped = 0

    for (const bill of overdueBills) {
      // Check if we already queued an email for this bill today
      const alreadyQueued = await checkRecentEmailQueued(
        userId,
        'bill_overdue',
        { billId: bill.id }
      )

      if (alreadyQueued) {
        skipped++
        continue
      }

      try {
        await queueEmail('bill_overdue', {
          billName: bill.name,
          billAmount: parseFloat(bill.amount),
          daysOverdue: bill.daysOverdue,
          dueDate: bill.next_date
        }, 1) // Priority 1 (highest)

        queued++
      } catch (err) {
        console.error('Failed to queue bill email:', err)
        skipped++
      }
    }

    return { queued, skipped }
  } catch (error) {
    console.error('Error in queueBillOverdueEmails:', error)
    return { queued: 0, skipped: overdueBills.length, error }
  }
}

/**
 * Queue email for goal achieved notification
 * Should be called when a goal reaches 100%
 *
 * @param {string} userId - User ID
 * @param {object} goal - Goal data
 */
export async function queueGoalAchievedEmail(userId, goal) {
  try {
    // Get user email preferences
    const prefs = await getEmailPreferences()

    // Skip if emails disabled or goal emails disabled
    if (!prefs.emails_enabled || !prefs.goal_achieved_emails) {
      return { queued: false, reason: 'disabled' }
    }

    // Check if we already sent this notification
    const alreadySent = await checkRecentEmailQueued(
      userId,
      'goal_achieved',
      { goalId: goal.id }
    )

    if (alreadySent) {
      return { queued: false, reason: 'already_sent' }
    }

    await queueEmail('goal_achieved', {
      goalName: goal.name,
      targetAmount: parseFloat(goal.target_amount)
    }, 3) // Priority 3 (medium)

    return { queued: true }
  } catch (error) {
    console.error('Error in queueGoalAchievedEmail:', error)
    return { queued: false, error }
  }
}

/**
 * Queue email for low balance warning
 *
 * @param {string} userId - User ID
 * @param {object} account - Account data
 * @param {number} threshold - Balance threshold
 */
export async function queueLowBalanceEmail(userId, account, threshold) {
  try {
    // Get user email preferences
    const prefs = await getEmailPreferences()

    // Skip if emails disabled or low balance emails disabled
    if (!prefs.emails_enabled || !prefs.low_balance_emails) {
      return { queued: false, reason: 'disabled' }
    }

    // Check if we already sent this notification recently (within 7 days)
    const alreadySent = await checkRecentEmailQueued(
      userId,
      'low_balance',
      { accountId: account.id },
      7 // 7 days
    )

    if (alreadySent) {
      return { queued: false, reason: 'already_sent' }
    }

    await queueEmail('low_balance', {
      accountName: account.name,
      balance: parseFloat(account.current_balance),
      threshold
    }, 4) // Priority 4 (lower)

    return { queued: true }
  } catch (error) {
    console.error('Error in queueLowBalanceEmail:', error)
    return { queued: false, error }
  }
}

/**
 * Check if a similar email was recently queued/sent
 * Prevents duplicate emails for the same event
 *
 * @param {string} userId - User ID
 * @param {string} emailType - Email type
 * @param {object} metadata - Metadata to match (e.g., budgetId, billId)
 * @param {number} withinDays - Check within this many days (default: 1)
 */
async function checkRecentEmailQueued(userId, emailType, metadata, withinDays = 1) {
  try {
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - withinDays)

    // Check email_queue first
    const { data: queuedEmails } = await supabase
      .from('email_queue')
      .select('id, payload')
      .eq('user_id', userId)
      .eq('email_type', emailType)
      .gte('created_at', daysAgo.toISOString())
      .in('status', ['queued', 'sent'])
      .limit(10)

    // Check if any queued email matches our metadata
    if (queuedEmails && queuedEmails.length > 0) {
      const key = Object.keys(metadata)[0]
      const value = metadata[key]

      const match = queuedEmails.find(email => {
        const payload = typeof email.payload === 'string'
          ? JSON.parse(email.payload)
          : email.payload
        return payload[key] === value
      })

      if (match) return true
    }

    // Also check email_logs for sent emails
    const { data: sentEmails } = await supabase
      .from('email_logs')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('email_type', emailType)
      .eq('status', 'sent')
      .gte('created_at', daysAgo.toISOString())
      .limit(10)

    if (sentEmails && sentEmails.length > 0) {
      const key = Object.keys(metadata)[0]
      const value = metadata[key]

      const match = sentEmails.find(email => {
        const meta = typeof email.metadata === 'string'
          ? JSON.parse(email.metadata)
          : email.metadata
        return meta && meta[key] === value
      })

      if (match) return true
    }

    return false
  } catch (error) {
    console.error('Error checking recent emails:', error)
    return false // Allow email if check fails
  }
}

/**
 * Process all email notifications
 * Call this periodically (e.g., every 5 minutes) alongside existing notification checks
 *
 * @param {string} userId - User ID
 * @param {object} budgetAlerts - Alerts from BudgetAlertService
 * @param {object} billData - Data from BillReminderService
 */
export async function processEmailNotifications(userId, budgetAlerts = [], billData = null) {
  const results = {
    budgets: { queued: 0, skipped: 0 },
    bills: { queued: 0, skipped: 0 },
    errors: []
  }

  try {
    // Process budget exceeded emails
    if (budgetAlerts && budgetAlerts.length > 0) {
      results.budgets = await queueBudgetExceededEmails(userId, budgetAlerts)
    }

    // Process bill overdue emails
    if (billData && billData.overdueBills && billData.overdueBills.length > 0) {
      results.bills = await queueBillOverdueEmails(userId, billData.overdueBills)
    }
  } catch (error) {
    console.error('Error processing email notifications:', error)
    results.errors.push(error.message)
  }

  return results
}

export default {
  queueBudgetExceededEmails,
  queueBillOverdueEmails,
  queueGoalAchievedEmail,
  queueLowBalanceEmail,
  processEmailNotifications
}
