import { useState, useEffect } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'

export default function TransferMoneyModal({ isOpen, onClose, onSubmit, accounts, preSelectedFromAccount }) {
  const [formData, setFormData] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    description: ''
  })
  const [selectedFromAccount, setSelectedFromAccount] = useState(null)
  const [selectedToAccount, setSelectedToAccount] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-select source account when provided (e.g., from delete with balance)
  useEffect(() => {
    if (preSelectedFromAccount && isOpen) {
      setFormData(prev => ({
        ...prev,
        from_account_id: preSelectedFromAccount.id,
        // Pre-fill amount with full balance for easy "transfer all" before delete
        amount: preSelectedFromAccount.current_balance?.toString() || '',
        // Use pending delete description if provided (includes account name for history)
        description: preSelectedFromAccount.pendingDeleteDescription || prev.description
      }))
      setSelectedFromAccount(preSelectedFromAccount)
    }
  }, [preSelectedFromAccount, isOpen])

  useEffect(() => {
    if (formData.from_account_id) {
      const account = accounts.find(a => a.id === formData.from_account_id)
      setSelectedFromAccount(account)
    } else {
      setSelectedFromAccount(null)
    }
  }, [formData.from_account_id, accounts])

  useEffect(() => {
    if (formData.to_account_id) {
      const account = accounts.find(a => a.id === formData.to_account_id)
      setSelectedToAccount(account)
    } else {
      setSelectedToAccount(null)
    }
  }, [formData.to_account_id, accounts])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isSubmitting) return // Prevent duplicate submissions

    if (!formData.from_account_id) {
      alert('Please select a source account')
      return
    }

    if (!formData.to_account_id) {
      alert('Please select a destination account')
      return
    }

    if (formData.from_account_id === formData.to_account_id) {
      alert('Source and destination accounts must be different')
      return
    }

    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (selectedFromAccount && amount > selectedFromAccount.current_balance) {
      alert('Insufficient balance in source account')
      return
    }

    try {
      setIsSubmitting(true)

      await onSubmit(
        formData.from_account_id,
        formData.to_account_id,
        amount,
        formData.description
      )

      // Close modal only after successful transfer
      handleClose()
    } catch (error) {
      console.error('Transfer error:', error)
      alert('Transfer failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      from_account_id: '',
      to_account_id: '',
      amount: '',
      description: ''
    })
    setSelectedFromAccount(null)
    setSelectedToAccount(null)
    onClose()
  }

  if (!isOpen) return null

  // Filter accounts for "From" dropdown (only cash and investment accounts with balance)
  const fromAccounts = accounts.filter(a =>
    (a.account_type === 'cash' || a.account_type === 'investment') &&
    parseFloat(a.current_balance) > 0
  )

  // Filter accounts for "To" dropdown (exclude selected "From" account)
  const toAccounts = accounts.filter(a => a.id !== formData.from_account_id)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-slideIn">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Transfer Money</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Move funds between your accounts
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* From Account */}
          <div className="form-group">
            <label className="label">From Account *</label>
            <select
              className="select"
              value={formData.from_account_id}
              onChange={(e) => setFormData({ ...formData, from_account_id: e.target.value })}
              required
            >
              <option value="">Select source account</option>
              {fromAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatCurrency(account.current_balance)} available
                </option>
              ))}
            </select>
            {selectedFromAccount && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Available:</strong> {formatCurrency(selectedFromAccount.current_balance)}
                </p>
                {selectedFromAccount.institution_name && (
                  <p className="text-xs text-blue-600 mt-1">
                    {selectedFromAccount.institution_name}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Transfer Indicator */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="h-px w-16 bg-gray-300"></div>
              <ArrowRight className="h-6 w-6" />
              <div className="h-px w-16 bg-gray-300"></div>
            </div>
          </div>

          {/* To Account */}
          <div className="form-group">
            <label className="label">To Account *</label>
            <select
              className="select"
              value={formData.to_account_id}
              onChange={(e) => setFormData({ ...formData, to_account_id: e.target.value })}
              required
              disabled={!formData.from_account_id}
            >
              <option value="">Select destination account</option>
              {toAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.account_type})
                </option>
              ))}
            </select>
            {selectedToAccount && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Current Balance:</strong> {formatCurrency(selectedToAccount.current_balance)}
                </p>
                {selectedToAccount.institution_name && (
                  <p className="text-xs text-green-600 mt-1">
                    {selectedToAccount.institution_name}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="label">Transfer Amount (KES) *</label>
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            {selectedFromAccount && formData.amount && (
              <p className="text-xs text-gray-600 mt-1">
                Remaining balance: {formatCurrency(selectedFromAccount.current_balance - parseFloat(formData.amount || 0))}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="label">Description (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Moving to investment account"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Transfer Summary */}
          {selectedFromAccount && selectedToAccount && formData.amount && (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">Transfer Summary</p>
              <div className="space-y-1 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>From:</span>
                  <span className="font-medium">{selectedFromAccount.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>To:</span>
                  <span className="font-medium">{selectedToAccount.name}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-blue-600 pt-2 border-t border-gray-300">
                  <span>Amount:</span>
                  <span>{formatCurrency(formData.amount)}</span>
                </div>
              </div>
            </div>
          )}

        </form>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex space-x-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 btn btn-secondary py-3"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 btn btn-primary py-3 relative"
            disabled={!formData.from_account_id || !formData.to_account_id || !formData.amount || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="opacity-0">Transfer Money</span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              </>
            ) : (
              'Transfer Money'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
