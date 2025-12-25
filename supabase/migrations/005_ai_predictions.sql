-- Migration: Create ai_predictions table
-- Description: Cache AI budget predictions for performance and analysis

-- Create ai_predictions table
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  month DATE NOT NULL,
  predicted_amount DECIMAL(12, 2) NOT NULL,
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  trend VARCHAR(20) CHECK (trend IN ('increasing', 'decreasing', 'stable', 'seasonal', 'insufficient_data')),
  seasonality_factor DECIMAL(3, 2),
  moving_average DECIMAL(12, 2),
  historical_variance DECIMAL(12, 2),
  calculation_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON ai_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_month ON ai_predictions(user_id, month);
CREATE INDEX IF NOT EXISTS idx_predictions_category ON ai_predictions(category);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON ai_predictions(created_at DESC);

-- Create unique constraint to prevent duplicate predictions for same user/category/month
CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_unique
  ON ai_predictions(user_id, category, month);

-- Enable Row Level Security
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view their own AI predictions" ON ai_predictions;
DROP POLICY IF EXISTS "Users can insert their own AI predictions" ON ai_predictions;
DROP POLICY IF EXISTS "Users can update their own AI predictions" ON ai_predictions;
DROP POLICY IF EXISTS "Users can delete their own AI predictions" ON ai_predictions;

-- RLS Policy: Users can view their own AI predictions
CREATE POLICY "Users can view their own AI predictions"
  ON ai_predictions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own AI predictions
CREATE POLICY "Users can insert their own AI predictions"
  ON ai_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own AI predictions
CREATE POLICY "Users can update their own AI predictions"
  ON ai_predictions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own AI predictions
CREATE POLICY "Users can delete their own AI predictions"
  ON ai_predictions FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE ai_predictions IS 'Caches AI-generated budget predictions with confidence scores and trend analysis';
