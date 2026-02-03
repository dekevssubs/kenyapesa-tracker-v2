import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import {
  HandCoins,
  Plus,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  Wallet,
  DollarSign,
  Users,
  Ban,
  ChevronRight,
  Calendar,
  MessageSquare
} from 'lucide-react'
import { LendingService } from '../utils/lendingService'
import ConfirmationModal from '../components/ConfirmationModal'
import { useConfirmation } from '../hooks/useConfirmation'
import LendingDetailDrawer from '../components/lending/LendingDetailDrawer'
import ForgivenessModal from '../components/lending/ForgivenessModal'
import TransactionMessageParser from '../components/TransactionMessageParser'
import MpesaFeePreview from '../components/MpesaFeePreview'
import { FEE_METHODS } from '../utils/kenyaTransactionFees'
import { ACCOUNT_CATEGORIES } from '../constants'

// Helper to determine parser type based on account category
const getParserType = (account) => {
  if (!account) return 'transaction'
  const category = account.category?.toLowerCase()
  if (ACCOUNT_CATEGORIES.MOBILE_MONEY.includes(category)) return 'mpesa'
  if (ACCOUNT_CATEGORIES.BANK.includes(category)) return 'bank'
  return 'transaction' // Default for cash, investment, etc.
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: Clock
  },
  partial: {
    label: 'Partial',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: DollarSign
  },
  complete: {
    label: 'Complete',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle
  },
  overdue: {
    label: 'Overdue',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertTriangle
  },
  forgiven: {
    label: 'Forgiven',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: Ban
  }
}

