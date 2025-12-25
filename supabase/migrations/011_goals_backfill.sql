-- Migration: Backfill existing goals with linked accounts
-- Purpose: Link existing goals to user's primary savings/investment account
-- Run this AFTER migration 010_goals_foundation.sql
-- Version: 011
-- Date: 2024-12-23

-- Note: This migration prepares goals for the enhancement in 012
-- It doesn't add the new columns yet, just ensures data integrity

-- For existing goals without linked_account_id (will be added in 012),
-- this is a placeholder migration to maintain sequence.
-- The actual backfill will happen in migration 012 after columns are added.

-- Add a comment to track migration
COMMENT ON TABLE goals IS 'User financial goals and savings targets - Ready for enhancement';
