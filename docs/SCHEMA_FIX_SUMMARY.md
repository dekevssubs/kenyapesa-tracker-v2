# Schema Fix Summary

## Issue
The initial migration script (`008_backfill_account_transactions.sql`) had schema mismatches with the actual database structure defined in `007_accounts_foundation.sql`.

## Root Cause
The `account_transactions` table uses a **directional flow model**:
- `from_account_id` - Source account (money flows OUT)
- `to_account_id` - Destination account (money flows IN)

But the initial migration script incorrectly assumed:
- A single `account_id` field
- `related_income_id` and `related_expense_id` fields

## Actual Schema (from 007_accounts_foundation.sql)

### account_transactions Table
```sql
CREATE TABLE account_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  from_account_id UUID,      -- Source account
  to_account_id UUID,         -- Destination account
  transaction_type VARCHAR(50),
  amount DECIMAL(12, 2),
  category VARCHAR(50),
  description TEXT,
  reference_id UUID,          -- Link to original record (income/expense)
  reference_type VARCHAR(50), -- Type: 'income', 'expense', etc.
  date DATE,
  notes TEXT,
  created_at TIMESTAMP
);
```

### Transaction Flow Model

**Income** (money flows INTO account):
```sql
INSERT INTO account_transactions (
  to_account_id,    -- Money goes TO the account
  transaction_type, -- 'income'
  amount,
  reference_id,     -- income.id
  reference_type    -- 'income'
)
```

**Expense** (money flows OUT OF account):
```sql
INSERT INTO account_transactions (
  from_account_id,  -- Money comes FROM the account
  transaction_type, -- 'expense'
  amount,
  reference_id,     -- expenses.id
  reference_type    -- 'expense'
)
```

**Transfer** (money flows FROM one account TO another):
```sql
INSERT INTO account_transactions (
  from_account_id,  -- Source account
  to_account_id,    -- Destination account
  transaction_type, -- 'transfer'
  amount
)
```

**Investment Return** (money flows INTO investment account):
```sql
-- Created automatically by process_investment_return() trigger
INSERT INTO account_transactions (
  to_account_id,    -- Investment account
  transaction_type, -- 'investment_return'
  amount,
  category          -- return_type (interest, dividend, etc.)
)
```

## Files Fixed

