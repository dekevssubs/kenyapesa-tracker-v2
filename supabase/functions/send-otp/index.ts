// Send OTP Edge Function
// Generates and sends OTP code for passwordless login

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'
import { otpLoginTemplate } from '../_shared/email-templates.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'noreply@kenyapesa.space'

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

interface OTPRequest {
  email: string
  purpose?: 'login' | 'verification' | 'password_reset'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { email, purpose = 'login' }: OTPRequest = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check rate limiting: max 3 OTP requests per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .eq('purpose', purpose)
      .gte('created_at', oneHourAgo)

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({
          error: 'Too many OTP requests. Please try again later.',
          rateLimited: true
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For login purpose, verify user exists
    let userName: string | undefined
    if (purpose === 'login') {
      const { data: authUser } = await supabase.auth.admin.listUsers()
      const user = authUser?.users?.find(u => u.email?.toLowerCase() === normalizedEmail)

      if (!user) {
        // Don't reveal if user exists or not for security
        // Still return success but don't actually send email
        return new Response(
          JSON.stringify({
            success: true,
            message: 'If an account exists with this email, you will receive an OTP code.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userName = user.user_metadata?.full_name
    }

    // Generate OTP
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP in database
    const { error: insertError } = await supabase.from('otp_codes').insert({
      email: normalizedEmail,
      code: otpCode,
      purpose,
      expires_at: expiresAt.toISOString()
    })

    if (insertError) {
      console.error('Failed to store OTP:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate email content
    const { subject, html, text } = otpLoginTemplate({
      code: otpCode,
      userName
    })

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `KenyaPesa <${EMAIL_FROM}>`,
        to: [normalizedEmail],
        subject,
        html,
        text
      })
    })

    const resendResult = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send OTP email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 600 // 10 minutes in seconds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send OTP error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
