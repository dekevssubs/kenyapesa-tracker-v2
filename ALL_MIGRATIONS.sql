-- ============================================================================
-- KENYAPESA TRACKER - ALL MIGRATIONS CONSOLIDATED
-- ============================================================================
-- Run this entire file in your Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/ojigypxfwwxlcpuyjjlw/editor
-- ============================================================================

-- ============================================================================
-- MIGRATION 001: Lending Tracker
-- ============================================================================

-- Create lending_tracker table
CREATE TABLE IF NOT EXISTS lending_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  date_lent DATE NOT NULL,
  expected_return_date DATE,
  repayment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (repayment_status IN ('pending', 'partial', 'complete')),
  amount_repaid DECIMAL(12, 2) DEFAULT 0 CHECK (amount_repaid >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lending_user_id ON lending_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_lending_status ON lending_tracker(repayment_status);
CREATE INDEX IF NOT EXISTS idx_lending_date ON lending_tracker(date_lent);

-- Enable RLS
ALTER TABLE lending_tracker ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own lending records" ON lending_tracker;
CREATE POLICY "Users can view their own lending records"
  ON lending_tracker FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own lending records" ON lending_tracker;
CREATE POLICY "Users can insert their own lending records"
  ON lending_tracker FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own lending records" ON lending_tracker;
CREATE POLICY "Users can update their own lending records"
  ON lending_tracker FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own lending records" ON lending_tracker;
CREATE POLICY "Users can delete their own lending records"
  ON lending_tracker FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_lending_tracker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_lending_tracker_updated_at ON lending_tracker;
CREATE TRIGGER set_lending_tracker_updated_at
  BEFORE UPDATE ON lending_tracker
  FOR EACH ROW
  EXECUTE FUNCTION update_lending_tracker_updated_at();

-- ============================================================================
-- MIGRATION 002: Bill Reminders
-- ============================================================================

-- Create bill_reminders table
CREATE TABLE IF NOT EXISTS bill_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category VARCHAR(50) NOT NULL,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'mpesa',
  due_date DATE NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'once' CHECK (frequency IN ('once', 'weekly', 'monthly', 'quarterly', 'yearly')),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  last_reminded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bill_reminders_user_id ON bill_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_due_date ON bill_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_active ON bill_reminders(is_active);

-- Enable RLS
ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bill reminders" ON bill_reminders;
CREATE POLICY "Users can delete their own bill reminders"
  ON bill_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_bill_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bill_reminders_updated_at ON bill_reminders;
CREATE TRIGGER set_bill_reminders_updated_at
  BEFORE UPDATE ON bill_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_reminders_updated_at();

-- ============================================================================
-- MIGRATION 003: Budget Alerts
-- ============================================================================

-- Create budget_alerts table
CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('warning_75', 'warning_90', 'exceeded')),
  spent_amount DECIMAL(12, 2) NOT NULL,
  budget_percentage DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON budget_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget_id ON budget_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_created_at ON budget_alerts(created_at);

-- Enable RLS
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own budget alerts" ON budget_alerts;
CREATE POLICY "Users can view their own budget alerts"
  ON budget_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own budget alerts" ON budget_alerts;
CREATE POLICY "Users can insert their own budget alerts"
  ON budget_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- MIGRATION 004: Pending Expenses
-- ============================================================================

-- Create pending_expenses table
CREATE TABLE IF NOT EXISTS pending_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_transaction_id UUID REFERENCES recurring_transactions(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category VARCHAR(50) NOT NULL,
  description TEXT,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'mpesa',
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_expenses_user_id ON pending_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_recurring_id ON pending_expenses(recurring_transaction_id);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_status ON pending_expenses(status);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_date ON pending_expenses(date);

-- Enable RLS
ALTER TABLE pending_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own pending expenses" ON pending_expenses;
CREATE POLICY "Users can view their own pending expenses"
  ON pending_expenses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pending expenses" ON pending_expenses;
CREATE POLICY "Users can insert their own pending expenses"
  ON pending_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pending expenses" ON pending_expenses;
CREATE POLICY "Users can update their own pending expenses"
  ON pending_expenses FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pending expenses" ON pending_expenses;
CREATE POLICY "Users can delete their own pending expenses"
  ON pending_expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_pending_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pending_expenses_updated_at ON pending_expenses;
CREATE TRIGGER set_pending_expenses_updated_at
  BEFORE UPDATE ON pending_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_expenses_updated_at();

-- ============================================================================
-- MIGRATION 005: AI Predictions
-- ============================================================================

-- Create ai_predictions table
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  month DATE NOT NULL,
  predicted_amount DECIMAL(12, 2) NOT NULL,
  confidence_score DECIMAL(4, 3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  trend VARCHAR(20),
  seasonality_factor DECIMAL(5, 3),
  moving_average DECIMAL(12, 2),
  historical_variance DECIMAL(12, 2),
  calculation_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, month)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_predictions_user_id ON ai_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_month ON ai_predictions(month);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_category ON ai_predictions(category);

-- Enable RLS
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own predictions" ON ai_predictions;
CREATE POLICY "Users can view their own predictions"
  ON ai_predictions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own predictions" ON ai_predictions;
CREATE POLICY "Users can insert their own predictions"
  ON ai_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own predictions" ON ai_predictions;
CREATE POLICY "Users can update their own predictions"
  ON ai_predictions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own predictions" ON ai_predictions;
CREATE POLICY "Users can delete their own predictions"
  ON ai_predictions FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ai_predictions_updated_at ON ai_predictions;
CREATE TRIGGER set_ai_predictions_updated_at
  BEFORE UPDATE ON ai_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_predictions_updated_at();

-- ============================================================================
-- MIGRATION 006: Update Recurring Transactions
-- ============================================================================

-- Add new columns to recurring_transactions table
ALTER TABLE recurring_transactions
  ADD COLUMN IF NOT EXISTS last_auto_created_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE recurring_transactions
  ADD COLUMN IF NOT EXISTS auto_create_days_before INTEGER DEFAULT 0;

-- Create index for auto_add queries
CREATE INDEX IF NOT EXISTS idx_recurring_auto_add ON recurring_transactions(user_id, auto_add, is_active)
  WHERE auto_add = true AND is_active = true;

-- ============================================================================
-- MIGRATION COMPLETED
-- ============================================================================
-- All tables have been created successfully!
--
-- Next steps:
-- 1. Verify all tables appear in your Supabase Table Editor
-- 2. Start your development server: npm run dev
-- 3. Test the new features
-- ============================================================================
