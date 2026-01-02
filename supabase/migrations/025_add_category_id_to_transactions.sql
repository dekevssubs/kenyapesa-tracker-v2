-- =====================================================
-- Migration: Add category_id to account_transactions
-- Purpose: Link transactions to centralized category system
-- Dependencies: 024_unified_category_system.sql
-- =====================================================

-- Add category_id column to account_transactions
ALTER TABLE account_transactions
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_account_transactions_category_id ON account_transactions(category_id);

-- Backfill category_id from existing category string (best effort migration)
-- Map legacy category strings to new category slugs
DO $$
DECLARE
    txn RECORD;
    cat_id UUID;
    user_id_val UUID;
BEGIN
    FOR txn IN
        SELECT id, category, user_id, from_account_id, to_account_id
        FROM account_transactions
        WHERE category IS NOT NULL AND category_id IS NULL
    LOOP
        -- Get user_id from account
        IF txn.from_account_id IS NOT NULL THEN
            SELECT a.user_id INTO user_id_val FROM accounts a WHERE a.id = txn.from_account_id;
        ELSIF txn.to_account_id IS NOT NULL THEN
            SELECT a.user_id INTO user_id_val FROM accounts a WHERE a.id = txn.to_account_id;
        ELSE
            -- Try to get from transaction's user_id if exists
            user_id_val := txn.user_id;
        END IF;

        -- Skip if no user found
        IF user_id_val IS NULL THEN
            CONTINUE;
        END IF;

        -- Find matching category by slug (case-insensitive match)
        SELECT id INTO cat_id
        FROM expense_categories
        WHERE user_id = user_id_val
          AND LOWER(slug) = LOWER(txn.category)
          AND is_active = TRUE
        LIMIT 1;

        -- If exact match not found, try fuzzy match on name
        IF cat_id IS NULL THEN
            SELECT id INTO cat_id
            FROM expense_categories
            WHERE user_id = user_id_val
              AND LOWER(name) LIKE '%' || LOWER(txn.category) || '%'
              AND is_active = TRUE
            LIMIT 1;
        END IF;

        -- Update transaction with category_id if found
        IF cat_id IS NOT NULL THEN
            UPDATE account_transactions
            SET category_id = cat_id
            WHERE id = txn.id;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- Keep legacy category column for now (backwards compatibility)
-- Will deprecate after transition period
-- =====================================================

COMMENT ON COLUMN account_transactions.category IS 'DEPRECATED: Use category_id instead. Kept for backwards compatibility.';
COMMENT ON COLUMN account_transactions.category_id IS 'Foreign key to expense_categories table. Replaces legacy category string.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
