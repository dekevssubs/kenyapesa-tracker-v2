# Accounts System - End-to-End Testing Checklist

## Pre-Testing Setup

### ✅ Database Migrations
- [ ] Run `007_accounts_foundation.sql` in Supabase SQL Editor
- [ ] Verify tables created: `accounts`, `account_transactions`, `investment_returns`
- [ ] Check database functions exist: `update_account_balance_on_transaction`
- [ ] Verify RLS policies are enabled on all new tables

### ✅ Application Setup
- [ ] All files are present in the codebase
- [ ] No console errors on app startup
- [ ] Navigation to `/accounts` works without errors

---

## Test Suite 1: Navigation & UI

### Test 1.1: Accounts Navigation
- [ ] Open the application
- [ ] Verify "Accounts" appears in sidebar navigation with Wallet icon
- [ ] Click on "Accounts" - should navigate to `/accounts`
- [ ] Page loads without errors
- [ ] Header shows "Accounts" as current page

### Test 1.2: Accounts Page Layout
- [ ] Page shows header: "Accounts"
- [ ] Summary cards display:
  - Total Net Worth
  - Liquid Cash
  - Investments
  - Virtual Accounts
- [ ] All summary cards show "0" for new users (or migration data for existing users)
- [ ] Quick Actions section shows 3 buttons:
  - Add New Account
  - Transfer Money (disabled if < 2 accounts)
  - Record Investment Return (disabled if no investment accounts)
- [ ] Filter section shows: All, Cash, Investments, Virtual
- [ ] Accounts list is empty or shows migrated accounts

---

## Test Suite 2: Add Account Modal

### Test 2.1: Opening Modal
- [ ] Click "Add New Account" button
- [ ] Modal opens with animation
- [ ] Shows "Add New Account" header
- [ ] Step 1: Select Type is displayed

### Test 2.2: Preset Selection - Cash Accounts
- [ ] Search bar is visible
- [ ] "Cash Accounts" category shows:
  - M-Pesa (Safaricom)
  - Airtel Money
  - T-Kash (Telkom)
  - KCB Bank
  - Equity Bank
  - Cooperative Bank
  - NCBA Bank
  - Standard Chartered
  - Absa Bank
- [ ] Click on "M-Pesa" preset
- [ ] Modal advances to Step 2
- [ ] Form is pre-filled with:
  - Name: "M-Pesa"
  - Account Type: "Cash Account"
  - Category: "mpesa"
  - Institution: "Safaricom"

### Test 2.3: Preset Selection - Money Market Funds
- [ ] Go back to Step 1
- [ ] "Money Market Funds" category shows:
  - CIC Money Market Fund
  - NCBA Money Market Fund
  - Sanlam Money Market Fund
  - Zimele Money Market Fund
  - GenCapMM Money Market Fund
  - Apollo MMF
  - Old Mutual MMF
- [ ] Each shows typical rate (e.g., "12.5% p.a.")
- [ ] Click on "CIC Money Market Fund"
- [ ] Form is pre-filled with:
  - Name: "CIC Money Market Fund"
  - Account Type: "Investment Account"
  - Interest Rate: "13.2" (or current rate)
  - Institution: "CIC Asset Management"

### Test 2.4: Preset Selection - Saccos
- [ ] "Saccos" category shows:
  - Stima Sacco
  - Kenya Police Sacco
  - Mwalimu National Sacco
  - Afya Sacco
  - Unaitas Sacco
  - Safaricom Sacco
  - Tower Sacco
  - Harambee Sacco
- [ ] Each shows typical dividend rate
- [ ] Select any Sacco
- [ ] Verify pre-fill works correctly

### Test 2.5: Preset Selection - Government Securities
- [ ] "Government Securities" category shows:
  - Treasury Bills (91-day, 182-day, 364-day)
  - Treasury Bonds (2-year, 5-year, 10-year, 20-year)
  - M-Akiba Bond
- [ ] Each shows typical rate and minimum investment
- [ ] Select "M-Akiba Bond"
- [ ] Verify form shows min investment info

### Test 2.6: Preset Selection - Stocks & REITs
- [ ] "Stocks & REITs" category shows both:
  - Stocks: Safaricom, Equity Group, KCB, EABL, BAT
  - REITs: Fahari I-REIT, Acorn I-REIT, Acorn D-REIT
- [ ] Select any stock/REIT
- [ ] Verify pre-fill works

