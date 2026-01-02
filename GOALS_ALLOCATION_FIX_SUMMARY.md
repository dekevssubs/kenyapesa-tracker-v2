# Goals Allocation Architecture Fix - Summary

## Issue Identified

The P1-3 implementation from `SESSION_PROGRESS_JAN2_UPDATED.md` was **NOT compliant** with the canonical Goals ledger architecture defined in `Goals-ledger-architecture.md`.

### The Problem

**What was implemented in P1-3:**
```javascript
// Goals simply used the ENTIRE linked account balance
current_amount: goal.linked_account?.current_balance
```

**Why this was wrong:**
If one account backs multiple goals, ALL goals would show the same total balance.

Example:
- MMF Account balance: 24,796.30
- Goal 1 (Vacation): Shows 24,796.30 ❌
- Goal 2 (Emergency): Shows 24,796.30 ❌
- Goal 3 (School): Shows 24,796.30 ❌

**What the canonical architecture requires:**
- Goals track **allocations** (claims on portions of account balance)
- Uses `goal_allocations` table to track which money is for which goal
- `goal.current_amount = SUM(goal_allocations.amount)`
- Each contribution creates BOTH a ledger entry AND an allocation record

---

## Changes Made

### 1. Database Migration (021_goal_allocations_table.sql)

**Created new table:**
```sql
CREATE TABLE goal_allocations (
  id UUID PRIMARY KEY,
  goal_id UUID REFERENCES goals(id),
  account_transaction_id UUID REFERENCES account_transactions(id),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(goal_id, account_transaction_id)
);
```

**Added constraints:**
- `target_date NOT NULL` on goals table (every goal must have a deadline)
- Indexes for fast balance calculations

**File:** `supabase/migrations/021_goal_allocations_table.sql`

---

### 2. GoalService Updates (goalService.js)

#### New Method: `calculateGoalBalance()`
**Lines:** 470-494

```javascript
async calculateGoalBalance(goalId) {
  const { data: allocations } = await this.supabase
    .from('goal_allocations')
    .select('amount')
    .eq('goal_id', goalId)

  return allocations.reduce((sum, alloc) =>
    sum + parseFloat(alloc.amount || 0), 0
  )
}
```

**Purpose:** Calculate goal balance from allocations, NOT account balance.

---

#### Updated Method: `getAllGoals()`
**Lines:** 501-538

**Before:**
```javascript
current_amount: goal.linked_account
  ? parseFloat(goal.linked_account.current_balance)
  : parseFloat(goal.current_amount || 0)
```

**After:**
```javascript
const allocatedAmount = await this.calculateGoalBalance(goal.id)
return {
  ...goal,
  current_amount: allocatedAmount
}
```

**Impact:** Each goal now shows its own allocated amount, not the entire account balance.

---

#### Updated Method: `getGoalWithContributions()`
**Lines:** 598-623

Same pattern - uses `calculateGoalBalance()` instead of `linked_account.current_balance`.

---

#### Updated Method: `makeContribution()`
**Lines:** 196-216

**Added after contribution succeeds:**
```javascript
// Create allocation record linking goal to account transaction
await this.supabase
  .from('goal_allocations')
  .insert({
    goal_id: goalId,
    account_transaction_id: result.account_transaction_id,
    amount: parseFloat(amount)
  })

// Calculate new goal balance from allocations
const newBalance = await this.calculateGoalBalance(goalId)
```

**Impact:** Every contribution now creates both:
1. A ledger entry in `account_transactions` (money movement)
2. An allocation record in `goal_allocations` (goal tracking)

---

#### Updated Method: `makeWithdrawal()`
**Lines:** 276-394

**Added validation:**
```javascript
// Check goal allocation balance, not account balance
const goalBalance = await this.calculateGoalBalance(goalId)
if (goalBalance < amount) {
  return {
    error: `Insufficient balance allocated to this goal. Available: KES ${goalBalance.toFixed(2)}`
  }
}
```

**Added FIFO allocation reduction logic:**
```javascript
// Get allocations oldest first
const allocations = await this.supabase
  .from('goal_allocations')
  .select('id, amount')
  .eq('goal_id', goalId)
  .order('created_at', { ascending: true })

let remainingToReduce = amount
for (const allocation of allocations) {
  if (allocAmount <= remainingToReduce) {
    // Delete this allocation entirely
    allocationsToDelete.push(allocation.id)
  } else {
    // Partially reduce this allocation
    allocationsToUpdate.push({
      id: allocation.id,
      newAmount: allocAmount - remainingToReduce
    })
  }
}
```

