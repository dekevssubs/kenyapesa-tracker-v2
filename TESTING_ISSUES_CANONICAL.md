# Issues Canonical – KenyaPesa

> **Purpose**
> This document is the single source of truth for all *known, unresolved issues* identified during testing. It is optimized for use with Claude Code / VS Code using **compressed, issue-focused prompts**.
>
> **Rules**
> - Ledger integrity issues take priority over UX
> - Fix in order: P0 → P1 → P2 → P3
> - Do NOT re‑ingest old chats or PDFs once this file exists

---

## 🔴 P0 — Ledger / Transaction Integrity (CRITICAL)

### P0‑1: Income Net Pay vs Deposit Mismatch

**Description**
Income module calculates net pay correctly (~KES 107,398.15 from gross 150,000) but the amount deposited into the account is significantly lower (~KES 64,000).

**Impact**
Breaks financial correctness and user trust.

**Suspected Areas**
- Income calculation → ledger insert → account balance update

**Task**
- Trace full flow from calculation to ledger write
- Ensure deposited amount == computed net pay
- Keep deductions auditable and ledger‑correct

---

### P0‑2: Income Reversal Fails (Constraint Violation)

**Error**
`account_transactions_transaction_type_check` violation

**Location**
- Income.jsx (~line 319)
- Supabase insert into `account_transactions`

**Impact**
Prevents reversals; corrupts auditability

**Task**
- Identify missing / invalid `transaction_type`
- Propose safe enum / check constraint fix
- Ensure reversals do not mutate historical data

---

### P0‑3: Lending – Forgiving Debt Fails (Same Constraint Issue)

**Error**
Same `transaction_type_check` violation during debt forgiveness

**Location**
- lendingService.js (~line 908)
- ForgivenessModal / Lending.jsx

**Impact**
Bad debt cannot be recorded

**Task**
- Confirm shared root cause with Income reversal
- Define proper transaction type for bad debt / forgiveness
- Keep ledger explicit and auditable

---

## 🟠 P1 — Business Logic & Data Consistency

### P1‑1: Budget Marked Over‑Spent When Equal

**Description**
Budget shows "over budget" when expense amount equals budget amount (e.g. Rent 15,000).

**Impact**
Incorrect financial feedback

**Task**
- Fix comparison logic
- Rules:
  - equal → fully utilized
  - exceeded → over budget

---

### P1‑2: Missing Historical Transactions

**Description**
Transactions from previous months do not appear in:
- Account history
- Reports
- Expense edit forms

**Symptoms**
- November rent missing
- Queries default to current month
- Supabase error: `id=eq.null` on edit

**Task**
- Audit date filtering logic
- Fix `account_id` handling on updates
- Ensure historical transactions are always queryable

---

### P1‑3: Account Balance ≠ Transaction History

**Description**
Account balances do not match the sum of transactions.

**Impact**
Ledger inconsistency risk

**Task**
- Verify balance derivation logic
- Confirm whether missing historical transactions cause mismatch
- No manual balance edits allowed

---

## 🟡 P2 — UX / Workflow Improvements

### P2‑1: Bill Reminder → Expense Flow

**Issues**
- Missing / inconsistent toast notifications
- Description reused incorrectly across months
- No confirmation/edit step before expense creation

**Requirements**
- Show success toast (auto‑dismiss)
- Allow user to edit prefilled expense before saving
- Prefill from previous month (amount, category, account)
- Month‑aware description handling

---

### P2‑2: Goals – Toast Notification Persists

**Description**
Goal contribution success toast does not auto‑dismiss.

**Task**
- Fix toast lifecycle without touching ledger logic

---

## 🟦 P3 — Feature Scope / Design Decisions

### P3‑1: Subscriptions – Define Correct Behavior

**Issues**
- Dark mode inconsistencies in Add Subscription form
- Unclear financial behavior

**Decision Needed**
Choose ONE:
1. Subscriptions auto‑create expenses
2. Subscriptions deduct directly from accounts
3. Remove subscriptions in favor of expenses

**Task**
- Provide recommendation before implementation

---

### P3‑2: Lending Enhancements (Non‑Blocking)

**Requests**
- Prefill Ref, Date, Name from message parser
- Support parser‑based repayment recording
- Fix overlapping record‑payment UI
- Add support for loans borrowed from others (symmetry)

**Constraint**
Do not break existing lending ledger logic


> **Golden Rule**
> Accounts hold money. Goals reserve money. Ledger is the source of truth.
