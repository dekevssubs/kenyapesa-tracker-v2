-- Migration: Create lending_tracker table
-- Description: Track money lent to people with repayment status

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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lending_user_id ON lending_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_lending_status ON lending_tracker(repayment_status);
CREATE INDEX IF NOT EXISTS idx_lending_date ON lending_tracker(date_lent DESC);

-- Enable Row Level Security
ALTER TABLE lending_tracker ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view their own lending records" ON lending_tracker;
DROP POLICY IF EXISTS "Users can insert their own lending records" ON lending_tracker;
DROP POLICY IF EXISTS "Users can update their own lending records" ON lending_tracker;
DROP POLICY IF EXISTS "Users can delete their own lending records" ON lending_tracker;

-- RLS Policy: Users can view their own lending records
CREATE POLICY "Users can view their own lending records"
  ON lending_tracker FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own lending records
CREATE POLICY "Users can insert their own lending records"
  ON lending_tracker FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own lending records
CREATE POLICY "Users can update their own lending records"
  ON lending_tracker FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own lending records
CREATE POLICY "Users can delete their own lending records"
  ON lending_tracker FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_lending_tracker_updated_at ON lending_tracker;
CREATE TRIGGER update_lending_tracker_updated_at
    BEFORE UPDATE ON lending_tracker
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE lending_tracker IS 'Tracks money lent to people with repayment status and history';