### Test 2.7: Search Functionality
- [ ] Type "CIC" in search bar
- [ ] Only CIC-related presets appear
- [ ] Type "Sacco" in search bar
- [ ] All Saccos appear
- [ ] Clear search
- [ ] All categories reappear

### Test 2.8: Custom Account
- [ ] Click "Create Custom Account" at bottom
- [ ] Modal advances to Step 2
- [ ] Form is blank (no pre-fill)
- [ ] All fields are editable

### Test 2.9: Form Submission - Success
- [ ] Fill in all required fields:
  - Account Name: "Test Account"
  - Account Type: "Cash Account"
  - Category: "mpesa"
  - Current Balance: "10000"
- [ ] Click "Add Account"
- [ ] Modal closes
- [ ] Success toast appears: "Test Account added successfully!"
- [ ] Account appears in accounts list
- [ ] Summary cards update to show new balance

### Test 2.10: Form Validation
- [ ] Open Add Account modal
- [ ] Select a preset
- [ ] Clear the Account Name field
- [ ] Try to submit
- [ ] Browser validation prevents submission
- [ ] Error message shows "Please fill out this field"

### Test 2.11: Modal Close
- [ ] Open Add Account modal
- [ ] Click X button in top-right
- [ ] Modal closes without saving
- [ ] Click "Add New Account" again
- [ ] Modal state is reset (back to Step 1)

---

## Test Suite 3: Account Display

### Test 3.1: Account Card Display
After creating an account:
- [ ] Account card shows in grid layout
- [ ] Card displays:
  - Account icon (correct for category)
  - Gradient color (green for cash, blue for investment, purple for virtual)
  - Account name
  - Institution name (if provided)
  - Current balance (formatted as KES X,XXX.XX)
  - Interest rate (if investment account)
  - Last 4 digits of account number (if provided)
  - "Primary" badge (if is_primary = true)

### Test 3.2: Balance Visibility Toggle
- [ ] Click "Hide Balances" button in header
- [ ] All balances show as "••••••"
- [ ] Button changes to "Show Balances"
- [ ] Click "Show Balances"
- [ ] Balances reappear

### Test 3.3: Account Filtering
- [ ] Create accounts of different types (cash, investment, virtual)
- [ ] Click "Cash" filter
- [ ] Only cash accounts appear
- [ ] Filter count shows correct number
- [ ] Click "Investments" filter
- [ ] Only investment accounts appear
- [ ] Click "Virtual" filter
- [ ] Only virtual accounts appear
- [ ] Click "All" filter
- [ ] All accounts reappear

---

## Test Suite 4: Transfer Money Modal

### Test 4.1: Opening Modal - Disabled State
- [ ] With 0 accounts: "Transfer Money" button is disabled
- [ ] With 1 account: "Transfer Money" button is disabled
- [ ] Tooltip or cursor shows button is disabled

### Test 4.2: Opening Modal - Enabled State
- [ ] Create 2+ accounts
- [ ] "Transfer Money" button is enabled
- [ ] Click button
- [ ] Modal opens
- [ ] Shows "Transfer Money" header

### Test 4.3: Source Account Selection
- [ ] "From Account" dropdown shows only accounts with balance > 0
- [ ] Dropdown shows: "Account Name - KES X,XXX.XX available"
- [ ] Select an account
- [ ] Blue info box appears showing:
  - Available balance
  - Institution name (if any)

### Test 4.4: Destination Account Selection
- [ ] "To Account" dropdown is disabled until "From Account" selected
- [ ] After selecting source, "To Account" is enabled
- [ ] "To Account" dropdown excludes selected "From Account"
- [ ] Shows all other accounts (including those with 0 balance)
- [ ] Select a destination account
- [ ] Green info box appears showing:
  - Current balance
  - Institution name

### Test 4.5: Amount Input
- [ ] Enter transfer amount
- [ ] "Remaining balance" helper text appears below
- [ ] Shows: "Remaining balance: KES X,XXX.XX"
- [ ] Amount updates in real-time as you type

### Test 4.6: Transfer Summary
- [ ] With source, destination, and amount filled
- [ ] Summary card appears showing:
  - From: [Source Account Name]
  - To: [Destination Account Name]
  - Amount: [Transfer Amount]

### Test 4.7: Validation - Insufficient Balance
- [ ] Select source account with balance 1000
- [ ] Enter amount 1500
- [ ] Click "Transfer Money"
- [ ] Alert shows: "Insufficient balance in source account"
- [ ] Transfer does not proceed