export default function Lending() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { isOpen: confirmOpen, config: confirmConfig, confirm, close: closeConfirm } = useConfirmation()

  // State
  const [activeTab, setActiveTab] = useState('lending') // 'lending' or 'borrowing'
  const [counterparties, setCounterparties] = useState([])
  const [summary, setSummary] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  // Borrowing state
  const [lenders, setLenders] = useState([])
  const [borrowingSummary, setBorrowingSummary] = useState(null)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRepaymentModal, setShowRepaymentModal] = useState(false)
  const [showForgivenessModal, setShowForgivenessModal] = useState(false)
  const [forgivingLoading, setForgivingLoading] = useState(false)
  const [showBorrowingModal, setShowBorrowingModal] = useState(false)
  const [showBorrowingRepaymentModal, setShowBorrowingRepaymentModal] = useState(false)

  // Selected items
  const [selectedCounterparty, setSelectedCounterparty] = useState(null)
  const [selectedLending, setSelectedLending] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Filter
  const [filterStatus, setFilterStatus] = useState('active') // active, complete, all

  // Message parser and fee preview
  const [showMessageParser, setShowMessageParser] = useState(false)
  const [selectedFeeMethod, setSelectedFeeMethod] = useState(FEE_METHODS.MPESA_SEND) // Default to Send Money
  const [transactionFee, setTransactionFee] = useState(0)
  const [isBankTransfer, setIsBankTransfer] = useState(false) // Track if parsed message is bank transfer
  const [manualFeeEntry, setManualFeeEntry] = useState('') // Manual fee entry for bank transfers
  const [feeOverride, setFeeOverride] = useState(false) // When true, use parsed fee instead of calculated
  const [showRepaymentMessageParser, setShowRepaymentMessageParser] = useState(false) // SMS parser for repayments
  const [showBorrowingMessageParser, setShowBorrowingMessageParser] = useState(false) // SMS parser for borrowing

  // Form data
  const [formData, setFormData] = useState({
    person_name: '',
    amount: '',
    lend_from_account_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    interest_rate: ''
  })

  const [repaymentData, setRepaymentData] = useState({
    amount: '',
    repay_to_account_id: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Borrowing form data
  const [borrowingFormData, setBorrowingFormData] = useState({
    lender_name: '',
    lender_type: 'individual',
    amount: '',
    receive_to_account_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    interest_rate: ''
  })

  const [borrowingRepaymentData, setBorrowingRepaymentData] = useState({
    amount: '',
    pay_from_account_id: '',
    date: new Date().toISOString().split('T')[0]
  })

  const [selectedLender, setSelectedLender] = useState(null)
  const [selectedBorrowing, setSelectedBorrowing] = useState(null)

  useEffect(() => {
    if (user) {
      fetchCounterparties()
      fetchBorrowings()
      fetchAccounts()
    }
  }, [user])

  const fetchCounterparties = async () => {
    try {
      setLoading(true)
      const lendingService = new LendingService(supabase, user.id)
      const result = await lendingService.getLendingsByCounterparty()

      if (result.success) {
        setCounterparties(result.counterparties)
        setSummary(result.summary)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error fetching counterparties:', error)
      showToast('Error', 'Failed to fetch lending records', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchBorrowings = async () => {
    try {
      const lendingService = new LendingService(supabase, user.id)
      const result = await lendingService.getBorrowingsByLender()

      if (result.success) {
        setLenders(result.lenders)
        setBorrowingSummary(result.summary)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error fetching borrowings:', error)
    }
  }

  const fetchAccounts = async () => {
    try {
      const lendingService = new LendingService(supabase, user.id)
      const result = await lendingService.getAccountsForLending()

      if (result.success) {
        setAccounts(result.accounts)
        const primaryAccount = result.accounts.find(a => a.is_primary)
        if (primaryAccount) {
          setFormData(prev => ({ ...prev, lend_from_account_id: primaryAccount.id }))
          setRepaymentData(prev => ({ ...prev, repay_to_account_id: primaryAccount.id }))
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  // Check if selected account is M-Pesa
  const isMpesaAccount = () => {
    if (!formData.lend_from_account_id) return false
    const account = accounts.find(a => a.id === formData.lend_from_account_id)
    if (!account) return false
    const mpesaKeywords = ['mpesa', 'm-pesa', 'safaricom', 'mobile money']
    const accountName = (account.name || '').toLowerCase()
    const accountType = (account.account_type || '').toLowerCase()
    return mpesaKeywords.some(kw => accountName.includes(kw) || accountType.includes(kw)) ||
           accountType === 'mobile_money'
  }

  // Check if selected account is a Bank account
  const isBankAccount = () => {
    if (!formData.lend_from_account_id) return false
    const account = accounts.find(a => a.id === formData.lend_from_account_id)
    if (!account) return false
    const bankKeywords = ['bank', 'ncba', 'kcb', 'equity', 'co-op', 'coop', 'stanbic', 'absa', 'dtb', 'i&m', 'checking', 'savings']
    const accountName = (account.name || '').toLowerCase()
    const accountType = (account.account_type || '').toLowerCase()
    return bankKeywords.some(kw => accountName.includes(kw) || accountType.includes(kw)) ||
           accountType === 'bank' || accountType === 'checking' || accountType === 'savings'
  }

  // Check if message parser should be shown (M-Pesa or Bank account)
  const shouldShowMessageParser = () => {
    return isMpesaAccount() || isBankAccount()
  }

  // Check if selected borrowing account is M-Pesa
  const isBorrowingMpesaAccount = () => {
    if (!borrowingFormData.receive_to_account_id) return false
    const account = accounts.find(a => a.id === borrowingFormData.receive_to_account_id)
    if (!account) return false
    const mpesaKeywords = ['mpesa', 'm-pesa', 'safaricom', 'mobile money']
    const accountName = (account.name || '').toLowerCase()
    const accountType = (account.account_type || '').toLowerCase()
    return mpesaKeywords.some(kw => accountName.includes(kw) || accountType.includes(kw)) ||
           accountType === 'mobile_money'
  }

  // Check if selected borrowing account is a Bank account
  const isBorrowingBankAccount = () => {
    if (!borrowingFormData.receive_to_account_id) return false
    const account = accounts.find(a => a.id === borrowingFormData.receive_to_account_id)
    if (!account) return false
    const bankKeywords = ['bank', 'ncba', 'kcb', 'equity', 'co-op', 'coop', 'stanbic', 'absa', 'dtb', 'i&m', 'checking', 'savings']
    const accountName = (account.name || '').toLowerCase()
    const accountType = (account.account_type || '').toLowerCase()
    return bankKeywords.some(kw => accountName.includes(kw) || accountType.includes(kw)) ||
           accountType === 'bank' || accountType === 'checking' || accountType === 'savings'
  }

  // Check if message parser should be shown for borrowing (M-Pesa or Bank account)
  const shouldShowBorrowingMessageParser = () => {
    return isBorrowingMpesaAccount() || isBorrowingBankAccount()
  }

  // Handle parsed M-Pesa or Bank message
  const handleMessageParsed = (parsedData) => {
    if (parsedData) {
      // Check if this is a bank transfer
      const isBankTxn = parsedData.isBankTransfer || false
      setIsBankTransfer(isBankTxn)

      // TransactionMessageParser passes recipient as 'description'
      // Clean up the recipient name (remove phone numbers, extra spaces)
      let recipientName = parsedData.description || ''
      // Remove phone numbers and clean up
      recipientName = recipientName.replace(/\d{10,}/g, '').trim()
      // Capitalize first letter of each word
      recipientName = recipientName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim()

      // Parse date from message (format: "25/12/24 10:30 AM" or similar)
      let parsedDate = new Date().toISOString().split('T')[0] // Default to today
      if (parsedData.transactionDate) {
        try {
          // Parse date like "25/12/24" or "25/12/2024"
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

      // Get reference code for notes
      const reference = parsedData.reference || parsedData.bankReference || parsedData.mpesaReference || ''
      const existingNotes = ''
      const notesWithRef = reference ? `Ref: ${reference}` : existingNotes

      setFormData(prev => ({
        ...prev,
        amount: parsedData.amount?.toString() || prev.amount,
        person_name: recipientName || prev.person_name,
        date: parsedDate,
        notes: notesWithRef || prev.notes
      }))

      // Store the fee from the parsed message (TransactionMessageParser passes it as 'transactionFee')
      // For bank transfers, fee is not included in message, user needs to enter manually
      if (isBankTxn) {
        // Reset fee for bank transfers - user will enter manually
        setManualFeeEntry('')
        setTransactionFee(0)
        setFeeOverride(false) // Allow manual entry
        showToast('Success', 'Bank transfer details extracted. Please enter the transaction fee manually.', 'success')
      } else {
        // M-Pesa messages include fee - USE THE PARSED FEE (truth is in the SMS!)
        if (parsedData.transactionFee !== null && parsedData.transactionFee !== undefined) {
          setTransactionFee(parsedData.transactionFee)
          setFeeOverride(true) // Lock the fee from being recalculated
        }
        showToast('Success', 'Transaction details extracted from message', 'success')
      }

      setShowMessageParser(false)
    }
  }

  // Handle fee calculation from MpesaFeePreview
  // Only update fee if not overridden by parsed message (truth is in the SMS)
  const handleFeeCalculated = (fee) => {
    if (!feeOverride) {
      setTransactionFee(fee)
    }
  }

  // Handle manual fee entry for bank transfers
  const handleManualFeeChange = (value) => {
    setManualFeeEntry(value)
    const fee = parseFloat(value) || 0
    setTransactionFee(fee)
  }

  const handleAddLending = async (e) => {
    e.preventDefault()

    if (!formData.person_name.trim()) {
      showToast('Validation Error', 'Please enter a person name', 'warning')
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Validation Error', 'Please enter a valid amount', 'warning')
      return
    }

    if (!formData.lend_from_account_id) {
      showToast('Validation Error', 'Please select an account', 'warning')
      return
    }

    try {
      const lendingService = new LendingService(supabase, user.id)

      // Prepare fee data for M-Pesa or Bank transactions
      // For lending, fees are always 'separate' - we lend the amount, fee is our cost
      const hasFee = (isMpesaAccount() || isBankAccount()) && transactionFee > 0
      const feeData = hasFee ? {
        transaction_fee: transactionFee,
        fee_method: 'separate' // Always separate for lending
      } : {}

      const result = await lendingService.createLending({
        lend_from_account_id: formData.lend_from_account_id,
        person_name: formData.person_name.trim(),
        amount: parseFloat(formData.amount),
        date: formData.date,
        due_date: formData.due_date || null,
        notes: formData.notes,
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
        ...feeData
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      // Build success message with fee info if applicable
      let successMessage = `Lent ${formatCurrency(formData.amount)} to ${formData.person_name}`
      if (result.feeAmount && result.feeAmount > 0) {
        successMessage += ` (+ ${formatCurrency(result.feeAmount)} M-Pesa fee)`
      }
      showToast('Success', successMessage, 'success')
      resetForm()
      setShowAddModal(false)
      fetchCounterparties()
      fetchAccounts()
    } catch (error) {
      console.error('Error adding lending:', error)
      showToast('Error', error.message || 'Failed to save lending record', 'error')
    }
  }

  // Handle parsed repayment message
  const handleRepaymentParsed = (parsedData) => {
    // Parse date from SMS (format: "25/12/24 10:30 AM" or similar) to YYYY-MM-DD
    let parsedDate = repaymentData.date // Keep current date as fallback
    if (parsedData.transactionDate) {
      try {
        const datePart = parsedData.transactionDate.split(' ')[0]
        const parts = datePart.split('/')
        if (parts.length === 3) {
          let [month, day, year] = parts
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

    setRepaymentData(prev => ({
      ...prev,
      amount: parsedData.amount ? parsedData.amount.toString() : prev.amount,
      date: parsedDate
    }))

    setShowRepaymentMessageParser(false)
    showToast('Success', 'Transaction details extracted from message', 'success')
  }

  // Handle parsed borrowing message (loan received)
  const handleBorrowingParsed = (parsedData) => {
    if (parsedData) {
      // Extract sender name (lender) from parsed description
      let lenderName = parsedData.description || ''
      // Clean up the name (remove phone numbers, extra spaces)
      lenderName = lenderName.replace(/\d{10,}/g, '').trim()
      // Capitalize first letter of each word
      lenderName = lenderName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim()

      // Parse date from message (format: "25/12/24 10:30 AM" or similar)
      let parsedDate = borrowingFormData.date // Default to current form date
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

      // Get reference code for notes
      const reference = parsedData.reference || parsedData.bankReference || parsedData.mpesaReference || ''
      const notesWithRef = reference ? `Ref: ${reference}` : ''

      setBorrowingFormData(prev => ({
        ...prev,
        amount: parsedData.amount?.toString() || prev.amount,
        lender_name: lenderName || prev.lender_name,
        date: parsedDate,
        notes: notesWithRef || prev.notes
      }))

      setShowBorrowingMessageParser(false)
      showToast('Success', 'Loan details extracted from message', 'success')
    }
  }

  const handleRepayment = async (e) => {
    e.preventDefault()

    const repaymentAmount = parseFloat(repaymentData.amount)

    if (!repaymentAmount || repaymentAmount <= 0) {
      showToast('Validation Error', 'Please enter a valid repayment amount', 'warning')
      return
    }

    if (!repaymentData.repay_to_account_id) {
      showToast('Validation Error', 'Please select an account for repayment', 'warning')
      return
    }

    try {
      const lendingService = new LendingService(supabase, user.id)
      const result = await lendingService.recordRepayment(
        selectedLending.id,
        repaymentAmount,
        repaymentData.repay_to_account_id,
        repaymentData.date
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      showToast('Success', `Repayment of ${formatCurrency(repaymentAmount)} recorded`, 'success')
      setShowRepaymentModal(false)
      setSelectedLending(null)
      resetRepaymentData()
      fetchCounterparties()
      fetchAccounts()

      // Refresh drawer if open
      if (drawerOpen && selectedCounterparty) {
        // Drawer will auto-refresh via its own useEffect
      }
    } catch (error) {
      console.error('Error recording repayment:', error)
      showToast('Error', error.message || 'Failed to record repayment', 'error')
    }
  }

  const handleForgiveness = async (lendingId, reason) => {
    try {
      setForgivingLoading(true)
      const lendingService = new LendingService(supabase, user.id)
      const result = await lendingService.forgiveLending(lendingId, reason)

      if (!result.success) {
        throw new Error(result.error)
      }

      showToast('Debt Forgiven', `${formatCurrency(result.writeOffAmount)} written off as bad debt`, 'info')
      setShowForgivenessModal(false)
      setSelectedLending(null)
      fetchCounterparties()

      // Close drawer and reopen to refresh
      if (drawerOpen) {
        setDrawerOpen(false)
        setTimeout(() => setDrawerOpen(true), 100)
      }
    } catch (error) {
      console.error('Error forgiving lending:', error)
      showToast('Error', error.message || 'Failed to forgive lending', 'error')
    } finally {
      setForgivingLoading(false)
    }
  }

  const openRepaymentModal = (lending) => {
    setSelectedLending(lending)
    const remaining = parseFloat(lending.amount) - parseFloat(lending.amount_repaid || 0)
    const primaryAccount = accounts.find(a => a.is_primary)
    setRepaymentData({
      amount: remaining.toString(),
      repay_to_account_id: primaryAccount?.id || '',
      date: new Date().toISOString().split('T')[0]
    })
    setShowRepaymentModal(true)
  }

  const openForgivenessModal = (lending) => {
    setSelectedLending(lending)
    setShowForgivenessModal(true)
  }

  const openCounterpartyDrawer = (counterparty) => {
    setSelectedCounterparty(counterparty)
    setDrawerOpen(true)
  }

  const resetForm = () => {
    const primaryAccount = accounts.find(a => a.is_primary)
    setFormData({
      person_name: '',
      amount: '',
      lend_from_account_id: primaryAccount?.id || '',
      date: new Date().toISOString().split('T')[0],
      due_date: '',
      notes: '',
      interest_rate: ''
    })
    setShowMessageParser(false)
    setTransactionFee(0)
    setSelectedFeeMethod(FEE_METHODS.MPESA_SEND)
    setIsBankTransfer(false)
    setManualFeeEntry('')
    setFeeOverride(false) // Reset fee override for fresh entry
  }

  const resetRepaymentData = () => {
    const primaryAccount = accounts.find(a => a.is_primary)
    setRepaymentData({
      amount: '',
      repay_to_account_id: primaryAccount?.id || '',
      date: new Date().toISOString().split('T')[0]
    })
  }

  // Borrowing functions
  const resetBorrowingForm = () => {
    const primaryAccount = accounts.find(a => a.is_primary)
    setBorrowingFormData({
      lender_name: '',
      lender_type: 'individual',
      amount: '',
      receive_to_account_id: primaryAccount?.id || '',
      date: new Date().toISOString().split('T')[0],
      due_date: '',
      notes: '',
      interest_rate: ''
    })
    setShowBorrowingMessageParser(false)
  }

  const resetBorrowingRepaymentData = () => {
    const primaryAccount = accounts.find(a => a.is_primary)
    setBorrowingRepaymentData({
      amount: '',
      pay_from_account_id: primaryAccount?.id || '',
      date: new Date().toISOString().split('T')[0]
    })
  }

  const handleAddBorrowing = async (e) => {
    e.preventDefault()

    if (!borrowingFormData.lender_name.trim()) {
      showToast('Validation Error', 'Please enter a lender name', 'warning')
      return
    }

    if (!borrowingFormData.amount || parseFloat(borrowingFormData.amount) <= 0) {
      showToast('Validation Error', 'Please enter a valid amount', 'warning')
      return
    }

    if (!borrowingFormData.receive_to_account_id) {
      showToast('Validation Error', 'Please select an account', 'warning')
      return
    }

    try {
      const lendingService = new LendingService(supabase, user.id)
      const result = await lendingService.createBorrowedLoan({
        receive_to_account_id: borrowingFormData.receive_to_account_id,
        lender_name: borrowingFormData.lender_name.trim(),
        lender_type: borrowingFormData.lender_type,
        amount: parseFloat(borrowingFormData.amount),
        date: borrowingFormData.date,
        due_date: borrowingFormData.due_date || null,
        notes: borrowingFormData.notes,
        interest_rate: borrowingFormData.interest_rate ? parseFloat(borrowingFormData.interest_rate) : null
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      showToast('Success', `Borrowed ${formatCurrency(borrowingFormData.amount)} from ${borrowingFormData.lender_name}`, 'success')
      resetBorrowingForm()
      setShowBorrowingModal(false)
      fetchBorrowings()
      fetchAccounts()
    } catch (error) {
      console.error('Error adding borrowing:', error)
      showToast('Error', error.message || 'Failed to save borrowing record', 'error')
    }
  }

  const handleBorrowingRepayment = async (e) => {
    e.preventDefault()

    if (!borrowingRepaymentData.amount || parseFloat(borrowingRepaymentData.amount) <= 0) {
      showToast('Validation Error', 'Please enter a valid amount', 'warning')
      return
    }

    if (!borrowingRepaymentData.pay_from_account_id) {
      showToast('Validation Error', 'Please select an account', 'warning')
      return
    }

    if (!selectedBorrowing) {
      showToast('Error', 'No loan selected', 'error')
      return
    }

    try {
      const lendingService = new LendingService(supabase, user.id)
      const result = await lendingService.recordBorrowedLoanRepayment(
        selectedBorrowing.id,
        parseFloat(borrowingRepaymentData.amount),
        borrowingRepaymentData.pay_from_account_id,
        borrowingRepaymentData.date
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      showToast('Success', `Paid ${formatCurrency(borrowingRepaymentData.amount)} to ${selectedLender?.lenderName}`, 'success')
      resetBorrowingRepaymentData()
      setShowBorrowingRepaymentModal(false)
      setSelectedBorrowing(null)
      fetchBorrowings()
      fetchAccounts()
    } catch (error) {
      console.error('Error recording borrowing repayment:', error)
      showToast('Error', error.message || 'Failed to record payment', 'error')
    }
  }

  const openLenderDrawer = (lender) => {
    setSelectedLender(lender)
    setDrawerOpen(true)
  }

  // Filter counterparties
  const filteredCounterparties = counterparties.filter(cp => {
    if (filterStatus === 'active') {
      return cp.activeLoans > 0
    }
    if (filterStatus === 'complete') {
      return cp.activeLoans === 0 && cp.totalOutstanding <= 0
    }
    return true // 'all'
  })

  // Filter lenders (for borrowing tab)
  const filteredLenders = lenders.filter(lender => {
    if (filterStatus === 'active') {
      return lender.activeLoans > 0
    }
    if (filterStatus === 'complete') {
      return lender.activeLoans === 0 && lender.totalOutstanding <= 0
    }
    return true // 'all'
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs: Lending vs Borrowing */}
      <div className="card bg-white dark:bg-gray-800 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('lending')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
              activeTab === 'lending'
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <HandCoins className="h-5 w-5 mr-2" />
            Money I Lent
          </button>
          <button
            onClick={() => setActiveTab('borrowing')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
              activeTab === 'borrowing'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Wallet className="h-5 w-5 mr-2" />
            Money I Borrowed
          </button>
        </div>
      </div>

      {/* Header Stats - Lending Tab */}
      {activeTab === 'lending' && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-amber-100 text-sm">Total Lent</p>
            <HandCoins className="h-5 w-5 text-amber-200" />
          </div>
          <p className="text-xl sm:text-3xl font-bold">{formatCurrency(summary?.totalLent || 0)}</p>
          <p className="text-xs text-amber-100 mt-1">Lifetime lending</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-100 text-sm">Outstanding</p>
            <AlertTriangle className="h-5 w-5 text-red-200" />
          </div>
          <p className="text-xl sm:text-3xl font-bold">{formatCurrency(summary?.totalOutstanding || 0)}</p>
          <p className="text-xs text-red-100 mt-1">Open receivables</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-sm">Overdue</p>
            <Clock className="h-5 w-5 text-orange-200" />
          </div>
          <p className="text-xl sm:text-3xl font-bold">{formatCurrency(summary?.totalOverdueAmount || 0)}</p>
          <p className="text-xs text-orange-100 mt-1">{summary?.overdueCounterparties || 0} borrower(s)</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm">Active Borrowers</p>
            <Users className="h-5 w-5 text-blue-200" />
          </div>
          <p className="text-xl sm:text-3xl font-bold">{summary?.activeCounterparties || 0}</p>
          <p className="text-xs text-blue-100 mt-1">of {summary?.totalCounterparties || 0} total</p>
        </div>
      </div>
      )}

      {/* Header Stats - Borrowing Tab */}
      {activeTab === 'borrowing' && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100 text-sm">Total Borrowed</p>
            <Wallet className="h-5 w-5 text-purple-200" />
          </div>
          <p className="text-xl sm:text-3xl font-bold">{formatCurrency(borrowingSummary?.totalBorrowed || 0)}</p>
          <p className="text-xs text-purple-100 mt-1">Lifetime borrowing</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-100 text-sm">Outstanding</p>
            <AlertTriangle className="h-5 w-5 text-red-200" />
          </div>
          <p className="text-xl sm:text-3xl font-bold">{formatCurrency(borrowingSummary?.totalOutstanding || 0)}</p>
          <p className="text-xs text-red-100 mt-1">Amount you owe</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-sm">Overdue</p>
            <Clock className="h-5 w-5 text-orange-200" />
          </div>
          <p className="text-xl sm:text-3xl font-bold">{formatCurrency(borrowingSummary?.totalOverdueAmount || 0)}</p>
          <p className="text-xs text-orange-100 mt-1">{borrowingSummary?.overdueLenders || 0} lender(s)</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm">Active Lenders</p>
            <Users className="h-5 w-5 text-blue-200" />
          </div>
          <p className="text-xl sm:text-3xl font-bold">{borrowingSummary?.activeLenders || 0}</p>
          <p className="text-xs text-blue-100 mt-1">of {borrowingSummary?.totalLenders || 0} total</p>
        </div>
      </div>
      )}

      {/* Add New Button - Lending */}
      {activeTab === 'lending' && (
      <div className="card bg-white dark:bg-gray-800">
        <button
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
          className="btn btn-primary w-full flex items-center justify-center py-4"
        >
          <Plus className="h-5 w-5 mr-2" />
          Lend Money to Someone
        </button>
      </div>
      )}

      {/* Add New Button - Borrowing */}
      {activeTab === 'borrowing' && (
      <div className="card bg-white dark:bg-gray-800">
        <button
          onClick={() => {
            resetBorrowingForm()
            setShowBorrowingModal(true)
          }}
          className="btn btn-primary w-full flex items-center justify-center py-4 bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Record Borrowed Loan
        </button>
      </div>
      )}

      {/* Filters - Lending */}
      {activeTab === 'lending' && (
      <div className="card bg-white dark:bg-gray-800">
        <label className="label">Filter Borrowers</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setFilterStatus('active')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              filterStatus === 'active'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Active ({counterparties.filter(c => c.activeLoans > 0).length})
          </button>
          <button
            onClick={() => setFilterStatus('complete')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              filterStatus === 'complete'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Complete ({counterparties.filter(c => c.activeLoans === 0 && c.totalOutstanding <= 0).length})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({counterparties.length})
          </button>
        </div>
      </div>
      )}

      {/* Filters - Borrowing */}
      {activeTab === 'borrowing' && (
      <div className="card bg-white dark:bg-gray-800">
        <label className="label">Filter Lenders</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setFilterStatus('active')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              filterStatus === 'active'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Active ({lenders.filter(l => l.activeLoans > 0).length})
          </button>
          <button
            onClick={() => setFilterStatus('complete')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              filterStatus === 'complete'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Paid Off ({lenders.filter(l => l.activeLoans === 0 && l.totalOutstanding <= 0).length})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({lenders.length})
          </button>
        </div>
      </div>
      )}

      {/* Borrowers List (Counterparty-Centric) - Lending Tab */}
      {activeTab === 'lending' && (
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
          Borrowers
        </h3>

        {filteredCounterparties.length === 0 ? (
          <div className="text-center py-12">
            <HandCoins className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {counterparties.length === 0
                ? 'No lending records yet'
                : 'No borrowers match your filter'}
            </p>
            {counterparties.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
              >
                Lend Money
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCounterparties.map((cp) => {
              const StatusIcon = STATUS_CONFIG[cp.status]?.icon || Clock
              const statusConfig = STATUS_CONFIG[cp.status]

              return (
                <div
                  key={cp.personName}
                  onClick={() => openCounterpartyDrawer(cp)}
                  className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {cp.personName}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig?.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig?.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>{cp.activeLoans} active loan{cp.activeLoans !== 1 ? 's' : ''}</span>
                          {cp.nearestDueDate && (
                            <span className="flex items-center whitespace-nowrap">
                              <Calendar className="h-3 w-3 mr-1" />
                              Due: {new Date(cp.nearestDueDate).toLocaleDateString('en-KE', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                          {cp.isOverdue && (
                            <span className="text-red-600 dark:text-red-400 whitespace-nowrap">
                              {cp.maxDaysOverdue} days overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-4 pl-13 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(cp.totalOutstanding)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          outstanding
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {cp.totalRepaid > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Repaid: {formatCurrency(cp.totalRepaid)}</span>
                        <span>{((cp.totalRepaid / cp.totalLent) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            cp.status === 'complete' ? 'bg-green-500' :
                            cp.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min((cp.totalRepaid / cp.totalLent) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* Lenders List - Borrowing Tab */}
      {activeTab === 'borrowing' && (
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
          Lenders (People/Institutions I Owe)
        </h3>

        {filteredLenders.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {lenders.length === 0
                ? 'No borrowed loans recorded yet'
                : 'No lenders match your filter'}
            </p>
            {lenders.length === 0 && (
              <button
                onClick={() => setShowBorrowingModal(true)}
                className="btn btn-primary bg-purple-600 hover:bg-purple-700"
              >
                Record Borrowed Loan
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLenders.map((lender) => {
              const StatusIcon = STATUS_CONFIG[lender.isOverdue ? 'overdue' : lender.totalOutstanding <= 0 ? 'complete' : 'partial']?.icon || Clock
              const statusLabel = lender.isOverdue ? 'Overdue' : lender.totalOutstanding <= 0 ? 'Paid Off' : lender.totalRepaid > 0 ? 'Partial' : 'Pending'
              const statusColor = lender.isOverdue
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : lender.totalOutstanding <= 0
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'

              return (
                <div
                  key={lender.lenderName}
                  className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {lender.lenderName}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusLabel}
                          </span>
                          {lender.lenderType && lender.lenderType !== 'other' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize whitespace-nowrap">
                              {lender.lenderType}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>{lender.activeLoans} active loan{lender.activeLoans !== 1 ? 's' : ''}</span>
                          {lender.isOverdue && (
                            <span className="text-red-600 dark:text-red-400 whitespace-nowrap">
                              {lender.maxDaysOverdue} days overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-4 pl-13 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(lender.totalOutstanding)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          you owe
                        </p>
                      </div>
                      {lender.totalOutstanding > 0 && lender.loans[0] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLender(lender)
                            setSelectedBorrowing(lender.loans[0])
                            resetBorrowingRepaymentData()
                            setBorrowingRepaymentData(prev => ({
                              ...prev,
                              amount: lender.loans[0].outstanding.toString()
                            }))
                            setShowBorrowingRepaymentModal(true)
                          }}
                          className="w-full sm:w-auto justify-center whitespace-nowrap px-4 py-2 sm:px-3 sm:py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {lender.totalRepaid > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Paid: {formatCurrency(lender.totalRepaid)}</span>
                        <span>{((lender.totalRepaid / lender.totalBorrowed) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            lender.totalOutstanding <= 0 ? 'bg-green-500' :
                            lender.isOverdue ? 'bg-red-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${Math.min((lender.totalRepaid / lender.totalBorrowed) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* Add Lending Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 animate-slideIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Lend Money
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddLending} className="space-y-4">
              <div className="form-group">
                <label className="label flex items-center">
                  <Wallet className="h-4 w-4 mr-1" />
                  Lend From Account *
                </label>
                <select
                  className="select"
                  value={formData.lend_from_account_id}
                  onChange={(e) => setFormData({ ...formData, lend_from_account_id: e.target.value })}
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.current_balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parse Transaction Message Button - Show for M-Pesa and Bank accounts */}
              {shouldShowMessageParser() && (
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => setShowMessageParser(!showMessageParser)}
                    className={`w-full py-2.5 px-4 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center ${
                      isBankAccount()
                        ? 'border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        : 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {showMessageParser
                      ? 'Hide Message Parser'
                      : isBankAccount()
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
                <label className="label">Person Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="John Doe"
                  value={formData.person_name}
                  onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="5000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              {/* M-Pesa Fee Preview - Show when M-Pesa is selected and amount is entered */}
              {isMpesaAccount() && formData.amount && parseFloat(formData.amount) > 0 && (
                <MpesaFeePreview
                  amount={parseFloat(formData.amount)}
                  selectedFeeMethod={selectedFeeMethod}
                  onFeeMethodChange={setSelectedFeeMethod}
                  onFeeCalculated={handleFeeCalculated}
                />
              )}

              {/* Bank Transfer Fee - Manual Entry */}
              {isBankAccount() && formData.amount && parseFloat(formData.amount) > 0 && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-blue-500 rounded-lg mr-3">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm">Bank Transfer Fee</p>
                      <p className="text-xs text-blue-600 dark:text-blue-500">
                        Enter the transaction fee charged by your bank
                      </p>
                    </div>
                  </div>

                  <div className="form-group mb-3">
                    <label className="label text-blue-700 dark:text-blue-400">Transaction Fee (KES)</label>
                    <input
                      type="number"
                      className="input bg-white dark:bg-gray-800"
                      placeholder="e.g., 50"
                      value={manualFeeEntry}
                      onChange={(e) => handleManualFeeChange(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Fee Summary */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Lending Amount</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(formData.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Bank Fee</span>
                      <span className={`font-medium ${transactionFee > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {transactionFee > 0 ? formatCurrency(transactionFee) : 'Not entered'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">Total Debit</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(parseFloat(formData.amount) + transactionFee)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Show total amount - fee is always separate for lending (M-Pesa only - Bank has its own section) */}
              {isMpesaAccount() && transactionFee > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700 dark:text-amber-400">Total Deducted from Account:</span>
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                      {formatCurrency(parseFloat(formData.amount) + transactionFee)}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    {formatCurrency(formData.amount)} (lending) + {formatCurrency(transactionFee)} (M-Pesa fee)
                  </p>
                </div>
              )}

              <div className="form-group">
                <label className="label">Date Lent *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Expected Return Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Interest Rate %</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="e.g., 5.5"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Notes</label>
                <textarea
                  className="textarea"
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto sm:flex-1 justify-center btn btn-secondary py-3 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button type="submit" className="w-full sm:w-auto sm:flex-1 justify-center btn btn-primary py-3 whitespace-nowrap">
                  Lend Money
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repayment Modal - z-[60] to appear above drawer (z-50) */}
      {showRepaymentModal && selectedLending && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 animate-slideIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Record Repayment
              </h3>
              <button
                onClick={() => {
                  setShowRepaymentModal(false)
                  setSelectedLending(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* SMS Parser Button */}
            <button
              type="button"
              onClick={() => setShowRepaymentMessageParser(true)}
              className="w-full mb-4 py-2.5 px-4 border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center justify-center text-sm font-medium"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {(() => {
                const selectedAccount = accounts.find(a => a.id === repaymentData.repay_to_account_id)
                const parserType = getParserType(selectedAccount)
                return parserType === 'mpesa' ? 'Parse M-Pesa SMS' :
                       parserType === 'bank' ? 'Parse Bank SMS' :
                       'Parse Transaction SMS'
              })()}
            </button>

            {/* Transaction Message Parser Modal */}
            {showRepaymentMessageParser && (
              <TransactionMessageParser
                onParsed={handleRepaymentParsed}
                onClose={() => setShowRepaymentMessageParser(false)}
              />
            )}

            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                From: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedLending.person_name}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Total Lent: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(selectedLending.amount)}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Already Repaid: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(selectedLending.amount_repaid || 0)}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Remaining: <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(parseFloat(selectedLending.amount) - parseFloat(selectedLending.amount_repaid || 0))}
                </span>
              </p>
            </div>

            <form onSubmit={handleRepayment} className="space-y-4">
              <div className="form-group">
                <label className="label">Repayment Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="Enter amount received"
                  value={repaymentData.amount}
                  onChange={(e) => setRepaymentData({ ...repaymentData, amount: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="label flex items-center">
                  <Wallet className="h-4 w-4 mr-1" />
                  Deposit To *
                </label>
                <select
                  className="select"
                  value={repaymentData.repay_to_account_id}
                  onChange={(e) => setRepaymentData({ ...repaymentData, repay_to_account_id: e.target.value })}
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.current_balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Repayment Date *</label>
                <input
                  type="date"
                  className="input"
                  value={repaymentData.date}
                  onChange={(e) => setRepaymentData({ ...repaymentData, date: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRepaymentModal(false)
                    setSelectedLending(null)
                  }}
                  className="w-full sm:w-auto sm:flex-1 justify-center btn btn-secondary py-3 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button type="submit" className="w-full sm:w-auto sm:flex-1 justify-center btn btn-primary py-3 whitespace-nowrap">
                  Record Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Borrowing Modal */}
      {showBorrowingModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 animate-slideIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Record Borrowed Loan
              </h3>
              <button
                onClick={() => setShowBorrowingModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddBorrowing} className="space-y-4">
              <div className="form-group">
                <label className="label flex items-center">
                  <Wallet className="h-4 w-4 mr-1" />
                  Receive To Account *
                </label>
                <select
                  className="select"
                  value={borrowingFormData.receive_to_account_id}
                  onChange={(e) => setBorrowingFormData({ ...borrowingFormData, receive_to_account_id: e.target.value })}
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.current_balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parse Transaction Message Button - Show for M-Pesa and Bank accounts */}
              {shouldShowBorrowingMessageParser() && (
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => setShowBorrowingMessageParser(!showBorrowingMessageParser)}
                    className={`w-full py-2.5 px-4 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center ${
                      isBorrowingBankAccount()
                        ? 'border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        : 'border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {showBorrowingMessageParser
                      ? 'Hide Message Parser'
                      : isBorrowingBankAccount()
                        ? 'Parse Bank Transaction SMS'
                        : 'Parse M-Pesa Transaction SMS'
                    }
                  </button>
                </div>
              )}

              {/* Transaction Message Parser */}
              {showBorrowingMessageParser && (
                <TransactionMessageParser
                  onParsed={handleBorrowingParsed}
                  onClose={() => setShowBorrowingMessageParser(false)}
                />
              )}

              <div className="form-group">
                <label className="label flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  Lender Name *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Who did you borrow from?"
                  value={borrowingFormData.lender_name}
                  onChange={(e) => setBorrowingFormData({ ...borrowingFormData, lender_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Lender Type</label>
                <select
                  className="select"
                  value={borrowingFormData.lender_type}
                  onChange={(e) => setBorrowingFormData({ ...borrowingFormData, lender_type: e.target.value })}
                >
                  <option value="individual">Individual / Friend</option>
                  <option value="chama">Chama / Merry-go-round</option>
                  <option value="sacco">SACCO</option>
                  <option value="bank">Bank</option>
                  <option value="mfi">Microfinance (MFI)</option>
                  <option value="employer">Employer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Amount Borrowed (KES) *
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="Enter amount"
                  value={borrowingFormData.amount}
                  onChange={(e) => setBorrowingFormData({ ...borrowingFormData, amount: e.target.value })}
                  min="1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Date Borrowed *</label>
                  <input
                    type="date"
                    className="input"
                    value={borrowingFormData.date}
                    onChange={(e) => setBorrowingFormData({ ...borrowingFormData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={borrowingFormData.due_date}
                    onChange={(e) => setBorrowingFormData({ ...borrowingFormData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Interest Rate (%)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g., 12"
                  value={borrowingFormData.interest_rate}
                  onChange={(e) => setBorrowingFormData({ ...borrowingFormData, interest_rate: e.target.value })}
                  step="0.1"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="label flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Notes
                </label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Any additional details..."
                  value={borrowingFormData.notes}
                  onChange={(e) => setBorrowingFormData({ ...borrowingFormData, notes: e.target.value })}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBorrowingModal(false)}
                  className="w-full sm:w-auto sm:flex-1 justify-center btn btn-secondary py-3 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button type="submit" className="w-full sm:w-auto sm:flex-1 justify-center btn btn-primary py-3 bg-purple-600 hover:bg-purple-700 whitespace-nowrap">
                  Record Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Borrowing Repayment Modal */}
      {showBorrowingRepaymentModal && selectedBorrowing && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Make Payment
              </h3>
              <button
                onClick={() => {
                  setShowBorrowingRepaymentModal(false)
                  setSelectedBorrowing(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Paying to: <strong>{selectedLender?.lenderName}</strong>
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Outstanding: <strong>{formatCurrency(selectedBorrowing?.outstanding || 0)}</strong>
              </p>
            </div>

            <form onSubmit={handleBorrowingRepayment} className="space-y-4">
              <div className="form-group">
                <label className="label flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Payment Amount (KES) *
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="Enter amount"
                  value={borrowingRepaymentData.amount}
                  onChange={(e) => setBorrowingRepaymentData({ ...borrowingRepaymentData, amount: e.target.value })}
                  max={selectedBorrowing?.outstanding}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label className="label flex items-center">
                  <Wallet className="h-4 w-4 mr-1" />
                  Pay From Account *
                </label>
                <select
                  className="select"
                  value={borrowingRepaymentData.pay_from_account_id}
                  onChange={(e) => setBorrowingRepaymentData({ ...borrowingRepaymentData, pay_from_account_id: e.target.value })}
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.current_balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Payment Date *</label>
                <input
                  type="date"
                  className="input"
                  value={borrowingRepaymentData.date}
                  onChange={(e) => setBorrowingRepaymentData({ ...borrowingRepaymentData, date: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBorrowingRepaymentModal(false)
                    setSelectedBorrowing(null)
                  }}
                  className="w-full sm:w-auto sm:flex-1 justify-center btn btn-secondary py-3 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button type="submit" className="w-full sm:w-auto sm:flex-1 justify-center btn btn-primary py-3 bg-purple-600 hover:bg-purple-700 whitespace-nowrap">
                  Make Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counterparty Detail Drawer */}
      <LendingDetailDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedCounterparty(null)
        }}
        counterparty={selectedCounterparty}
        onRecordRepayment={openRepaymentModal}
        onForgive={openForgivenessModal}
        onRefresh={fetchCounterparties}
      />

      {/* Forgiveness Modal */}
      <ForgivenessModal
        isOpen={showForgivenessModal}
        onClose={() => {
          setShowForgivenessModal(false)
          setSelectedLending(null)
        }}
        lending={selectedLending}
        onConfirm={handleForgiveness}
        isLoading={forgivingLoading}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={closeConfirm}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        variant={confirmConfig.variant}
      />
    </div>
  )
}
