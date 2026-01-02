# 📊 End-to-End Income & Account Flow

Complete documentation of how income, expenses, and account balances work in KenyaPesa Tracker.

---

## Scenario 1: New Income to Empty Account

### Initial State
```
Account: M-Pesa Wallet
Balance: KES 0.00
```

### Step 1: Add Income (Gross Salary)
**You enter:**
- Gross Salary: 150,000
- Employer: ABC Company Ltd
- Custom Deduction (Car Loan): 20,000
- Deposit to: M-Pesa Wallet

**System calculates:**
```
Gross Salary:           150,000.00
- NSSF:                  -1,080.00
- Housing Levy (1.5%):   -2,250.00
- SHIF (2.75%):          -4,125.00
- PAYE (after relief):  -35,146.85
= After Statutory:      107,398.15
- Car Loan:             -20,000.00
= NET DEPOSITED:         87,398.15
```

### Database Writes

#### 1.1: `income` table
```sql
INSERT INTO income (
  user_id, account_id, amount, source, source_name,
  tax_amount, statutory_deductions, date
) VALUES (
  'user-123',
  'mpesa-account-id',
  150000.00,           -- GROSS amount stored
  'salary',
  'ABC Company Ltd',
  35146.85,            -- Tax
  7455.00,             -- NSSF + Housing + SHIF
  '2025-12-28'
)
-- Returns: income_id = 'income-abc'
```

#### 1.2: `custom_deductions` table
```sql
INSERT INTO custom_deductions (
  user_id, income_id, deduction_type, deduction_name, amount
) VALUES (
  'user-123',
  'income-abc',
  'car_loan',
  'Car Loan',
  20000.00
)
```

#### 1.3: `account_transactions` table (THE LEDGER)
```sql
INSERT INTO account_transactions (
  user_id,
  to_account_id,        -- Money flows IN
  transaction_type,
  amount,               -- NET amount (after ALL deductions)
  date,
  category,
  description,
  reference_id,
  reference_type
) VALUES (
  'user-123',
  'mpesa-account-id',
  'income',
  87398.15,             -- ✅ NET AMOUNT DEPOSITED
  '2025-12-28',
  'salary',
  'Salary from ABC Company Ltd',
  'income-abc',
  'income'
)
-- Returns: transaction_id = 'tx-001'
```

#### 1.4: Database Trigger Updates Account Balance
```sql
-- AUTOMATIC TRIGGER: update_account_balance_on_transaction()
UPDATE accounts
SET current_balance = current_balance + 87398.15
WHERE id = 'mpesa-account-id';

-- Result: 0.00 + 87398.15 = 87,398.15
```

### Final State After Income
```
Account: M-Pesa Wallet
Balance: KES 87,398.15 ✅

Account History:
┌─────────────┬──────────────────────────────────┬───────────┬─────────────┐
│ Date        │ Description                      │ Type      │ Amount      │
├─────────────┼──────────────────────────────────┼───────────┼─────────────┤
│ 2025-12-28  │ Salary from ABC Company Ltd      │ Income    │ +87,398.15  │
└─────────────┴──────────────────────────────────┴───────────┴─────────────┘
```

---

## Scenario 2: Expense from Account with Balance

### Current State
```
Account: M-Pesa Wallet
Balance: KES 87,398.15
```

### Step 2: Pay Rent Expense
**You enter:**
- Amount: 12,000
- Category: Rent
- From Account: M-Pesa Wallet
- Date: 2025-12-28

**System calculates M-Pesa transaction fee:**
```
Expense Amount:     12,000.00
M-Pesa Fee (Send):      33.00  (calculated from kenyaTransactionFees.js)
Total Deducted:     12,033.00
```

### Database Writes

#### 2.1: `expenses` table
```sql
INSERT INTO expenses (
  user_id, account_id, amount, category, description, date
) VALUES (
  'user-123',
  'mpesa-account-id',
  12000.00,
  'Rent',
  'Monthly rent payment',
  '2025-12-28'
)
-- Returns: expense_id = 'expense-xyz'
```