### Test 4.8: Validation - Same Account
- [ ] This should be impossible (destination excludes source)
- [ ] Verify dropdown filtering works correctly

### Test 4.9: Successful Transfer
- [ ] Select source account with 5000 balance
- [ ] Select destination account with 2000 balance
- [ ] Enter amount 1000
- [ ] Optionally add description: "Moving to savings"
- [ ] Click "Transfer Money"
- [ ] Modal closes
- [ ] Success toast: "Transferred KES 1,000.00 successfully!"
- [ ] Source account balance decreases by 1000 (now 4000)
- [ ] Destination account balance increases by 1000 (now 3000)
- [ ] Summary cards update correctly

### Test 4.10: Transfer Creates Transactions
In database or future transaction view:
- [ ] Source account has `transfer_out` transaction (-1000)
- [ ] Destination account has `transfer_in` transaction (+1000)
- [ ] Both transactions have same description
- [ ] Both transactions have same date (today)

---

## Test Suite 5: Record Investment Return Modal

### Test 5.1: Opening Modal - Disabled State
- [ ] With 0 investment accounts: Button is disabled
- [ ] Create only cash accounts: Button remains disabled
- [ ] Create 1 investment account: Button becomes enabled

### Test 5.2: Opening Modal - Enabled State
- [ ] Create at least 1 investment account
- [ ] Click "Record Investment Return"
- [ ] Modal opens
- [ ] Shows "Record Investment Return" header
- [ ] Subtitle: "Track interest, dividends, and capital gains"

### Test 5.3: Investment Account Selection
- [ ] "Investment Account" dropdown shows only accounts with type = 'investment'
- [ ] Each option shows:
  - Account name
  - Current balance
  - Interest rate (if set)
  - Format: "CIC MMF - KES 50,000.00 (13.2% p.a.)"
- [ ] Select an account
- [ ] Blue info box appears showing current balance and institution

### Test 5.4: Auto-Fill Interest Rate
- [ ] Select an account with interest_rate = 12.5
- [ ] Rate field auto-fills with "12.5"
- [ ] User can override if needed

### Test 5.5: Return Type Selection
- [ ] "Return Type" dropdown shows:
  - Interest
  - Dividend
  - Capital Gain
  - Capital Loss
  - Bonus
- [ ] Each has a description below dropdown
- [ ] Select "Interest"
- [ ] Description shows: "Interest earned on deposits (MMF, Savings, FD)"
- [ ] Select "Dividend"
- [ ] Description updates: "Dividends from Saccos, Stocks, REITs"

### Test 5.6: Amount Input - Interest/Dividend
- [ ] Select return type "Interest"
- [ ] Enter amount: 500
- [ ] Amount field accepts decimal (500.50)
- [ ] Helper text does not show for positive returns

### Test 5.7: Amount Input - Capital Loss
- [ ] Select return type "Capital Loss"
- [ ] Enter amount: 200 (as positive number)
- [ ] Helper text appears: "Enter as positive number (will be recorded as loss)"
- [ ] Text is in red color

### Test 5.8: Rate Field - Required for Interest/Dividend
- [ ] Select return type "Interest"
- [ ] Rate field shows: "Rate (% p.a.) *" (required)
- [ ] Try to submit without rate
- [ ] Validation prevents submission
- [ ] Select "Capital Gain"
- [ ] Rate field shows: "Rate (% p.a.)" (optional)

### Test 5.9: Period Fields - Conditional Display
- [ ] Select return type "Interest" or "Dividend"
- [ ] Period Start and Period End fields appear
- [ ] Both are optional
- [ ] Select "Capital Gain"
- [ ] Period fields do not appear

### Test 5.10: Date Received
- [ ] Field defaults to today's date
- [ ] Can select past dates
- [ ] Can select future dates (if needed for scheduled returns)

### Test 5.11: Notes Field
- [ ] Enter notes: "Monthly interest for December"
- [ ] Text area accepts multi-line input
- [ ] Field is optional

### Test 5.12: Return Summary - Interest
- [ ] Fill form with:
  - Account: CIC MMF (balance 50,000)
  - Type: Interest
  - Amount: 500
  - Rate: 13.2
  - Date: Today
- [ ] Summary card appears showing:
  - Account: CIC Money Market Fund
  - Type: Interest
  - Return Amount: +KES 500.00 (green)
  - New Balance: KES 50,500.00

