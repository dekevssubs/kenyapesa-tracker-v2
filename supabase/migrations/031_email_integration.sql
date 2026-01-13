-- Email Integration Migration
-- Adds tables for email preferences, OTP codes, email logs, and email queue

-- ============================================
-- 1. Email Preferences Table
-- ============================================
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Global toggle
  emails_enabled BOOLEAN DEFAULT true,

  -- Category preferences
  bill_overdue_emails BOOLEAN DEFAULT true,
  budget_exceeded_emails BOOLEAN DEFAULT true,
  goal_achieved_emails BOOLEAN DEFAULT true,
  low_balance_emails BOOLEAN DEFAULT false,
  weekly_summary_emails BOOLEAN DEFAULT true,

  -- Frequency controls
  max_emails_per_day INTEGER DEFAULT 5,
  digest_hour INTEGER DEFAULT 8 CHECK (digest_hour >= 0 AND digest_hour <= 23),
  digest_timezone TEXT DEFAULT 'Africa/Nairobi',

  -- Unsubscribe token (for one-click unsubscribe)
  unsubscribe_token UUID DEFAULT gen_random_uuid() UNIQUE,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own email preferences"
  ON email_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences"
  ON email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email preferences"
  ON email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. OTP Codes Table
-- ============================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'verification', 'password_reset')),

  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX idx_otp_email_purpose ON otp_codes(email, purpose, expires_at);
CREATE INDEX idx_otp_cleanup ON otp_codes(expires_at);

-- ============================================
-- 3. Email Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  provider_message_id TEXT,
  error_message TEXT,

  metadata JSONB DEFAULT '{}',

  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only view their own email logs)
CREATE POLICY "Users can view own email logs"
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes for performance and rate limiting
CREATE INDEX idx_email_logs_user_date ON email_logs(user_id, created_at);
CREATE INDEX idx_email_logs_type_date ON email_logs(email_type, created_at);
CREATE INDEX idx_email_logs_status ON email_logs(status, created_at);

-- ============================================
-- 4. Email Queue Table
-- ============================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

  scheduled_for TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own email queue"
  ON email_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Index for queue processing
CREATE INDEX idx_email_queue_status ON email_queue(status, scheduled_for, priority);
CREATE INDEX idx_email_queue_user ON email_queue(user_id, created_at);

-- ============================================
-- 5. Add email_verified column to profiles
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- ============================================
-- 6. Update trigger for email_preferences
-- ============================================
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_preferences_updated_at();

-- ============================================
-- 7. Function to clean up expired OTPs
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Function to check email rate limit
-- ============================================
CREATE OR REPLACE FUNCTION check_email_rate_limit(p_user_id UUID, p_email_type TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_emails INTEGER;
  v_sent_today INTEGER;
BEGIN
  -- Get user's max emails per day setting
  SELECT COALESCE(max_emails_per_day, 5) INTO v_max_emails
  FROM email_preferences
  WHERE user_id = p_user_id;

  -- Default to 5 if no preference set
  IF v_max_emails IS NULL THEN
    v_max_emails := 5;
  END IF;

  -- Count emails sent today (excluding OTP and verification which are critical)
  SELECT COUNT(*) INTO v_sent_today
  FROM email_logs
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND email_type NOT IN ('otp', 'verification', 'password_reset')
    AND status = 'sent';

  RETURN v_sent_today < v_max_emails;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. Function to create default email preferences on signup
-- ============================================
CREATE OR REPLACE FUNCTION create_default_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles to auto-create email preferences
DROP TRIGGER IF EXISTS trigger_create_email_preferences ON profiles;
CREATE TRIGGER trigger_create_email_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_email_preferences();

-- ============================================
-- 10. Grant necessary permissions for edge functions
-- ============================================
-- These allow the service role to access these tables
GRANT SELECT, INSERT, UPDATE, DELETE ON otp_codes TO service_role;
GRANT SELECT, INSERT, UPDATE ON email_logs TO service_role;
GRANT SELECT, INSERT, UPDATE ON email_queue TO service_role;
GRANT SELECT, UPDATE ON email_preferences TO service_role;

-- Allow anon role to insert OTP requests (for login flow)
GRANT INSERT ON otp_codes TO anon;
GRANT SELECT ON otp_codes TO anon;
