-- Email Queue Processing Cron Job & Fixes
-- 1. Add missing RLS policy for email_queue INSERT (users need to queue emails)
-- 2. Set up pg_cron + pg_net to process email queue every 5 minutes
-- 3. Add cleanup jobs for old processed emails
--
-- IMPORTANT: Before running this migration, ensure:
--   a) pg_cron extension is enabled in Supabase Dashboard → Database → Extensions
--   b) pg_net extension is enabled in Supabase Dashboard → Database → Extensions
--   c) RESEND_API_KEY is set in Supabase Dashboard → Edge Functions → Secrets
--
-- If pg_cron/pg_net are not available (free tier), you can alternatively:
--   - Use Supabase Dashboard → Database → Cron Jobs UI to schedule the function
--   - Or use an external cron service (e.g., cron-job.org) to call the edge function

-- ============================================
-- 1. Fix missing INSERT policy on email_queue
-- ============================================
CREATE POLICY "Users can insert own email queue items"
  ON email_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. Schedule email queue processing via pg_cron
-- ============================================
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Process email queue every 5 minutes by calling the Edge Function
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"batchSize": 50}'::jsonb
  );
  $$
);

-- ============================================
-- 3. Cleanup old processed emails (weekly)
-- ============================================
SELECT cron.schedule(
  'cleanup-email-queue',
  '0 3 * * 0',  -- Sunday 3 AM UTC
  $$
  DELETE FROM email_queue
  WHERE status IN ('sent', 'cancelled', 'failed')
    AND processed_at < NOW() - INTERVAL '30 days';
  $$
);

SELECT cron.schedule(
  'cleanup-email-logs',
  '0 4 * * 0',  -- Sunday 4 AM UTC
  $$
  DELETE FROM email_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);
