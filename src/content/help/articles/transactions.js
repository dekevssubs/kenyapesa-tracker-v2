export const transactions = [
  {
    id: 'income-tracking',
    title: 'Tracking Your Income',
    icon: 'TrendingUp',
    readTime: '3 min',
    keywords: ['income', 'salary', 'money', 'earn', 'receive', 'payment'],
    content: `
## Tracking Your Income

Recording your income is essential for understanding your financial picture.

### Income Sources

KenyaPesa Tracker supports various income types common in Kenya:

- **Salary** - Your regular employment income
- **Freelance/Side Hustle** - Extra work income
- **Business** - Income from your business
- **Rental** - Rent from property
- **Investment** - Dividends, interest, returns
- **Gift** - Money received as a gift
- **Other** - Any other income source

### Adding Income

1. Go to **Income** in the sidebar
2. Click **Add Income**
3. Fill in:
   - **Amount** - The total amount received
   - **Source** - Select the income type
   - **Date** - When you received it
   - **Account** - Which account it was deposited to
   - **Notes** - Any additional details

### Salary with Deductions

When adding your salary, you can track deductions:
- PAYE (Pay As You Earn tax)
- NHIF (National Hospital Insurance Fund)
- NSSF (National Social Security Fund)
- SACCO deductions
- Loan repayments

The app will record these as separate transactions and update your account balances correctly.

### Recurring Income

For regular income like monthly salary:
- Set up recurring income to auto-create entries
- Just confirm each month when the salary arrives
    `
  },
  {
    id: 'expense-tracking',
    title: 'Recording Expenses',
    icon: 'ShoppingCart',
    readTime: '4 min',
    keywords: ['expense', 'spending', 'buy', 'purchase', 'pay', 'cost'],
    content: `
## Recording Expenses

Track every shilling you spend to understand where your money goes.

### Expense Categories

We've set up categories that match typical Kenyan spending:

**Essentials**
- Food & Groceries
- Rent & Housing
- Utilities (electricity, water)
- Transport & Matatu

**Lifestyle**
- Entertainment
- Eating Out
- Shopping
- Personal Care

**Financial**
- Savings
- Investment
- Debt Repayment
- Insurance

### Adding an Expense

1. Go to **Expenses**
2. Click **Add Expense**
3. Enter:
   - **Amount** - How much you spent
   - **Category** - What type of expense
   - **Date** - When you spent it
   - **Account** - Which account you paid from
   - **Notes** - Description or details

### Quick Add Options

- **Mobile FAB** - Use the floating + button on mobile
- **Command Palette** - Press Ctrl+K and type "expense"
- **M-Pesa Parsing** - Paste your M-Pesa message!

### Smart Categorization

The app learns from your spending patterns:
- Frequent merchants are auto-categorized
- Similar descriptions get suggested categories
    `
  },
  {
    id: 'mpesa-parsing',
    title: 'M-Pesa Message Parsing',
    icon: 'Smartphone',
    readTime: '3 min',
    keywords: ['mpesa', 'message', 'sms', 'parse', 'automatic', 'safaricom'],
    content: `
## M-Pesa Message Parsing

Save time by pasting M-Pesa confirmation messages directly!

### How It Works

1. Copy an M-Pesa confirmation message from your phone
2. Go to **Expenses** or **Income**
3. Click **Parse M-Pesa Message**
4. Paste the message
5. We'll extract all the details automatically!

### What Gets Extracted

From a typical M-Pesa message, we extract:
- **Transaction Code** - The unique M-Pesa reference
- **Amount** - How much was sent/received
- **Date & Time** - When the transaction happened
- **Recipient/Sender** - Who you transacted with
- **Transaction Type** - Send money, buy goods, pay bill, etc.
- **Transaction Fees** - Any charges

### Supported Transaction Types

- Send Money (to mobile number)
- Buy Goods (till number)
- Pay Bill (paybill number)
- Withdraw (from agent)
- Receive Money
- Airtime purchase

### Tips

- Copy the full message including the transaction code
- The app will suggest a category based on the recipient
- Review the extracted data before saving

### Example Message

\`\`\`
RKS7XYZABC Confirmed. Ksh500.00 sent to JOHN DOE 0712345678 on 15/1/24 at 2:30 PM. New M-PESA balance is Ksh1,234.56. Transaction cost, Ksh0.00.
\`\`\`
    `
  }
]
