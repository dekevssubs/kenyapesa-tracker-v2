import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../utils/supabase'
import { LendingService } from '../../utils/lendingService'
import { formatCurrency } from '../../utils/calculations'
import {
  X,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Ban,
  ChevronDown,
  ChevronUp,
  Wallet,
  History
} from 'lucide-react'

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: Clock
  },
  partial: {
    label: 'Partial',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: ArrowDownLeft
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

export default function LendingDetailDrawer({
  isOpen,
  onClose,
  counterparty,
  onRecordRepayment,
  onForgive,
  onRefresh
}) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [lendings, setLendings] = useState([])
  const [timeline, setTimeline] = useState({})
  const [expandedLoans, setExpandedLoans] = useState(new Set())
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (isOpen && counterparty && user) {
      fetchPersonLendings()
    }
  }, [isOpen, counterparty, user])

  const fetchPersonLendings = async () => {
    try {
      setLoading(true)
      const lendingService = new LendingService(supabase, user.id)
      const result = await lendingService.getLendingsForPerson(counterparty.personName)

      if (result.success) {
        setLendings(result.lendings)
        setSummary(result.summary)

        // Fetch timeline for each lending
        const timelineMap = {}
        for (const lending of result.lendings) {
          const timelineResult = await lendingService.getLedgerTimeline(lending.id)
          if (timelineResult.success) {
            timelineMap[lending.id] = timelineResult.timeline
          }
        }
        setTimeline(timelineMap)
      } else {
        showToast('Error', result.error, 'error')
      }
    } catch (error) {
      console.error('Error fetching person lendings:', error)
      showToast('Error', 'Failed to load lending details', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleLoanExpanded = (loanId) => {
    setExpandedLoans(prev => {
      const newSet = new Set(prev)
      if (newSet.has(loanId)) {
        newSet.delete(loanId)
      } else {
        newSet.add(loanId)
      }
      return newSet
    })
  }

  const getStatusForLoan = (loan) => {
    if (loan.status === 'forgiven') return 'forgiven'
    if (loan.status === 'complete') return 'complete'
    if (loan.isOverdue) return 'overdue'
    if (loan.status === 'partial') return 'partial'
    return 'pending'
  }

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'lending':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />
      case 'repayment':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />
      case 'bad_debt':
      case 'forgiveness':
        return <Ban className="h-4 w-4 text-gray-500" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />
    }
  }

  if (!isOpen) return null

  const StatusIcon = STATUS_CONFIG[counterparty?.status]?.icon || Clock

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-xl w-full bg-white dark:bg-gray-900 shadow-xl transform transition-transform">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {counterparty?.personName}
                  </h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[counterparty?.status]?.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {STATUS_CONFIG[counterparty?.status]?.label}
                    </span>
                    {counterparty?.isOverdue && (
                      <span className="text-xs text-red-600 dark:text-red-400">
                        {counterparty.maxDaysOverdue} days overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Summary Stats */}
            {summary && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Lent</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(summary.totalLent)}
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400">Repaid</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(summary.totalRepaid)}
                  </p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400">Outstanding</p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(summary.totalOutstanding)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="spinner"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Loan History ({lendings.length})
                </h3>

                {lendings.map((loan) => {
                  const loanStatus = getStatusForLoan(loan)
                  const statusConfig = STATUS_CONFIG[loanStatus]
                  const LoanStatusIcon = statusConfig?.icon || Clock
                  const isExpanded = expandedLoans.has(loan.id)
                  const loanTimeline = timeline[loan.id] || []
                  const outstanding = parseFloat(loan.amount) - parseFloat(loan.amount_repaid || 0)

                  return (
                    <div
                      key={loan.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      {/* Loan Header */}
                      <div
                        className="p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => toggleLoanExpanded(loan.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig?.color}`}>
                              <LoanStatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig?.label}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(loan.date_lent || loan.date).toLocaleDateString('en-KE', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {formatCurrency(outstanding)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                of {formatCurrency(loan.amount)}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {loan.status !== 'pending' && (
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  loanStatus === 'complete' ? 'bg-green-500' :
                                  loanStatus === 'forgiven' ? 'bg-gray-400' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min((parseFloat(loan.amount_repaid || 0) / parseFloat(loan.amount)) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                          {/* Loan Details */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            {loan.due_date && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Calendar className="h-4 w-4 mr-2" />
                                Due: {new Date(loan.due_date).toLocaleDateString('en-KE')}
                              </div>
                            )}
                            {loan.lend_from_account && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Wallet className="h-4 w-4 mr-2" />
                                From: {loan.lend_from_account.name}
                              </div>
                            )}
                            {loan.interest_rate && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Interest: {loan.interest_rate}%
                              </div>
                            )}
                          </div>

                          {loan.notes && (
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                  {loan.notes}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Ledger Timeline */}
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                              <History className="h-4 w-4 mr-2" />
                              Ledger Timeline
                            </h4>
                            {loanTimeline.length > 0 ? (
                              <div className="space-y-2">
                                {loanTimeline.map((tx, index) => (
                                  <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                  >
                                    <div className="flex items-center space-x-3">
                                      {getTransactionIcon(tx.transaction_type)}
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                          {tx.transaction_type === 'lending' ? 'Loan Given' :
                                           tx.transaction_type === 'repayment' ? 'Repayment Received' :
                                           tx.transaction_type === 'bad_debt' ? 'Bad Debt Write-off' :
                                           tx.transaction_type}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {new Date(tx.date).toLocaleDateString('en-KE')}
                                        </p>
                                      </div>
                                    </div>
                                    <p className={`text-sm font-bold ${
                                      tx.transaction_type === 'lending' ? 'text-red-600 dark:text-red-400' :
                                      tx.transaction_type === 'repayment' ? 'text-green-600 dark:text-green-400' :
                                      'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {tx.transaction_type === 'lending' ? '-' : '+'}
                                      {formatCurrency(tx.amount)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                No ledger entries found
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          {loan.status !== 'complete' && loan.status !== 'forgiven' && (
                            <div className="flex space-x-3">
                              <button
                                onClick={() => onRecordRepayment(loan)}
                                className="flex-1 btn btn-primary py-2 text-sm flex items-center justify-center"
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Record Payment
                              </button>
                              <button
                                onClick={() => onForgive(loan)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm flex items-center"
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Forgive
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {lendings.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No lending records found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {summary && summary.totalOutstanding > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <button
                onClick={() => {
                  // Find first active loan for quick repayment
                  const activeLoan = lendings.find(l =>
                    l.status !== 'complete' && l.status !== 'forgiven'
                  )
                  if (activeLoan) {
                    onRecordRepayment(activeLoan)
                  }
                }}
                className="w-full btn btn-primary py-3 flex items-center justify-center"
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Record Repayment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
