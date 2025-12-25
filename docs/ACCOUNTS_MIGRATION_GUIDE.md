# Accounts Foundation - Migration Guide

## Overview

The Accounts Foundation system introduces comprehensive account management to KenyaPesa Tracker, allowing users to track cash accounts (M-Pesa, banks), investment accounts (MMF, Saccos, Government Securities), and virtual accounts (savings goals).

## What Gets Migrated

The migration process will:

1. **Create a Default Account**: Creates a primary "Main Account (Auto-Created)" classified as M-Pesa/Cash
2. **Backfill Income**: All historical income records will be imported as account transactions
3. **Backfill Expenses**: All historical expense records will be imported as account transactions
4. **Calculate Balance**: The account balance will be automatically calculated based on transaction history

## Migration Options

### Option 1: Run SQL Migration Directly (Database Admins)

If you have direct access to the Supabase database:

```sql
-- Run this SQL script in Supabase SQL Editor
-- File: supabase/migrations/008_backfill_account_transactions.sql
```

This will:
- Create default accounts for all users with existing income/expense data
- Backfill all income and expense records
- Calculate accurate balances
- Record migration completion

### Option 2: Run from Settings Page (Recommended for Users)

1. Navigate to **Settings** page
2. Scroll to **Data Migration** section
3. Click **Run Migration** button
4. Confirm the migration
5. Wait for completion (usually takes a few seconds)
6. View the migration summary

## Migration Process Details

### Step 1: Default Account Creation

A new account is created with these properties:
- **Name**: "Main Account (Auto-Created)"
- **Type**: Cash Account
- **Category**: M-Pesa
- **Institution**: M-Pesa
- **Primary**: Yes (default account for income/expenses)
- **Initial Balance**: 0 (will be calculated)

### Step 2: Income Backfill

For each income record:
- Creates an `account_transaction` with type `income`
- Links to original income record via `related_income_id`
- Preserves date, amount, source (as category), and description
- Automatically increases account balance via database trigger

### Step 3: Expense Backfill

For each expense record:
- Creates an `account_transaction` with type `expense`
- Links to original expense record via `related_expense_id`
- Preserves date, amount, category, and description
- Automatically decreases account balance via database trigger

### Step 4: Balance Calculation

The account balance is calculated as:
```
Balance = SUM(income) - SUM(expenses) + SUM(transfers_in) - SUM(transfers_out) + SUM(investment_returns)
```

This happens automatically via database triggers whenever transactions are added.

## After Migration

Once migration is complete:

### ✅ What Works Automatically
- All historical transactions appear in account transaction history
- Account balance reflects your complete financial history
- New income/expenses automatically update account balances
- Transfers between accounts work seamlessly
- Investment returns are tracked separately

### 🔄 What You Can Do
- Add new accounts (MMF, Saccos, Banks, etc.)
- Transfer money between accounts
- Record investment returns (interest, dividends, capital gains)
- View account-specific transaction history
- Track liquid cash vs investments separately

### ⚠️ Important Notes
- **One-Time Operation**: Migration can only be run once per user
- **No Data Loss**: Original income/expense records remain unchanged
- **Reversible**: If needed, you can delete the created account and transactions
- **Primary Account**: The auto-created account becomes your default for new income/expenses

## Verification

After migration, verify the following:

1. **Check Account Balance**
   - Navigate to Accounts page
   - Verify "Main Account (Auto-Created)" appears
   - Check that balance matches your expected net worth (income - expenses)

2. **Transaction Count**
   - Settings → Data Migration section shows migration summary
   - Income count should match your income records
   - Expense count should match your expense records

3. **Date Range**
   - Earliest transaction should match your oldest income/expense
   - Latest transaction should match your most recent income/expense

## Troubleshooting

### Migration Shows "Already Complete"
- Migration has already been run for your account
- Check the migration summary in Settings for details
- No need to run again

### Balance Doesn't Match Expected
1. Check if all income/expense records were migrated (view migration summary)
2. Verify no duplicate transactions exist
3. Check for any manual account edits after migration

### Migration Failed Error
1. Check browser console for error details
2. Verify you have stable internet connection
3. Try refreshing the page and running again
4. Contact support if error persists

## Database Schema

### Tables Created

**accounts** - User's financial accounts
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- name (text)
- account_type (cash, investment, virtual)
- category (mpesa, bank, mmf, sacco, etc.)
- institution_name (text, optional)
- account_number (text, optional)
- current_balance (numeric, default 0)
- interest_rate (numeric, optional)
- is_primary (boolean, default false)
- notes (text, optional)
- created_at (timestamp)
```

**account_transactions** - All financial transactions
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- account_id (uuid, foreign key → accounts)
- transaction_type (income, expense, transfer_in, transfer_out, etc.)
- amount (numeric)
- date (date)
- category (text)
- description (text, optional)
- payment_method (text, optional)
- related_income_id (uuid, optional → income)
- related_expense_id (uuid, optional → expenses)
- created_at (timestamp)
```

**migration_history** - Track migration execution
```sql
- id (uuid, primary key)
- migration_name (text)
- executed_at (timestamp)
- records_affected (integer)
- status (text)
```

### Database Triggers

**update_account_balance_on_transaction**
- Automatically updates account balance when transactions are added
- Adds amount for: income, transfer_in, investment_return
- Subtracts amount for: expense, transfer_out, investment_deposit

## Support

For questions or issues:
1. Check this documentation first
2. Review migration summary in Settings
3. Check browser console for errors
4. Raise an issue on GitHub repository

---

**Last Updated**: December 2024
**Version**: 1.0.0
