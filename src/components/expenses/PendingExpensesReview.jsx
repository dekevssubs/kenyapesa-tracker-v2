import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../utils/supabase'
import { formatCurrency } from '../../utils/calculations'
import { getCategoryIcon, getPaymentIcon } from '../../utils/iconMappings'
import { RecurringExpenseService } from '../../utils/recurringExpenseService'
import { Clock, Check, X, Edit2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function PendingExpensesReview({ onUpdate }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [pendingExpenses, setPendingExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [processingIds, setProcessingIds] = useState(new Set())

  useEffect(() => {
    if (user) {
      fetchPendingExpenses()
    }
  }, [user])

  const fetchPendingExpenses = async () => {
    try {
      const service = new RecurringExpenseService(supabase, user.id)
      const pending = await service.getPendingExpenses()
      setPendingExpenses(pending)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching pending expenses:', error)
      setLoading(false)
    }
  }

  const handleApprove = async (pendingId) => {
    if (processingIds.has(pendingId)) return

    setProcessingIds(prev => new Set(prev).add(pendingId))

    try {
      const service = new RecurringExpenseService(supabase, user.id)
      const result = await service.approvePendingExpense(pendingId)

      if (result.success) {
        showToast('Success', 'Expense approved and added to your records', 'success')
        await fetchPendingExpenses()
        if (onUpdate) onUpdate()
      } else {
        showToast('Error', result.error || 'Failed to approve expense', 'error')
      }
    } catch (error) {
      console.error('Error approving expense:', error)
      showToast('Error', 'Failed to approve expense', 'error')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(pendingId)
        return next
      })
    }
  }

  const handleReject = async (pendingId) => {
    if (processingIds.has(pendingId)) return

    if (!confirm('Are you sure you want to reject this expense?')) return

    setProcessingIds(prev => new Set(prev).add(pendingId))

    try {
      const service = new RecurringExpenseService(supabase, user.id)
      const result = await service.rejectPendingExpense(pendingId)

      if (result.success) {
        showToast('Rejected', 'Expense rejected and removed from pending', 'info')
        await fetchPendingExpenses()
        if (onUpdate) onUpdate()
      } else {
        showToast('Error', result.error || 'Failed to reject expense', 'error')
      }
    } catch (error) {
      console.error('Error rejecting expense:', error)
      showToast('Error', 'Failed to reject expense', 'error')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(pendingId)
        return next
      })
    }
  }

  const handleUpdateAmount = async (pendingId) => {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      showToast('Invalid Amount', 'Please enter a valid amount', 'warning')
      return
    }

    try {
      const service = new RecurringExpenseService(supabase, user.id)
      const result = await service.updatePendingAmount(pendingId, parseFloat(editAmount))

      if (result.success) {
        showToast('Updated', 'Expense amount updated successfully', 'success')
        setEditingId(null)
        setEditAmount('')
        await fetchPendingExpenses()
      } else {
        showToast('Error', result.error || 'Failed to update amount', 'error')
      }
    } catch (error) {
      console.error('Error updating amount:', error)
      showToast('Error', 'Failed to update amount', 'error')
    }
  }

  const handleApproveAll = async () => {
    if (pendingExpenses.length === 0) return

    if (!confirm(`Approve all ${pendingExpenses.length} pending expenses?`)) return

    try {
      const service = new RecurringExpenseService(supabase, user.id)
      const result = await service.approveAllPending()

      if (result.success) {
        showToast('Success', `Approved ${result.approved} of ${result.total} expenses`, 'success')
        await fetchPendingExpenses()
        if (onUpdate) onUpdate()
      } else {
        showToast('Error', result.error || 'Failed to approve all expenses', 'error')
      }
    } catch (error) {
      console.error('Error approving all:', error)
      showToast('Error', 'Failed to approve all expenses', 'error')
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (pendingExpenses.length === 0) {
    return null // Don't show component if no pending expenses
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Pending Expenses Review
            </h3>
            <p className="text-sm text-gray-600">
              {pendingExpenses.length} auto-created {pendingExpenses.length === 1 ? 'expense' : 'expenses'} awaiting your approval
            </p>
          </div>
        </div>

        {pendingExpenses.length > 1 && (
          <button
            onClick={handleApproveAll}
            className="btn btn-primary flex items-center"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve All
          </button>
        )}
      </div>

      <div className="space-y-3">
        {pendingExpenses.map((pending) => {
          const CategoryIcon = getCategoryIcon(pending.category)
          const PaymentIcon = getPaymentIcon(pending.payment_method)
          const isEditing = editingId === pending.id
          const isProcessing = processingIds.has(pending.id)

          return (
            <div
              key={pending.id}
              className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="p-2.5 rounded-lg bg-white">
                  <CategoryIcon className="h-7 w-7 text-gray-700" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-semibold text-gray-900 capitalize">
                      {pending.category}
                    </p>
                    <span className="flex items-center text-xs text-gray-500">
                      <PaymentIcon className="h-3.5 w-3.5 mr-1" />
                      {pending.payment_method}
                    </span>
                    <span className="flex items-center text-xs text-amber-600">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Auto-created
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">{pending.description}</p>

                  {pending.recurring_transactions && (
                    <p className="text-xs text-gray-500 mt-1">
                      From: {pending.recurring_transactions.name} ({pending.recurring_transactions.frequency})
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    Due: {new Date(pending.date).toLocaleDateString('en-KE', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      className="input py-2 px-3 w-32"
                      placeholder="Amount"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdateAmount(pending.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditAmount('')
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(pending.amount)}
                      </p>
                      <button
                        onClick={() => {
                          setEditingId(pending.id)
                          setEditAmount(pending.amount)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center mt-1"
                        disabled={isProcessing}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit amount
                      </button>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(pending.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Approve"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <div className="spinner h-4 w-4"></div>
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(pending.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Reject"
                        disabled={isProcessing}
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
