-- Migration: Add snooze functionality to bill_reminders
-- Description: Allow users to snooze (postpone) bill reminders

-- Add snoozed_until column to bill_reminders
ALTER TABLE bill_reminders
ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;

-- Add index for efficient querying of snoozed bills
CREATE INDEX IF NOT EXISTS idx_bills_snoozed_until ON bill_reminders(snoozed_until)
  WHERE snoozed_until IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN bill_reminders.snoozed_until IS 'When set, bill reminder is snoozed until this date/time. NULL means not snoozed.';

-- Note: A bill is considered "snoozed" when snoozed_until > NOW()
-- When fetching bills, we can filter them with:
--   WHERE snoozed_until IS NULL OR snoozed_until <= NOW()
-- This automatically un-snoozes bills when their snooze period expires