**Impact:** Withdrawals now properly reduce/close goal allocations using FIFO.

---

### 3. Goals UI Updates (Goals.jsx)

#### Goal Details Modal
**Lines:** 881-907

**Added allocation vs account balance display:**
```jsx
<div className="grid grid-cols-2 gap-3 text-sm">
  <div>
    <p className="text-gray-500">Allocated to Goal</p>
    <p className="font-semibold text-blue-600">
      {formatCurrency(selectedGoal.current_amount || 0)}
    </p>
  </div>
  <div>
    <p className="text-gray-500">Account Total</p>
    <p className="font-semibold text-gray-900">
      {formatCurrency(selectedGoal.linked_account.current_balance || 0)}
    </p>
  </div>
</div>
<p className="text-xs text-gray-500 mt-2 italic">
  Note: Goals are allocations of account funds. Multiple goals can share one account.
</p>
```

**Impact:** Users can now see BOTH:
- How much is allocated to this specific goal
- How much is in the total linked account

---

#### Goal Creation Form
**Lines:** 559-561

**Updated help text:**
```jsx
<p className="text-xs text-gray-500 mt-1">
  Account where funds are stored. Multiple goals can share one account - each tracks its own allocation.
</p>
```

**Impact:** Educates users about the allocation concept upfront.

---

## Architecture Principles Enforced

The implementation now correctly follows all canonical principles:

✅ **Goals are not accounts**
- Goals do not hold money
- Goals track allocations of money in real accounts

✅ **Ledger is authoritative**
- All money movement via `account_transactions`
- Goals reference ledger entries via `goal_allocations`

✅ **Linking an account ≠ funding a goal**
- Linked account is storage location
- Goal balance = sum of allocations, NOT account balance

✅ **Every goal must have a deadline**
- `target_date NOT NULL` constraint enforced

✅ **Virtual goal accounts**
- Multiple goals can exist on one account
- Each tracks separate allocations
- No double-counting

---

## Example Flow

### User Action:
"Contribute KES 2,000 to Vacation goal using MMF account"

### What Happens:

1. **Ledger Entry (account_transactions):**
```
from_account: Bank Account
to_account: MMF Account
amount: 2,000
reference_type: 'goal'
reference_id: vacation_goal_id
```

2. **Allocation Record (goal_allocations):**
```
goal_id: vacation_goal_id
account_transaction_id: <ledger_tx_id>
amount: 2,000
```

3. **Result:**
- MMF Account balance: +2,000 (real money moved)
- Vacation goal allocation: +2,000 (tracking claim)
- Emergency goal allocation: unchanged (separate tracking)
- School goal allocation: unchanged (separate tracking)

---

## Testing Scenarios

### Scenario 1: Multiple Goals, One Account

**Setup:**
- Create MMF Account with 0 balance
- Create Goal A (Vacation, target: 5,000)
- Create Goal B (Emergency, target: 10,000)
- Both linked to MMF Account

**Test:**
1. Contribute 3,000 to Goal A from Bank
   - Goal A shows: 3,000 ✅
   - Goal B shows: 0 ✅
   - MMF Account shows: 3,000 ✅

2. Contribute 7,000 to Goal B from Bank
   - Goal A shows: 3,000 ✅
   - Goal B shows: 7,000 ✅
   - MMF Account shows: 10,000 ✅

3. Withdraw 1,000 from Goal A
   - Goal A shows: 2,000 ✅
   - Goal B shows: 7,000 ✅
   - MMF Account shows: 9,000 ✅

---

### Scenario 2: Goal Balance Calculation

**Setup:**
- Create Goal with 0 balance
- Make 3 contributions:
  - Contribution 1: 1,000
  - Contribution 2: 500
  - Contribution 3: 2,000

**Test:**
```sql
SELECT SUM(amount) FROM goal_allocations WHERE goal_id = <goal_id>
-- Expected: 3,500
```

Goal should display: 3,500 ✅

---

### Scenario 3: FIFO Withdrawal

**Setup:**
- Goal has 3 allocations:
  - Allocation 1 (oldest): 1,000
  - Allocation 2: 500
  - Allocation 3 (newest): 2,000