#### 2.2: `account_transactions` table - EXPENSE
```sql
INSERT INTO account_transactions (
  user_id,
  from_account_id,      -- Money flows OUT
  transaction_type,
  amount,
  date,
  category,
  description,
  reference_id,
  reference_type
) VALUES (
  'user-123',
  'mpesa-account-id',
  'expense',
  12000.00,             -- Expense amount
  '2025-12-28',
  'Rent',
  'Monthly rent payment',
  'expense-xyz',
  'expense'
)
-- Returns: transaction_id = 'tx-002'
```

#### 2.3: `account_transactions` table - TRANSACTION FEE
```sql
INSERT INTO account_transactions (
  user_id,
  from_account_id,      -- Money flows OUT
  transaction_type,
  amount,
  date,
  category,
  description,
  reference_id,
  reference_type
) VALUES (
  'user-123',
  'mpesa-account-id',
  'transaction_fee',
  33.00,                -- M-Pesa fee
  '2025-12-28',
  'M-Pesa Send Fee',
  'Transaction fee for expense',
  'expense-xyz',
  'expense'
)
-- Returns: transaction_id = 'tx-003'
```

#### 2.4: Database Trigger Updates Account Balance (TWICE)
```sql
-- AUTOMATIC TRIGGER fires for tx-002 (expense)
UPDATE accounts
SET current_balance = current_balance - 12000.00
WHERE id = 'mpesa-account-id';
-- Result: 87,398.15 - 12,000.00 = 75,398.15

-- AUTOMATIC TRIGGER fires for tx-003 (fee)
UPDATE accounts
SET current_balance = current_balance - 33.00
WHERE id = 'mpesa-account-id';
-- Result: 75,398.15 - 33.00 = 75,365.15
```

### Final State After Expense
```
Account: M-Pesa Wallet
Balance: KES 75,365.15 ✅

Account History:
┌─────────────┬──────────────────────────────────┬───────────────┬─────────────┐
│ Date        │ Description                      │ Type          │ Amount      │
├─────────────┼──────────────────────────────────┼───────────────┼─────────────┤
│ 2025-12-28  │ Salary from ABC Company Ltd      │ Income        │ +87,398.15  │
│ 2025-12-28  │ Monthly rent payment             │ Expense       │ -12,000.00  │
│ 2025-12-28  │ Transaction fee for expense      │ Transaction Fee│    -33.00  │
└─────────────┴──────────────────────────────────┴───────────────┴─────────────┘
```

---

## Scenario 3: Income Reversal (Immutability Pattern)

### Current State
```
Account: M-Pesa Wallet
Balance: KES 75,365.15

income table: income-abc (is_reversed = false)
account_transactions: tx-001 (income, +87,398.15)
```

### Step 3: Reverse the Income
**You click "Reverse" on the income entry**
- Reason: "Duplicate entry - salary was recorded twice"

### Database Writes

#### 3.1: `income` table - Mark as Reversed
```sql
UPDATE income
SET
  is_reversed = true,
  reversal_reason = 'Duplicate entry - salary was recorded twice',
  reversed_at = '2025-12-28T14:30:00Z'
WHERE id = 'income-abc'
AND user_id = 'user-123';

-- ❗ IMPORTANT: Original income record is NOT deleted (immutability)
```

#### 3.2: `account_transactions` table - REVERSAL TRANSACTION
```sql
INSERT INTO account_transactions (
  user_id,
  from_account_id,      -- Money flows OUT (reversing the deposit)
  transaction_type,
  amount,               -- SAME NET amount as original income deposit
  date,
  category,
  description,
  reference_id,
  reference_type
) VALUES (
  'user-123',
  'mpesa-account-id',
  'reversal',           -- ✅ Transaction type = 'reversal'
  87398.15,             -- ✅ Full NET amount that was deposited (NOT GROSS!)
  '2025-12-28',
  'salary',
  'Reversal: ABC Company Ltd - Duplicate entry - salary was recorded twice',
  'income-abc',         -- Links back to original income
  'income_reversal'     -- ✅ Reference type identifies what's reversed
)
-- Returns: transaction_id = 'tx-004'
```