### Test 5.13: Return Summary - Capital Loss
- [ ] Fill form with:
  - Account: Safaricom Stock (balance 10,000)
  - Type: Capital Loss
  - Amount: 1,000
- [ ] Summary card shows:
  - Return Amount: -KES 1,000.00 (red)
  - New Balance: KES 9,000.00

### Test 5.14: Successful Return Recording - Interest
- [ ] Complete form for interest return of 500
- [ ] Click "Record Return"
- [ ] Modal closes
- [ ] Success toast: "Interest of KES 500.00 recorded!"
- [ ] Account balance increases by 500
- [ ] Investment account updates in accounts list

### Test 5.15: Successful Return Recording - Capital Loss
- [ ] Complete form for capital loss of 1,000
- [ ] Click "Record Return"
- [ ] Success toast: "Capital Loss of KES 1,000.00 recorded!"
- [ ] Account balance decreases by 1,000
- [ ] Summary cards update

---

## Test Suite 6: Data Migration

### Test 6.1: Migration Status Check (New Users)
- [ ] Navigate to Settings page
- [ ] Scroll to "Data Migration" section
- [ ] Section appears after "Data Management"
- [ ] Shows purple icon (Database)
- [ ] Status shows "Migrate to Accounts System" (not complete)

### Test 6.2: Migration Status Check (Existing Users)
If user has existing income/expense data but no accounts:
- [ ] Message indicates migration is recommended
- [ ] Shows: "You have existing income and expense data..."

### Test 6.3: Migration Button State
- [ ] "Run Migration" button is visible
- [ ] Button is enabled
- [ ] Shows Database icon

### Test 6.4: Migration Confirmation
- [ ] Click "Run Migration"
- [ ] Browser confirmation dialog appears
- [ ] Message: "This will create a default account and backfill all your historical income and expense data. Continue?"
- [ ] Click "Cancel"
- [ ] Migration does not proceed
- [ ] Click "Run Migration" again
- [ ] Click "OK"
- [ ] Migration starts

### Test 6.5: Migration Progress
- [ ] Button changes to "Migrating..."
- [ ] Button shows spinning icon
- [ ] Button is disabled during migration
- [ ] Progress indicator appears below
- [ ] Message: "Migration in Progress... Please wait..."

### Test 6.6: Migration Success (With Historical Data)
Setup: User has 10 income records and 15 expense records
- [ ] Migration completes
- [ ] Success toast appears: "Migration completed! 25 records migrated successfully."
- [ ] Section UI changes to "Migration Complete" state
- [ ] Shows green checkmark icon
- [ ] Message: "Your historical data has been successfully migrated..."

### Test 6.7: Migration Summary Display
After successful migration:
- [ ] Summary card appears
- [ ] Shows:
  - Account Created: "Main Account (Auto-Created)"
  - Current Balance: Correct calculation (total income - total expenses)
  - Total Transactions: 25
  - Income Records: 10 (green)
  - Expense Records: 15 (red)
  - Date Range: [Earliest Date] - [Latest Date]

### Test 6.8: Migration Creates Account
- [ ] Navigate to Accounts page
- [ ] "Main Account (Auto-Created)" appears in accounts list
- [ ] Account details:
  - Type: Cash Account
  - Category: M-Pesa
  - Institution: M-Pesa
  - Primary: Yes (badge shows)
  - Balance: Sum of (income - expenses)

### Test 6.9: Migration Prevents Duplicates
- [ ] Try to run migration again
- [ ] Click "Run Migration" button (should still be visible for testing)
- [ ] Error toast: "Migration has already been completed"
- [ ] No duplicate account created
- [ ] No duplicate transactions created

### Test 6.10: Migration with No Data
Setup: User has no income or expense records
- [ ] Run migration
- [ ] Account is created
- [ ] Balance is 0
- [ ] No transactions created
- [ ] Summary shows 0 records migrated

---

## Test Suite 7: Database Integrity

### Test 7.1: Database Triggers (After Transfer)
- [ ] Open Supabase table editor
- [ ] Navigate to `account_transactions` table
- [ ] Filter by user_id
- [ ] Verify 2 transactions created for transfer:
  - One with type = 'transfer_out' (negative amount effect)
  - One with type = 'transfer_in' (positive amount effect)
- [ ] Check `accounts` table
- [ ] Verify balances updated correctly via trigger

