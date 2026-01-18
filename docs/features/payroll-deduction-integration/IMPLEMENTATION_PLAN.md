# Payroll Deduction Integration with Expenses and Reminders

## Overview

This feature integrates payroll deductions (SACCO, Loans, Rent) from the PAYE Calculator with:
1. **Expense tracking** - Optional recording of deductions as expenses under appropriate categories
2. **Bill reminders** - Optional recurring bill reminders for monthly deduction tracking

## Problem Statement

Employees have deductions beyond statutory ones (PAYE, NSSF, SHIF, Housing Levy):
- SACCO contributions
- Loan repayments (HELB, Car Loans, Personal Loans)
- Rent deductions (employer-deducted housing)
- Insurance premiums
- Retirement contributions

Previously, these deductions were tracked on the income side but not integrated with:
- The expense reporting system
- The reminders/bills system

## Solution Architecture

### Key Design Decision: Avoiding Double Deductions

**Critical**: When a deduction creates an expense record, it must NOT affect account balances.

**Why?**
- When you receive salary, the NET amount (after all deductions) is deposited
- The deductions (SACCO, Rent, etc.) are already removed from your pay
- Creating an expense should NOT deduct again from your account

**Implementation**:
- Expense records created from deductions have `account_id = NULL`
- This means: expense is recorded for tracking/reporting, but no account balance changes
- Payment method is set to `salary_deduction` to indicate it's already deducted

### Example Flow

```
Gross Salary:           KES 100,000
Statutory Deductions:
  - NSSF:               KES   1,080
  - Housing Levy:       KES   1,500
  - SHIF:               KES   2,750
  - PAYE:               KES  16,925
                        -----------
                        KES  22,255

Custom Deductions:
  - SACCO:              KES   5,000  [checkbox: record as expense]
  - HELB Loan:          KES   3,500  [checkbox: record as expense + reminder]
  - Rent:               KES  15,000  [checkbox: record as expense]
                        -----------
                        KES  23,500

Net Deposited:          KES  54,245  --> This is what hits your bank account
```

**What happens:**
1. Income record created with gross = 100,000
2. Account transaction created for NET = 54,245 (deposited to account)
3. Expense records created for SACCO (5,000), HELB (3,500), Rent (15,000) - NO account impact
4. Bill reminder created for HELB Loan (recurring monthly)

## Implementation Details

### 1. New Deduction Type: Rent

Added `RENT: 'rent'` to `IncomeService.DEDUCTION_TYPES` for employer-deducted rent payments.

### 2. Deduction-to-Category Mapping

```javascript
static DEDUCTION_TO_CATEGORY_MAP = {
  sacco: 'investments',           // Financial > Investments (SACCO)
  helb_loan: 'loan-repayments',   // Financial > Loan Repayments
  car_loan: 'loan-repayments',    // Financial > Loan Repayments
  personal_loan: 'loan-repayments', // Financial > Loan Repayments
  mortgage: 'rent-mortgage',      // Housing > Rent or Mortgage
  rent: 'rent-mortgage',          // Housing > Rent or Mortgage
  insurance: 'home-insurance',    // Housing > Home Insurance
  retirement: 'retirement'        // Financial > Retirement Contributions
}
```

Non-mappable types (savings, investment, welfare, union_dues, other) don't show the expense checkbox.

### 3. New Methods in IncomeService

| Method | Purpose |
|--------|---------|
| `getCategorySlugForDeduction(type)` | Returns category slug for a deduction type |
| `canMapToExpense(type)` | Returns true if deduction type can be mapped |
| `getDeductionCategoryInfo(type)` | Returns category display info for UI |
| `createDeductionExpense(deduction, date, accountId)` | Creates expense record (no account impact) |
| `createDeductionReminder(deduction, startDate)` | Creates recurring bill reminder |
| `processDeductionIntegrations(deductions, incomeId, date, accountId)` | Processes all deduction integrations |

