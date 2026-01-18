# Payroll Deduction Integration - TODO List

## Completed Tasks

- [x] **Add RENT deduction type**
  - Added `RENT: 'rent'` to `DEDUCTION_TYPES`
  - Added entry in `getDeductionTypes()` with label "Rent Deduction"
  - File: `src/utils/incomeService.js`

- [x] **Add deduction-to-category mapping**
  - Created `DEDUCTION_TO_CATEGORY_MAP` static property
  - Maps deduction types to expense category slugs
  - File: `src/utils/incomeService.js`

- [x] **Add helper methods**
  - `getCategorySlugForDeduction(type)` - Get category slug
  - `canMapToExpense(type)` - Check if mappable
  - `getDeductionCategoryInfo(type)` - Get category display info
  - File: `src/utils/incomeService.js`

- [x] **Add createDeductionExpense method**
  - Creates expense record from deduction
  - Sets `account_id = NULL` to avoid double deduction
  - Sets `payment_method = 'salary_deduction'`
  - File: `src/utils/incomeService.js`

- [x] **Add createDeductionReminder method**
  - Creates recurring_transactions entry with `kind = 'bill'`
  - Calculates next_date based on frequency
  - Sets `auto_add = false` (since already deducted)
  - File: `src/utils/incomeService.js`

- [x] **Add processDeductionIntegrations method**
  - Orchestrates expense and reminder creation
  - Filters deductions with integration flags
  - File: `src/utils/incomeService.js`

- [x] **Update createIncome method**
  - Calls `processDeductionIntegrations` after saving deductions
  - Only processes deductions with `create_expense` or `create_reminder` flags
  - File: `src/utils/incomeService.js`

- [x] **Update Income.jsx UI**
  - Added "Record as expense" checkbox (for mappable types)
  - Shows target category when checked
  - Added "Add to bill reminders" checkbox (when recurring)
  - Updated `addCustomDeduction` to include new fields
  - File: `src/pages/Income.jsx`

- [x] **Add SACCO account integration**
  - Added `getSaccoAccounts()` method to fetch user's SACCO accounts
  - Added `transferToSaccoAccount()` method to create account transaction
  - Added SACCO account dropdown in deduction form (when type is 'sacco')
  - Shows current balance and preview of amount to be added
  - Tip shown if no SACCO accounts exist
  - Files: `src/utils/incomeService.js`, `src/pages/Income.jsx`

## Testing Tasks (Manual)

- [ ] **Test SACCO deduction with expense**
  1. Go to Income page
  2. Add new income with gross salary
  3. Add SACCO deduction with "Record as expense" checked
  4. Submit income
  5. Check Expenses page - should see SACCO under Financial > Investments
  6. Check account balance - should NOT be affected by expense

- [ ] **Test HELB loan with reminder**
  1. Add income with HELB Loan deduction
  2. Check "Recurring deduction"
  3. Check "Add to bill reminders"
  4. Submit income
  5. Go to Reminders page
  6. Verify HELB Loan appears as a Bill reminder

- [ ] **Test Rent deduction**
  1. Add income with Rent deduction
  2. Check "Record as expense"
  3. Submit
  4. Verify expense under Housing > Rent or Mortgage

- [ ] **Test net calculation**
  1. Gross = 100,000
  2. Add SACCO = 5,000, Rent = 3,000
  3. Verify net calculation shows correct amount
  4. Verify account receives NET amount only

- [ ] **Test non-mappable types**
  1. Add deduction with type "Savings" or "Other"
  2. Verify "Record as expense" checkbox is NOT shown

- [ ] **Test SACCO account linking**
  1. Create a SACCO account on Accounts page (e.g., "Stima SACCO")
  2. Go to Income page, add income with SACCO deduction
  3. Select the SACCO account from dropdown
  4. Submit income
  5. Verify SACCO account balance increased by deduction amount
  6. Check account_transactions table for 'sacco_contribution' entry

- [ ] **Test SACCO without account**
  1. Add SACCO deduction when no SACCO accounts exist
  2. Verify tip message is shown ("Create a SACCO account...")

## Future Enhancements (Backlog)

- [ ] Bulk apply integration settings to all deductions
- [ ] Save deduction templates for quick reuse
- [ ] Deduction summary reports
- [ ] Link reminders to loan balance tracking
- [ ] Auto-suggest common deduction amounts based on history
