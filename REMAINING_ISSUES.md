# Remaining Issues - KenyaPesa Tracker

## Completed Issues
- [x] Fix Dashboard 400 error - budgetAlertService.js using wrong column names (amount -> monthly_limit, category -> category_id)
- [x] Fix Budget Categories loading issue for new users - Added category seeding fallback
- [x] Fix Sign-up OTP verification - Now requires OTP before dashboard access
- [x] Add OTP verification after password login (2FA flow)
- [x] Implement Password Reset with OTP requirement - Created ForgotPassword page
- [x] Implement Password Change with OTP requirement - Added to Settings page
- [x] Remove Email Code login option - Now only password + OTP login
- [x] Redesign Accounts as Bank-Themed Cards - Credit card style with official Kenyan bank colors
- [x] Add Message Parser to Transfer Money form with transaction fee tracking

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

## Notes
- Code was committed and pushed: `bfa09a7`
- Branch: main
- All OTP-related changes are complete
- Category seeding fallback added to Budget and Expenses pages
