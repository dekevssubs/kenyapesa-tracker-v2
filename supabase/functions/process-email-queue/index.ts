// Process Email Queue Edge Function
// Processes queued emails and sends daily/weekly digests

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getEmailTemplate } from '../_shared/email-templates.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const APP_URL = Deno.env.get('APP_URL') || 'https://kenyapesa.space'
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'noreply@kenyapesa.space'

interface QueueItem {
  id: string
  user_id: string
  email_type: string
  recipient_email: string
  subject: string
  payload: Record<string, unknown>
  priority: number
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Parse request body for batch size (default 50)
    let batchSize = 50
    try {
      const body = await req.json()
      batchSize = body.batchSize || 50
    } catch {
      // No body provided, use defaults
    }

    // Get pending emails from queue (ordered by priority and scheduled time)
    const { data: queueItems, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(batchSize) as { data: QueueItem[] | null; error: unknown }

    if (fetchError) {
      console.error('Failed to fetch queue:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch email queue' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No emails to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0
    }

    for (const item of queueItems) {
      results.processed++

      // Mark as processing
      await supabase
        .from('email_queue')
        .update({ status: 'processing' })
        .eq('id', item.id)

      try {
        // Check user email preferences
        const { data: prefs } = await supabase
          .from('email_preferences')
          .select('*')
          .eq('user_id', item.user_id)
          .single()

        // Skip if emails disabled
        if (prefs && !prefs.emails_enabled) {
          await supabase
            .from('email_queue')
            .update({
              status: 'cancelled',
              processed_at: new Date().toISOString(),
              error_message: 'User disabled emails'
            })
            .eq('id', item.id)
          results.skipped++
          continue
        }

        // Check specific preference for email type
        const preferenceMap: Record<string, string> = {
          'bill_overdue': 'bill_overdue_emails',
          'budget_exceeded': 'budget_exceeded_emails',
          'goal_achieved': 'goal_achieved_emails',
          'low_balance': 'low_balance_emails',
          'weekly_summary': 'weekly_summary_emails'
        }

        const prefKey = preferenceMap[item.email_type]
        if (prefs && prefKey && !prefs[prefKey]) {
          await supabase
            .from('email_queue')
            .update({
              status: 'cancelled',
              processed_at: new Date().toISOString(),
              error_message: `User disabled ${item.email_type} emails`
            })
            .eq('id', item.id)
          results.skipped++
          continue
        }

        // Check rate limit
        const { data: canSend } = await supabase.rpc('check_email_rate_limit', {
          p_user_id: item.user_id,
          p_email_type: item.email_type
        })

        if (!canSend) {
          // Reschedule for tomorrow
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(prefs?.digest_hour || 8, 0, 0, 0)

          await supabase
            .from('email_queue')
            .update({
              status: 'queued',
              scheduled_for: tomorrow.toISOString(),
              retry_count: item.retry_count || 0 + 1
            })
            .eq('id', item.id)
          results.skipped++
          continue
        }

        // Get unsubscribe URL
        const unsubscribeUrl = prefs?.unsubscribe_token
          ? `${APP_URL}/unsubscribe?token=${prefs.unsubscribe_token}`
          : `${APP_URL}/unsubscribe`

        // Generate email content
        const templateData = {
          ...item.payload,
          appUrl: APP_URL,
          unsubscribeUrl
        }

        const { subject, html, text } = getEmailTemplate(item.email_type, templateData)

        // Send email via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `KenyaPesa <${EMAIL_FROM}>`,
            to: [item.recipient_email],
            subject,
            html,
            text
          })
        })

        const resendResult = await resendResponse.json()

        if (!resendResponse.ok) {
          throw new Error(resendResult.message || 'Failed to send email')
        }

        // Mark as sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id)

        // Log successful email
        await supabase.from('email_logs').insert({
          user_id: item.user_id,
          email_type: item.email_type,
          recipient_email: item.recipient_email,
          subject,
          status: 'sent',
          provider_message_id: resendResult.id
        })

        results.sent++

      } catch (error) {
        console.error(`Failed to process email ${item.id}:`, error)

        // Check retry count
        const retryCount = (item.retry_count || 0) + 1
        const maxRetries = item.max_retries || 3

        if (retryCount < maxRetries) {
          // Reschedule for later
          const retryTime = new Date(Date.now() + retryCount * 30 * 60 * 1000) // 30 min * retry count

          await supabase
            .from('email_queue')
            .update({
              status: 'queued',
              scheduled_for: retryTime.toISOString(),
              retry_count: retryCount,
              error_message: error.message
            })
            .eq('id', item.id)
        } else {
          // Mark as failed
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
              error_message: error.message
            })
            .eq('id', item.id)

          // Log failed email
          await supabase.from('email_logs').insert({
            user_id: item.user_id,
            email_type: item.email_type,
            recipient_email: item.recipient_email,
            subject: item.subject,
            status: 'failed',
            error_message: error.message
          })
        }

        results.failed++
      }
    }

    // Clean up expired OTPs
    await supabase.rpc('cleanup_expired_otps')

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Process queue error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
