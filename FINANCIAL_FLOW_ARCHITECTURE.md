# Financial Flow Architecture - KenyaPesa Tracker

## Problem Statement

Currently, the app tracks financial activities in silos:
- ✅ Income (salary, side hustles)
- ✅ Expenses (spending)
- ✅ Budgets (spending limits)
- ✅ Goals (savings targets)
- ✅ Subscriptions (recurring expenses)
- ✅ Net Worth (assets & liabilities snapshot)
- ✅ Lending (money lent out)
- ❌ **Missing:** Investment tracking (MMF, Saccos, M-Akiba, etc.)
- ❌ **Missing:** Cash flow visualization
- ❌ **Missing:** Central "available balance" concept
- ❌ **Missing:** Logical connections between all pieces

**User Question:** How do we make income (salary) the "main account" that everything else depends on?

---

## Conceptual Model: The Money Flow System

### 1. Core Concept: Every Shilling Has a Purpose

```
┌─────────────────────────────────────────────────────────────────┐
│                         INCOME SOURCES                          │
│  (Salary, Business, Investments Returns, Side Hustles, etc.)   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AVAILABLE BALANCE                            │
│            (Total Income - Total Allocated/Spent)               │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├──────────────┐
             │              │
             ▼              ▼
    ┌────────────┐  ┌──────────────┐
    │  ALLOCATED │  │   UNALLOCATED │
    │  (Planned) │  │   (Available) │
    └──────┬─────┘  └──────────────┘
           │
           ├─────────────────────┬─────────────────────┬───────────────────┐
           │                     │                     │                   │
           ▼                     ▼                     ▼                   ▼
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐    ┌─────────────┐
    │  EXPENSES   │      │   SAVINGS   │      │ INVESTMENTS │    │   LENDING   │
    │  (Budgets)  │      │   (Goals)   │      │ (MMF/Sacco) │    │  (IOUs)     │
    └─────────────┘      └─────────────┘      └─────────────┘    └─────────────┘
           │                     │                     │                   │
           ▼                     ▼                     ▼                   ▼
    Actual Spending      Goal Progress        Portfolio Value      Repayments
```

---

## Proposed Architecture

### Phase 1: Investment Accounts System

#### New Concept: "Accounts"
Create a flexible account system to track money locations:

**Account Types:**
1. **Cash Accounts** (liquid money)
   - M-Pesa wallet
   - Bank accounts
   - Physical cash
   - Mobile money (Airtel Money, T-Kash)

2. **Investment Accounts** (growing money)
   - Money Market Funds (MMF)
   - Saccos
   - Treasury Bills/Bonds (M-Akiba)
   - Stocks (NSE)
   - Unit Trusts
   - Fixed Deposits
   - REITs

3. **Virtual Accounts** (conceptual)
   - Emergency fund
   - Sinking funds (planned expenses)

#### Database Schema

```sql
-- Main accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL, -- "Main M-Pesa", "CIC MMF", "Stima Sacco"
  account_type VARCHAR(50) NOT NULL, -- 'cash', 'investment', 'virtual'
  category VARCHAR(50) NOT NULL, -- 'mpesa', 'bank', 'mmf', 'sacco', 'stocks', etc.
  institution_name VARCHAR(255), -- "M-Pesa", "CIC Asset Management", "Stima Sacco"
  account_number VARCHAR(100),
  current_balance DECIMAL(12, 2) DEFAULT 0,
  interest_rate DECIMAL(5, 2), -- For investments
  is_primary BOOLEAN DEFAULT false, -- Mark one as "main account"
  is_active BOOLEAN DEFAULT true,
  currency VARCHAR(3) DEFAULT 'KES',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Account transactions (money movements)
CREATE TABLE account_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  from_account_id UUID REFERENCES accounts(id), -- NULL for income
  to_account_id UUID REFERENCES accounts(id), -- NULL for expenses
  transaction_type VARCHAR(50) NOT NULL, -- 'income', 'expense', 'transfer', 'investment_deposit', 'investment_withdrawal'
  amount DECIMAL(12, 2) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  reference_id UUID, -- Link to expense, income, or goal transaction
  reference_type VARCHAR(50), -- 'expense', 'income', 'goal_contribution', 'lending'
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Investment returns tracking
CREATE TABLE investment_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  return_type VARCHAR(50) NOT NULL, -- 'interest', 'dividend', 'capital_gain'
  amount DECIMAL(12, 2) NOT NULL,
  rate DECIMAL(5, 2), -- Annual rate if applicable
  period_start DATE,
  period_end DATE,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Phase 2: Cash Flow Logic

#### How Money Flows:

**1. Income Arrives → Goes to Primary Account**
```javascript
// When user records salary/income
1. Create income record (existing table)
2. Create account_transaction:
   - from_account_id: NULL (external source)
   - to_account_id: primary_account_id
   - transaction_type: 'income'
   - amount: income_amount
