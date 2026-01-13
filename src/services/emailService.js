/**
 * Email Service
 * Handles email-related operations via Supabase Edge Functions
 */

import { supabase } from '../utils/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * Call a Supabase Edge Function
 */
async function callEdgeFunction(functionName, body) {
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify(body),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Request failed')
  }

  return result
}

/**
 * Request OTP for passwordless login
 * @param {string} email - User's email address
 * @param {string} purpose - 'login' | 'verification' | 'password_reset'
 */
export async function requestOTP(email, purpose = 'login') {
  return callEdgeFunction('send-otp', { email, purpose })
}

/**
 * Verify OTP code
 * @param {string} email - User's email address
 * @param {string} code - 6-digit OTP code
 * @param {string} purpose - 'login' | 'verification' | 'password_reset'
 */
export async function verifyOTP(email, code, purpose = 'login') {
  return callEdgeFunction('verify-otp', { email, code, purpose })
}

/**
 * Send a transactional email
 * @param {string} to - Recipient email
 * @param {string} templateType - Email template type
 * @param {object} templateData - Data for the template
 * @param {string} userId - Optional user ID for logging
 */
export async function sendEmail(to, templateType, templateData, userId = null) {
  return callEdgeFunction('send-email', {
    to,
    templateType,
    templateData,
    userId,
  })
}

/**
 * Queue an email for later sending (used for digests)
 * @param {string} emailType - Type of email
 * @param {object} payload - Email data
 * @param {number} priority - Priority (1-10, lower = higher priority)
 * @param {Date} scheduledFor - When to send
 */
export async function queueEmail(emailType, payload, priority = 5, scheduledFor = null) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase.from('email_queue').insert({
    user_id: user.id,
    email_type: emailType,
    recipient_email: user.email,
    subject: getEmailSubject(emailType, payload),
    payload,
    priority,
    scheduled_for: scheduledFor || new Date().toISOString(),
  }).select().single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Get email subject based on type and payload
 */
function getEmailSubject(emailType, payload) {
  switch (emailType) {
    case 'bill_overdue':
      return `Overdue: ${payload.billName} was due ${payload.daysOverdue} days ago`
    case 'budget_exceeded':
      return `Budget Alert: ${payload.category} exceeded (${payload.percentage}%)`
    case 'goal_achieved':
      return `Congratulations! Goal achieved: ${payload.goalName}`
    case 'low_balance':
      return `Low Balance Alert: ${payload.accountName}`
    case 'weekly_summary':
      return `Your KenyaPesa Weekly Summary`
    default:
      return 'KenyaPesa Notification'
  }
}

/**
 * Get user's email preferences
 */
export async function getEmailPreferences() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = row not found
    throw error
  }

  // Return defaults if no preferences exist
  if (!data) {
    return {
      emails_enabled: true,
      bill_overdue_emails: true,
      budget_exceeded_emails: true,
      goal_achieved_emails: true,
      low_balance_emails: false,
      weekly_summary_emails: true,
      max_emails_per_day: 5,
      digest_hour: 8,
      digest_timezone: 'Africa/Nairobi',
    }
  }

  return data
}

/**
 * Update user's email preferences
 * @param {object} preferences - Updated preferences
 */
export async function updateEmailPreferences(preferences) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Check if preferences exist
  const { data: existing } = await supabase
    .from('email_preferences')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('email_preferences')
      .update(preferences)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('email_preferences')
      .insert({
        user_id: user.id,
        ...preferences,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Get email logs for current user
 * @param {number} limit - Number of logs to fetch
 */
export async function getEmailLogs(limit = 20) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Unsubscribe from emails using token
 * @param {string} token - Unsubscribe token
 * @param {string} emailType - Optional specific email type to unsubscribe from
 */
export async function unsubscribeByToken(token, emailType = null) {
  // Get preferences by token
  const { data: prefs, error: fetchError } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('unsubscribe_token', token)
    .single()

  if (fetchError || !prefs) {
    throw new Error('Invalid unsubscribe token')
  }

  // Update preferences
  const updates = emailType
    ? { [`${emailType}_emails`]: false }
    : { emails_enabled: false }

  const { error: updateError } = await supabase
    .from('email_preferences')
    .update(updates)
    .eq('unsubscribe_token', token)

  if (updateError) throw updateError

  return { success: true, emailType }
}

/**
 * Check if user's email is verified
 */
export async function checkEmailVerified() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { verified: false }
  }

  // Check auth.users email_confirmed_at
  if (user.email_confirmed_at) {
    return { verified: true, verifiedAt: user.email_confirmed_at }
  }

  // Also check profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_verified, email_verified_at')
    .eq('id', user.id)
    .single()

  return {
    verified: profile?.email_verified || false,
    verifiedAt: profile?.email_verified_at || null,
  }
}

/**
 * Send verification email to current user
 */
export async function sendVerificationEmail() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  return requestOTP(user.email, 'verification')
}

export default {
  requestOTP,
  verifyOTP,
  sendEmail,
  queueEmail,
  getEmailPreferences,
  updateEmailPreferences,
  getEmailLogs,
  unsubscribeByToken,
  checkEmailVerified,
  sendVerificationEmail,
}