### 4. UI Changes in Income.jsx

Each deduction now shows:
- **"Recurring deduction"** checkbox (existing)
- **"Record as expense"** checkbox (new) - Only shown for mappable types
  - Shows target category when checked (e.g., "→ Financial > Loan Repayments")
- **"Add to bill reminders"** checkbox (new) - Only shown when recurring is checked

### 5. Data Flow

```
User adds income with deductions
        │
        ▼
┌───────────────────────────┐
│ createIncome()            │
│  1. Create income record  │
│  2. Create custom_deduc-  │
│     tions records         │
│  3. Process integrations: │
│     - Create expenses     │
│       (no account_id)     │
│     - Create reminders    │
│  4. Create account_trans- │
│     action (NET amount)   │
└───────────────────────────┘
```

## Files Modified

| File | Changes |
|------|---------|
| `src/utils/incomeService.js` | Added RENT type, category mapping, integration methods |
| `src/pages/Income.jsx` | Added expense/reminder checkboxes in deduction form |

## Database Tables Affected

| Table | Action |
|-------|--------|
| `income` | Income record (unchanged) |
| `custom_deductions` | Deduction records (unchanged) |
| `expenses` | New expense records with `account_id = NULL` |
| `recurring_transactions` | New bill reminders with `kind = 'bill'` |
| `account_transactions` | Only NET amount deposited (unchanged) |

## User Requirements (Confirmed)

| Requirement | Decision |
|-------------|----------|
| Auto-create expense? | Ask each time (checkbox per deduction) |
| Add to reminders? | Yes, show as Bill reminders |
| Rent type? | Support both payroll deduction AND separate bill |

## Testing Checklist

- [ ] Add income with SACCO deduction, check "record as expense"
  - [ ] Verify expense appears in Expenses page under Financial > Investments
  - [ ] Verify account balance NOT affected by expense
- [ ] Add income with HELB Loan, check "recurring" + "add to reminders"
  - [ ] Verify bill reminder appears in Reminders page
  - [ ] Verify next_date is one month from income date
- [ ] Add income with Rent deduction
  - [ ] Verify maps to Housing > Rent or Mortgage category
- [ ] Verify net calculation: Gross - Statutory - Custom = Net deposited
- [ ] Verify existing income flow (without integrations) still works

## SACCO Account Integration

### Feature: Link SACCO Deductions to SACCO Accounts

When a user adds a SACCO deduction, they can optionally link it to a SACCO account created in the Accounts page. This allows the deduction amount to:
1. Reduce net salary (as before)
2. **Increase the linked SACCO account balance**

### How It Works

```
Salary received: KES 100,000
SACCO deduction: KES 5,000 → Linked to "Stima SACCO" account
Net deposited: KES 95,000 (to bank account)
SACCO balance: +KES 5,000 (increases)
```

### Implementation

1. **UI**: When deduction_type is 'sacco', a dropdown shows user's SACCO accounts
2. **Backend**: If sacco_account_id is set, creates an account_transaction:
   - `to_account_id`: The SACCO account
   - `transaction_type`: 'sacco_contribution'
   - `amount`: Deduction amount
   - This triggers the database balance update via trigger

### Methods Added

| Method | Purpose |
|--------|---------|
| `getSaccoAccounts()` | Fetches user's SACCO accounts for dropdown |
| `transferToSaccoAccount()` | Creates account_transaction to increase SACCO balance |

### Database Impact

| Table | Action |
|-------|--------|
| `accounts` | SACCO account balance increases |
| `account_transactions` | New transaction with type 'sacco_contribution' |

---

## Future Enhancements

1. **Bulk operations**: Apply same integration settings to all deductions of same type
2. **Templates**: Save deduction configurations for reuse
3. **Reports**: Deduction summary by type over time
4. **Reminder notes**: Auto-include loan balance tracking
5. **Loan accounts**: Similar linking for loan repayments to track loan balance decreases
