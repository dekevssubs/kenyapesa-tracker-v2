import { useState, useEffect } from 'react'
import { X, ArrowRight, MessageSquare, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'
import TransactionMessageParser from '../TransactionMessageParser'

export default function TransferMoneyModal({ isOpen, onClose, onSubmit, accounts, preSelectedFromAccount }) {
  const [formData, setFormData] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    description: '',
    transaction_fee: ''
  })
  const [selectedFromAccount, setSelectedFromAccount] = useState(null)
  const [selectedToAccount, setSelectedToAccount] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showParser, setShowParser] = useState(false)

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

  const handleParsedData = (parsedData) => {
    setFormData(prev => ({
      ...prev,
      amount: parsedData.amount?.toString() || prev.amount,
      transaction_fee: parsedData.transactionFee?.toString() || '',
      description: parsedData.description || parsedData.recipient || prev.description
    }))
  }

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

    const fee = parseFloat(formData.transaction_fee) || 0
    const totalDebit = amount + fee

    if (selectedFromAccount && totalDebit > selectedFromAccount.current_balance) {
      alert('Insufficient balance in source account (including transaction fee)')
      return
    }

    try {
      setIsSubmitting(true)

      await onSubmit(
        formData.from_account_id,
        formData.to_account_id,
        amount,
        formData.description,
        fee // Pass fee as 5th parameter
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
      description: '',
      transaction_fee: ''
    })
    setSelectedFromAccount(null)
    setSelectedToAccount(null)
    setShowParser(false)
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

  // Calculate totals
  const amount = parseFloat(formData.amount) || 0
  const fee = parseFloat(formData.transaction_fee) || 0
  const totalDebit = amount + fee

  return (
    <>
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
            {/* Parse Message Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowParser(true)}
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Parse M-Pesa/Bank Message
              </button>
            </div>

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
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Available:</strong> {formatCurrency(selectedFromAccount.current_balance)}
                  </p>
                  {selectedFromAccount.institution_name && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {selectedFromAccount.institution_name}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Transfer Indicator */}
            <div className="flex justify-center">
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="h-px w-16 bg-gray-300 dark:bg-gray-600"></div>
                <ArrowRight className="h-6 w-6" />
                <div className="h-px w-16 bg-gray-300 dark:bg-gray-600"></div>
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
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    <strong>Current Balance:</strong> {formatCurrency(selectedToAccount.current_balance)}
                  </p>
                  {selectedToAccount.institution_name && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {selectedToAccount.institution_name}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Amount & Fee Row */}
            <div className="grid grid-cols-2 gap-4">
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
              </div>

              {/* Transaction Fee */}
              <div className="form-group">
                <label className="label">
                  Transaction Fee (KES)
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="0.00"
                  value={formData.transaction_fee}
                  onChange={(e) => setFormData({ ...formData, transaction_fee: e.target.value })}
                />
              </div>
            </div>

            {/* Fee Info */}
            {fee > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Transaction fee will be deducted from source account
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Total debit: {formatCurrency(totalDebit)}
                    </p>
                  </div>
                </div>
              </div>
            )}

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

            {/* Remaining Balance Preview */}
            {selectedFromAccount && formData.amount && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Remaining balance after transfer: {formatCurrency(selectedFromAccount.current_balance - totalDebit)}
              </p>
            )}

            {/* Transfer Summary */}
            {selectedFromAccount && selectedToAccount && formData.amount && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Transfer Summary</p>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span>From:</span>
                    <span className="font-medium">{selectedFromAccount.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>To:</span>
                    <span className="font-medium">{selectedToAccount.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transfer Amount:</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  {fee > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>Transaction Fee:</span>
                      <span className="font-medium">{formatCurrency(fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-blue-600 dark:text-blue-400 pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span>Total Debit:</span>
                    <span>{formatCurrency(totalDebit)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Recipient Gets:</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
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

      {/* Transaction Message Parser Modal */}
      {showParser && (
        <TransactionMessageParser
          onParsed={handleParsedData}
          onClose={() => setShowParser(false)}
        />
      )}
    </>
  )
}
