-- Migration: Create pending_expenses table
-- Description: Auto-created expenses from recurring transactions awaiting user approval

-- Create pending_expenses table
CREATE TABLE IF NOT EXISTS pending_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_transaction_id UUID REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category VARCHAR(50) NOT NULL,
  description TEXT,
  payment_method VARCHAR(50),
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pending_user_id ON pending_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_expenses(status);
CREATE INDEX IF NOT EXISTS idx_pending_recurring_id ON pending_expenses(recurring_transaction_id);
CREATE INDEX IF NOT EXISTS idx_pending_user_status ON pending_expenses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_date ON pending_expenses(date DESC);

-- Enable Row Level Security
ALTER TABLE pending_expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view their own pending expenses" ON pending_expenses;
DROP POLICY IF EXISTS "Users can insert their own pending expenses" ON pending_expenses;
DROP POLICY IF EXISTS "Users can update their own pending expenses" ON pending_expenses;
DROP POLICY IF EXISTS "Users can delete their own pending expenses" ON pending_expenses;

-- RLS Policy: Users can view their own pending expenses
CREATE POLICY "Users can view their own pending expenses"
  ON pending_expenses FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own pending expenses
CREATE POLICY "Users can insert their own pending expenses"
  ON pending_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own pending expenses
CREATE POLICY "Users can update their own pending expenses"
  ON pending_expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own pending expenses
CREATE POLICY "Users can delete their own pending expenses"
  ON pending_expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE pending_expenses IS 'Auto-created expenses from recurring transactions awaiting user review and approval';
