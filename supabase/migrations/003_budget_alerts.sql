-- Migration: Create budget_alerts table
-- Description: Log budget alert history to prevent spam notifications

-- Create budget_alerts table
CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('warning_75', 'warning_90', 'exceeded')),
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON budget_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_budget_id ON budget_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_alerts_dismissed ON budget_alerts(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON budget_alerts(triggered_at DESC);

-- Enable Row Level Security
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view their own budget alerts" ON budget_alerts;
DROP POLICY IF EXISTS "Users can insert their own budget alerts" ON budget_alerts;
DROP POLICY IF EXISTS "Users can update their own budget alerts" ON budget_alerts;
DROP POLICY IF EXISTS "Users can delete their own budget alerts" ON budget_alerts;

-- RLS Policy: Users can view their own budget alerts
CREATE POLICY "Users can view their own budget alerts"
  ON budget_alerts FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own budget alerts
CREATE POLICY "Users can insert their own budget alerts"
  ON budget_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own budget alerts
CREATE POLICY "Users can update their own budget alerts"
  ON budget_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own budget alerts
CREATE POLICY "Users can delete their own budget alerts"
  ON budget_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE budget_alerts IS 'Logs budget alert notifications to prevent duplicate alerts within 24 hours';