**Test:** Withdraw 1,200

**Expected:**
- Allocation 1: Deleted (fully consumed)
- Allocation 2: Updated to 300 (partially consumed)
- Allocation 3: Unchanged
- Goal balance: 2,300

---

## Files Modified

| File | Purpose |
|------|---------|
| `supabase/migrations/021_goal_allocations_table.sql` | Created goal_allocations table and constraints |
| `src/utils/goalService.js` | Implemented allocation-based balance calculation and contribution/withdrawal logic |
| `src/pages/Goals.jsx` | Added UI to show allocation vs account balance distinction |

---

## Build Status

✅ **Build successful** - No TypeScript/JavaScript errors

```
✓ 2510 modules transformed.
✓ built in 9.43s
dist/index.html                    0.46 kB
dist/assets/index-C8LFabhx.css   103.27 kB
dist/assets/index-C0a5umui.js    1,518.40 kB
```

---

## Next Steps

### 1. Apply Migration to Database

**IMPORTANT:** The migration file has been created but needs to be applied to your Supabase instance.

**Option A: Supabase CLI**
```bash
supabase db reset  # Resets and applies all migrations
# OR
supabase migration up  # Applies only new migrations
```

**Option B: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `supabase/migrations/021_goal_allocations_table.sql`
3. Execute the SQL

**Option C: psql**
```bash
psql <your-database-connection-string> -f supabase/migrations/021_goal_allocations_table.sql
```

---

### 2. Data Migration (If Existing Goals Exist)

If you have existing goals with contributions, you'll need to:

1. **Backfill goal_allocations table** from existing `goal_contributions`:

```sql
INSERT INTO goal_allocations (goal_id, account_transaction_id, amount, created_at)
SELECT
  gc.goal_id,
  gc.account_transaction_id,
  gc.amount,
  gc.contribution_date
FROM goal_contributions gc
WHERE gc.transaction_type = 'contribution'
AND gc.account_transaction_id IS NOT NULL
ON CONFLICT (goal_id, account_transaction_id) DO NOTHING;
```

2. **Verify allocations match expected balances**:

```sql
-- Compare old calculation vs new
SELECT
  g.id,
  g.name,
  g.current_amount as old_balance,
  COALESCE(SUM(ga.amount), 0) as new_balance
FROM goals g
LEFT JOIN goal_allocations ga ON ga.goal_id = g.id
GROUP BY g.id, g.name, g.current_amount;
```

---

### 3. Testing Checklist

Before deploying to production:

- [ ] Migration applied successfully
- [ ] Existing goals show correct allocated amounts
- [ ] New contribution creates allocation record
- [ ] Goal balance updates after contribution
- [ ] Multiple goals on one account show separate amounts
- [ ] Withdrawal reduces allocations correctly (FIFO)
- [ ] Goal details modal shows allocation vs account balance
- [ ] Account balance remains correct (unchanged by goal logic)
- [ ] Build succeeds with no errors
- [ ] No console errors in browser

---

## Canonical Compliance

This implementation is now **fully compliant** with `Goals-ledger-architecture.md`.

All rules enforced:
- ✅ Goal target date is required
- ✅ Goal amount is derived, never stored (calculated from allocations)
- ✅ Goals never mutate account balances
- ✅ Ledger entries exist for every contribution
- ✅ Goals track allocations, not account balances
- ✅ Multiple goals can share one account

All forbidden patterns eliminated:
- ❌ Treating account balance as goal balance
- ❌ Creating goal-only transactions
- ❌ Symbolic or non-ledger goal movements
- ❌ Goals without deadlines

---

## Architecture Decision Record

**Decision:** Implement virtual goal accounts via goal_allocations table

**Context:** P1-3 implementation incorrectly used entire account balance for goal progress, breaking multi-goal scenarios

**Consequences:**
- ✅ Supports multiple goals per account
- ✅ Maintains ledger-first architecture
- ✅ Enables accurate forecasting and reminders
- ✅ Scales without balance duplication
- ⚠️ Requires data migration for existing goals
- ⚠️ Additional table join for goal balance calculation (minimal performance impact)

**Status:** Implemented and ready for testing

---

**Last Updated:** January 2, 2026
**Author:** Claude Sonnet 4.5
**Status:** Implementation complete, awaiting database migration and testing
