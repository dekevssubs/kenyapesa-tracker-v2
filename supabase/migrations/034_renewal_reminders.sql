-- Migration: Create renewal_reminders table
-- Description: Track subscriptions/services the user may want to cancel before renewal date
-- This implements the "Remind me to cancel" feature

-- Create renewal_reminders table
CREATE TABLE IF NOT EXISTS renewal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  related_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  related_recurring_id UUID REFERENCES recurring_transactions(id) ON DELETE SET NULL,
  renewal_date DATE NOT NULL,
  amount_expected DECIMAL(12, 2) NOT NULL CHECK (amount_expected >= 0),
  reminder_days INTEGER[] NOT NULL DEFAULT '{5, 3, 2, 1}',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'renewed')),
  notes TEXT,
  last_notified_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_user_id ON renewal_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_renewal_date ON renewal_reminders(renewal_date);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_status ON renewal_reminders(status);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_user_active ON renewal_reminders(user_id, status, renewal_date)
  WHERE status = 'active';

-- Enable Row Level Security
ALTER TABLE renewal_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user data isolation
DROP POLICY IF EXISTS "Users can view their own renewal reminders" ON renewal_reminders;
CREATE POLICY "Users can view their own renewal reminders"
  ON renewal_reminders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own renewal reminders" ON renewal_reminders;
CREATE POLICY "Users can insert their own renewal reminders"
  ON renewal_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own renewal reminders" ON renewal_reminders;
CREATE POLICY "Users can update their own renewal reminders"
  ON renewal_reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own renewal reminders" ON renewal_reminders;
CREATE POLICY "Users can delete their own renewal reminders"
  ON renewal_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS update_renewal_reminders_updated_at ON renewal_reminders;
CREATE TRIGGER update_renewal_reminders_updated_at
    BEFORE UPDATE ON renewal_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Table and column comments
COMMENT ON TABLE renewal_reminders IS 'Tracks subscriptions/services the user may want to cancel before renewal date';
COMMENT ON COLUMN renewal_reminders.title IS 'Name of the subscription/service (e.g., Netflix, ChatGPT Pro)';
COMMENT ON COLUMN renewal_reminders.related_expense_id IS 'Optional link to the expense that triggered this reminder';
COMMENT ON COLUMN renewal_reminders.related_recurring_id IS 'Optional link to a recurring transaction if this is tied to a subscription';
COMMENT ON COLUMN renewal_reminders.renewal_date IS 'Date when the subscription will renew if not cancelled';
COMMENT ON COLUMN renewal_reminders.amount_expected IS 'Expected renewal amount';
COMMENT ON COLUMN renewal_reminders.reminder_days IS 'Array of days before renewal to send reminders (e.g., {5, 3, 2, 1})';
COMMENT ON COLUMN renewal_reminders.status IS 'active = awaiting action, cancelled = user cancelled subscription, expired = renewal date passed, renewed = user acknowledged renewal';
COMMENT ON COLUMN renewal_reminders.last_notified_at IS 'Timestamp of last notification sent for this reminder';
COMMENT ON COLUMN renewal_reminders.cancelled_at IS 'Timestamp when user marked as cancelled';
