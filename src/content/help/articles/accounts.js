export const accounts = [
  {
    id: 'adding-accounts',
    title: 'Adding Accounts',
    icon: 'Wallet',
    readTime: '3 min',
    keywords: ['account', 'add', 'create', 'mpesa', 'bank', 'cash', 'wallet'],
    content: `
## Adding Accounts

Accounts are the foundation of your financial tracking. Each account represents a place where you hold money.

### Types of Accounts

**Mobile Money**
- M-Pesa
- Airtel Money
- T-Kash

**Bank Accounts**
- Savings Account
- Current Account
- Fixed Deposit

**Cash**
- Wallet cash
- Home safe

**Investment**
- Money Market Funds
- Stocks/Shares
- SACCO Shares

### How to Add an Account

1. Go to **Accounts** in the sidebar
2. Click **Add Account**
3. Fill in the details:
   - **Name** - Give it a recognizable name (e.g., "Equity Bank", "M-Pesa Main")
   - **Type** - Select the account type
   - **Current Balance** - Enter the current balance
   - **Color** - Choose a color for easy identification
4. Click **Save**

### Tips

- Set your M-Pesa as your default account for quick expense entry
- Update balances regularly for accurate net worth tracking
- Use different colors for different account types
    `
  },
  {
    id: 'account-types',
    title: 'Understanding Account Types',
    icon: 'CreditCard',
    readTime: '3 min',
    keywords: ['account', 'type', 'mobile', 'money', 'bank', 'cash', 'investment'],
    content: `
## Understanding Account Types

KenyaPesa Tracker supports various account types to match how Kenyans manage money.

### Mobile Money (M-Pesa, Airtel Money)

Mobile money accounts are the most common for daily transactions in Kenya.
- Track send money, buy goods, and pay bill transactions
- Perfect for M-Pesa message parsing
- Great for daily expense tracking

### Bank Accounts

For your bank deposits and withdrawals.
- **Savings Account** - Long-term savings with interest
- **Current Account** - For frequent transactions and salary deposits
- **Fixed Deposit** - Locked savings for higher interest

### Cash

Physical money you carry or store.
- Wallet cash for small daily purchases
- Home safe for emergency funds
- Good for tracking matatu fare, small vendors, etc.

### Investment Accounts

Track your investments separately.
- SACCO shares and deposits
- Money Market Funds
- Stocks and unit trusts

### Loan Accounts

For tracking borrowed money or loans given.
- Personal loans
- SACCO loans
- Salary advance
    `
  },
  {
    id: 'transfers',
    title: 'Transferring Between Accounts',
    icon: 'ArrowLeftRight',
    readTime: '2 min',
    keywords: ['transfer', 'move', 'money', 'between', 'accounts', 'withdraw', 'deposit'],
    content: `
## Transferring Between Accounts

Moving money between your accounts keeps your balances accurate.

### When to Record Transfers

- M-Pesa to bank (deposit)
- Bank to M-Pesa (withdrawal)
- Bank to bank transfers
- Withdrawing cash from M-Pesa

### How to Make a Transfer

1. Go to **Accounts**
2. Click **Transfer**
3. Select:
   - **From Account** - Where the money is coming from
   - **To Account** - Where the money is going
   - **Amount** - How much to transfer
4. Click **Transfer**

### What Happens

- The "From" account balance decreases
- The "To" account balance increases
- A transfer transaction is recorded in account history

### Transaction Fees

If there's a fee (like M-Pesa withdrawal charges):
- The fee is automatically recorded as an expense
- Your account balances reflect the actual amounts

### Tips

- Always record transfers to keep your balances accurate
- Use the M-Pesa calculator to know withdrawal fees in advance
- Review account history if balances don't match your actual amounts
    `
  }
]