3. Update primary_account balance: +amount
```

**2. Expenses → Deduct from Account**
```javascript
// When user records expense
1. Create expense record (existing table)
2. Create account_transaction:
   - from_account_id: selected_account_id (or primary)
   - to_account_id: NULL (money leaves system)
   - transaction_type: 'expense'
   - reference_id: expense_id
3. Update account balance: -amount
```

**3. Investments → Transfer Money**
```javascript
// When user invests (e.g., deposits to MMF)
1. Create account_transaction:
   - from_account_id: primary_account_id
   - to_account_id: mmf_account_id
   - transaction_type: 'investment_deposit'
   - amount: investment_amount
2. Update balances:
   - Primary account: -amount
   - MMF account: +amount
```

**4. Goal Savings → Transfer Money**
```javascript
// When user contributes to goal
1. Create goal contribution (existing)
2. Create account_transaction:
   - from_account_id: primary_account_id
   - to_account_id: goal_virtual_account_id
   - transaction_type: 'transfer'
   - reference_id: goal_id
3. Update balances
```

**5. Lending → Transfer Out**
```javascript
// When user lends money
1. Create lending record (existing)
2. Create account_transaction:
   - from_account_id: primary_account_id
   - to_account_id: NULL (external person)
   - transaction_type: 'expense'
   - reference_type: 'lending'
   - reference_id: lending_id
3. Update primary balance: -amount
```

**6. Repayments → Return to Account**
```javascript
// When borrower repays
1. Update lending record
2. Create account_transaction:
   - from_account_id: NULL (external)
   - to_account_id: primary_account_id
   - transaction_type: 'income'
   - reference_type: 'lending_repayment'
