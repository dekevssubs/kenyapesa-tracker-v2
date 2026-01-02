# Portfolio Implementation Plan

## Overview

Merge **Goals**, **Savings & Investments**, and **Net Worth** into a single **Portfolio** page that becomes the unified financial backbone of the application.

---

## Current State

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| Savings & Investments | `/savings-investments` | View savings/investment accounts, charts | TO BE MERGED |
| Net Worth | `/networth` | Manual asset/liability tracking | TO BE MERGED |
| Goals | `/goals` | Financial goal tracking | TO BE EMBEDDED |
| Accounts | `/accounts` | Account management | KEEP (operational) |
| Account History | `/account-history` | Transaction ledger | KEEP (audit) |

---

## Target State

| Page | Route | Purpose |
|------|-------|---------|
| **Portfolio** | `/portfolio` | Unified view: Net Worth, Assets, Liabilities, Goals, Activity |
| Accounts | `/accounts` | Account CRUD operations |
| Account History | `/account-history` | Full transaction ledger |

---

## Architecture Principles (Locked)

1. **Money lives in Accounts** - never in Goals
2. **Goals are intent** - they observe, don't store
3. **Truth lives in Ledger** - `account_transactions` is source of truth
4. **Net Worth is calculated** - Assets - Liabilities, derived from accounts
5. **One ledger, many views** - Portfolio, Reports, Goals all read same data

---

## Implementation Phases

### Phase 1: Create Portfolio Page Structure
**Files to create:**
- `src/pages/Portfolio.jsx` - Main unified page

**Portfolio Page Sections:**
```
Portfolio Page
├── 1. Summary Cards (Top)
│   ├── Total Assets (from accounts where type = cash/savings/investment)
│   ├── Total Liabilities (from net_worth where is_liability = true)
│   ├── Net Worth (Assets - Liabilities)
│   └── Goal Progress (X of Y goals on track)
│
├── 2. Net Worth Trend Chart
│   └── Line chart showing net worth over time
│
├── 3. Asset Allocation
│   ├── Pie chart: Cash vs Savings vs Investments
│   └── Tab filters: [All | Cash | Savings | Investments]
│
├── 4. Accounts Grid
│   ├── Cash Accounts (M-Pesa, Bank)
│   ├── Savings Accounts (Sacco, Fixed Deposit)
│   └── Investment Accounts (MMF, Stocks, Bonds)
│
├── 5. Goals Section (Embedded)
│   ├── Active Goals with progress bars
│   ├── Quick contribute action
│   └── Link to full goals management
│
├── 6. Liabilities Section
│   ├── Outstanding loans
│   ├── Credit card debt
│   └── Other liabilities
│
└── 7. Recent Activity Feed
    └── Latest transactions from account_transactions
```

### Phase 2: Fix Goals Module (Per Spec)
**Files to modify:**
- `src/pages/Goals.jsx`

**Changes Required:**
1. ✅ Remove "Withdraw" action (already done per previous session)
2. ✅ Rename "Savings Account" → "Linked Account" (already done)
3. Ensure goals derive progress from linked account transactions
4. Goals should NOT display as holding money directly
5. Contribution = Transfer from source → linked account, tagged with goal_id

### Phase 3: Integrate Net Worth Data
**Current:** Manual entries in `net_worth` table (separate from accounts)

**Target:** Hybrid approach
- **Assets from Accounts**: Cash, Savings, Investment accounts feed automatically
- **Assets from Manual Entry**: Property, Vehicles, Other (keep net_worth table)
- **Liabilities**: Keep in net_worth table (loans, credit, debts)

**Net Worth Calculation:**
```javascript
const totalAssets =
  accountsTotal +  // from accounts table (cash + savings + investment)
  manualAssets     // from net_worth where is_liability = false AND type IN (property, vehicle, other)

const totalLiabilities =
  netWorthLiabilities  // from net_worth where is_liability = true

const netWorth = totalAssets - totalLiabilities
```

### Phase 4: Update Navigation
**File to modify:**
- `src/components/dashboard/DashboardLayout.jsx`

