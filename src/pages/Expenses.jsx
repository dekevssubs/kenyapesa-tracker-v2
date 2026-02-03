import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { getCategoryIcon, getPaymentIcon, getCategoryColor } from '../utils/iconMappings'
import { Plus, Eye, RotateCcw, TrendingDown, Filter, X, AlertTriangle, Wallet, DollarSign, CheckCircle, MessageSquare, RefreshCw, FileText, Calendar, CreditCard, Tag, MinusCircle, Building2, Receipt, Search, Upload, Bell } from 'lucide-react'
import SearchBar, { searchItems } from '../components/ui/SearchBar'
import ImportWizard from '../components/import/ImportWizard'
import { ExpenseService } from '../utils/expenseService'
import { calculateTransactionFee, getAvailableFeeMethods, formatFeeBreakdown, FEE_METHODS } from '../utils/kenyaTransactionFees'
import TransactionMessageParser from '../components/TransactionMessageParser'
import MpesaFeePreview from '../components/MpesaFeePreview'
import { getCategoriesGroupedByParent, getExpenseCategoriesForSelection, ensureUserHasCategories } from '../utils/categoryService'
import { ACCOUNT_CATEGORIES } from '../constants'
import CategorySelector from '../components/categories/CategorySelector'
import CreateRenewalReminderModal from '../components/reminders/CreateRenewalReminderModal'
import { SubscriptionService } from '../utils/subscriptionService'
import { BillReminderService } from '../utils/newBillReminderService'
import ConvertToRecurringModal from '../components/subscriptions/ConvertToRecurringModal'
import SpendingVelocityPanel from '../components/expenses/SpendingVelocityPanel'
import PaymentAndFeesPanel from '../components/expenses/PaymentAndFeesPanel'
import MonthComparisonPanel from '../components/expenses/MonthComparisonPanel'

const PAYMENT_METHODS = ['mpesa', 'cash', 'bank', 'card']

// Helper to determine parser type based on account category
const getParserType = (account) => {
  if (!account) return 'transaction'
  const category = account.category?.toLowerCase()
  if (ACCOUNT_CATEGORIES.MOBILE_MONEY.includes(category)) return 'mpesa'
  if (ACCOUNT_CATEGORIES.BANK.includes(category)) return 'bank'
  return 'transaction' // Default for cash, investment, etc.
}

