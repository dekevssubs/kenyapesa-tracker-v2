-- Migration: Create recurring_income table
-- Description: Support recurring income entries (salary, freelance, etc.)
-- Enables users to set up income templates that recur on a schedule

-- Create recurring_income table
CREATE TABLE IF NOT EXISTS recurring_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Income details
  source VARCHAR(50) NOT NULL CHECK (source IN ('salary', 'side_hustle', 'investment', 'bonus', 'gift', 'other')),
  source_name TEXT, -- Employer name, client, etc.
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,

  -- Recurrence settings
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE, -- Optional: when to stop recurring
  next_date DATE NOT NULL, -- Next expected income date

  -- Auto-creation settings
  auto_create BOOLEAN DEFAULT FALSE, -- Automatically create income entry
  auto_create_days_before INTEGER DEFAULT 0 CHECK (auto_create_days_before >= 0 AND auto_create_days_before <= 30),
  last_auto_created_at TIMESTAMPTZ, -- When was last income auto-created

  -- For salary-specific deductions
  is_gross BOOLEAN DEFAULT FALSE, -- Is amount gross salary (before deductions)
  gross_salary DECIMAL(12, 2), -- Gross salary amount
  statutory_deductions DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recurring_income_user_id ON recurring_income(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_income_next_date ON recurring_income(next_date);
CREATE INDEX IF NOT EXISTS idx_recurring_income_active ON recurring_income(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_income_user_active ON recurring_income(user_id, is_active, next_date);
CREATE INDEX IF NOT EXISTS idx_recurring_income_auto_create ON recurring_income(user_id, is_active, auto_create, next_date);

-- Enable Row Level Security
ALTER TABLE recurring_income ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own recurring income"
  ON recurring_income FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring income"
  ON recurring_income FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring income"
  ON recurring_income FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring income"
  ON recurring_income FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_recurring_income_updated_at
  BEFORE UPDATE ON recurring_income
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE recurring_income IS 'Manages recurring income templates (salary, freelance, etc.) with automatic creation support';
COMMENT ON COLUMN recurring_income.source IS 'Type of income: salary, side_hustle, investment, bonus, gift, other';
COMMENT ON COLUMN recurring_income.source_name IS 'Who pays - employer name, client, investment source, etc.';
COMMENT ON COLUMN recurring_income.frequency IS 'How often: weekly, biweekly, monthly, quarterly, yearly';
COMMENT ON COLUMN recurring_income.start_date IS 'When this recurring income started';
COMMENT ON COLUMN recurring_income.end_date IS 'Optional: When to stop this recurring income';
COMMENT ON COLUMN recurring_income.next_date IS 'Next expected income date';
COMMENT ON COLUMN recurring_income.auto_create IS 'If true, automatically create income entry on next_date';
COMMENT ON COLUMN recurring_income.auto_create_days_before IS 'Days before next_date to auto-create income (0 = on date)';
COMMENT ON COLUMN recurring_income.is_gross IS 'If true, amount represents gross salary before deductions';
