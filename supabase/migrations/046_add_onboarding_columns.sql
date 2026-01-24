-- Add onboarding tracking columns to profiles table
-- Migration: 046_add_onboarding_columns.sql

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE;

-- Create index for efficient onboarding status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(id, onboarding_completed);

COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether the user has completed the onboarding tour';
COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN profiles.onboarding_skipped IS 'Whether the user skipped the onboarding tour';