#### 3.3: Database Trigger Updates Account Balance
```sql
-- AUTOMATIC TRIGGER fires for tx-004
UPDATE accounts
SET current_balance = current_balance - 87398.15
WHERE id = 'mpesa-account-id';

-- Result: 75,365.15 - 87,398.15 = -12,032.85 (NEGATIVE!)
```

### Final State After Income Reversal
```
Account: M-Pesa Wallet
Balance: KES -12,032.85 ⚠️ (NEGATIVE - you're in the red!)

Account History:
┌─────────────┬──────────────────────────────────┬───────────────┬─────────────┐
│ Date        │ Description                      │ Type          │ Amount      │
├─────────────┼──────────────────────────────────┼───────────────┼─────────────┤
│ 2025-12-28  │ Salary from ABC Company Ltd      │ Income        │ +87,398.15  │
│             │ [REVERSED]                       │               │ (struck out)│
│ 2025-12-28  │ Monthly rent payment             │ Expense       │ -12,000.00  │
│ 2025-12-28  │ Transaction fee for expense      │ Transaction Fee│    -33.00  │
│ 2025-12-28  │ Reversal: ABC Company Ltd        │ Reversal      │ -87,398.15  │
│             │ - Duplicate entry                │               │             │
└─────────────┴──────────────────────────────────┴───────────────┴─────────────┘

Income List (in Income page):
┌────────────────────────────────────┬────────────┬────────────┐
│ Income                             │ Status     │ Amount     │
├────────────────────────────────────┼────────────┼────────────┤
│ Salary from ABC Company Ltd        │ REVERSED   │ 87,398.15  │
│ 2025-12-28                         │ ⚠️         │ (struck)   │
└────────────────────────────────────┴────────────┴────────────┘
```

**Why Negative Balance?**
You spent 12,033 (rent + fee) from money you thought you had, but when you reversed the income, that money never existed!

---

## Scenario 4: Expense Reversal

### Current State
```
Account: M-Pesa Wallet
Balance: KES -12,032.85
```

### Step 4: Reverse the Rent Expense
**You realize the rent payment was wrong**
- Reason: "Paid to wrong account, will re-do"

### Database Writes

#### 4.1: `expenses` table - Mark as Reversed
```sql
UPDATE expenses
SET
  is_reversed = true,
  reversal_reason = 'Paid to wrong account, will re-do',
  reversed_at = '2025-12-28T15:00:00Z'
WHERE id = 'expense-xyz'
AND user_id = 'user-123';
```

#### 4.2: `account_transactions` table - REVERSAL TRANSACTION
```sql
INSERT INTO account_transactions (
  user_id,
  to_account_id,        -- Money flows IN (reversing the debit)
  transaction_type,
  amount,
  date,
  category,
  description,
  reference_id,
  reference_type
) VALUES (
  'user-123',
  'mpesa-account-id',
  'reversal',
  12100.00,             -- ✅ Expense + Fee (both reversed)
  '2025-12-28',
  'Rent',
  'Reversal: Monthly rent payment - Paid to wrong account, will re-do',
  'expense-xyz',
  'expense_reversal'
)
-- Returns: transaction_id = 'tx-005'
```

**⚠️ DESIGN DECISION:** Transaction fees ARE reversed with the expense.

