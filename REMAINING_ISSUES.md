# Remaining Issues - KenyaPesa Tracker

## Completed Issues
- [x] Fix Dashboard 400 error - budgetAlertService.js using wrong column names (amount -> monthly_limit, category -> category_id)
- [x] Fix Budget Categories loading issue for new users - Added category seeding fallback
- [x] Fix Sign-up OTP verification - Now requires OTP before dashboard access
- [x] Add OTP verification after password login (2FA flow)
- [x] Implement Password Reset with OTP requirement - Created ForgotPassword page
- [x] Implement Password Change with OTP requirement - Added to Settings page
- [x] Remove Email Code login option - Now only password + OTP login

## Remaining Issues

### 1. Reports Preloader Flash Issue
**Description:** Some spinning rectangular preloader flashes on the screen momentarily when viewing reports and should be removed.

**Location:**
- `src/pages/ComprehensiveReports.jsx`
- `src/components/reports/*.jsx` (all report tab components)

**Current Behavior:** All report tabs initialize with `loading = true` which shows a spinner while data loads.

**Fix Options:**
1. Change `useState(true)` to `useState(false)` in report components to skip loading state
2. Add minimum loading time to prevent flash
3. Use skeleton loading instead of spinner

### 2. Add FAQ Section
**Description:** Add a FAQ section to help users understand the system.

**Suggested Implementation:**
- Create new FAQ page or add to Settings/Help section
- Include common questions about:
  - How to use the app
  - M-Pesa integration
  - Budget tracking
  - Reports
  - Account management

**Files to create/modify:**
- Create `src/pages/FAQ.jsx` or `src/components/settings/FAQ.jsx`
- Add route in `src/App.jsx`
- Add navigation link in sidebar

### 3. Redesign Accounts as Bank-Themed Cards (Wild Idea)
**Description:** Redesign accounts to look like credit/debit cards with bank theme colors.

**Location:** `src/pages/Accounts.jsx`

**Suggested Implementation:**
- Create card-like design for each account
- Use bank-specific colors (e.g., Equity green, KCB blue, M-Pesa green)
- Show card number (masked), balance, account type
- Add visual indicators for account status

**Design Elements:**
- Card shape with rounded corners
- Bank logo/icon
- Gradient backgrounds matching bank brands
- Card chip graphic
- Account holder name
- Last 4 digits display

## Notes
- Code was committed and pushed: `bfa09a7`
- Branch: main
- All OTP-related changes are complete
- Category seeding fallback added to Budget and Expenses pages