### Test 7.2: Database Triggers (After Investment Return)
- [ ] Check `investment_returns` table
- [ ] Verify new record created with:
  - account_id
  - return_type
  - amount
  - rate (if provided)
  - period_start, period_end (if provided)
  - date
- [ ] Check `account_transactions` table
- [ ] Verify transaction created with type = 'investment_return'
- [ ] Check `accounts` table
- [ ] Balance increased by return amount

### Test 7.3: Row Level Security
- [ ] Log in as User A
- [ ] Create some accounts
- [ ] Log out
- [ ] Log in as User B
- [ ] Navigate to Accounts page
- [ ] User B cannot see User A's accounts
- [ ] User B can create their own accounts
- [ ] Check database policies are enforcing user isolation

### Test 7.4: Transaction History Integrity
- [ ] Check `account_transactions` table
- [ ] All transactions have:
  - user_id matching account owner
  - account_id exists in accounts table
  - transaction_type is valid enum value
  - amount > 0
  - date is valid
- [ ] Verify foreign keys prevent orphaned records

---

## Test Suite 8: UI/UX Polish

### Test 8.1: Responsive Design - Mobile
- [ ] Open app on mobile device or resize browser to 375px width
- [ ] Accounts page is fully responsive
- [ ] Summary cards stack vertically
- [ ] Account cards show 1 per row
- [ ] Modals are scrollable on small screens
- [ ] All buttons are touch-friendly
- [ ] No horizontal scrolling

### Test 8.2: Responsive Design - Tablet
- [ ] Resize browser to 768px width
- [ ] Summary cards show 2 per row
- [ ] Account cards show 2 per row
- [ ] Modals fit comfortably
- [ ] Filter buttons wrap nicely

### Test 8.3: Dark Mode (If Implemented)
- [ ] Toggle dark mode in settings
- [ ] Accounts page adapts to dark theme
- [ ] Modal backgrounds are dark
- [ ] Text is readable
- [ ] Colors still convey meaning (green=income, red=expense)

### Test 8.4: Loading States
- [ ] Refresh Accounts page
- [ ] Loading spinner appears while fetching accounts
- [ ] Page doesn't jump when data loads
- [ ] No "flash of unstyled content"

### Test 8.5: Empty States
- [ ] With 0 accounts created:
  - [ ] Empty state message appears
  - [ ] Wallet icon shown (large, gray)
  - [ ] Message: "No accounts yet"
  - [ ] "Add Your First Account" button appears
- [ ] With accounts but filter shows none:
  - [ ] Message: "No accounts match your filter"
  - [ ] No "Add Account" button (just change filter)

### Test 8.6: Icon Consistency
- [ ] All icons are from Lucide React library
- [ ] Icon sizes are consistent:
  - Small icons (text inline): h-4 w-4
  - Medium icons (buttons): h-5 w-5
  - Large icons (cards): h-6 w-6
  - Feature icons: h-8 w-8
- [ ] Icon colors match their context

### Test 8.7: Animation & Transitions
- [ ] Modals slide in smoothly
- [ ] Buttons have hover states
- [ ] Active filter button highlights
- [ ] Balance visibility toggle is smooth
- [ ] Toast notifications animate in/out

---

## Test Suite 9: Edge Cases & Error Handling

### Test 9.1: Network Errors
- [ ] Disconnect internet
- [ ] Try to add an account
- [ ] Error toast appears: "Failed to add account"
- [ ] Modal doesn't close
- [ ] User can retry after reconnecting

### Test 9.2: Invalid Balance
- [ ] Try to create account with negative balance
- [ ] Browser validation prevents it (if type=number min=0)
- [ ] Or server returns error

### Test 9.3: Very Large Numbers
- [ ] Create account with balance 999,999,999,999
- [ ] Number displays correctly with commas
- [ ] No overflow in UI
- [ ] Calculations remain accurate

### Test 9.4: Special Characters
- [ ] Account name with emojis: "My M-Pesa 💰"
- [ ] Saves correctly
- [ ] Displays correctly
- [ ] Account name with quotes: "John's Account"
- [ ] Escaping handled properly

### Test 9.5: Long Account Names
- [ ] Create account with 100+ character name
- [ ] Name truncates in card view
- [ ] Full name visible in modal/edit view
- [ ] No layout breaking

### Test 9.6: Decimal Precision
- [ ] Transfer amount 100.999
- [ ] Rounds to 2 decimal places (101.00)
- [ ] Interest return of 0.01
- [ ] Displays correctly as "KES 0.01"