### 1. `supabase/migrations/008_backfill_account_transactions.sql`
**Changes:**
- ✅ Changed `account_id` → `to_account_id` for income records
- ✅ Changed `account_id` → `from_account_id` for expense records
- ✅ Changed `related_income_id` → `reference_id` with `reference_type = 'income'`
- ✅ Changed `related_expense_id` → `reference_id` with `reference_type = 'expense'`
- ✅ Removed `payment_method` field (doesn't exist in schema)
- ✅ Fixed balance calculation to use `from_account_id` and `to_account_id`
- ✅ Fixed migration_summary view to use correct fields

### 2. `src/utils/dataMigrationService.js`
**Changes in `backfillIncome()`:**
- ✅ Changed `account_id` → `to_account_id`
- ✅ Changed `related_income_id` → `reference_id` with `reference_type = 'income'`
- ✅ Removed `payment_method` field

**Changes in `backfillExpenses()`:**
- ✅ Changed `account_id` → `from_account_id`
- ✅ Changed `related_expense_id` → `reference_id` with `reference_type = 'expense'`
- ✅ Removed `payment_method` field

**Changes in `recalculateBalance()`:**
- ✅ Uses `.or()` filter to get transactions where account is source OR destination
- ✅ Calculates balance as: `SUM(to_account) - SUM(from_account)`

**Changes in `getMigrationSummary()`:**
- ✅ Uses `.or()` filter for transaction queries
- ✅ Filters by `to_account_id` for income total
- ✅ Filters by `from_account_id` for expense total

### 3. `src/utils/accountService.js`
**No changes needed!** ✅
- Already correctly uses `from_account_id` and `to_account_id`
- `transferBetweenAccounts()` method is correct
- `recordInvestmentReturn()` correctly inserts into `investment_returns` table (trigger handles the rest)
- `getAccountTransactions()` correctly uses `.or()` filter

## How to Apply the Fix

### Step 1: Run the Fixed Migration
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/008_backfill_account_transactions.sql
```

### Step 2: Verify Migration Success
```sql
-- Check created accounts
SELECT * FROM accounts WHERE is_primary = true;

-- Check migrated transactions
SELECT COUNT(*), transaction_type
FROM account_transactions
GROUP BY transaction_type;

-- View migration summary
SELECT * FROM migration_summary;
```

### Step 3: Test in UI
1. Navigate to `/accounts`
2. Verify "Main Account (Auto-Created)" appears
3. Check that balance = Total Income - Total Expenses
4. Go to Settings → Data Migration
5. Verify migration status shows "Complete"

## Validation Queries

### Check Income Migration
```sql
SELECT
  at.id,
  at.to_account_id,
  at.transaction_type,
  at.amount,
  at.reference_id,
  at.reference_type,
  i.source,
  i.amount as original_amount
FROM account_transactions at
INNER JOIN income i ON i.id = at.reference_id
WHERE at.reference_type = 'income'
LIMIT 10;
```

### Check Expense Migration
```sql
SELECT
  at.id,
  at.from_account_id,
  at.transaction_type,
  at.amount,
  at.reference_id,
  at.reference_type,
  e.category,
  e.amount as original_amount
FROM account_transactions at
INNER JOIN expenses e ON e.id = at.reference_id
WHERE at.reference_type = 'expense'
LIMIT 10;
```

### Verify Balance Calculation
```sql
SELECT
  a.name,
  a.current_balance,
  COALESCE(SUM(CASE WHEN at.to_account_id = a.id THEN at.amount ELSE 0 END), 0) as total_in,
  COALESCE(SUM(CASE WHEN at.from_account_id = a.id THEN at.amount ELSE 0 END), 0) as total_out,
  COALESCE(SUM(CASE WHEN at.to_account_id = a.id THEN at.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN at.from_account_id = a.id THEN at.amount ELSE 0 END), 0) as calculated_balance
FROM accounts a
LEFT JOIN account_transactions at ON (at.to_account_id = a.id OR at.from_account_id = a.id)
WHERE a.is_primary = true
GROUP BY a.id, a.name, a.current_balance;

-- current_balance should equal calculated_balance
```

## Database Triggers Behavior

### update_account_balance_on_transaction
Automatically runs after INSERT on account_transactions:
```sql
-- Deducts from source
IF from_account_id IS NOT NULL THEN
  UPDATE accounts SET current_balance = current_balance - amount
  WHERE id = from_account_id;
END IF;

-- Adds to destination
IF to_account_id IS NOT NULL THEN
  UPDATE accounts SET current_balance = current_balance + amount
  WHERE id = to_account_id;
END IF;
```

### process_investment_return
Runs BEFORE INSERT on investment_returns:
- Creates an account_transaction with `to_account_id` = investment account
- Sets `transaction_type` = 'investment_return'
- Links transaction back to investment_returns record

## Error Messages You Might See

### Before Fix:
```
ERROR: 42703: column "account_id" of relation "account_transactions" does not exist
```

### After Fix:
✅ Migration should complete successfully with no errors

## Rollback (If Needed)

If you need to roll back the migration:

```sql
-- Delete migration history
DELETE FROM migration_history WHERE migration_name = '008_backfill_account_transactions';

-- Delete migrated transactions
DELETE FROM account_transactions WHERE reference_type IN ('income', 'expense');

-- Delete auto-created accounts
DELETE FROM accounts WHERE name = 'Main Account (Auto-Created)';

-- Drop migration view
DROP VIEW IF EXISTS migration_summary;
```

## Testing Checklist

After applying the fix:
- [ ] Migration script runs without errors
- [ ] Accounts table has auto-created account
- [ ] account_transactions has records with correct from/to fields
- [ ] Account balances are calculated correctly
- [ ] UI shows accounts page correctly
- [ ] Migration status in Settings shows "Complete"
- [ ] Transfer between accounts works
- [ ] Recording investment returns works

---

**Fix Applied**: 2024-12-23
**Migration Version**: 008
**Status**: ✅ Ready for deployment