**Navigation Changes:**
```javascript
// REMOVE these entries:
{ name: 'Savings & Investments', href: '/savings-investments', ... }
{ name: 'Net Worth', href: '/networth', ... }

// KEEP Goals but consider making it a sub-route or embedded
{ name: 'Goals', href: '/goals', ... }  // Can keep for dedicated management

// ADD Portfolio:
{ name: 'Portfolio', href: '/portfolio', icon: Briefcase, color: 'text-emerald-500' }
```

### Phase 5: Update Routes
**File to modify:**
- `src/App.jsx`

**Route Changes:**
```javascript
// ADD new route:
<Route path="/portfolio" element={<Portfolio />} />

// DEPRECATE (redirect to portfolio):
<Route path="/savings-investments" element={<Navigate to="/portfolio" />} />
<Route path="/networth" element={<Navigate to="/portfolio" />} />
```

---

## Database Considerations

### No New Tables Required
The existing schema supports this architecture:
- `accounts` - All financial accounts
- `account_transactions` - Unified ledger (source of truth)
- `goals` - Goal definitions with `linked_account_id`
- `goal_contributions` - Tracks contributions to goals
- `net_worth` - Manual assets/liabilities (property, vehicles, loans)

### Data Flow
```
Income → Account (via account_transactions)
         ↓
Account Balance (auto-updated by trigger)
         ↓
Portfolio View (reads accounts + net_worth)
         ↓
Net Worth Calculation (derived)
         ↓
Goals (observe linked account via goal_contributions)
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Portfolio.jsx` | Main unified Portfolio page |
| `src/components/portfolio/PortfolioSummary.jsx` | Summary cards component |
| `src/components/portfolio/AssetAllocation.jsx` | Pie chart + allocation view |
| `src/components/portfolio/GoalsOverview.jsx` | Embedded goals section |
| `src/components/portfolio/LiabilitiesSection.jsx` | Liabilities list |
| `src/components/portfolio/PortfolioActivity.jsx` | Recent activity feed |
| `src/utils/portfolioService.js` | Data aggregation service |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.jsx` | Add Portfolio route, add redirects |
| `src/components/dashboard/DashboardLayout.jsx` | Update navigation |
| `src/pages/Goals.jsx` | Ensure spec compliance (if not already) |

---

## Files to Deprecate (Keep but Redirect)

| File | Action |
|------|--------|
| `src/pages/SavingsInvestments.jsx` | Redirect to Portfolio |
| `src/pages/NetWorth.jsx` | Redirect to Portfolio |

---

## Implementation Order

1. **Create `portfolioService.js`** - Data aggregation logic
2. **Create Portfolio page** - Main page with all sections
3. **Create sub-components** - Summary, Allocation, Goals, Liabilities, Activity
4. **Update navigation** - Add Portfolio, reorder menu
5. **Update routes** - Add Portfolio route, add redirects
6. **Test integration** - Ensure all data flows correctly
7. **Polish UI** - Match existing design system

---

## UI Design Notes

- Follow existing gradient header pattern (like Expenses, Income pages)
- Use existing card components and styling
- Recharts for charts (already used in app)
- Responsive grid layout (already used)
- Dark mode support (already implemented)

---

## Success Criteria

- [ ] Single Portfolio page shows all financial position data
- [ ] Net Worth calculated automatically from accounts + manual entries
- [ ] Goals section shows progress without claiming to hold money
- [ ] Account balances are source of truth
- [ ] Activity feed shows unified transaction history
- [ ] Old routes redirect to Portfolio
- [ ] Navigation is simplified

---

## Questions to Confirm

1. Should Goals page remain as standalone for detailed management, or fully embed in Portfolio?
   - **Recommendation**: Keep `/goals` for CRUD, embed overview in Portfolio

2. Should Lending (receivables) be shown in Portfolio as assets?
   - **Recommendation**: Yes, loans given = receivable assets

3. Should we keep ability to add manual assets (property, vehicles)?
   - **Recommendation**: Yes, via the existing net_worth table

---

**Status:** READY FOR APPROVAL