### Test 9.7: Concurrent Edits
- [ ] Open app in 2 browser tabs
- [ ] Add account in Tab 1
- [ ] Refresh Tab 2
- [ ] New account appears
- [ ] No stale data issues

---

## Test Suite 10: Integration Testing

### Test 10.1: Income Integration (Future)
When income recording creates account transactions:
- [ ] Add new income entry
- [ ] Select account from dropdown (or defaults to primary)
- [ ] Income creates `account_transaction` with type='income'
- [ ] Account balance increases
- [ ] Transaction appears in account history

### Test 10.2: Expense Integration (Future)
When expense recording creates account transactions:
- [ ] Add new expense entry
- [ ] Select payment account
- [ ] Expense creates `account_transaction` with type='expense'
- [ ] Account balance decreases
- [ ] Transaction appears in account history

### Test 10.3: Budget Integration (Future)
- [ ] Budgets can track spending per account
- [ ] Can filter expenses by account

### Test 10.4: Reports Integration (Future)
- [ ] Reports show account-based analytics
- [ ] Can view spending by account
- [ ] Account balance trends over time

### Test 10.5: Net Worth Integration
- [ ] Net Worth page pulls from accounts table
- [ ] Total net worth = sum of all account balances
- [ ] Investment vs cash breakdown matches accounts

---

## Performance Testing

### Test P.1: Load Time
- [ ] With 0 accounts: Page loads in < 1 second
- [ ] With 10 accounts: Page loads in < 2 seconds
- [ ] With 100 accounts: Page loads in < 3 seconds

### Test P.2: Modal Performance
- [ ] Modal opens instantly (< 200ms)
- [ ] Preset filtering is real-time (no lag)
- [ ] Form submission completes in < 500ms

### Test P.3: Data Migration Performance
- [ ] With 100 income + 100 expense records
- [ ] Migration completes in < 10 seconds
- [ ] No browser freezing during migration
- [ ] Progress updates in real-time

---

## Security Testing

### Test S.1: Authentication
- [ ] Logged out user cannot access /accounts
- [ ] Redirected to /login
- [ ] After login, can access /accounts

### Test S.2: Authorization
- [ ] User A cannot modify User B's accounts via API manipulation
- [ ] RLS policies enforce data isolation
- [ ] Direct database queries respect user_id

### Test S.3: Input Sanitization
- [ ] XSS attempt in account name: `<script>alert('xss')</script>`
- [ ] Renders as plain text, script doesn't execute
- [ ] SQL injection attempt: `'; DROP TABLE accounts; --`
- [ ] Parameterized queries prevent injection

---

## Accessibility Testing

### Test A.1: Keyboard Navigation
- [ ] Can tab through all form fields
- [ ] Can open modals with keyboard
- [ ] Can close modals with Escape key
- [ ] Focus indicators are visible

### Test A.2: Screen Reader
- [ ] All buttons have aria-labels
- [ ] Form fields have proper labels
- [ ] Error messages are announced
- [ ] Success toasts are announced

### Test A.3: Color Contrast
- [ ] Text has sufficient contrast (WCAG AA)
- [ ] Green/red colors have additional indicators (not just color)

---

## Final Checklist

### Code Quality
- [ ] No console errors in browser
- [ ] No console warnings
- [ ] All imports resolved
- [ ] No unused variables (ESLint)
- [ ] Code follows project conventions

### Documentation
- [ ] README updated with Accounts feature
- [ ] Migration guide exists and is clear
- [ ] API documentation (if applicable)
- [ ] Comments for complex logic

### Deployment Ready
- [ ] All environment variables set
- [ ] Database migrations versioned
- [ ] No hardcoded credentials
- [ ] Error boundaries implemented
- [ ] Logging configured

---

## Bug Tracking

If you find any bugs during testing, document them here:

| Bug ID | Description | Steps to Reproduce | Severity | Status |
|--------|-------------|-------------------|----------|--------|
|        |             |                   |          |        |

---

## Sign-Off

Once all tests pass:

- [ ] All critical features work as expected
- [ ] No blocking bugs remain
- [ ] Performance is acceptable
- [ ] Security checks passed
- [ ] Ready for user testing

**Tested By**: _______________
**Date**: _______________
**Version**: _______________

---

**Notes**:
- This checklist is comprehensive but not exhaustive
- Adapt based on your specific requirements
- Re-test after bug fixes
- Consider automated testing for regression prevention
