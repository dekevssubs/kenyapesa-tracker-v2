// Send Email Edge Function
// Generic email sender using Resend API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'
import { getEmailTemplate, EmailTemplateData } from '../_shared/email-templates.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const APP_URL = Deno.env.get('APP_URL') || 'https://kenyapesa.space'
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'noreply@kenyapesa.space'

interface EmailRequest {
  to: string
  templateType: string
  templateData: EmailTemplateData
  userId?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { to, templateType, templateData, userId }: EmailRequest = await req.json()

    if (!to || !templateType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, templateType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit for non-critical emails
    const criticalEmails = ['otp', 'verification', 'password_reset']
    if (userId && !criticalEmails.includes(templateType)) {
      const { data: canSend } = await supabase.rpc('check_email_rate_limit', {
        p_user_id: userId,
        p_email_type: templateType
      })

      if (!canSend) {
        console.log(`Rate limit exceeded for user ${userId}`)
        return new Response(
          JSON.stringify({ error: 'Daily email limit reached', rateLimited: true }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get unsubscribe URL if user has preferences
    let unsubscribeUrl = `${APP_URL}/unsubscribe`
    if (userId) {
      const { data: prefs } = await supabase
        .from('email_preferences')
        .select('unsubscribe_token')
        .eq('user_id', userId)
        .single()

      if (prefs?.unsubscribe_token) {
        unsubscribeUrl = `${APP_URL}/unsubscribe?token=${prefs.unsubscribe_token}`
      }
    }

    // Generate email content from template
    const enrichedData: EmailTemplateData = {
      ...templateData,
      appUrl: APP_URL,
      unsubscribeUrl
    }

    const { subject, html, text } = getEmailTemplate(templateType, enrichedData)

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `KenyaPesa <${EMAIL_FROM}>`,
        to: [to],
        subject,
        html,
        text
      })
    })

    const resendResult = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult)

      // Log failed email
      if (userId) {
        await supabase.from('email_logs').insert({
          user_id: userId,
          email_type: templateType,
          recipient_email: to,
          subject,
          status: 'failed',
          error_message: resendResult.message || JSON.stringify(resendResult)
        })
      }

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful email
    if (userId) {
      await supabase.from('email_logs').insert({
        user_id: userId,
        email_type: templateType,
        recipient_email: to,
        subject,
        status: 'sent',
        provider_message_id: resendResult.id
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: resendResult.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send email error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
