-- Migration: Add source_name and reversal fields to income table
-- This supports:
-- 1. Tracking source of funds (who paid - employer, client, etc.)
-- 2. Income reversal functionality (immutable income pattern)
-- Date: 2025-12-27

-- Add source_name column to track who paid
ALTER TABLE income
ADD COLUMN IF NOT EXISTS source_name TEXT;

-- Add reversal-related columns
ALTER TABLE income
ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE;

ALTER TABLE income
ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

ALTER TABLE income
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;

-- Create index for faster queries on reversed income
CREATE INDEX IF NOT EXISTS idx_income_is_reversed ON income(is_reversed);

-- Note: transaction_type in account_history is TEXT, not an enum
-- The value 'income_reversal' can be used directly without modifying any type
