-- Migration: Create bill_reminders table
-- Description: Track upcoming bills and recurring payments with reminders

-- Create bill_reminders table
CREATE TABLE IF NOT EXISTS bill_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category VARCHAR(50) NOT NULL,
  due_date DATE NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'once' CHECK (frequency IN ('once', 'weekly', 'monthly', 'quarterly', 'yearly')),
  is_active BOOLEAN DEFAULT TRUE,
  last_reminded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bill_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bill_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_active ON bill_reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_bills_user_active ON bill_reminders(user_id, is_active, due_date);

-- Enable Row Level Security
ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view their own bill reminders" ON bill_reminders;
DROP POLICY IF EXISTS "Users can insert their own bill reminders" ON bill_reminders;
DROP POLICY IF EXISTS "Users can update their own bill reminders" ON bill_reminders;
DROP POLICY IF EXISTS "Users can delete their own bill reminders" ON bill_reminders;

-- RLS Policy: Users can view their own bill reminders
CREATE POLICY "Users can view their own bill reminders"
  ON bill_reminders FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own bill reminders
CREATE POLICY "Users can insert their own bill reminders"
  ON bill_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own bill reminders
CREATE POLICY "Users can update their own bill reminders"
  ON bill_reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own bill reminders
CREATE POLICY "Users can delete their own bill reminders"
  ON bill_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_bill_reminders_updated_at ON bill_reminders;
CREATE TRIGGER update_bill_reminders_updated_at
    BEFORE UPDATE ON bill_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE bill_reminders IS 'Tracks upcoming bills and recurring payments with reminder notifications';
