import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { HandCoins, Plus, Edit2, Trash2, UserCheck, Clock, CheckCircle, DollarSign, X, AlertCircle, Wallet } from 'lucide-react'
import { LendingService } from '../utils/lendingService'
import ConfirmationModal from '../components/ConfirmationModal'
import { useConfirmation } from '../hooks/useConfirmation'

const REPAYMENT_STATUSES = ['pending', 'partial', 'complete']

export default function Lending() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { isOpen: confirmOpen, config: confirmConfig, confirm, close: closeConfirm } = useConfirmation()
  const [lendingRecords, setLendingRecords] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showRepaymentModal, setShowRepaymentModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [repayingRecord, setRepayingRecord] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

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
      fetchLendingRecords()
      fetchAccounts()
    }
  }, [user])

  const fetchLendingRecords = async () => {
    try {
      const lendingService = new LendingService(supabase, user.id)
      const result = await lendingService.getAllLendings()

      if (result.success) {
        setLendingRecords(result.lendings)
      } else {
        throw new Error(result.error)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching lending records:', error)
      showToast('Error', 'Failed to fetch lending records', 'error')
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const lendingService = new LendingService(supabase, user.id)
      const result = await lendingService.getAccountsForLending()

      if (result.success) {
        setAccounts(result.accounts)
        // Auto-select primary account
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

  const handleSubmit = async (e) => {
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

      if (editingRecord) {
        // Simple update (editing doesn't change accounts for now)
        const { error } = await supabase
          .from('lending_tracker')
          .update({
            person_name: formData.person_name,
            amount: parseFloat(formData.amount),
            date: formData.date,
            due_date: formData.due_date || null,
            notes: formData.notes,
            interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null
          })
          .eq('id', editingRecord.id)
          .eq('user_id', user.id)

        if (error) throw error
        showToast('Success', 'Lending record updated successfully', 'success')
      } else {
        // Create new lending with service
        const result = await lendingService.createLending({
          lend_from_account_id: formData.lend_from_account_id,
          person_name: formData.person_name,
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
      }

      resetForm()
      setShowModal(false)
      setEditingRecord(null)
      fetchLendingRecords()
      fetchAccounts() // Refresh account balances
    } catch (error) {
      console.error('Error saving lending record:', error)
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
        repayingRecord.id,
        repaymentAmount,
        repaymentData.repay_to_account_id,
        repaymentData.date
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      showToast('Success', `Repayment of ${formatCurrency(repaymentAmount)} recorded. Status: ${result.newStatus}`, 'success')
      setShowRepaymentModal(false)
      setRepayingRecord(null)
      setRepaymentData({
        amount: '',
        repay_to_account_id: accounts.find(a => a.is_primary)?.id || '',
        date: new Date().toISOString().split('T')[0]
      })
      fetchLendingRecords()
      fetchAccounts() // Refresh account balances
    } catch (error) {
      console.error('Error recording repayment:', error)
      showToast('Error', error.message || 'Failed to record repayment', 'error')
    }
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    setFormData({
      person_name: record.person_name,
      amount: record.amount,
      lend_from_account_id: record.lend_from_account_id || '',
      date: record.date,
      due_date: record.due_date || '',
      notes: record.notes || '',
      interest_rate: record.interest_rate?.toString() || ''
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    confirm({
      title: 'Delete Lending Record',
      message: 'Are you sure you want to delete this lending record? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('lending_tracker')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

          if (error) throw error

          showToast('Deleted', 'Lending record deleted successfully', 'info')
          fetchLendingRecords()
        } catch (error) {
          console.error('Error deleting lending record:', error)
          showToast('Error', 'Failed to delete lending record', 'error')
        }
      }
    })
  }

  const openRepaymentModal = (record) => {
    setRepayingRecord(record)
    const remaining = parseFloat(record.amount) - parseFloat(record.amount_repaid)
    const primaryAccount = accounts.find(a => a.is_primary)
    setRepaymentData({
      amount: remaining.toString(),
      repay_to_account_id: primaryAccount?.id || '',
      date: new Date().toISOString().split('T')[0]
    })
    setShowRepaymentModal(true)
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

  const filteredRecords = lendingRecords.filter(record => {
    if (filterStatus === 'all') return true
    return record.status === filterStatus
  })

  const totalLent = lendingRecords.reduce((sum, r) => sum + parseFloat(r.amount), 0)
  const totalRepaid = lendingRecords.reduce((sum, r) => sum + parseFloat(r.amount_repaid), 0)
  const totalOutstanding = totalLent - totalRepaid

  const statusCounts = {
    pending: lendingRecords.filter(r => r.status === 'pending').length,
    partial: lendingRecords.filter(r => r.status === 'partial').length,
    complete: lendingRecords.filter(r => r.status === 'complete').length
  }

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-amber-100">Total Lent</p>
            <HandCoins className="h-6 w-6 text-amber-200" />
          </div>
          <p className="text-4xl font-bold">{formatCurrency(totalLent)}</p>
          <p className="text-sm text-amber-100 mt-2">
            {lendingRecords.length} {lendingRecords.length === 1 ? 'record' : 'records'}
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100">Total Repaid</p>
            <CheckCircle className="h-6 w-6 text-green-200" />
          </div>
          <p className="text-4xl font-bold">{formatCurrency(totalRepaid)}</p>
          <p className="text-sm text-green-100 mt-2">
            {statusCounts.complete} completed
          </p>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-100">Outstanding</p>
            <AlertCircle className="h-6 w-6 text-red-200" />
          </div>
          <p className="text-4xl font-bold">{formatCurrency(totalOutstanding)}</p>
          <p className="text-sm text-red-100 mt-2">
            {statusCounts.pending + statusCounts.partial} active
          </p>
        </div>
      </div>

      {/* Add New Button */}
      <div className="card bg-white dark:bg-gray-800">
        <button
          onClick={() => {
            resetForm()
            setEditingRecord(null)
            setShowModal(true)
          }}
          className="btn btn-primary w-full flex items-center justify-center py-4"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New Lending Record
        </button>
      </div>

      {/* Filters */}
      <div className="card bg-white dark:bg-gray-800">
        <label className="label">Filter by Status</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setFilterStatus('all')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({lendingRecords.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              filterStatus === 'pending'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Pending ({statusCounts.pending})
          </button>
          <button
            onClick={() => setFilterStatus('partial')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              filterStatus === 'partial'
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Partial ({statusCounts.partial})
          </button>
          <button
            onClick={() => setFilterStatus('complete')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              filterStatus === 'complete'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Complete ({statusCounts.complete})
          </button>
        </div>
      </div>

      {/* Lending Records List */}
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Lending Records {filterStatus !== 'all' && `(${filteredRecords.length} filtered)`}
        </h3>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <HandCoins className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {lendingRecords.length === 0
                ? 'No lending records yet'
                : 'No records match your filter'}
            </p>
            {lendingRecords.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
              >
                Add Your First Record
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => {
              const lentAmount = parseFloat(record.amount)
              const repaidAmount = parseFloat(record.amount_repaid)
              const remaining = lentAmount - repaidAmount
              const repaidPercentage = (repaidAmount / lentAmount) * 100

              const statusColors = {
                pending: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }

              return (
                <div
                  key={record.id}
                  className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <UserCheck className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {record.person_name}
                        </p>
                        <span className={`badge ${statusColors[record.status]}`}>
                          {record.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4" />
                          <span>Lent: {formatCurrency(lentAmount)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            Date: {new Date(record.date).toLocaleDateString('en-KE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        {record.due_date && (
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                              Due: {new Date(record.due_date).toLocaleDateString('en-KE', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {record.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Note: {record.notes}
                        </p>
                      )}

                      {/* Repayment Progress */}
                      {record.status !== 'pending' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">Repaid: {formatCurrency(repaidAmount)}</span>
                            <span className="text-gray-600 dark:text-gray-400">{repaidPercentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                record.status === 'complete' ? 'bg-green-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(repaidPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(remaining)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">remaining</p>

                      <div className="flex space-x-2 mt-2">
                        {record.status !== 'complete' && (
                          <button
                            onClick={() => openRepaymentModal(record)}
                            className="px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Record Payment
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingRecord ? 'Edit Lending Record' : 'Add New Lending Record'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingRecord(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Selector */}
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
                      {account.is_primary && ' (Primary)'}
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
                <label className="label">Amount Lent (KES) *</label>
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
                <label className="label">Due Date (Optional)</label>
                <input
                  type="date"
                  className="input"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Interest Rate % (Optional)</label>
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
                <label className="label">Notes (Optional)</label>
                <textarea
                  className="textarea"
                  placeholder="Add any notes or details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingRecord(null)
                  }}
                  className="flex-1 btn btn-secondary py-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary py-3"
                >
                  {editingRecord ? 'Update' : 'Add'} Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {showRepaymentModal && repayingRecord && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Record Repayment
              </h3>
              <button
                onClick={() => {
                  setShowRepaymentModal(false)
                  setRepayingRecord(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Lending to: <span className="font-semibold text-gray-900 dark:text-gray-100">{repayingRecord.person_name}</span></p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Lent: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(repayingRecord.amount)}</span></p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Already Repaid: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(repayingRecord.amount_repaid)}</span></p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Remaining: <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(parseFloat(repayingRecord.amount) - parseFloat(repayingRecord.amount_repaid))}</span></p>
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
                  Deposit Repayment To *
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
                      {account.is_primary && ' (Primary)'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Choose which account will receive this repayment
                </p>
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
                    setRepayingRecord(null)
                  }}
                  className="flex-1 btn btn-secondary py-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary py-3"
                >
                  Record Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
