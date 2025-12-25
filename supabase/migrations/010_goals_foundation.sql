-- Goals Foundation Migration
-- Creates the base goals table structure

-- 1. Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12, 2) DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE,
  description TEXT,
  category VARCHAR(50) DEFAULT 'savings',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_created ON goals(created_at);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'goals'
    AND policyname = 'goals_user_policy'
  ) THEN
    CREATE POLICY goals_user_policy ON goals
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Comments
COMMENT ON TABLE goals IS 'User financial goals and savings targets';
COMMENT ON COLUMN goals.name IS 'Goal name/title';
COMMENT ON COLUMN goals.target_amount IS 'Target amount to save';
COMMENT ON COLUMN goals.current_amount IS 'Current saved amount';
COMMENT ON COLUMN goals.deadline IS 'Optional deadline date';
COMMENT ON COLUMN goals.category IS 'Goal category (savings, vacation, emergency, purchase, education, investment, other)';

-- Migrate existing data from savings_goals if it exists
DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_sql TEXT;
BEGIN
  -- Check if savings_goals table exists
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'savings_goals'
  ) THEN
    -- Build dynamic SQL based on which columns exist in savings_goals
    v_sql := 'INSERT INTO goals (id, user_id, target_amount, current_amount, name';

    -- name column is always included (will be generated if doesn't exist in savings_goals)

    -- Check for deadline
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'savings_goals'
      AND column_name = 'deadline'
    ) THEN
      v_sql := v_sql || ', deadline';
    END IF;

    -- Check for description
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'savings_goals'
      AND column_name = 'description'
    ) THEN
      v_sql := v_sql || ', description';
    END IF;

    -- Check for category
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'savings_goals'
      AND column_name = 'category'
    ) THEN
      v_sql := v_sql || ', category';
    END IF;

    -- Check for created_at
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'savings_goals'
      AND column_name = 'created_at'
    ) THEN
      v_sql := v_sql || ', created_at';
    END IF;

    -- Check for updated_at
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'savings_goals'
      AND column_name = 'updated_at'
    ) THEN
      v_sql := v_sql || ', updated_at';
    END IF;

    v_sql := v_sql || ') SELECT id, user_id, target_amount, COALESCE(current_amount, 0), ';

    -- Add name column to SELECT
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'savings_goals' AND column_name = 'name') THEN
      v_sql := v_sql || 'name';
    ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'savings_goals' AND column_name = 'title') THEN
      v_sql := v_sql || 'title';
    ELSE
      -- Generate default name if no name/title column exists in savings_goals
      v_sql := v_sql || '''Savings Goal - KES '' || target_amount::text';
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'savings_goals' AND column_name = 'deadline') THEN
      v_sql := v_sql || ', deadline';
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'savings_goals' AND column_name = 'description') THEN
      v_sql := v_sql || ', description';
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'savings_goals' AND column_name = 'category') THEN
      v_sql := v_sql || ', COALESCE(category, ''savings'')';
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'savings_goals' AND column_name = 'created_at') THEN
      v_sql := v_sql || ', COALESCE(created_at, NOW())';
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'savings_goals' AND column_name = 'updated_at') THEN
      v_sql := v_sql || ', COALESCE(updated_at, NOW())';
    END IF;

    v_sql := v_sql || ' FROM savings_goals ON CONFLICT (id) DO NOTHING';

    -- Execute the migration
    EXECUTE v_sql;

    RAISE NOTICE 'Migrated data from savings_goals to goals table';
  ELSE
    RAISE NOTICE 'No savings_goals table found, skipping migration';
  END IF;
END $$;
