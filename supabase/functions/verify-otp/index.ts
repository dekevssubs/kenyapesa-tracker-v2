// Verify OTP Edge Function
// Verifies OTP code and creates session for passwordless login

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface VerifyOTPRequest {
  email: string
  code: string
  purpose?: 'login' | 'verification' | 'password_reset'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { email, code, purpose = 'login' }: VerifyOTPRequest = await req.json()

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize inputs
    const normalizedEmail = email.toLowerCase().trim()
    const normalizedCode = code.trim()

    // Find valid OTP
    const { data: otpRecords, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('purpose', purpose)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('Failed to fetch OTP:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const otpRecord = otpRecords?.[0]

    if (!otpRecord) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired OTP',
          expired: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      // Mark as used to prevent further attempts
      await supabase
        .from('otp_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', otpRecord.id)

      return new Response(
        JSON.stringify({
          error: 'Maximum verification attempts exceeded. Please request a new code.',
          maxAttempts: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify code
    if (otpRecord.code !== normalizedCode) {
      // Increment attempts
      await supabase
        .from('otp_codes')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id)

      const remainingAttempts = otpRecord.max_attempts - otpRecord.attempts - 1
      return new Response(
        JSON.stringify({
          error: 'Invalid OTP code',
          remainingAttempts
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark OTP as used
    await supabase
      .from('otp_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otpRecord.id)

    // Handle different purposes
    if (purpose === 'login') {
      // Get user by email
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const user = authUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail)

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate magic link / session token
      // Since we can't directly create a session, we'll generate a sign-in link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
        options: {
          redirectTo: `${Deno.env.get('APP_URL') || 'https://kenyapesa.space'}/dashboard`
        }
      })

      if (linkError) {
        console.error('Failed to generate session:', linkError)
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          purpose: 'login',
          // Return the hashed token for client-side verification
          token: linkData.properties?.hashed_token,
          redirectUrl: linkData.properties?.action_link
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (purpose === 'verification') {
      // Get user by email
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const user = authUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail)

      if (user) {
        // Update email_confirmed_at
        await supabase.auth.admin.updateUserById(user.id, {
          email_confirm: true
        })

        // Update profile
        await supabase
          .from('profiles')
          .update({
            email_verified: true,
            email_verified_at: new Date().toISOString()
          })
          .eq('id', user.id)
      }

      return new Response(
        JSON.stringify({
          success: true,
          purpose: 'verification',
          message: 'Email verified successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (purpose === 'password_reset') {
      // Return a token that allows password reset
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail
      })

      if (linkError) {
        console.error('Failed to generate recovery link:', linkError)
        return new Response(
          JSON.stringify({ error: 'Failed to initiate password reset' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          purpose: 'password_reset',
          redirectUrl: linkData.properties?.action_link
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Verify OTP error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