export default function Expenses() {
  const { user } = useAuth()
  const toast = useToast()
  const [expenses, setExpenses] = useState([])
  const [accounts, setAccounts] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMessageParser, setShowMessageParser] = useState(false)
  const [totalExpenses, setTotalExpenses] = useState(0)

  // Database categories state (per canonical spec - categories from database, not hardcoded)
  const [categoriesGrouped, setCategoriesGrouped] = useState([])
  const [categoriesFlat, setCategoriesFlat] = useState([])

  // View details modal state
  const [viewingExpense, setViewingExpense] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [expenseDetails, setExpenseDetails] = useState(null)

  // Renewal reminder modal state
  const [showRenewalReminderModal, setShowRenewalReminderModal] = useState(false)
  const [renewalReminderPrefill, setRenewalReminderPrefill] = useState(null)

  // Convert to recurring modal state
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertExpense, setConvertExpense] = useState(null)

  // Reverse expense state
  const [showReverseModal, setShowReverseModal] = useState(false)
  const [reversingExpense, setReversingExpense] = useState(null)
  const [reverseReason, setReverseReason] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportWizard, setShowImportWizard] = useState(false)

  // Budget warning state
  const [showBudgetWarning, setShowBudgetWarning] = useState(false)
  const [budgetWarningData, setBudgetWarningData] = useState(null)
  const [pendingExpenseData, setPendingExpenseData] = useState(null)

  // Fee calculation state
  const [calculatedFee, setCalculatedFee] = useState(0)
  const [feeOverride, setFeeOverride] = useState(false)
  const [balanceCheck, setBalanceCheck] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)

  // Recurring expense state
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState('monthly')
  const [recurrenceType, setRecurrenceType] = useState('subscription') // 'subscription' or 'bill'

  const [formData, setFormData] = useState({
    amount: '',
    category_id: '', // UUID foreign key to expense_categories
    category_slug: '', // Category slug for display/compatibility
    description: '',
    payment_method: 'mpesa',
    account_id: '',
    fee_method: FEE_METHODS.MPESA_SEND,
    transaction_fee: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Helper function to determine payment method and fee method from account
  const getPaymentDetailsFromAccount = (account) => {
    let paymentMethod = 'cash' // default
    let feeMethod = FEE_METHODS.MANUAL

    if (!account) return { paymentMethod, feeMethod }

    const accountType = account.account_type?.toLowerCase()
    const accountName = account.name?.toLowerCase() || ''

    // Check for mobile money accounts (M-Pesa, Airtel Money, T-Kash)
    if (ACCOUNT_CATEGORIES.MOBILE_MONEY.includes(accountType) ||
        accountName.includes('mpesa') || accountName.includes('m-pesa') ||
        accountName.includes('airtel') || accountName.includes('tkash')) {
      paymentMethod = 'mpesa'
      feeMethod = accountType === 'airtel_money' ? FEE_METHODS.AIRTEL_MONEY : FEE_METHODS.MPESA_SEND
    }
    // Check for bank accounts
    else if (ACCOUNT_CATEGORIES.BANK.includes(accountType) ||
             accountName.includes('bank') || accountName.includes('savings') || accountName.includes('checking')) {
      paymentMethod = 'bank'
      feeMethod = FEE_METHODS.BANK_TRANSFER
    }
    // Check for card accounts
    else if (accountType === 'card' || accountType === 'credit' ||
             accountName.includes('card') || accountName.includes('credit')) {
      paymentMethod = 'card'
      feeMethod = FEE_METHODS.MANUAL
    }
    // Check for cash
    else if (accountType === 'cash' || ACCOUNT_CATEGORIES.CASH.includes(accountType)) {
      paymentMethod = 'cash'
      feeMethod = FEE_METHODS.MANUAL
    }
    // Investment accounts default to bank transfer method
    else if (ACCOUNT_CATEGORIES.INVESTMENT.includes(accountType)) {
      paymentMethod = 'bank'
      feeMethod = FEE_METHODS.MANUAL
    }

    return { paymentMethod, feeMethod }
  }

  // Helper function to check if account is mobile money (M-Pesa, Airtel Money, T-Kash)
  const isMpesaAccount = (account) => {
    if (!account) return false
    const accountType = account.account_type?.toLowerCase()
    const accountName = account.name?.toLowerCase() || ''
    return ACCOUNT_CATEGORIES.MOBILE_MONEY.includes(accountType) ||
           accountName.includes('mpesa') || accountName.includes('m-pesa') ||
           accountName.includes('airtel') || accountName.includes('tkash')
  }

  useEffect(() => {
    if (user) {
      fetchExpenses()
      fetchAccounts()
      fetchBudgets()
      fetchCategories()
    }
  }, [user])

  // Fetch categories from database (per canonical spec)
  const fetchCategories = async () => {
    try {
      // First ensure user has categories (seeds them if needed)
      const ensureResult = await ensureUserHasCategories(user.id)
      if (ensureResult.seeded) {
        console.log('Categories were seeded for new user')
      }

      const [grouped, flat] = await Promise.all([
        getCategoriesGroupedByParent(user.id),
        getExpenseCategoriesForSelection(user.id)
      ])
      setCategoriesGrouped(grouped)
      setCategoriesFlat(flat)

      // Set default category if available and form is empty
      if (flat.length > 0 && !formData.category_id) {
        setFormData(prev => ({
          ...prev,
          category_id: flat[0].id,
          category_slug: flat[0].slug
        }))
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Auto-calculate fee when amount or fee_method changes
  useEffect(() => {
    if (!feeOverride && formData.amount && formData.fee_method) {
      const fee = calculateTransactionFee(parseFloat(formData.amount), formData.fee_method)
      setCalculatedFee(fee)
      setFormData(prev => ({ ...prev, transaction_fee: fee.toString() }))
    }
  }, [formData.amount, formData.fee_method, feeOverride])

  // Check balance when account, amount, or fee changes
  useEffect(() => {
    async function checkBalance() {
      if (formData.account_id && formData.amount) {
        const expenseService = new ExpenseService(supabase, user.id)
        const totalAmount = parseFloat(formData.amount) + parseFloat(formData.transaction_fee || 0)
        const check = await expenseService.checkAccountBalance(formData.account_id, totalAmount)
        setBalanceCheck(check)
      } else {
        setBalanceCheck(null)
      }
    }
    checkBalance()
  }, [formData.account_id, formData.amount, formData.transaction_fee, user])

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error

      setExpenses(data || [])

      const currentDate = new Date()
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      // Include transaction fees in monthly total, exclude reversed expenses
      const monthlyTotal = (data || [])
        .filter(expense => {
          const expenseDate = new Date(expense.date)
          const isNotReversed = !expense.is_reversed
          return expenseDate >= firstDay && expenseDate <= lastDay && isNotReversed
        })
        .reduce((sum, expense) => {
          const amount = parseFloat(expense.amount)
          const fee = parseFloat(expense.transaction_fee || 0)
          return sum + amount + fee
        }, 0)

      setTotalExpenses(monthlyTotal)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const expenseService = new ExpenseService(supabase, user.id)
      const result = await expenseService.getAccountsForExpense()
      if (result.success) {
        setAccounts(result.accounts)
        // Auto-select primary account if available
        const primaryAccount = result.accounts.find(a => a.is_primary)
        if (primaryAccount && !formData.account_id) {
          const { paymentMethod, feeMethod } = getPaymentDetailsFromAccount(primaryAccount)
          setFormData(prev => ({
            ...prev,
            account_id: primaryAccount.id,
            payment_method: paymentMethod,
            fee_method: feeMethod
          }))
          setSelectedAccount(primaryAccount)
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchBudgets = async () => {
    try {
      const currentMonth = new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          id,
          category_id,
          monthly_limit,
          month,
          expense_categories!category_id (
            id,
            slug,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('month', currentMonth)

      if (error) throw error
      // Transform to include category slug for compatibility
      const transformedBudgets = (data || []).map(b => ({
        ...b,
        category: b.expense_categories?.slug,
        categoryName: b.expense_categories?.name
      }))
      setBudgets(transformedBudgets)
    } catch (error) {
      console.error('Error fetching budgets:', error)
    }
  }

  // Check if expense would exceed budget
  const checkBudgetImpact = (category, expenseAmount, expenseFee) => {
    const budget = budgets.find(b => b.category === category)
    if (!budget) return null // No budget set for this category

    // Calculate current spending for this category this month
    const currentDate = new Date()
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    const currentSpent = expenses
      .filter(e => {
        const expenseDate = new Date(e.date)
        const isNotReversed = !e.is_reversed
        return e.category === category &&
               expenseDate >= firstDay &&
               expenseDate <= lastDay &&
               isNotReversed
      })
      .reduce((sum, e) => {
        const amount = parseFloat(e.amount) || 0
        const fee = parseFloat(e.transaction_fee) || 0
        return sum + amount + fee
      }, 0)

    const totalWithNewExpense = currentSpent + parseFloat(expenseAmount) + parseFloat(expenseFee || 0)
    const budgetLimit = parseFloat(budget.monthly_limit)
    const wouldExceed = totalWithNewExpense > budgetLimit

    return {
      wouldExceed,
      currentSpent,
      budgetLimit,
      newTotal: totalWithNewExpense,
      overage: wouldExceed ? totalWithNewExpense - budgetLimit : 0,
      percentage: (totalWithNewExpense / budgetLimit) * 100
    }
  }

  // Calculate next due date for recurring expenses
  const calculateNextDueDate = (currentDate, frequency) => {
    const date = new Date(currentDate)

    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
      default:
        date.setMonth(date.getMonth() + 1)
    }

    return date.toISOString().split('T')[0]
  }

  const handleSubmit = async (e, bypassBudgetWarning = false) => {
    e.preventDefault()

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!formData.account_id) {
      toast.error('Please select an account')
      return
    }

    // STRICT BALANCE VALIDATION - Prevent transaction if insufficient balance
    const account = accounts.find(a => a.id === formData.account_id)
    if (account) {
      const totalRequired = parseFloat(formData.amount) + parseFloat(formData.transaction_fee || 0)
      const availableBalance = parseFloat(account.current_balance)

      if (totalRequired > availableBalance) {
        const deficit = totalRequired - availableBalance
        toast.error(
          `Insufficient balance in ${account.name}. Available: ${formatCurrency(availableBalance)}, Required: ${formatCurrency(totalRequired)}, Deficit: ${formatCurrency(deficit)}`,
          { duration: 6000 }
        )
        return
      }
    }

    // BUDGET WARNING - Check if expense would exceed budget
    if (!bypassBudgetWarning) {
      const budgetImpact = checkBudgetImpact(formData.category_slug, formData.amount, formData.transaction_fee)
      if (budgetImpact && budgetImpact.wouldExceed) {
        // Show budget warning modal
        setBudgetWarningData(budgetImpact)
        setPendingExpenseData({ ...formData, isRecurring, recurringFrequency })
        setShowBudgetWarning(true)
        return
      }
    }

    try {
      const expenseService = new ExpenseService(supabase, user.id)

      // Calculate the actual fee value to use (handles empty string edge case)
      const actualFee = feeOverride
        ? parseFloat(formData.transaction_fee || 0)
        : calculateTransactionFee(parseFloat(formData.amount), formData.fee_method)

      // Create new expense using service with category_id (proper foreign key)
      const result = await expenseService.createExpense({
        account_id: formData.account_id,
        amount: parseFloat(formData.amount),
        date: formData.date,
        category_id: formData.category_id,
        category_slug: formData.category_slug,
        description: formData.description,
        payment_method: formData.payment_method,
        fee_method: formData.fee_method,
        transaction_fee: actualFee,
        fee_override: feeOverride
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      // Use the actual calculated fee for the toast notification
      const breakdown = formatFeeBreakdown(formData.amount, actualFee, formData.fee_method)
      toast.success(`Expense added! Amount: ${breakdown.formattedAmount}, Fee: ${breakdown.formattedFee}, Total: ${breakdown.formattedTotal}`)

      // If marked as recurring, create a subscription or bill reminder
      if (isRecurring) {
        const nextDueDate = calculateNextDueDate(formData.date, recurringFrequency)
        const itemName = formData.description || `${formData.category_slug.charAt(0).toUpperCase() + formData.category_slug.slice(1)} expense`

        if (recurrenceType === 'subscription') {
          // Create subscription
          const subscriptionService = new SubscriptionService(supabase, user.id)
          const subscriptionResult = await subscriptionService.createSubscription({
            name: itemName,
            description: `Auto-created from expense on ${formData.date}`,
            categoryId: formData.category_id,
            categorySlug: formData.category_slug,
            amount: parseFloat(formData.amount),
            frequency: recurringFrequency,
            nextDueDate: nextDueDate,
            sourceExpenseId: result.expense?.id || null
          })

          if (!subscriptionResult.success) {
            console.error('Error creating subscription:', subscriptionResult.error)
            toast.warning('Expense saved, but failed to create subscription')
          } else {
            toast.success(`Subscription created! Next payment due: ${nextDueDate}`, 4000)
          }
        } else {
          // Create bill reminder
          const billReminderService = new BillReminderService(supabase, user.id)
          const billResult = await billReminderService.createBillReminder({
            name: itemName,
            description: `Auto-created from expense on ${formData.date}`,
            categoryId: formData.category_id,
            categorySlug: formData.category_slug,
            amount: parseFloat(formData.amount),
            frequency: recurringFrequency,
            nextDueDate: nextDueDate,
            sourceExpenseId: result.expense?.id || null
          })

          if (!billResult.success) {
            console.error('Error creating bill reminder:', billResult.error)
            toast.warning('Expense saved, but failed to create bill reminder')
          } else {
            toast.success(`Bill reminder created! Next payment due: ${nextDueDate}`, 4000)
          }
        }
      }

      // Reset form
      const primaryAccount = accounts.find(a => a.is_primary)
      const defaultCategory = categoriesFlat.length > 0 ? categoriesFlat[0] : null
      setFormData({
        amount: '',
        category_id: defaultCategory?.id || '',
        category_slug: defaultCategory?.slug || 'groceries',
        description: '',
        payment_method: 'mpesa',
        account_id: primaryAccount?.id || '',
        fee_method: FEE_METHODS.MPESA_SEND,
        transaction_fee: '',
        date: new Date().toISOString().split('T')[0]
      })
      setFeeOverride(false)
      setBalanceCheck(null)
      setIsRecurring(false)
      setRecurringFrequency('monthly')
      setRecurrenceType('subscription')
      setShowModal(false)
      fetchExpenses()
      fetchAccounts() // Refresh accounts to update balances
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error(`Error saving expense: ${error.message}`)
    }
  }

  // Proceed with expense despite budget warning
  const handleProceedDespiteBudget = async () => {
    setShowBudgetWarning(false)

    // Restore form data from pending expense
    if (pendingExpenseData) {
      setFormData({
        amount: pendingExpenseData.amount,
        category_id: pendingExpenseData.category_id,
        category_slug: pendingExpenseData.category_slug,
        description: pendingExpenseData.description,
        payment_method: pendingExpenseData.payment_method,
        account_id: pendingExpenseData.account_id,
        fee_method: pendingExpenseData.fee_method,
        transaction_fee: pendingExpenseData.transaction_fee,
        date: pendingExpenseData.date
      })
      setIsRecurring(pendingExpenseData.isRecurring)
      setRecurringFrequency(pendingExpenseData.recurringFrequency)
    }

    // Create a synthetic event to pass to handleSubmit
    const syntheticEvent = { preventDefault: () => {} }
    await handleSubmit(syntheticEvent, true) // bypass budget warning

    setBudgetWarningData(null)
    setPendingExpenseData(null)
  }

  const handleCancelBudgetWarning = () => {
    setShowBudgetWarning(false)
    setBudgetWarningData(null)
    setPendingExpenseData(null)
    // Keep modal open so user can adjust the expense
  }

  // View expense details
  const handleViewDetails = async (expense) => {
    setViewingExpense(expense)
    setShowViewModal(true)

    try {
      // Only fetch account info if account_id exists
      if (expense.account_id) {
        const { data: account } = await supabase
          .from('accounts')
          .select('name, account_type')
          .eq('id', expense.account_id)
          .single()

        setExpenseDetails({
          ...expense,
          account_name: account?.name || 'Unknown Account',
          account_type: account?.account_type || 'unknown'
        })
      } else {
        // No account_id - legacy expense or cash transaction
        setExpenseDetails({
          ...expense,
          account_name: 'Cash/Untracked',
          account_type: 'cash'
        })
      }
    } catch (error) {
      console.error('Error fetching expense details:', error)
      setExpenseDetails({
        ...expense,
        account_name: 'Unknown Account',
        account_type: 'unknown'
      })
    }
  }

  // Open reverse modal
  const handleOpenReverse = (expense) => {
    setReversingExpense(expense)
    setReverseReason('')
    setShowReverseModal(true)
  }

  // Reverse expense
  const handleReverseExpense = async () => {
    if (!reversingExpense || !reverseReason.trim()) {
      toast.error('Please provide a reason for reversing this expense')
      return
    }

    try {
      const expenseAmount = parseFloat(reversingExpense.amount)
      const feeAmount = parseFloat(reversingExpense.transaction_fee || 0)
      const totalAmount = expenseAmount + feeAmount
      const reversalDate = new Date().toISOString().split('T')[0]

      // Step 1: Mark expense as reversed in expenses table
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          is_reversed: true,
          reversal_reason: reverseReason.trim(),
          reversed_at: new Date().toISOString()
        })
        .eq('id', reversingExpense.id)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Step 2: Create REVERSAL transaction in ledger (per spec)
      // Per reversal.md spec:
      //   transaction_type: 'reversal'
      //   from_account_id: null (not coming from anywhere)
      //   to_account_id: original source account (money flows BACK IN)
      //   reference_type: 'expense_reversal'
      //   reference_id: original expense id
      //   amount: total (expense + fee combined)
      const { error: reversalError } = await supabase
        .from('account_transactions')
        .insert({
          user_id: user.id,
          from_account_id: null,
          to_account_id: reversingExpense.account_id,
          transaction_type: 'reversal',
          amount: totalAmount,
          date: reversalDate,
          category: reversingExpense.category,
          description: `Reversal of ${reversingExpense.category} expense${feeAmount > 0 ? ` (incl. ${formatCurrency(feeAmount)} fee)` : ''}${reversingExpense.description ? ': ' + reversingExpense.description : ''} - Reason: ${reverseReason.trim()}`,
          reference_id: reversingExpense.id,
          reference_type: 'expense_reversal'
        })

      if (reversalError) throw reversalError

      // Note: Balance is automatically updated by database trigger
      // No manual balance update needed - ledger is source of truth

      // Success notification
      toast.success(`Expense reversed! ${formatCurrency(totalAmount)} has been returned to your account.`)

      // Reset and refresh
      setShowReverseModal(false)
      setReversingExpense(null)
      setReverseReason('')
      fetchExpenses()
      fetchAccounts()
    } catch (error) {
      console.error('Error reversing expense:', error)
      toast.error(`Failed to reverse expense: ${error.message}`)
    }
  }

  const handleAccountChange = (accountId) => {
    const account = accounts.find(a => a.id === accountId)
    setSelectedAccount(account || null)

    // Auto-set payment method and fee method based on account type
    if (account) {
      const { paymentMethod, feeMethod } = getPaymentDetailsFromAccount(account)

      setFormData(prev => ({
        ...prev,
        account_id: accountId,
        payment_method: paymentMethod,
        fee_method: feeMethod
      }))

      // Reset fee override when account changes
      setFeeOverride(false)
    } else {
      setFormData(prev => ({ ...prev, account_id: accountId }))
    }
  }

  // Map parsed transaction types to fee methods
  const getFeeMethodFromTransactionType = (transactionType, bankTransferType) => {
    // M-Pesa transaction types
    if (transactionType === 'payment_till') return FEE_METHODS.MPESA_BUY_GOODS
    if (transactionType === 'payment_paybill') return FEE_METHODS.MPESA_PAYBILL
    if (transactionType === 'payment') return FEE_METHODS.MPESA_BUY_GOODS // Legacy fallback (most payments are till)
    if (transactionType === 'send_money') return FEE_METHODS.MPESA_SEND
    if (transactionType === 'withdraw') return FEE_METHODS.MPESA_WITHDRAW_AGENT
    if (transactionType === 'airtime_purchase') return FEE_METHODS.MPESA_BUY_GOODS

    // Bank transfer types
    if (transactionType === 'bank_transfer' || transactionType === 'bank_debit') {
      if (bankTransferType === 'bank_to_till') return FEE_METHODS.MPESA_BUY_GOODS
      if (bankTransferType === 'bank_to_paybill') return FEE_METHODS.MPESA_PAYBILL
      if (bankTransferType === 'bank_to_mpesa') return FEE_METHODS.MPESA_SEND
      return FEE_METHODS.BANK_TRANSFER
    }

    // Default
    return FEE_METHODS.MPESA_SEND
  }

  const handleParsedMessage = (parsedData) => {
    // Parse the date from SMS (format: "5/1/26 1:32 PM" or "23/12/24") to YYYY-MM-DD
    // Kenya M-Pesa dates are DD/MM/YY format
    let parsedDate = formData.date // Keep current date as fallback
    if (parsedData.transactionDate) {
      try {
        // Extract just the date part (before time)
        const datePart = parsedData.transactionDate.split(' ')[0]
        const parts = datePart.split('/')
        if (parts.length === 3) {
          // Kenya M-Pesa format is DD/MM/YY (not US MM/DD/YY)
          let [day, month, year] = parts
          // Handle 2-digit year
          if (year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`
          }
          // Pad month and day
          month = month.padStart(2, '0')
          day = day.padStart(2, '0')
          parsedDate = `${year}-${month}-${day}`
        }
      } catch (e) {
        console.error('Error parsing date from SMS:', e)
      }
    }

    // Determine the fee method based on transaction type
    const feeMethod = getFeeMethodFromTransactionType(
      parsedData.transactionType,
      parsedData.bankTransferType
    )

    // Update form data with parsed transaction details including date and fee method
    setFormData(prev => ({
      ...prev,
      amount: parsedData.amount.toString(),
      transaction_fee: parsedData.transactionFee.toString(),
      description: `${parsedData.description}${parsedData.reference ? ' - Ref: ' + parsedData.reference : ''}`.trim(),
      date: parsedDate,
      fee_method: feeMethod
    }))

    // Set fee override since we got the fee from the message
    setFeeOverride(true)

    // Open the main form modal
    setShowModal(true)
  }

  // Handle CSV import
  const handleCSVImport = async (data) => {
    try {
      const expenseService = new ExpenseService(supabase, user.id)
      let successCount = 0
      let errorCount = 0

      // Get primary account for imported expenses
      const primaryAccount = accounts.find(a => a.is_primary) || accounts[0]
      if (!primaryAccount) {
        throw new Error('No account available. Please create an account first.')
      }

      for (const item of data) {
        try {
          const result = await expenseService.createExpense({
            account_id: primaryAccount.id,
            amount: parseFloat(item.amount) || 0,
            date: item.date || new Date().toISOString().split('T')[0],
            category_slug: item.category || 'other',
            description: item.description || 'Imported expense',
            payment_method: item.payment_method || 'cash',
            fee_method: 'none',
            transaction_fee: 0,
            fee_override: true
          })

          if (result.success) {
            successCount++
          } else {
            errorCount++
          }
        } catch (e) {
          errorCount++
        }
      }

      await fetchExpenses()
      await fetchAccounts()

      if (errorCount > 0) {
        toast.warning(`Imported ${successCount} expenses. ${errorCount} failed.`)
      } else {
        toast.success(`Successfully imported ${successCount} expenses!`)
      }

      return { success: true, count: successCount }
    } catch (error) {
      console.error('Import error:', error)
      throw error
    }
  }

  const filteredExpenses = (() => {
    // First apply category and payment filters
    let result = expenses.filter(expense => {
      const categoryMatch = filterCategory === 'all' || expense.category === filterCategory
      const paymentMatch = filterPayment === 'all' || expense.payment_method === filterPayment
      return categoryMatch && paymentMatch
    })
    // Then apply search
    if (searchQuery.trim()) {
      result = searchItems(result, searchQuery, ['description', 'category', 'payment_method', 'amount'])
    }
    return result
  })()

  const getCategoryTotal = (category) => {
    const currentMonth = expenses.filter(e => {
      const d = new Date(e.date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !e.is_reversed
    })
    return currentMonth
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0)
  }

  // Calculate top categories from actual expense data (not hardcoded list)
  const topCategories = (() => {
    const currentMonth = expenses.filter(e => {
      const d = new Date(e.date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !e.is_reversed
    })

    // Group expenses by category
    const categoryTotals = {}
    currentMonth.forEach(e => {
      const cat = e.category || 'uncategorized'
      if (!categoryTotals[cat]) categoryTotals[cat] = 0
      categoryTotals[cat] += parseFloat(e.amount) + parseFloat(e.transaction_fee || 0)
    })

    // Convert to array and sort
    return Object.entries(categoryTotals)
      .map(([category, total]) => ({ category, total }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-100 dark:text-red-200">Total Expenses This Month</p>
            <TrendingDown className="h-6 w-6 text-red-200 dark:text-red-300" />
          </div>
          <p className="text-4xl font-bold">{formatCurrency(totalExpenses)}</p>
          <p className="text-sm text-red-100 dark:text-red-200 mt-2">
            {expenses.filter(e => {
              const d = new Date(e.date)
              const now = new Date()
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !e.is_reversed
            }).length} transactions this month
          </p>
        </div>

        <div className="card flex flex-col items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={() => {
              // Auto-select first budgeted category if available, otherwise default to first database category
              const firstBudgetedCategoryId = budgets.length > 0 ? budgets[0].category_id : null
              const defaultCategoryObj = firstBudgetedCategoryId
                ? categoriesFlat.find(c => c.id === firstBudgetedCategoryId)
                : categoriesFlat[0]

              setFormData({
                amount: '',
                category_id: defaultCategoryObj?.id || '',
                category_slug: defaultCategoryObj?.slug || 'groceries',
                description: '',
                payment_method: 'mpesa',
                account_id: accounts.find(a => a.is_primary)?.id || '',
                fee_method: FEE_METHODS.MPESA_SEND,
                transaction_fee: '',
                date: new Date().toISOString().split('T')[0]
              })
              setFeeOverride(false)
              setBalanceCheck(null)
              setShowModal(true)
            }}
            className="btn btn-primary py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg flex items-center w-full sm:w-auto justify-center"
          >
            <Plus className="h-5 sm:h-6 w-5 sm:w-6 mr-2" />
            Add New Expense
          </button>
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto justify-center">
            <button
              onClick={() => setShowMessageParser(true)}
              className="btn btn-secondary py-2 px-4 flex items-center whitespace-nowrap text-sm"
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Parse SMS
            </button>
            <button
              onClick={() => setShowImportWizard(true)}
              className="btn btn-secondary py-2 px-4 flex items-center whitespace-nowrap text-sm"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Import CSV
            </button>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Spending Categories This Month
          </h3>
          <div className="space-y-3">
            {topCategories.map(({ category, total }) => {
              const Icon = getCategoryIcon(category)
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                      <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{category}</p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                        <div
                          className="bg-red-500 dark:bg-red-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(total / totalExpenses * 100).toFixed(0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(total)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {((total / totalExpenses) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Insight Panels */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SpendingVelocityPanel expenses={expenses} />
          <PaymentAndFeesPanel expenses={expenses} />
          <MonthComparisonPanel expenses={expenses} />
        </div>
      )}

      {/* Search & Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Search & Filters</h3>
          </div>
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search expenses by description, category, amount..."
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select
              className="select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {/* Use hierarchical categories from database */}
              {categoriesGrouped.map((group) => (
                <optgroup key={group.parentSlug} label={group.parentName}>
                  {group.categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select
              className="select"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            >
              <option value="all">All Methods</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Expense History {(filterCategory !== 'all' || filterPayment !== 'all' || searchQuery.trim()) ? `(${filteredExpenses.length} result${filteredExpenses.length !== 1 ? 's' : ''})` : ''}
        </h3>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <TrendingDown className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {expenses.length === 0
                ? 'No expenses recorded yet'
                : searchQuery.trim()
                  ? `No expenses match "${searchQuery}"`
                  : 'No expenses match your filters'}
            </p>
            {expenses.length === 0 && (
              <button
                onClick={() => {
                  // Auto-select first budgeted category if available, otherwise default to first database category
                  const firstBudgetedCategoryId = budgets.length > 0 ? budgets[0].category_id : null
                  const defaultCategoryObj = firstBudgetedCategoryId
                    ? categoriesFlat.find(c => c.id === firstBudgetedCategoryId)
                    : categoriesFlat[0]

                  setFormData({
                    amount: '',
                    category_id: defaultCategoryObj?.id || '',
                    category_slug: defaultCategoryObj?.slug || 'groceries',
                    description: '',
                    payment_method: 'mpesa',
                    account_id: accounts.find(a => a.is_primary)?.id || '',
                    fee_method: FEE_METHODS.MPESA_SEND,
                    transaction_fee: '',
                    date: new Date().toISOString().split('T')[0]
                  })
                  setFeeOverride(false)
                  setBalanceCheck(null)
                  setShowModal(true)
                }}
                className="btn btn-primary"
              >
                Add Your First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => {
              const CategoryIcon = getCategoryIcon(expense.category)
              const PaymentIcon = getPaymentIcon(expense.payment_method)
              const isReversed = expense.is_reversed
              const totalWithFee = parseFloat(expense.amount) + parseFloat(expense.transaction_fee || 0)

              return (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                    isReversed
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`p-2.5 rounded-lg ${isReversed ? 'bg-red-100 dark:bg-red-900/40' : 'bg-white dark:bg-gray-800'}`}>
                      <CategoryIcon className={`h-7 w-7 ${isReversed ? 'text-red-400' : 'text-gray-700 dark:text-gray-300'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap">
                        <p className={`font-semibold capitalize ${isReversed ? 'text-red-600 dark:text-red-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                          {expense.category}
                        </p>
                        {isReversed && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded">
                            REVERSED
                          </span>
                        )}
                        <span className={`badge ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                        <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <PaymentIcon className="h-3.5 w-3.5 mr-1" />
                          {expense.payment_method}
                        </span>
                      </div>
                      {expense.description && (
                        <p className={`text-sm ${isReversed ? 'text-red-500 dark:text-red-400 line-through' : 'text-gray-600 dark:text-gray-400'}`}>
                          {expense.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-3 mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(expense.date).toLocaleDateString('en-KE', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        {parseFloat(expense.transaction_fee || 0) > 0 && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            Fee: {formatCurrency(expense.transaction_fee)}
                          </p>
                        )}
                      </div>
                      {isReversed && expense.reversal_reason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">
                          Reason: {expense.reversal_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${isReversed ? 'text-red-400 dark:text-red-500 line-through' : 'text-red-600 dark:text-red-400'}`}>
                        -{formatCurrency(expense.amount)}
                      </p>
                      {parseFloat(expense.transaction_fee || 0) > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Total: {formatCurrency(totalWithFee)}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(expense)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!isReversed && (
                        <button
                          onClick={() => handleOpenReverse(expense)}
                          className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                          title="Reverse Expense"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full my-8 animate-slideIn shadow-2xl">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-xl z-10">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Add New Expense
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setShowMessageParser(true)
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center mt-1"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {(() => {
                    const selectedAccount = accounts.find(a => a.id === formData.account_id)
                    const parserType = getParserType(selectedAccount)
                    return parserType === 'mpesa' ? 'Parse M-Pesa SMS' :
                           parserType === 'bank' ? 'Parse Bank SMS' :
                           'Parse Transaction Message'
                  })()}
                </button>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form id="expense-form" onSubmit={handleSubmit} className="p-6 pt-4 max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
              {/* Account Selector */}
              <div className="form-group">
                <label className="label flex items-center">
                  <Wallet className="h-4 w-4 mr-1" />
                  Account *
                </label>
                <select
                  className="select"
                  value={formData.account_id}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.current_balance)}
                      {account.is_primary && ' (Primary)'}
                    </option>
                  ))}
                </select>
                {selectedAccount && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current balance: {formatCurrency(selectedAccount.current_balance)}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="label">Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="500"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              {/* M-Pesa Fee Preview - Enhanced UI for M-Pesa accounts */}
              {isMpesaAccount(selectedAccount) && !feeOverride ? (
                <MpesaFeePreview
                  amount={formData.amount}
                  category={formData.category_slug}
                  selectedFeeMethod={formData.fee_method}
                  onFeeMethodChange={(method) => setFormData({ ...formData, fee_method: method })}
                  onFeeCalculated={(fee) => setFormData(prev => ({ ...prev, transaction_fee: fee.toString() }))}
                />
              ) : (
                <>
                  {/* Fee Method Selector - For non-M-Pesa accounts */}
                  <div className="form-group">
                    <label className="label flex items-center justify-between">
                      <span>Fee Calculation Method</span>
                      <label className="flex items-center text-xs font-normal cursor-pointer">
                        <input
                          type="checkbox"
                          checked={feeOverride}
                          onChange={(e) => setFeeOverride(e.target.checked)}
                          className="mr-1"
                        />
                        Manual Override
                      </label>
                    </label>
                    <select
                      className="select"
                      value={formData.fee_method}
                      onChange={(e) => setFormData({ ...formData, fee_method: e.target.value })}
                      disabled={feeOverride}
                    >
                      {getAvailableFeeMethods().map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transaction Fee Display/Input */}
                  <div className="form-group">
                    <label className="label">Transaction Fee (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="0"
                      value={formData.transaction_fee}
                      onChange={(e) => {
                        setFormData({ ...formData, transaction_fee: e.target.value })
                        setFeeOverride(true)
                      }}
                      readOnly={!feeOverride}
                    />
                    {!feeOverride && formData.amount && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Auto-calculated based on {formData.fee_method}
                      </p>
                    )}
                  </div>

                  {/* Total Amount Display */}
                  {formData.amount && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(formData.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Fee:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(parseFloat(formData.transaction_fee) || 0)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t border-blue-300 dark:border-blue-700 pt-1">
                        <span className="text-gray-900 dark:text-gray-100">Total:</span>
                        <span className="text-gray-900 dark:text-gray-100">{formatCurrency((parseFloat(formData.amount) || 0) + (parseFloat(formData.transaction_fee) || 0))}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Manual Override for M-Pesa accounts */}
              {isMpesaAccount(selectedAccount) && (
                <div className="flex items-center justify-end">
                  <label className="flex items-center text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feeOverride}
                      onChange={(e) => setFeeOverride(e.target.checked)}
                      className="mr-1.5"
                    />
                    Enter fee manually
                  </label>
                </div>
              )}

              {/* Balance Warning */}
              {balanceCheck && !balanceCheck.sufficient && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800 rounded-lg flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-900 dark:text-amber-400">Insufficient Balance</p>
                    <p className="text-amber-700 dark:text-amber-500">
                      {balanceCheck.accountName} has {formatCurrency(balanceCheck.balance)} available.
                      You need {formatCurrency((parseFloat(formData.amount) || 0) + (parseFloat(formData.transaction_fee) || 0))}.
                      Deficit: {formatCurrency(balanceCheck.deficit)}
                    </p>
                    <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                      You can still proceed, but the transaction will be recorded.
                    </p>
                  </div>
                </div>
              )}

              {/* Balance OK */}
              {balanceCheck && balanceCheck.sufficient && (
                <div className="p-2 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Sufficient balance available
                  </p>
                </div>
              )}

              {/* Recurring Expense Toggle */}
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <RefreshCw className={`h-5 w-5 ${isRecurring ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">Make this recurring</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Track as a subscription or bill reminder</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isRecurring ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isRecurring ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {isRecurring && (
                    <div className="pt-3 border-t border-purple-200 dark:border-purple-700 space-y-4">
                      {/* Frequency Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Frequency
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setRecurringFrequency('monthly')}
                            className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                              recurringFrequency === 'monthly'
                                ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-300'
                            }`}
                          >
                            Monthly
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecurringFrequency('yearly')}
                            className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                              recurringFrequency === 'yearly'
                                ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-300'
                            }`}
                          >
                            Yearly
                          </button>
                        </div>
                      </div>

                      {/* Type Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Type
                        </label>
                        <div className="space-y-2">
                          <label
                            className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              recurrenceType === 'subscription'
                                ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40'
                                : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="recurrenceType"
                              value="subscription"
                              checked={recurrenceType === 'subscription'}
                              onChange={() => setRecurrenceType('subscription')}
                              className="sr-only"
                            />
                            <div className="flex-1">
                              <p className={`font-medium ${recurrenceType === 'subscription' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                Subscription
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Netflix, Spotify, software, streaming services
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              recurrenceType === 'subscription'
                                ? 'border-purple-500 bg-purple-500'
                                : 'border-gray-300 dark:border-gray-500'
                            }`}>
                              {recurrenceType === 'subscription' && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </label>

                          <label
                            className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              recurrenceType === 'bill'
                                ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40'
                                : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="recurrenceType"
                              value="bill"
                              checked={recurrenceType === 'bill'}
                              onChange={() => setRecurrenceType('bill')}
                              className="sr-only"
                            />
                            <div className="flex-1">
                              <p className={`font-medium ${recurrenceType === 'bill' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                Bill Reminder
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Rent, utilities, loan payments, insurance
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              recurrenceType === 'bill'
                                ? 'border-purple-500 bg-purple-500'
                                : 'border-gray-300 dark:border-gray-500'
                            }`}>
                              {recurrenceType === 'bill' && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Next Due Date Preview */}
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          <span className="font-medium">Next {recurrenceType === 'subscription' ? 'payment' : 'bill'} due:</span>{' '}
                          {new Date(calculateNextDueDate(formData.date, recurringFrequency)).toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              <div className="form-group">
                <label className="label">Category *</label>
                <CategorySelector
                  userId={user.id}
                  value={formData.category_id}
                  onChange={(category) => {
                    setFormData({
                      ...formData,
                      category_id: category?.id || '',
                      category_slug: category?.slug || ''
                    })
                  }}
                  placeholder="Select a category"
                  showDescription
                />

                {/* Budget Impact Preview */}
                {formData.amount && (() => {
                  const budgetImpact = checkBudgetImpact(formData.category_slug, formData.amount, formData.transaction_fee)
                  if (!budgetImpact) return null

                  return (
                    <div className={`mt-2 p-3 rounded-lg border ${
                      budgetImpact.wouldExceed
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                        : budgetImpact.percentage >= 80
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    }`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Budget Impact</span>
                        <span className={`font-bold ${
                          budgetImpact.wouldExceed
                            ? 'text-red-600 dark:text-red-400'
                            : budgetImpact.percentage >= 80
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {budgetImpact.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            budgetImpact.wouldExceed
                              ? 'bg-red-500'
                              : budgetImpact.percentage >= 80
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(budgetImpact.percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatCurrency(budgetImpact.newTotal)} of {formatCurrency(budgetImpact.budgetLimit)}
                        </span>
                        {budgetImpact.wouldExceed && (
                          <span className="text-red-600 dark:text-red-400 font-semibold flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Over by {formatCurrency(budgetImpact.overage)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="form-group">
                <label className="label">Description</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Lunch at Java, Uber to town"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Payment Method *</label>
                <select
                  className="select"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  required
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

            </form>

            <div className="flex space-x-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setFeeOverride(false)
                  setBalanceCheck(null)
                }}
                className="flex-1 btn btn-secondary py-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="expense-form"
                className="flex-1 btn btn-primary py-3"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Message Parser Modal */}
      {showMessageParser && (
        <TransactionMessageParser
          onParsed={handleParsedMessage}
          onClose={() => setShowMessageParser(false)}
        />
      )}

      {/* View Details Modal */}
      {showViewModal && viewingExpense && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full animate-slideIn shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <FileText className="h-5 w-5 text-blue-500 mr-2" />
                Expense Details
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  setViewingExpense(null)
                  setExpenseDetails(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Reversed Status Warning */}
              {viewingExpense.is_reversed && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="font-bold text-red-700 dark:text-red-400">REVERSED</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    This expense was reversed on {viewingExpense.reversed_at ? new Date(viewingExpense.reversed_at).toLocaleDateString('en-KE') : 'N/A'}
                  </p>
                  {viewingExpense.reversal_reason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      <strong>Reason:</strong> {viewingExpense.reversal_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Amount Summary */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl p-4 text-white">
                <p className="text-red-100 text-sm mb-1">Total Spent</p>
                <p className="text-3xl font-bold">
                  -{formatCurrency(parseFloat(viewingExpense.amount) + parseFloat(viewingExpense.transaction_fee || 0))}
                </p>
                {parseFloat(viewingExpense.transaction_fee || 0) > 0 && (
                  <div className="mt-2 pt-2 border-t border-red-400/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-red-100">Amount:</span>
                      <span className="text-white font-medium">{formatCurrency(viewingExpense.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-100">Transaction Fee:</span>
                      <span className="text-white font-medium">{formatCurrency(viewingExpense.transaction_fee)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
                    <Tag className="h-4 w-4 mr-1" />
                    <span className="text-xs">Category</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{viewingExpense.category}</p>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
                    <CreditCard className="h-4 w-4 mr-1" />
                    <span className="text-xs">Payment Method</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{viewingExpense.payment_method}</p>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="text-xs">Date</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(viewingExpense.date).toLocaleDateString('en-KE', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
                    <Building2 className="h-4 w-4 mr-1" />
                    <span className="text-xs">Account</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {expenseDetails?.account_name || 'Loading...'}
                  </p>
                </div>
              </div>

              {/* Description */}
              {viewingExpense.description && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center text-blue-600 dark:text-blue-400 mb-2">
                    <FileText className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Description</span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200">{viewingExpense.description}</p>
                </div>
              )}

              {/* Fee Details */}
              {parseFloat(viewingExpense.transaction_fee || 0) > 0 && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center text-orange-600 dark:text-orange-400 mb-2">
                    <Receipt className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Transaction Fee Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600 dark:text-gray-400">Fee Method:</div>
                    <div className="text-gray-900 dark:text-gray-100 font-medium">{viewingExpense.fee_method || 'N/A'}</div>
                    <div className="text-gray-600 dark:text-gray-400">Fee Amount:</div>
                    <div className="text-orange-600 dark:text-orange-400 font-medium">{formatCurrency(viewingExpense.transaction_fee)}</div>
                    <div className="text-gray-600 dark:text-gray-400">Manual Override:</div>
                    <div className="text-gray-900 dark:text-gray-100">{viewingExpense.fee_override ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Created: {viewingExpense.created_at ? new Date(viewingExpense.created_at).toLocaleString('en-KE') : 'N/A'}</p>
                {viewingExpense.updated_at && viewingExpense.updated_at !== viewingExpense.created_at && (
                  <p>Last Updated: {new Date(viewingExpense.updated_at).toLocaleString('en-KE')}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-3 p-6 pt-0">
              {/* Make Recurring button - for one-time expenses */}
              {!viewingExpense.is_reversed && !viewingExpense.is_recurrent && (
                <button
                  onClick={() => {
                    setConvertExpense(viewingExpense)
                    setShowViewModal(false)
                    setShowConvertModal(true)
                  }}
                  className="w-full btn bg-purple-500 hover:bg-purple-600 text-white py-3 flex items-center justify-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Make Recurring
                </button>
              )}

              {/* Show recurrent badge if already recurring */}
              {viewingExpense.is_recurrent && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center text-purple-600 dark:text-purple-400">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">
                      This is a recurring {viewingExpense.recurrence_type === 'subscription' ? 'subscription' : 'bill'} ({viewingExpense.recurrence_frequency})
                    </span>
                  </div>
                </div>
              )}

              {/* Remind me to cancel button - for subscriptions/recurring expenses */}
              {!viewingExpense.is_reversed && (
                <button
                  onClick={() => {
                    setRenewalReminderPrefill({
                      expenseId: viewingExpense.id,
                      title: viewingExpense.description || viewingExpense.category,
                      amount: viewingExpense.amount,
                      date: viewingExpense.date
                    })
                    setShowViewModal(false)
                    setShowRenewalReminderModal(true)
                  }}
                  className="w-full btn bg-red-500 hover:bg-red-600 text-white py-3 flex items-center justify-center"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Remind Me to Cancel
                </button>
              )}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingExpense(null)
                    setExpenseDetails(null)
                  }}
                  className="flex-1 btn btn-secondary py-3"
                >
                  Close
                </button>
                {!viewingExpense.is_reversed && (
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      handleOpenReverse(viewingExpense)
                    }}
                    className="flex-1 btn bg-orange-500 hover:bg-orange-600 text-white py-3 flex items-center justify-center"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reverse
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reverse Expense Modal */}
      {showReverseModal && reversingExpense && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full animate-slideIn shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                Reverse Expense
              </h3>
              <button
                onClick={() => {
                  setShowReverseModal(false)
                  setReversingExpense(null)
                  setReverseReason('')
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                  You are about to reverse the following expense:
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{reversingExpense.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reversingExpense.amount)}</span>
                  </div>
                  {parseFloat(reversingExpense.transaction_fee || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Transaction Fee:</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(reversingExpense.transaction_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-orange-300 dark:border-orange-700">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Total to Restore:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      +{formatCurrency(parseFloat(reversingExpense.amount) + parseFloat(reversingExpense.transaction_fee || 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>What happens when you reverse:</strong>
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                  <li>The full amount (including fees) will be returned to your account</li>
                  <li>A reversal transaction will be recorded in account history</li>
                  <li>The expense will be marked as reversed with your reason</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>

              <div>
                <label className="label">Reason for Reversal *</label>
                <textarea
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  className="input min-h-[80px]"
                  placeholder="e.g., Duplicate entry, Amount entered incorrectly, Transaction did not go through..."
                  required
                />
              </div>
            </div>

            <div className="flex space-x-3 p-6 pt-0">
              <button
                onClick={() => {
                  setShowReverseModal(false)
                  setReversingExpense(null)
                  setReverseReason('')
                }}
                className="flex-1 btn btn-secondary py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleReverseExpense}
                disabled={!reverseReason.trim()}
                className="flex-1 btn bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 flex items-center justify-center"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Warning Modal */}
      {showBudgetWarning && budgetWarningData && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-8 animate-slideIn border-2 border-orange-500 dark:border-orange-600">
            <div className="flex items-start space-x-4 mb-6">
              <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-3 flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Budget Alert
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This expense would exceed your budget for{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {formData.category_slug}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Current Spent</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(budgetWarningData.currentSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Budget Limit</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(budgetWarningData.budgetLimit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">New Total</p>
                    <p className="font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(budgetWarningData.newTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Over Budget</p>
                    <p className="font-bold text-red-600 dark:text-red-400">
                      +{formatCurrency(budgetWarningData.overage)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget Usage</span>
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {budgetWarningData.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 bg-red-500 rounded-full transition-all"
                    style={{ width: `${Math.min(budgetWarningData.percentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>What you can do:</strong>
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                  <li>Cancel and reduce the expense amount</li>
                  <li>Cancel and adjust your budget limit</li>
                  <li>Proceed anyway (not recommended)</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancelBudgetWarning}
                className="flex-1 btn btn-secondary py-3"
              >
                Go Back & Adjust
              </button>
              <button
                onClick={handleProceedDespiteBudget}
                className="flex-1 btn bg-orange-500 hover:bg-orange-600 text-white py-3 flex items-center justify-center"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Wizard */}
      <ImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        type="expense"
        onImport={handleCSVImport}
      />

      {/* Renewal Reminder Modal - "Remind me to cancel" */}
      <CreateRenewalReminderModal
        isOpen={showRenewalReminderModal}
        onClose={() => {
          setShowRenewalReminderModal(false)
          setRenewalReminderPrefill(null)
        }}
        onSuccess={() => {
          setShowRenewalReminderModal(false)
          setRenewalReminderPrefill(null)
        }}
        prefillData={renewalReminderPrefill}
      />

      {/* Convert to Recurring Modal */}
      <ConvertToRecurringModal
        isOpen={showConvertModal}
        onClose={() => {
          setShowConvertModal(false)
          setConvertExpense(null)
        }}
        onSuccess={() => {
          fetchExpenses()
        }}
        expense={convertExpense}
      />
    </div>
  )
}
