import { useState } from 'react'
import { X, AlertTriangle, Ban } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'

export default function ForgivenessModal({
  isOpen,
  onClose,
  lending,
  onConfirm,
  isLoading
}) {
  const [reason, setReason] = useState('')

  if (!isOpen || !lending) return null

  const outstanding = parseFloat(lending.amount) - parseFloat(lending.amount_repaid || 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm(lending.id, reason)
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 animate-slideIn">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Ban className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Forgive Debt
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                This action cannot be undone
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Forgiving this debt will:
              </p>
              <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-400 mt-1 space-y-1">
                <li>Record a "Bad Debt" expense of {formatCurrency(outstanding)}</li>
                <li>Reduce your net worth by this amount</li>
                <li>Mark this lending as forgiven</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Lending Details */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Borrower:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{lending.person_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Original Amount:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(lending.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Already Repaid:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(lending.amount_repaid || 0)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
              <span className="text-gray-600 dark:text-gray-400">Amount to Forgive:</span>
              <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(outstanding)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="label">Reason for Forgiveness (Optional)</label>
            <textarea
              className="textarea"
              placeholder="e.g., Unable to repay, gift, deceased, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary py-3"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn bg-amber-500 hover:bg-amber-600 text-white py-3 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="spinner-sm"></div>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Forgive Debt
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