**Reasoning:**
- If the expense was wrong (wrong account, wrong amount, duplicate), the fee associated with it should also be reversed
- User gets back both the expense amount AND the fee
- This is different from real-world M-Pesa (you can't get fees back), but necessary for data integrity

#### 4.3: Database Trigger Updates Account Balance
```sql
-- AUTOMATIC TRIGGER fires for tx-005
UPDATE accounts
SET current_balance = current_balance + 12100.00
WHERE id = 'mpesa-account-id';

-- Result: -12,032.85 + 12,100.00 = 67.15
```

### Final State After Expense Reversal
```
Account: M-Pesa Wallet
Balance: KES 67.15 ✅

Account History:
┌─────────────┬──────────────────────────────────┬───────────────┬─────────────┐
│ Date        │ Description                      │ Type          │ Amount      │
├─────────────┼──────────────────────────────────┼───────────────┼─────────────┤
│ 2025-12-28  │ Salary from ABC Company Ltd      │ Income        │ +87,398.15  │
│             │ [REVERSED]                       │               │ (struck out)│
│ 2025-12-28  │ Monthly rent payment             │ Expense       │ -12,000.00  │
│             │ [REVERSED]                       │               │ (struck out)│
│ 2025-12-28  │ Transaction fee for expense      │ Transaction Fee│    -33.00  │
│             │ [REVERSED]                       │               │ (struck out)│
│ 2025-12-28  │ Reversal: ABC Company Ltd        │ Reversal      │ -87,398.15  │
│ 2025-12-28  │ Reversal: Monthly rent payment   │ Reversal      │ +12,100.00  │
└─────────────┴──────────────────────────────────┴───────────────┴─────────────┘
```

---

## 🔍 Key Audit Features

### 1. **Immutability**
- Original records NEVER deleted
- Reversals create NEW transactions
- Full audit trail maintained

### 2. **Account Balance Calculation**
```sql
-- Real-time balance derivation from ledger
SELECT
  SUM(CASE WHEN to_account_id = 'mpesa-account-id' THEN amount ELSE 0 END) -
  SUM(CASE WHEN from_account_id = 'mpesa-account-id' THEN amount ELSE 0 END)
FROM account_transactions
WHERE (to_account_id = 'mpesa-account-id' OR from_account_id = 'mpesa-account-id')
  AND user_id = 'user-123';

-- This should ALWAYS equal accounts.current_balance
```

### 3. **Reports Exclude Reversed Items**
```sql
-- Income totals (exclude reversed)
SELECT SUM(amount)
FROM income
WHERE user_id = 'user-123'
  AND is_reversed = false  -- ✅ Only non-reversed income
  AND date BETWEEN '2025-12-01' AND '2025-12-31';

-- Expense totals (exclude reversed + get NET from ledger)
SELECT SUM(amount)
FROM account_transactions
WHERE user_id = 'user-123'
  AND transaction_type IN ('expense', 'transaction_fee')
  AND reference_id NOT IN (
    SELECT id FROM expenses WHERE is_reversed = true
  );
```

---

## ✅ What Should Work Correctly

1. **Income deposits NET amount** (gross - all deductions)
2. **Account balance updates** via database trigger
3. **Expenses deduct from account** (including M-Pesa fees)
4. **Reversals create opposing transactions** (not deletions)
5. **Account history shows all transactions** (including reversed ones with strikethrough)
6. **Reports exclude reversed transactions** from totals
7. **Balance = Sum of ledger transactions** (always reconcilable)
8. **Income reversal debits NET amount** (not gross)
9. **Expense reversal credits expense + fee**

---

## 📐 Transaction Fee Reversal Policy

**Current Implementation:** Fees ARE reversed with expenses

**Rationale:**
- Data integrity: If an expense is wrong, its fee is also wrong
- User expectation: "I want to undo this transaction completely"
- Alternative would be inconsistent ledger state

**Future Consideration:** Could add option to reverse expense but keep fee if needed

---

## 🔢 Key Formulas

### Income Net Calculation
```
Net Deposited = Gross Salary
                - NSSF
                - Housing Levy
                - SHIF
                - PAYE (after personal relief)
                - Custom Deductions (SACCO, loans, etc.)
```

### Account Balance
```
Balance = SUM(credits) - SUM(debits)

Credits (to_account_id):
  - Income transactions
  - Expense reversals
  - Transfer in

Debits (from_account_id):
  - Expense transactions
  - Transaction fees
  - Income reversals
  - Transfer out
```

### Net Worth Impact
```
Net Worth = Assets - Liabilities

Income increases assets (account balance goes up)
Income reversal decreases assets (account balance goes down)
Expense decreases assets (account balance goes down)
Expense reversal increases assets (account balance goes up)
```

---

## 🎯 Golden Rules

1. **Accounts hold money** - Physical/virtual storage
2. **Goals reserve money** - Intent, not storage (they observe accounts)
3. **Ledger is source of truth** - `account_transactions` table
4. **Income stores GROSS** - But deposits NET to account
5. **Reversals use NET** - Reverse what was actually deposited/withdrawn
6. **Never delete** - Mark as reversed, create reversal transaction
7. **Balance equals ledger sum** - Always reconcilable
