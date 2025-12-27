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
  Calendar
} from 'lucide-react'
import { LendingService } from '../utils/lendingService'
import ConfirmationModal from '../components/ConfirmationModal'
import { useConfirmation } from '../hooks/useConfirmation'
import LendingDetailDrawer from '../components/lending/LendingDetailDrawer'
import ForgivenessModal from '../components/lending/ForgivenessModal'

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
  const [counterparties, setCounterparties] = useState([])
  const [summary, setSummary] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRepaymentModal, setShowRepaymentModal] = useState(false)
  const [showForgivenessModal, setShowForgivenessModal] = useState(false)
  const [forgivingLoading, setForgivingLoading] = useState(false)

  // Selected items
  const [selectedCounterparty, setSelectedCounterparty] = useState(null)
  const [selectedLending, setSelectedLending] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Filter
  const [filterStatus, setFilterStatus] = useState('active') // active, complete, all

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

  useEffect(() => {
    if (user) {
      fetchCounterparties()
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
      const result = await lendingService.createLending({
        lend_from_account_id: formData.lend_from_account_id,
        person_name: formData.person_name.trim(),
        amount: parseFloat(formData.amount),
        date: formData.date,
        due_date: formData.due_date || null,
        notes: formData.notes,
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      showToast('Success', `Lent ${formatCurrency(formData.amount)} to ${formData.person_name}`, 'success')
      resetForm()
      setShowAddModal(false)
      fetchCounterparties()
      fetchAccounts()
    } catch (error) {
      console.error('Error adding lending:', error)
      showToast('Error', error.message || 'Failed to save lending record', 'error')
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
  }

  const resetRepaymentData = () => {
    const primaryAccount = accounts.find(a => a.is_primary)
    setRepaymentData({
      amount: '',
      repay_to_account_id: primaryAccount?.id || '',
      date: new Date().toISOString().split('T')[0]
    })
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-amber-100 text-sm">Total Lent</p>
            <HandCoins className="h-5 w-5 text-amber-200" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary?.totalLent || 0)}</p>
          <p className="text-xs text-amber-100 mt-1">Lifetime lending</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-100 text-sm">Outstanding</p>
            <AlertTriangle className="h-5 w-5 text-red-200" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary?.totalOutstanding || 0)}</p>
          <p className="text-xs text-red-100 mt-1">Open receivables</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-sm">Overdue</p>
            <Clock className="h-5 w-5 text-orange-200" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary?.totalOverdueAmount || 0)}</p>
          <p className="text-xs text-orange-100 mt-1">{summary?.overdueCounterparties || 0} borrower(s)</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm">Active Borrowers</p>
            <Users className="h-5 w-5 text-blue-200" />
          </div>
          <p className="text-3xl font-bold">{summary?.activeCounterparties || 0}</p>
          <p className="text-xs text-blue-100 mt-1">of {summary?.totalCounterparties || 0} total</p>
        </div>
      </div>

      {/* Add New Button */}
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

      {/* Filters */}
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

      {/* Borrowers List (Counterparty-Centric) */}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {cp.personName}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig?.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig?.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>{cp.activeLoans} active loan{cp.activeLoans !== 1 ? 's' : ''}</span>
                          {cp.nearestDueDate && (
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Due: {new Date(cp.nearestDueDate).toLocaleDateString('en-KE', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                          {cp.isOverdue && (
                            <span className="text-red-600 dark:text-red-400">
                              {cp.maxDaysOverdue} days overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(cp.totalOutstanding)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          outstanding
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
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

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn btn-secondary py-3"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn btn-primary py-3">
                  Lend Money
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {showRepaymentModal && selectedLending && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 animate-slideIn">
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

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRepaymentModal(false)
                    setSelectedLending(null)
                  }}
                  className="flex-1 btn btn-secondary py-3"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn btn-primary py-3">
                  Record Repayment
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