3. Update balance: +amount
```

---

### Phase 3: Available Balance Calculation

```javascript
class CashFlowService {
  async getAvailableBalance(userId, asOfDate = new Date()) {
    // Total liquid money (cash accounts only)
    const liquidBalance = await this.getTotalCashBalance(userId)

    // Committed but not spent (pending bills, subscriptions)
    const committed = await this.getCommittedExpenses(userId, asOfDate)

    // Allocated to active goals
    const goalAllocations = await this.getGoalAllocations(userId)

    // Available = Liquid - Committed - Goal Allocations
    const available = liquidBalance - committed - goalAllocations

    return {
      liquidBalance,      // Total in cash accounts
      committed,          // Bills due, subscriptions
      goalAllocations,    // Money "earmarked" for goals
      available,          // Truly spendable
      investmentBalance,  // Total in investments
      lendingOutstanding, // Money lent out
      totalNetWorth       // Everything combined
    }
  }
}
```

---

### Phase 4: Kenya-Specific Investment Options

#### Money Market Funds (MMF)
**Popular Options:**
- CIC Money Market Fund (minimum: KES 1,000)
- Britam Money Market Fund
- Old Mutual Money Market Fund
- NCBA Money Market Fund
- GenCap Hela Imara Money Market Fund

**Features to Track:**
- Daily interest accrual (~10-13% p.a.)
- Unit price fluctuations
- Withdrawals (T+1 or T+2)
- Management fees

#### Saccos
**Examples:**
- Stima Sacco
- Kenya Police Sacco
- Mwalimu National Sacco
- Afya Sacco

**Features to Track:**
- Monthly contributions
- Dividends (annual)
- Loan facility (borrow against savings)
- Share capital vs deposits

#### Government Securities
- **M-Akiba:** Mobile-based government bonds (minimum KES 3,000)
- **M-Akiba Retail:** Through CBK
- **Treasury Bills:** 91, 182, 364 days
- **Treasury Bonds:** 2-30 years

**Features to Track:**
- Maturity dates
- Interest payment dates
- Coupon rates
- Face value vs market value

#### Other Kenyan Investment Options
- **Stocks (NSE):** Safaricom, EABL, KCB, Equity, etc.
- **Unit Trusts:** Balanced, equity, bond funds
- **REITs:** ILAM Fahari I-REIT, Acorn I-REIT
- **Fixed Deposits:** Bank FDs (1 month - 1 year)
- **Chamas:** Informal investment groups

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal:** Set up account system basics

**Tasks:**
1. Create `accounts` table
2. Create `account_transactions` table
3. Create `investment_returns` table
4. Build Accounts CRUD page
5. Add "Primary Account" designation

**Deliverables:**
- `/accounts` page to manage cash and investment accounts
- Ability to create M-Pesa, Bank, MMF, Sacco accounts

---

### Phase 2: Connect Existing Features (Week 3-4)
**Goal:** Make income/expenses update account balances

**Tasks:**
1. Modify Income creation to update primary account
2. Modify Expense creation to deduct from account
3. Add account selection to expense form
4. Backfill existing transactions (migration script)
5. Add balance validation (can't spend more than available)

**Deliverables:**
- Account balances auto-update
- Historical balance reconstruction
- Overdraft warnings

---

### Phase 3: Investment Tracking (Week 5-6)
**Goal:** Track MMF, Saccos, and other investments

**Tasks:**
1. Investment account creation flow
2. Deposit/withdrawal tracking
3. Interest/dividend recording
4. Portfolio summary dashboard
5. Kenya-specific templates (CIC MMF, Stima Sacco, etc.)

**Deliverables:**
- `/investments` page
- Investment portfolio dashboard
- Returns calculation

---

### Phase 4: Cash Flow Visualization (Week 7-8)
**Goal:** Show money flow graphically

**Tasks:**
1. Cash flow summary component
2. Sankey diagram (income → allocations)
3. Available balance widget
4. Money allocation pie chart
5. Month-over-month flow comparison

**Deliverables:**
- Enhanced dashboard with flow visualization
- "Available to Spend" widget
- Allocation breakdown

---

### Phase 5: Advanced Features (Week 9-10)
**Goal:** Power user features

**Tasks:**
1. Goal funding from specific accounts
2. Automatic investment contributions
3. Portfolio rebalancing alerts
4. Investment performance tracking (ROI, XIRR)
5. Tax reporting (withholding tax on interest)

**Deliverables:**
- Advanced investment analytics
- Performance metrics
- Tax summaries

---

## UI/UX Design Concepts

### 1. Dashboard - Money Flow Widget

```
┌──────────────────────────────────────────────────────────┐
│  💰 Your Money This Month                                │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Income: KES 150,000 ────────────┐                      │
│                                   │                       │
│                                   ├─→ Expenses: 80,000   │
│                                   ├─→ Savings: 30,000    │
│                                   ├─→ Investments: 20,000│
│                                   └─→ Available: 20,000  │
│                                                           │
│  [█████████████████░░░░░] 80% allocated                  │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### 2. Accounts Overview Page

```
┌─────────────────────────────────────────────────────────┐
│  Accounts                                    + Add New  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  💵 CASH ACCOUNTS                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📱 M-Pesa Wallet (Primary) ···· KES 45,230      │  │
│  │ 🏦 Equity Bank ················ KES 123,450     │  │
│  │ 💰 Cash on Hand ··············· KES 5,000       │  │
│  └──────────────────────────────────────────────────┘  │
│  Total Liquid: KES 173,680                              │
│                                                          │
│  📈 INVESTMENTS                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📊 CIC Money Market Fund ······ KES 250,000     │  │
│  │    ↑ +12.3% (KES 27,500 gain)                   │  │
│  │ 🏛️ Stima Sacco ················ KES 180,000     │  │
│  │    Dividends: 10% p.a.                           │  │
│  │ 📈 Safaricom Stock (500 shares) KES 18,500      │  │
│  └──────────────────────────────────────────────────┘  │
│  Total Investments: KES 448,500                         │
│                                                          │
│  📊 NET WORTH: KES 622,180                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3. Investment Account Details

```
┌──────────────────────────────────────────────────────────┐
│  ← CIC Money Market Fund                                 │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Current Value: KES 250,000                              │
│  Units: 12,500.45                                        │
│  Unit Price: KES 20.00                                   │
│  Total Returns: +KES 27,500 (12.3%)                      │
│                                                           │
│  [Deposit] [Withdraw] [View Statement]                   │
│                                                           │
│  Recent Transactions                                      │
│  ────────────────────────────────────────────────────   │
│  Dec 15  Deposit           +50,000                       │
│  Nov 30  Interest Credit   +2,450                        │
│  Nov 15  Deposit           +100,000                      │
│  Oct 31  Interest Credit   +2,180                        │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Data Migration Strategy

