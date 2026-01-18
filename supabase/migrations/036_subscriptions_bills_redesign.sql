-- Migration: Redesign Subscriptions & Bill Reminders System
-- Description: Complete redesign of subscription and bill reminder tracking with payment history
-- This migration creates new tables and cleans up old data per user requirements

-- ============================================================
-- STEP 1: Create new subscriptions table
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  category_slug VARCHAR(100), -- For backwards compatibility
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  next_due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'skipped', 'overdue', 'cancelled')),
  source_expense_id UUID, -- Original expense that created this subscription
  last_paid_date DATE,
  last_paid_expense_id UUID, -- Most recent expense used as payment proof
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_due_date ON subscriptions(user_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions(user_id, category_id);

-- Enable RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
CREATE POLICY "Users can insert their own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON subscriptions;
CREATE POLICY "Users can delete their own subscriptions"
  ON subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE subscriptions IS 'Tracks subscription services like Netflix, Spotify, software subscriptions with payment tracking';

-- ============================================================
-- STEP 2: Redesign bill_reminders table
-- ============================================================
-- First, backup and drop old bill_reminders data
DROP TABLE IF EXISTS bill_reminders_old CASCADE;
ALTER TABLE IF EXISTS bill_reminders RENAME TO bill_reminders_old;

-- Create new bill_reminders table with updated schema
CREATE TABLE bill_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  category_slug VARCHAR(100), -- For backwards compatibility
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  next_due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'skipped', 'overdue', 'cancelled')),
  source_expense_id UUID, -- Original expense that created this bill reminder
  last_paid_date DATE,
  last_paid_expense_id UUID, -- Most recent expense used as payment proof
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for bill_reminders
CREATE INDEX IF NOT EXISTS idx_bill_reminders_user_id ON bill_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_status ON bill_reminders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_due_date ON bill_reminders(user_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_category ON bill_reminders(user_id, category_id);

-- Enable RLS for bill_reminders
ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bill_reminders
DROP POLICY IF EXISTS "Users can view their own bill reminders" ON bill_reminders;
CREATE POLICY "Users can view their own bill reminders"
  ON bill_reminders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own bill reminders" ON bill_reminders;
CREATE POLICY "Users can insert their own bill reminders"
  ON bill_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bill reminders" ON bill_reminders;
CREATE POLICY "Users can update their own bill reminders"
  ON bill_reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bill reminders" ON bill_reminders;
CREATE POLICY "Users can delete their own bill reminders"
  ON bill_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bill_reminders_updated_at ON bill_reminders;
CREATE TRIGGER update_bill_reminders_updated_at
    BEFORE UPDATE ON bill_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bill_reminders IS 'Tracks recurring bills like rent, utilities, loan payments with payment tracking';

-- Drop old backup table
DROP TABLE IF EXISTS bill_reminders_old CASCADE;

-- ============================================================
-- STEP 3: Create payment_history table
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_type VARCHAR(20) NOT NULL CHECK (reference_type IN ('subscription', 'bill_reminder')),
  reference_id UUID NOT NULL,
  expense_id UUID, -- Link to expense as payment proof (nullable for skipped)
  action VARCHAR(20) NOT NULL CHECK (action IN ('paid', 'skipped', 'cancelled')),
  billing_period_start DATE,
  billing_period_end DATE,
  amount_paid DECIMAL(12, 2),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payment_history
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_reference ON payment_history(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_expense ON payment_history(expense_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_date ON payment_history(user_id, payment_date DESC);

-- Enable RLS for payment_history
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_history
DROP POLICY IF EXISTS "Users can view their own payment history" ON payment_history;
CREATE POLICY "Users can view their own payment history"
  ON payment_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payment history" ON payment_history;
CREATE POLICY "Users can insert their own payment history"
  ON payment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payment history" ON payment_history;
CREATE POLICY "Users can update their own payment history"
  ON payment_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own payment history" ON payment_history;
CREATE POLICY "Users can delete their own payment history"
  ON payment_history FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE payment_history IS 'Audit trail for all subscription and bill reminder payment actions (paid, skipped, cancelled)';

-- ============================================================
-- STEP 4: Add recurrence fields to expenses table
-- ============================================================
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR(20) CHECK (recurrence_frequency IS NULL OR recurrence_frequency IN ('monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20) CHECK (recurrence_type IS NULL OR recurrence_type IN ('subscription', 'bill')),
  ADD COLUMN IF NOT EXISTS linked_subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_bill_reminder_id UUID REFERENCES bill_reminders(id) ON DELETE SET NULL;

-- Create index for recurrent expenses
CREATE INDEX IF NOT EXISTS idx_expenses_recurrent ON expenses(user_id, is_recurrent) WHERE is_recurrent = TRUE;

COMMENT ON COLUMN expenses.is_recurrent IS 'Whether this expense is part of a recurring payment';
COMMENT ON COLUMN expenses.recurrence_frequency IS 'Frequency of the recurring expense (monthly, yearly)';
COMMENT ON COLUMN expenses.recurrence_type IS 'Type of recurring item (subscription or bill)';
COMMENT ON COLUMN expenses.linked_subscription_id IS 'Reference to the subscription this expense pays for';
COMMENT ON COLUMN expenses.linked_bill_reminder_id IS 'Reference to the bill reminder this expense pays for';

-- ============================================================
-- STEP 5: Clean up old data from recurring_transactions and renewal_reminders
-- ============================================================
-- Delete all data from recurring_transactions (subscriptions were stored here)
DELETE FROM recurring_transactions WHERE TRUE;

-- Delete all data from renewal_reminders
DELETE FROM renewal_reminders WHERE TRUE;

-- ============================================================
-- STEP 6: Create helper function to calculate next due date
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  current_date_val DATE,
  frequency_val VARCHAR(20)
) RETURNS DATE AS $$
BEGIN
  CASE frequency_val
    WHEN 'monthly' THEN
      RETURN current_date_val + INTERVAL '1 month';
    WHEN 'yearly' THEN
      RETURN current_date_val + INTERVAL '1 year';
    ELSE
      RETURN current_date_val + INTERVAL '1 month'; -- Default to monthly
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_next_due_date IS 'Calculates the next due date based on frequency (monthly or yearly)';

-- ============================================================
-- STEP 7: Create function to check and update overdue status
-- ============================================================
CREATE OR REPLACE FUNCTION update_overdue_status() RETURNS void AS $$
BEGIN
  -- Update subscriptions that are 2+ days past due
  UPDATE subscriptions
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'active'
    AND next_due_date < CURRENT_DATE - INTERVAL '2 days';

  -- Update bill_reminders that are 2+ days past due
  UPDATE bill_reminders
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'active'
    AND next_due_date < CURRENT_DATE - INTERVAL '2 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_overdue_status IS 'Updates status to overdue for items 2+ days past due date';

-- ============================================================
-- Done
-- ============================================================
