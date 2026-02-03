import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { formatCurrency, calculateNetSalary } from '../utils/calculations'
import { getIncomeIcon } from '../utils/iconMappings'
import { Plus, Eye, RotateCcw, DollarSign, TrendingUp, X, Calculator, FileText, Wallet, MinusCircle, Building2, AlertTriangle, CheckCircle, Calendar, RefreshCw, PauseCircle, PlayCircle, Trash2, Search, MessageSquare } from 'lucide-react'
import SearchBar, { searchItems } from '../components/ui/SearchBar'
import { IncomeService } from '../utils/incomeService'
import TransactionMessageParser from '../components/TransactionMessageParser'
import { ACCOUNT_CATEGORIES } from '../constants'

const INCOME_SOURCES = ['salary', 'side_hustle', 'investment', 'bonus', 'gift', 'other']

export default function Income() {
  const { user } = useAuth()
  const toast = useToast()
  const [incomes, setIncomes] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [totalIncome, setTotalIncome] = useState(0)
  const [showCalculator, setShowCalculator] = useState(false)

  // View details modal state
  const [viewingIncome, setViewingIncome] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [incomeDetails, setIncomeDetails] = useState(null)

  // Reverse income state
  const [showReverseModal, setShowReverseModal] = useState(false)
  const [reversingIncome, setReversingIncome] = useState(null)
  const [reverseReason, setReverseReason] = useState('')

  // Custom deductions state
  const [customDeductions, setCustomDeductions] = useState([])
  const [showDeductionsSection, setShowDeductionsSection] = useState(false)
  const [saccoAccounts, setSaccoAccounts] = useState([])
  const [loanAccounts, setLoanAccounts] = useState([])

  const [formData, setFormData] = useState({
    amount: '',
    source: 'salary',
    source_name: '', // Who paid - employer name, client, etc.
    description: '',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    gross_salary: '', // For salary with deductions
    is_gross: false
  })

  const [calculatedSalary, setCalculatedSalary] = useState(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Message parser state
  const [showMessageParser, setShowMessageParser] = useState(false)

  // Recurring income state
  const [activeView, setActiveView] = useState('all') // 'all' | 'recurring'
  const [recurringIncomes, setRecurringIncomes] = useState([])
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState(null)
  const [recurringFormData, setRecurringFormData] = useState({
    source: 'salary',
    source_name: '',
    amount: '',
    description: '',
    account_id: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    auto_create: false,
    auto_create_days_before: 0,
    is_gross: false,
    gross_salary: '',
    statutory_deductions: '',
    tax_amount: ''
  })

  useEffect(() => {
    if (user) {
      fetchIncomes()
      fetchAccounts()
      fetchRecurringIncome()
      fetchSaccoAccounts()
      fetchLoanAccounts()
    }
  }, [user])

  useEffect(() => {
    // Auto-calculate when gross salary is entered
    if (formData.is_gross && formData.gross_salary && parseFloat(formData.gross_salary) > 0) {
      const result = calculateNetSalary(parseFloat(formData.gross_salary))
      setCalculatedSalary(result)
      setFormData(prev => ({ ...prev, amount: result.netSalary.toString() }))
    } else {
      setCalculatedSalary(null)
    }
  }, [formData.gross_salary, formData.is_gross])

  const fetchIncomes = async () => {
    try {
      // Step 1: Get all incomes
      const { data: incomesData, error: incomesError } = await supabase
        .from('income')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (incomesError) throw incomesError

      // Step 2: Get all account_transactions for these incomes
      const incomeIds = (incomesData || []).map(inc => inc.id)

      let depositedTransactions = []
      if (incomeIds.length > 0) {
        const { data: transData, error: transError } = await supabase
          .from('account_transactions')
          .select('reference_id, amount')
          .eq('reference_type', 'income')
          .in('reference_id', incomeIds)
          .eq('user_id', user.id)

        if (transError) throw transError
        depositedTransactions = transData || []
      }

      // Step 3: Match up incomes with their deposited amounts
      const incomesWithDeposits = (incomesData || []).map(income => ({
        ...income,
        deposited_transaction: depositedTransactions.filter(
          trans => trans.reference_id === income.id
        )
      }))

      setIncomes(incomesWithDeposits)

      const currentDate = new Date()
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      // Calculate monthly total, excluding reversed incomes
      // Use the deposited amount (from account_transactions) for accurate total
      const monthlyTotal = (incomesWithDeposits || [])
        .filter(income => {
          const incomeDate = new Date(income.date)
          // Exclude reversed incomes from the total
          return incomeDate >= firstDay && incomeDate <= lastDay && !income.is_reversed
        })
        .reduce((sum, income) => {
          // Use deposited amount if available (accounts for deductions), otherwise fall back to income amount
          const depositedAmount = income.deposited_transaction?.[0]?.amount || income.amount
          return sum + parseFloat(depositedAmount)
        }, 0)

      setTotalIncome(monthlyTotal)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching incomes:', error)
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const incomeService = new IncomeService(supabase, user.id)
      const result = await incomeService.getAccountsForIncome()
      if (result.success) {
        setAccounts(result.accounts)
        // Auto-select primary account
        const primaryAccount = result.accounts.find(a => a.is_primary)
        if (primaryAccount && !formData.account_id) {
          setFormData(prev => ({ ...prev, account_id: primaryAccount.id }))
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchSaccoAccounts = async () => {
    try {
      const incomeService = new IncomeService(supabase, user.id)
      const result = await incomeService.getSaccoAccounts()
      if (result.success) {
        setSaccoAccounts(result.accounts)
      }
    } catch (error) {
      console.error('Error fetching SACCO accounts:', error)
    }
  }

  const fetchLoanAccounts = async () => {
    try {
      const incomeService = new IncomeService(supabase, user.id)
      const result = await incomeService.getLoanAccounts()
      if (result.success) {
        setLoanAccounts(result.accounts)
      }
    } catch (error) {
      console.error('Error fetching loan accounts:', error)
    }
  }

  const fetchRecurringIncome = async () => {
    try {
      const incomeService = new IncomeService(supabase, user.id)
      const result = await incomeService.getAllRecurringIncome()
      if (result.success) {
        setRecurringIncomes(result.recurringIncomes)
      }
    } catch (error) {
      console.error('Error fetching recurring income:', error)
    }
  }

  // Check if selected account is M-Pesa
  const isMpesaAccount = () => {
    if (!formData.account_id) return false
    const account = accounts.find(a => a.id === formData.account_id)
    if (!account) return false
    const category = account.category?.toLowerCase()
    return ACCOUNT_CATEGORIES.MOBILE_MONEY.includes(category)
  }

  // Check if selected account is a Bank account
  const isBankAccount = () => {
    if (!formData.account_id) return false
    const account = accounts.find(a => a.id === formData.account_id)
    if (!account) return false
    const category = account.category?.toLowerCase()
    return ACCOUNT_CATEGORIES.BANK.includes(category)
  }

  // Check if message parser should be shown (M-Pesa or Bank account)
  const shouldShowMessageParser = () => {
    return isMpesaAccount() || isBankAccount()
  }

  // Handle parsed transaction message
  const handleMessageParsed = (parsedData) => {
    if (parsedData) {
      // Parse date from message (format: "25/12/24 10:30 AM" or similar)
      let parsedDate = formData.date // Default to current form date
      if (parsedData.transactionDate) {
        try {
          const dateParts = parsedData.transactionDate.split(' ')[0].split('/')
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0])
            const month = parseInt(dateParts[1]) - 1 // JS months are 0-indexed
            let year = parseInt(dateParts[2])
            // Handle 2-digit year
            if (year < 100) {
              year = year > 50 ? 1900 + year : 2000 + year
            }
            const dateObj = new Date(year, month, day)
            if (!isNaN(dateObj.getTime())) {
              parsedDate = dateObj.toISOString().split('T')[0]
            }
          }
        } catch (e) {
          console.log('Could not parse date:', parsedData.transactionDate)
        }
      }

      // Extract source name from description (sender name)
      let sourceName = parsedData.description || ''
      // Clean up the name
      sourceName = sourceName.replace(/\d{10,}/g, '').trim()
      // Capitalize first letter of each word
      sourceName = sourceName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim()

      // Get reference code for description
      const reference = parsedData.reference || parsedData.bankReference || parsedData.mpesaReference || ''
      const descriptionWithRef = reference ? `Ref: ${reference}` : ''

      setFormData(prev => ({
        ...prev,
        amount: parsedData.amount?.toString() || prev.amount,
        source_name: sourceName || prev.source_name,
        date: parsedDate,
        description: descriptionWithRef || prev.description
      }))

      toast.success('Transaction details extracted from message')
      setShowMessageParser(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!formData.account_id) {
      toast.error('Please select an account')
      return
    }

    if (!formData.source_name?.trim()) {
      toast.error('Please enter the source of funds (who paid you)')
      return
    }

    try {
      const incomeService = new IncomeService(supabase, user.id)

      // Prepare statutory deductions from calculator
      // CRITICAL: Only include deductions if using gross salary mode
      let taxAmount = 0
      let statutoryDeductions = 0
      let incomeAmount = 0

      if (formData.is_gross && calculatedSalary && formData.gross_salary && parseFloat(formData.gross_salary) > 0) {
        // Using gross salary mode - pass GROSS amount with deductions
        incomeAmount = parseFloat(formData.gross_salary)
        taxAmount = Math.max(0, calculatedSalary.paye)
        statutoryDeductions = calculatedSalary.nssf + calculatedSalary.housingLevy + calculatedSalary.shif
      } else {
        // Using net amount mode - amount is already net, no deductions
        incomeAmount = parseFloat(formData.amount)
        taxAmount = 0
        statutoryDeductions = 0
      }

      // Validation: Ensure we have valid data
      if (formData.is_gross && (!formData.gross_salary || parseFloat(formData.gross_salary) <= 0)) {
        toast.error('Please enter a valid gross salary amount')
        return
      }

      const incomeData = {
        account_id: formData.account_id,
        amount: incomeAmount,
        source: formData.source,
        source_name: formData.source_name.trim(), // Who paid - employer, client, etc.
        description: formData.description,
        date: formData.date,
        tax_amount: taxAmount,
        statutory_deductions: statutoryDeductions
      }

      // Debug logging (can be removed in production)
      console.log('Income Submission:', {
        mode: formData.is_gross ? 'Gross Salary' : 'Net Amount',
        grossSalary: formData.gross_salary,
        netAmount: formData.amount,
        incomeAmount,
        taxAmount,
        statutoryDeductions,
        customDeductions: customDeductions.length
      })

      // Create new income with custom deductions
      const result = await incomeService.createIncome(incomeData, customDeductions)

      if (!result.success) {
        throw new Error(result.error)
      }

      const account = accounts.find(a => a.id === formData.account_id)
      toast.success(`Income of ${formatCurrency(result.netAmount)} added to ${account?.name || 'account'}`)

      // If salary with statutory deductions, save to deductions table
      if (formData.is_gross && calculatedSalary) {
        const currentMonth = new Date(formData.date).toISOString().split('T')[0].slice(0, 7) + '-01'

        await supabase
          .from('deductions')
          .upsert([
            {
              user_id: user.id,
              gross_salary: calculatedSalary.grossSalary,
              nssf: calculatedSalary.nssf,
              housing_levy: calculatedSalary.housingLevy,
              shif: calculatedSalary.shif,
              taxable_income: calculatedSalary.taxableIncome,
              paye: calculatedSalary.paye,
              personal_relief: calculatedSalary.personalRelief,
              total_deductions: calculatedSalary.totalDeductions,
              net_salary: calculatedSalary.netSalary,
              month: currentMonth
            }
          ], { onConflict: 'user_id,month' })
      }

      // Reset form
      const primaryAccount = accounts.find(a => a.is_primary)
      setFormData({
        amount: '',
        source: 'salary',
        source_name: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        account_id: primaryAccount?.id || '',
        gross_salary: '',
        is_gross: false
      })
      setCustomDeductions([])
      setShowDeductionsSection(false)
      setCalculatedSalary(null)
      setShowModal(false)
      fetchIncomes()
      fetchAccounts() // Refresh to update balances
    } catch (error) {
      console.error('Error saving income:', error)
      toast.error(`Error saving income: ${error.message}`)
    }
  }

  // Add custom deduction
  const addCustomDeduction = () => {
    setCustomDeductions([
      ...customDeductions,
      {
        deduction_type: 'sacco',
        deduction_name: '',
        amount: '',
        is_recurring: false,
        frequency: 'monthly',
        notes: '',
        create_expense: false,
        create_reminder: false,
        sacco_account_id: '', // For linking SACCO deductions to SACCO accounts
        loan_account_id: '' // For linking loan deductions to loan accounts
      }
    ])
  }

  // Remove custom deduction
  const removeCustomDeduction = (index) => {
    setCustomDeductions(customDeductions.filter((_, i) => i !== index))
  }

  // Update custom deduction field
  const updateCustomDeduction = (index, field, value) => {
    const updated = [...customDeductions]
    updated[index] = { ...updated[index], [field]: value }
    setCustomDeductions(updated)
  }

  // View income details with full breakdown
  const handleViewDetails = async (income) => {
    setViewingIncome(income)
    setShowViewModal(true)

    try {
      const incomeService = new IncomeService(supabase, user.id)
      const result = await incomeService.getIncomeWithDeductions(income.id)
      if (result.success) {
        setIncomeDetails(result)
      }
    } catch (error) {
      console.error('Error fetching income details:', error)
    }
  }

  // Open reverse income modal
  const handleOpenReverse = (income) => {
    // Check if already reversed
    if (income.is_reversed) {
      toast.error('This income has already been reversed')
      return
    }

    // Calculate the actual deposited NET amount from account_transactions
    const depositedAmount = income.deposited_transaction?.[0]?.amount || income.amount

    // Store income with calculated deposited amount for use in modal and reversal
    setReversingIncome({
      ...income,
      depositedAmount: parseFloat(depositedAmount)
    })
    setReverseReason('')
    setShowReverseModal(true)
  }

  // Reverse income entry (creates a negative transaction)
  const handleReverseIncome = async () => {
    if (!reversingIncome) return

    if (!reverseReason.trim()) {
      toast.error('Please provide a reason for the reversal')
      return
    }

    try {
      // Get the account associated with this income
      const account = accounts.find(a => a.id === reversingIncome.account_id)

      // Use the deposited amount already calculated in handleOpenReverse
      const depositedAmount = reversingIncome.depositedAmount
      const today = new Date().toISOString().split('T')[0]

      // Step 1: Find all deduction-related transactions for this income
      // (SACCO contributions, loan payments, etc.)
      const { data: deductionTransactions, error: fetchError } = await supabase
        .from('account_transactions')
        .select('id, to_account_id, from_account_id, transaction_type, amount, category, description')
        .eq('reference_id', reversingIncome.id)
        .eq('reference_type', 'income_deduction')
        .eq('user_id', user.id)

      if (fetchError) throw fetchError

      // Step 2: Create reversal transactions for each deduction transaction
      // These transactions moved money INTO accounts (SACCO, loan), so we need to reverse that
      let reversedDeductionsCount = 0
      let reversedDeductionsTotal = 0

      if (deductionTransactions && deductionTransactions.length > 0) {
        for (const deductionTx of deductionTransactions) {
          // Create reversal: money flows OUT of the account it flowed INTO
          const { error: reversalError } = await supabase
            .from('account_transactions')
            .insert({
              user_id: user.id,
              from_account_id: deductionTx.to_account_id, // Money flows OUT (reversal)
              transaction_type: 'reversal',
              amount: parseFloat(deductionTx.amount),
              date: today,
              category: deductionTx.category,
              description: `Reversal: ${deductionTx.description} - ${reverseReason}`,
              reference_id: reversingIncome.id,
              reference_type: 'deduction_reversal'
            })

          if (reversalError) {
            console.error('Error reversing deduction transaction:', reversalError)
            // Continue with other reversals even if one fails
          } else {
            reversedDeductionsCount++
            reversedDeductionsTotal += parseFloat(deductionTx.amount)
          }
        }
      }

      // Step 3: Create a reversal transaction for the main income deposit (debit from account)
      // Use transaction_type: 'reversal' with reference_type: 'income_reversal' per immutability pattern
      const { error: txError } = await supabase
        .from('account_transactions')
        .insert({
          user_id: user.id,
          from_account_id: reversingIncome.account_id, // Money flows OUT (reversal)
          transaction_type: 'reversal',
          amount: depositedAmount, // ✅ Use NET amount that was deposited, not GROSS
          date: today,
          category: reversingIncome.source,
          description: `Reversal: ${reversingIncome.source_name || reversingIncome.source} - ${reverseReason}`,
          reference_id: reversingIncome.id,
          reference_type: 'income_reversal'
        })

      if (txError) throw txError

      // Step 4: Mark original income as reversed
      const { error: updateError } = await supabase
        .from('income')
        .update({
          is_reversed: true,
          reversal_reason: reverseReason,
          reversed_at: new Date().toISOString()
        })
        .eq('id', reversingIncome.id)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Build success message
      let successMessage = `Income reversed. ${formatCurrency(depositedAmount)} debited from ${account?.name || 'account'}`
      if (reversedDeductionsCount > 0) {
        successMessage += `. Also reversed ${reversedDeductionsCount} deduction(s) totaling ${formatCurrency(reversedDeductionsTotal)}`
      }

      toast.success(successMessage)
      setShowReverseModal(false)
      setReversingIncome(null)
      setReverseReason('')
      fetchIncomes()
      fetchAccounts() // Refresh balances
    } catch (error) {
      console.error('Error reversing income:', error)
      toast.error(`Error reversing income: ${error.message}`)
    }
  }

  // Recurring Income Handlers
  const handleRecurringSubmit = async (e) => {
    e.preventDefault()

    if (!recurringFormData.amount || parseFloat(recurringFormData.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!recurringFormData.account_id) {
      toast.error('Please select an account')
      return
    }

    try {
      const incomeService = new IncomeService(supabase, user.id)

      if (editingRecurring) {
        // Update existing recurring income
        const result = await incomeService.updateRecurringIncome(
          editingRecurring.id,
          recurringFormData
        )

        if (result.success) {
          toast.success('Recurring income updated successfully')
          setShowRecurringModal(false)
          setEditingRecurring(null)
          fetchRecurringIncome()
        } else {
          toast.error(result.error)
        }
      } else {
        // Create new recurring income
        const result = await incomeService.createRecurringIncome(recurringFormData)

        if (result.success) {
          toast.success('Recurring income created successfully')
          setShowRecurringModal(false)
          fetchRecurringIncome()
        } else {
          toast.error(result.error)
        }
      }
    } catch (error) {
      console.error('Error with recurring income:', error)
      toast.error(`Error: ${error.message}`)
    }
  }

  const handleEditRecurring = (recurring) => {
    setEditingRecurring(recurring)
    setRecurringFormData({
      source: recurring.source,
      source_name: recurring.source_name || '',
      amount: recurring.amount.toString(),
      description: recurring.description || '',
      account_id: recurring.account_id,
      frequency: recurring.frequency,
      start_date: recurring.start_date,
      end_date: recurring.end_date || '',
      auto_create: recurring.auto_create,
      auto_create_days_before: recurring.auto_create_days_before || 0,
      is_gross: recurring.is_gross || false,
      gross_salary: recurring.gross_salary?.toString() || '',
      statutory_deductions: recurring.statutory_deductions?.toString() || '',
      tax_amount: recurring.tax_amount?.toString() || ''
    })
    setShowRecurringModal(true)
  }

  const handleDeleteRecurring = async (recurring) => {
    if (!confirm(`Delete recurring income "${recurring.source_name || recurring.source}"?`)) {
      return
    }

    try {
      const incomeService = new IncomeService(supabase, user.id)
      const result = await incomeService.deleteRecurringIncome(recurring.id)

      if (result.success) {
        toast.success('Recurring income deleted')
        fetchRecurringIncome()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error deleting recurring income:', error)
      toast.error(`Error: ${error.message}`)
    }
  }

  const handleCreateFromTemplate = async (recurring) => {
    try {
      const incomeService = new IncomeService(supabase, user.id)
      const result = await incomeService.createIncomeFromRecurring(recurring.id)

      if (result.success) {
        toast.success('Income created from template')
        fetchIncomes()
        fetchRecurringIncome()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error creating from template:', error)
      toast.error(`Error: ${error.message}`)
    }
  }

  const handleToggleRecurringActive = async (recurring) => {
    try {
      const incomeService = new IncomeService(supabase, user.id)
      const result = await incomeService.toggleRecurringActive(recurring.id, recurring.is_active)

      if (result.success) {
        toast.success(recurring.is_active ? 'Recurring income paused' : 'Recurring income resumed')
        fetchRecurringIncome()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error toggling recurring income:', error)
      toast.error(`Error: ${error.message}`)
    }
  }

  const formatSource = (source) => {
    return source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getSourceColor = (source) => {
    const colors = {
      salary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      side_hustle: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      investment: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      bonus: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      gift: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
    return colors[source] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Income Tracking</h2>
              <p className="text-green-100 mt-1">Monitor all your earnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-stat bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-green-100 font-medium">Total Income This Month</p>
            <TrendingUp className="h-6 w-6 text-green-200" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(totalIncome)}</p>
          <p className="text-sm text-green-100">
            {incomes.filter(i => {
              const d = new Date(i.date)
              const now = new Date()
              // Exclude reversed incomes from the count
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !i.is_reversed
            }).length} transactions this month
          </p>
        </div>

        <div className="card bg-white dark:bg-gray-800 flex flex-col items-center justify-center gap-3">
          <button
            onClick={() => {
              const primaryAccount = accounts.find(a => a.is_primary)
              setFormData({
                amount: '',
                source: 'salary',
                source_name: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                account_id: primaryAccount?.id || '',
                gross_salary: '',
                is_gross: false
              })
              setCalculatedSalary(null)
              setShowModal(true)
            }}
            className="btn btn-primary py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg flex items-center w-full sm:w-auto justify-center"
          >
            <Plus className="h-5 sm:h-6 w-5 sm:w-6 mr-2" />
            Add New Income
          </button>
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto justify-center">
            <button
              onClick={() => setShowMessageParser(true)}
              className="btn btn-secondary py-2 px-4 flex items-center whitespace-nowrap text-sm"
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Parse SMS
            </button>
          </div>
        </div>
      </div>

      {/* View Toggle Tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveView('all')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeView === 'all'
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>All Income</span>
          </div>
        </button>
        <button
          onClick={() => setActiveView('recurring')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeView === 'recurring'
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>Recurring Income</span>
          </div>
        </button>
      </div>

      {/* Income List - shown when activeView === 'all' */}
      {activeView === 'all' && (
        <div className="card bg-white dark:bg-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Income History {searchQuery.trim() && `(${searchItems(incomes, searchQuery, ['source', 'source_name', 'description', 'amount']).length} result${searchItems(incomes, searchQuery, ['source', 'source_name', 'description', 'amount']).length !== 1 ? 's' : ''})`}
            </h3>
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by source, description, amount..."
              />
            </div>
          </div>

        {(() => {
          const filteredIncomes = searchQuery.trim()
            ? searchItems(incomes, searchQuery, ['source', 'source_name', 'description', 'amount'])
            : incomes
          return filteredIncomes.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {incomes.length === 0 ? 'No income recorded yet' : `No income matches "${searchQuery}"`}
            </h3>
            <p className="text-gray-500 dark:text-gray-500 mb-6">
              {incomes.length === 0 ? 'Start tracking your earnings' : 'Try a different search term'}
            </p>
            {incomes.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary px-8 py-3"
            >
              Add Your First Income
            </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIncomes.map((income) => {
              const SourceIcon = getIncomeIcon(income.source)
              const hasGrossInfo = income.source === 'salary' && (income.tax_amount > 0 || income.statutory_deductions > 0)
              // income.amount IS the GROSS amount already
              const grossAmount = parseFloat(income.amount)
              // Get the ACTUAL deposited amount from account_transactions (includes custom deductions)
              const depositedAmount = income.deposited_transaction?.[0]?.amount || grossAmount

              return (
                <div
                  key={income.id}
                  className={`flex items-center justify-between p-5 rounded-xl transition-colors ${
                    income.is_reversed
                      ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
                      : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`p-3 rounded-lg ${income.is_reversed ? 'bg-red-100 dark:bg-red-900/40' : 'bg-white dark:bg-gray-800'}`}>
                      <SourceIcon className={`h-8 w-8 ${income.is_reversed ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <p className={`font-semibold text-lg capitalize ${income.is_reversed ? 'text-red-700 dark:text-red-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                          {income.source.replace('_', ' ')}
                        </p>
                        <span className={`badge ${getSourceColor(income.source)}`}>
                          {income.source}
                        </span>
                        {income.is_reversed && (
                          <span className="badge bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            REVERSED
                          </span>
                        )}
                      </div>
                      {income.source_name && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                          <Building2 className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
                          From: <span className="font-medium ml-1">{income.source_name}</span>
                        </p>
                      )}
                      {/* Show Gross vs Deposited for salary */}
                      {hasGrossInfo && depositedAmount !== grossAmount && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Gross: {formatCurrency(grossAmount)} → Deposited: {formatCurrency(depositedAmount)}
                        </p>
                      )}
                      {income.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{income.description}</p>
                      )}
                      {income.is_reversed && income.reversal_reason && (
                        <p className="text-sm text-red-600 dark:text-red-400 mb-1">
                          Reason: {income.reversal_reason}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(income.date).toLocaleDateString('en-KE', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      {hasGrossInfo && depositedAmount !== grossAmount && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          From Gross: {formatCurrency(grossAmount)}
                        </p>
                      )}
                      <p className={`text-2xl font-bold ${income.is_reversed ? 'text-red-400 line-through' : 'text-green-600 dark:text-green-400'}`}>
                        +{formatCurrency(depositedAmount)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(income)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {!income.is_reversed && (
                        <button
                          onClick={() => handleOpenReverse(income)}
                          className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                          title="Reverse Income"
                        >
                          <RotateCcw className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
        })()}
        </div>
      )}

      {/* Recurring Income View - shown when activeView === 'recurring' */}
      {activeView === 'recurring' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recurring Income Templates</h3>
            <button
              onClick={() => {
                setEditingRecurring(null)
                const primaryAccount = accounts.find(a => a.is_primary)
                setRecurringFormData({
                  source: 'salary',
                  source_name: '',
                  amount: '',
                  description: '',
                  account_id: primaryAccount?.id || '',
                  frequency: 'monthly',
                  start_date: new Date().toISOString().split('T')[0],
                  end_date: '',
                  auto_create: false,
                  auto_create_days_before: 0,
                  is_gross: false,
                  gross_salary: '',
                  statutory_deductions: '',
                  tax_amount: ''
                })
                setShowRecurringModal(true)
              }}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Recurring Income
            </button>
          </div>

          {/* Recurring Income Cards */}
          {recurringIncomes.length === 0 ? (
            <div className="card bg-white dark:bg-gray-800 text-center py-16">
              <RefreshCw className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No recurring income set up yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Add salary, freelance, or other regular income to track automatically.
              </p>
              <button
                onClick={() => {
                  setEditingRecurring(null)
                  setShowRecurringModal(true)
                }}
                className="btn btn-primary px-8 py-3"
              >
                Create Your First Recurring Income
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recurringIncomes.map(recurring => {
                const isOverdue = new Date(recurring.next_date) < new Date()
                const SourceIcon = getIncomeIcon(recurring.source)

                return (
                  <div
                    key={recurring.id}
                    className={`card bg-white dark:bg-gray-800 p-6 ${!recurring.is_active ? 'opacity-60' : ''}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <SourceIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {recurring.source_name || formatSource(recurring.source)}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {recurring.frequency}
                          </p>
                        </div>
                      </div>
                      {!recurring.is_active && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                          Paused
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">
                      {formatCurrency(recurring.amount)}
                    </p>

                    {/* Next Date */}
                    <div className="flex items-center text-sm mb-3">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span className={isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}>
                        Next: {new Date(recurring.next_date).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Account */}
                    <div className="flex items-center text-sm mb-4">
                      <Wallet className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {recurring.account?.name}
                      </span>
                    </div>

                    {/* Auto-create badge */}
                    {recurring.auto_create && (
                      <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mb-4">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Auto-create enabled
                      </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => handleCreateFromTemplate(recurring)}
                        className="btn btn-sm btn-primary"
                        disabled={!recurring.is_active}
                      >
                        Create Now
                      </button>
                      <button
                        onClick={() => handleEditRecurring(recurring)}
                        className="btn btn-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Edit
                      </button>
                    </div>

                    {/* More Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleToggleRecurringActive(recurring)}
                        className="btn btn-sm btn-ghost flex items-center justify-center"
                      >
                        {recurring.is_active ? (
                          <>
                            <PauseCircle className="h-4 w-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Resume
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteRecurring(recurring)}
                        className="btn btn-sm btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Income Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg sm:max-w-2xl w-full p-4 sm:p-8 animate-slideIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Add New Income
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setCalculatedSalary(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Selector */}
              <div className="form-group">
                <label className="label text-base font-semibold flex items-center">
                  <Wallet className="h-4 w-4 mr-1" />
                  Deposit To Account *
                </label>
                <select
                  className="select text-base py-3"
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
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
              </div>

              {/* Parse Transaction Message Button - Show for M-Pesa and Bank accounts */}
              {shouldShowMessageParser() && (
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => setShowMessageParser(true)}
                    className={`w-full py-2.5 px-4 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center ${
                      isBankAccount()
                        ? 'border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        : 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {isBankAccount()
                      ? 'Parse Bank Transaction SMS'
                      : 'Parse M-Pesa Transaction SMS'
                    }
                  </button>
                </div>
              )}

              {/* Transaction Message Parser */}
              {showMessageParser && (
                <TransactionMessageParser
                  onParsed={handleMessageParsed}
                  onClose={() => setShowMessageParser(false)}
                />
              )}

              <div className="form-group">
                <label className="label text-base font-semibold">Income Source *</label>
                <select
                  className="select text-base py-3"
                  value={formData.source}
                  onChange={(e) => {
                    setFormData({ ...formData, source: e.target.value })
                    if (e.target.value !== 'salary') {
                      setFormData(prev => ({ ...prev, is_gross: false, gross_salary: '' }))
                      setCalculatedSalary(null)
                      setCustomDeductions([])
                      setShowDeductionsSection(false)
                    }
                  }}
                  required
                >
                  {INCOME_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source.replace('_', ' ').charAt(0).toUpperCase() + source.replace('_', ' ').slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source of Funds - Who paid */}
              <div className="form-group">
                <label className="label text-base font-semibold flex items-center">
                  <Building2 className="h-4 w-4 mr-1" />
                  {formData.source === 'salary' ? 'Employer Name' : 'Source of Funds'} *
                </label>
                <input
                  type="text"
                  className="input text-base py-3"
                  placeholder={
                    formData.source === 'salary' ? 'e.g., ABC Company Ltd' :
                    formData.source === 'side_hustle' ? 'e.g., Freelance Client Name' :
                    formData.source === 'investment' ? 'e.g., Safaricom Dividends, Treasury Bills' :
                    formData.source === 'bonus' ? 'e.g., Year-end Bonus from ABC Ltd' :
                    formData.source === 'gift' ? 'e.g., Birthday gift from Dad' :
                    'e.g., M-Pesa deposit, Bank transfer'
                  }
                  value={formData.source_name}
                  onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This helps track where your money comes from
                </p>
              </div>

              {/* Salary Options */}
              {formData.source === 'salary' && (
                <div className="p-6 bg-blue-50 dark:bg-blue-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_gross}
                      onChange={(e) => {
                        const isChecked = e.target.checked
                        setFormData({ ...formData, is_gross: isChecked })
                        // Reset calculator state when unchecking
                        if (!isChecked) {
                          setCalculatedSalary(null)
                          setCustomDeductions([])
                          setShowDeductionsSection(false)
                        }
                      }}
                      className="h-5 w-5 text-kenya-green focus:ring-kenya-green border-gray-300 dark:border-gray-600 rounded"
                    />
                    <div>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        <Calculator className="inline h-5 w-5 mr-2" />
                        I have my gross salary (before deductions)
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        We'll automatically calculate PAYE, NSSF, SHIF, and Housing Levy
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Gross Salary Input */}
              {formData.is_gross && (
                <>
                  <div className="form-group">
                    <label className="label text-base font-semibold">Gross Salary (KES) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input text-lg py-4"
                      placeholder="100,000"
                      value={formData.gross_salary}
                      onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })}
                      required
                    />
                  </div>

                  {/* Statutory Deduction Breakdown */}
                  {calculatedSalary && (
                    <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Statutory Deductions
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-gray-600 dark:text-gray-400">Gross Salary</span>
                          <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(calculatedSalary.grossSalary)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600 dark:text-gray-400">NSSF</span>
                          <span className="text-red-600">-{formatCurrency(calculatedSalary.nssf)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600 dark:text-gray-400">Housing Levy</span>
                          <span className="text-red-600">-{formatCurrency(calculatedSalary.housingLevy)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600 dark:text-gray-400">SHIF</span>
                          <span className="text-red-600">-{formatCurrency(calculatedSalary.shif)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600 dark:text-gray-400">PAYE</span>
                          <span className="text-red-600">-{formatCurrency(calculatedSalary.paye)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-t-2 border-gray-300 dark:border-gray-600 mt-2">
                          <span className="font-bold text-gray-900 dark:text-gray-100">After Statutory</span>
                          <span className="font-bold text-green-600 text-lg">{formatCurrency(calculatedSalary.netSalary)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Deductions Section */}
                  {calculatedSalary && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowDeductionsSection(!showDeductionsSection)}
                        className="btn btn-secondary w-full flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {showDeductionsSection ? 'Hide' : 'Add'} Custom Deductions (SACCO, Loans, Insurance)
                      </button>

                      {showDeductionsSection && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                          {customDeductions.map((deduction, index) => (
                            <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Deduction #{index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeCustomDeduction(index)}
                                  className="text-red-600 hover:bg-red-50 p-1 rounded"
                                >
                                  <MinusCircle className="h-5 w-5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-gray-600 dark:text-gray-400">Type</label>
                                  <select
                                    className="select text-sm py-2"
                                    value={deduction.deduction_type}
                                    onChange={(e) => updateCustomDeduction(index, 'deduction_type', e.target.value)}
                                  >
                                    {IncomeService.getDeductionTypes().map((type) => (
                                      <option key={type.value} value={type.value}>
                                        {type.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-600 dark:text-gray-400">Amount (KES)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="input text-sm py-2"
                                    value={deduction.amount}
                                    onChange={(e) => updateCustomDeduction(index, 'amount', e.target.value)}
                                    required
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Name/Description</label>
                                <input
                                  type="text"
                                  className="input text-sm py-2"
                                  placeholder="e.g., Stima SACCO, HELB Loan"
                                  value={deduction.deduction_name}
                                  onChange={(e) => updateCustomDeduction(index, 'deduction_name', e.target.value)}
                                  required
                                />
                              </div>

                              {/* Integration Options */}
                              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                {/* Recurring checkbox */}
                                <label className="flex items-center text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={deduction.is_recurring}
                                    onChange={(e) => updateCustomDeduction(index, 'is_recurring', e.target.checked)}
                                    className="mr-2"
                                  />
                                  Recurring deduction (auto-fill next time)
                                </label>

                                {/* Record as expense checkbox - only for mappable types */}
                                {IncomeService.canMapToExpense(deduction.deduction_type) && (
                                  <div>
                                    <label className="flex items-center text-xs cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={deduction.create_expense || false}
                                        onChange={(e) => updateCustomDeduction(index, 'create_expense', e.target.checked)}
                                        className="mr-2 accent-green-600"
                                      />
                                      <span className="text-green-700 dark:text-green-400">Record as expense</span>
                                    </label>
                                    {deduction.create_expense && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 ml-5 mt-1">
                                        → {IncomeService.getDeductionCategoryInfo(deduction.deduction_type).categoryDisplay}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Add to reminders checkbox - only when recurring */}
                                {deduction.is_recurring && IncomeService.canMapToExpense(deduction.deduction_type) && (
                                  <label className="flex items-center text-xs cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={deduction.create_reminder || false}
                                      onChange={(e) => updateCustomDeduction(index, 'create_reminder', e.target.checked)}
                                      className="mr-2 accent-blue-600"
                                    />
                                    <span className="text-blue-700 dark:text-blue-400">Add to bill reminders</span>
                                  </label>
                                )}

                                {/* SACCO Account selector - only for SACCO deductions */}
                                {deduction.deduction_type === 'sacco' && saccoAccounts.length > 0 && (
                                  <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                    <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                                      Link to SACCO Account (increases balance)
                                    </label>
                                    <select
                                      className="select text-sm py-1.5 w-full"
                                      value={deduction.sacco_account_id || ''}
                                      onChange={(e) => updateCustomDeduction(index, 'sacco_account_id', e.target.value)}
                                    >
                                      <option value="">Don't link to account</option>
                                      {saccoAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                          {account.name} ({formatCurrency(account.current_balance)})
                                        </option>
                                      ))}
                                    </select>
                                    {deduction.sacco_account_id && (
                                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                        +{formatCurrency(parseFloat(deduction.amount || 0))} will be added to this account
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Prompt to create SACCO account if none exist */}
                                {deduction.deduction_type === 'sacco' && saccoAccounts.length === 0 && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                                    Tip: Create a SACCO account in Accounts page to track your contributions
                                  </p>
                                )}

                                {/* Loan Account selector - for loan deductions */}
                                {IncomeService.canLinkToLoanAccount(deduction.deduction_type) && loanAccounts.length > 0 && (
                                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <label className="text-xs font-medium text-red-700 dark:text-red-300 mb-1 block">
                                      Link to Loan Account (reduces debt)
                                    </label>
                                    <select
                                      className="select text-sm py-1.5 w-full"
                                      value={deduction.loan_account_id || ''}
                                      onChange={(e) => updateCustomDeduction(index, 'loan_account_id', e.target.value)}
                                    >
                                      <option value="">Don't link to account</option>
                                      {loanAccounts
                                        .filter(account => {
                                          // Filter by relevant loan categories for this deduction type
                                          const relevantCategories = IncomeService.getLoanCategoriesForDeduction(deduction.deduction_type)
                                          return relevantCategories.length === 0 || relevantCategories.includes(account.category)
                                        })
                                        .map((account) => (
                                          <option key={account.id} value={account.id}>
                                            {account.name} (Owed: {formatCurrency(Math.abs(account.current_balance))})
                                          </option>
                                        ))}
                                    </select>
                                    {deduction.loan_account_id && (
                                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                        {formatCurrency(parseFloat(deduction.amount || 0))} payment will reduce this loan balance
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Prompt to create loan account if none exist */}
                                {IncomeService.canLinkToLoanAccount(deduction.deduction_type) && loanAccounts.length === 0 && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                                    Tip: Create a Loan account in Accounts page to track your loan balance
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={addCustomDeduction}
                            className="btn btn-outline w-full text-sm py-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Another Deduction
                          </button>

                          {/* Net After All Deductions */}
                          {customDeductions.length > 0 && calculatedSalary && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-400">After Statutory:</span>
                                <span className="text-gray-900 dark:text-gray-100">{formatCurrency(calculatedSalary.netSalary)}</span>
                              </div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-400">Custom Deductions:</span>
                                <span className="text-red-600">
                                  -{formatCurrency(customDeductions.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0))}
                                </span>
                              </div>
                              <div className="flex justify-between text-base font-bold border-t border-blue-300 dark:border-blue-700 pt-2">
                                <span className="text-gray-900 dark:text-gray-100">Net (Deposited):</span>
                                <span className="text-green-600">
                                  {formatCurrency(
                                    calculatedSalary.netSalary -
                                    customDeductions.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Net Amount Input (for non-salary or if not using gross) */}
              {!formData.is_gross && (
                <div className="form-group">
                  <label className="label text-base font-semibold">
                    {formData.source === 'salary' ? 'Net Amount (After Deductions)' : 'Amount'} (KES) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-lg py-4"
                    placeholder="73,060"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="label text-base font-semibold">Description</label>
                <input
                  type="text"
                  className="input text-base py-3"
                  placeholder="Monthly salary, Freelance project, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label text-base font-semibold">Date *</label>
                <input
                  type="date"
                  className="input text-base py-3"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setCalculatedSalary(null)
                  }}
                  className="flex-1 btn btn-secondary bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 py-4 text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary py-4 text-base"
                >
                  Add Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && viewingIncome && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 animate-slideIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-blue-500" />
                Income Details
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  setViewingIncome(null)
                  setIncomeDetails(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Badge */}
            {viewingIncome.is_reversed && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <span className="font-medium">This income has been reversed</span>
                </div>
                {viewingIncome.reversal_reason && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Reason: {viewingIncome.reversal_reason}
                  </p>
                )}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white">
                <p className="text-green-100 text-sm mb-1">Net Amount Received</p>
                <p className="text-3xl font-bold">{formatCurrency(incomeDetails?.netAmount || viewingIncome.amount)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source Type</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {viewingIncome.source.replace('_', ' ')}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(viewingIncome.date).toLocaleDateString('en-KE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {viewingIncome.source_name && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source of Funds</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                    {viewingIncome.source_name}
                  </p>
                </div>
              )}

              {viewingIncome.description && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                  <p className="text-gray-900 dark:text-gray-100">{viewingIncome.description}</p>
                </div>
              )}

              {/* Salary Breakdown */}
              {incomeDetails && (incomeDetails.taxAmount > 0 || incomeDetails.statutoryAmount > 0) && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Salary Breakdown
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Gross Salary</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(incomeDetails.grossAmount)}
                      </span>
                    </div>
                    {incomeDetails.statutoryAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Statutory Deductions (NSSF, SHIF, Housing)</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatCurrency(incomeDetails.statutoryAmount)}
                        </span>
                      </div>
                    )}
                    {incomeDetails.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">PAYE Tax</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatCurrency(incomeDetails.taxAmount)}
                        </span>
                      </div>
                    )}
                    {incomeDetails.customDeductionsTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Custom Deductions</span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatCurrency(incomeDetails.customDeductionsTotal)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">Net Amount</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(incomeDetails.netAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Deductions List */}
              {incomeDetails?.customDeductions?.length > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Custom Deductions</h4>
                  <div className="space-y-2">
                    {incomeDetails.customDeductions.map((deduction, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {deduction.deduction_name || deduction.deduction_type}
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatCurrency(deduction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => {
                  setShowViewModal(false)
                  setViewingIncome(null)
                  setIncomeDetails(null)
                }}
                className="flex-1 btn btn-secondary"
              >
                Close
              </button>
              {!viewingIncome.is_reversed && (
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    handleOpenReverse(viewingIncome)
                  }}
                  className="flex-1 btn bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reverse
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reverse Income Modal */}
      {showReverseModal && reversingIncome && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <RotateCcw className="h-5 w-5 mr-2 text-orange-500" />
                Reverse Income
              </h3>
              <button
                onClick={() => {
                  setShowReverseModal(false)
                  setReversingIncome(null)
                  setReverseReason('')
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Warning */}
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-300">
                    This action cannot be undone
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                    Reversing will debit {formatCurrency(reversingIncome.depositedAmount)} from your account and mark this income as reversed.
                  </p>
                </div>
              </div>
            </div>

            {/* Income Summary */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Income Type</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {reversingIncome.source.replace('_', ' ')}
                </span>
              </div>
              {reversingIncome.source_name && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">From</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {reversingIncome.source_name}
                  </span>
                </div>
              )}
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Date</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(reversingIncome.date).toLocaleDateString('en-KE')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Amount</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(reversingIncome.depositedAmount)}
                </span>
              </div>
            </div>

            {/* Reason Input */}
            <div className="mb-6">
              <label className="label">Reason for Reversal *</label>
              <textarea
                className="input min-h-[80px]"
                placeholder="e.g., Duplicate entry, Incorrect amount, Payment was refunded..."
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                required
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowReverseModal(false)
                  setReversingIncome(null)
                  setReverseReason('')
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleReverseIncome}
                className="flex-1 btn bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Income Modal */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg sm:max-w-2xl w-full p-4 sm:p-8 animate-slideIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {editingRecurring ? 'Edit Recurring Income' : 'Add Recurring Income'}
              </h3>
              <button
                onClick={() => {
                  setShowRecurringModal(false)
                  setEditingRecurring(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleRecurringSubmit} className="space-y-6">
              {/* Income Type */}
              <div>
                <label className="label">Income Type *</label>
                <select
                  className="input"
                  value={recurringFormData.source}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, source: e.target.value })}
                  required
                >
                  <option value="salary">Salary</option>
                  <option value="side_hustle">Side Hustle</option>
                  <option value="investment">Investment Returns</option>
                  <option value="bonus">Bonus</option>
                  <option value="gift">Gift</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Source Name */}
              <div>
                <label className="label">Source Name (Employer, Client, etc.)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., ABC Company, Freelance Client"
                  value={recurringFormData.source_name}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, source_name: e.target.value })}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="label">Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  placeholder="0.00"
                  value={recurringFormData.amount}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Frequency */}
                <div>
                  <label className="label">Frequency *</label>
                  <select
                    className="input"
                    value={recurringFormData.frequency}
                    onChange={(e) => setRecurringFormData({ ...recurringFormData, frequency: e.target.value })}
                    required
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly (Every 2 weeks)</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {/* Account */}
                <div>
                  <label className="label">Account *</label>
                  <select
                    className="input"
                    value={recurringFormData.account_id}
                    onChange={(e) => setRecurringFormData({ ...recurringFormData, account_id: e.target.value })}
                    required
                  >
                    <option value="">Select account...</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.account_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={recurringFormData.start_date}
                    onChange={(e) => setRecurringFormData({ ...recurringFormData, start_date: e.target.value })}
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="label">End Date (Optional)</label>
                  <input
                    type="date"
                    className="input"
                    value={recurringFormData.end_date}
                    onChange={(e) => setRecurringFormData({ ...recurringFormData, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Auto-create */}
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recurringFormData.auto_create}
                    onChange={(e) => setRecurringFormData({ ...recurringFormData, auto_create: e.target.checked })}
                    className="mr-3 h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    Automatically create income entry
                  </span>
                </label>
                {recurringFormData.auto_create && (
                  <div className="mt-3 ml-8">
                    <label className="label text-sm">Create how many days before?</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="input w-32"
                      value={recurringFormData.auto_create_days_before}
                      onChange={(e) => setRecurringFormData({ ...recurringFormData, auto_create_days_before: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      0 = on the day, 1 = day before, etc.
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="label">Description (Optional)</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Add notes about this recurring income..."
                  value={recurringFormData.description}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, description: e.target.value })}
                  rows="3"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecurringModal(false)
                    setEditingRecurring(null)
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                >
                  {editingRecurring ? 'Update' : 'Create'} Recurring Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}