### For Existing Users

**Challenge:** Users already have income and expense data without account linkage.

**Solution:**
```javascript
async function migrateExistingData(userId) {
  // 1. Create default primary account
  const primaryAccount = await createAccount({
    user_id: userId,
    name: 'Main Account',
    account_type: 'cash',
    category: 'mpesa',
    is_primary: true
  })

  // 2. Backfill all historical income
  const allIncome = await getIncome(userId)
  for (const income of allIncome) {
    await createAccountTransaction({
      user_id: userId,
      to_account_id: primaryAccount.id,
      transaction_type: 'income',
      amount: income.amount,
      date: income.date,
      reference_id: income.id,
      reference_type: 'income'
    })
  }

  // 3. Backfill all historical expenses
  const allExpenses = await getExpenses(userId)
  for (const expense of allExpenses) {
    await createAccountTransaction({
      user_id: userId,
      from_account_id: primaryAccount.id,
      transaction_type: 'expense',
      amount: expense.amount,
      date: expense.date,
      reference_id: expense.id,
      reference_type: 'expense'
    })
  }

  // 4. Calculate and set current balance
  const balance = calculateBalance(userId)
  await updateAccountBalance(primaryAccount.id, balance)
}
```

---

## Kenya-Specific Investment Presets

```javascript
const KENYA_INVESTMENT_TEMPLATES = {
  mmf: [
    {
      name: 'CIC Money Market Fund',
      institution: 'CIC Asset Management',
      category: 'mmf',
      typical_rate: 12.5,
      min_investment: 1000,
      liquidity: 'T+1'
    },
    {
      name: 'Britam Money Market Fund',
      institution: 'Britam Asset Managers',
      category: 'mmf',
      typical_rate: 11.8,
      min_investment: 1000,
      liquidity: 'T+2'
    }
  ],
  saccos: [
    {
      name: 'Stima Sacco',
      institution: 'Stima Sacco Society',
      category: 'sacco',
      typical_dividend: 10,
      min_contribution: 500
    },
    {
      name: 'Kenya Police Sacco',
      institution: 'Kenya Police Sacco Society',
      category: 'sacco',
      typical_dividend: 12,
      min_contribution: 1000
    }
  ],
  government: [
    {
      name: 'M-Akiba Bond',
      institution: 'Central Bank of Kenya',
      category: 'government_bond',
      min_investment: 3000,
      term_years: 3
    },
    {
      name: 'Treasury Bill 91-Day',
      institution: 'Central Bank of Kenya',
      category: 'treasury_bill',
      min_investment: 100000,
      term_days: 91
    }
  ]
}
```

---

## Summary: The Big Picture

### What Changes:

**Before (Current State):**
- Income tracked ✓
- Expenses tracked ✓
- No connection between them
- No "available money" concept
- No investment tracking

**After (Proposed State):**
- Income → Adds to primary account ✓
- Expenses → Deducts from account ✓
- Investments tracked separately ✓
- Clear "available balance" ✓
- Money flow visualization ✓
- Everything connected ✓

### Benefits:

1. **Better Money Awareness**
   - Users see exactly how much they can spend
   - Clear view of where money is

2. **Investment Tracking**
   - Track MMF, Sacco, stocks all in one place
   - See total portfolio performance

3. **Smarter Budgeting**
   - Budgets consider actual available money
   - Can't overspend what you don't have

4. **Goal Integration**
   - Goals can be funded from specific accounts
   - Track progress with real money movements

5. **Kenyan Context**
   - Built for M-Pesa, Saccos, MMFs
   - Local investment options pre-configured

---

## Next Steps - Your Decision

**Question for you:**

1. **Do you want to implement this gradually or all at once?**
   - Gradual: Phase 1 first (accounts system), then expand
   - All-in: Full implementation in one go

2. **Should we maintain backward compatibility?**
   - Keep existing simple income/expense tracking for basic users
   - Add accounts as "advanced mode"
   - OR force everyone to use accounts system

3. **Which investments are priority?**
   - Start with MMF + Saccos only?
   - Include all investment types from day 1?

4. **Migration approach for existing users?**
   - Auto-migrate everyone (create default account)
   - Optional opt-in to new system
   - Fresh start (keep old data, new transactions use new system)

**Let me know your preference and I'll start building!**
