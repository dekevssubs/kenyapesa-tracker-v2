import { useState, useMemo } from 'react'
import { CreditCard, ChevronDown, ChevronRight, Receipt, Percent } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'

export default function PaymentAndFeesPanel({ expenses }) {
  const [expanded, setExpanded] = useState(true)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const insights = useMemo(() => {
    const thisMonthExpenses = expenses.filter(e => {
      if (e.is_reversed) return false
      const d = new Date(e.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })

    // Payment method breakdown
    const methodMap = {}
    thisMonthExpenses.forEach(e => {
      const method = e.payment_method || 'other'
      if (!methodMap[method]) methodMap[method] = { total: 0, count: 0 }
      methodMap[method].total += parseFloat(e.amount || 0) + parseFloat(e.transaction_fee || 0)
      methodMap[method].count += 1
    })

    const totalSpending = Object.values(methodMap).reduce((sum, m) => sum + m.total, 0)
    const paymentMethods = Object.entries(methodMap)
      .map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count,
        percentage: totalSpending > 0 ? (data.total / totalSpending) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)

    // Fee impact
    const totalFees = thisMonthExpenses.reduce((sum, e) => sum + parseFloat(e.transaction_fee || 0), 0)
    const feePercentage = totalSpending > 0 ? (totalFees / totalSpending) * 100 : 0

    // Fee by method
    const feeMethodMap = {}
    thisMonthExpenses.forEach(e => {
      const fee = parseFloat(e.transaction_fee || 0)
      if (fee <= 0) return
      const method = e.fee_method || 'unknown'
      if (!feeMethodMap[method]) feeMethodMap[method] = { total: 0, count: 0 }
      feeMethodMap[method].total += fee
      feeMethodMap[method].count += 1
    })

    const feeMethods = Object.entries(feeMethodMap)
      .map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count
      }))
      .sort((a, b) => b.total - a.total)

    return { paymentMethods, totalSpending, totalFees, feePercentage, feeMethods }
  }, [expenses, currentMonth, currentYear])

  const methodLabels = {
    mpesa: 'M-Pesa',
    cash: 'Cash',
    bank: 'Bank',
    card: 'Card',
    other: 'Other'
  }

  const methodColors = {
    mpesa: 'bg-green-500',
    cash: 'bg-blue-500',
    bank: 'bg-indigo-500',
    card: 'bg-orange-500',
    other: 'bg-slate-500'
  }

  const feeMethodLabels = {
    mpesa_send: 'M-Pesa Send',
    mpesa_paybill: 'M-Pesa Paybill',
    mpesa_buy_goods: 'M-Pesa Buy Goods',
    mpesa_withdraw: 'M-Pesa Withdraw',
    bank_transfer: 'Bank Transfer',
    bank_rtgs: 'Bank RTGS',
    bank_eft: 'Bank EFT',
    unknown: 'Unknown'
  }

  const hasContent = insights.paymentMethods.length > 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-blue-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Payment & Fees</h3>
        </div>
        {expanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-200 dark:border-slate-700 pt-4">
          {!hasContent ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No spending data this month yet.
            </p>
          ) : (
            <>
              {/* Payment Method Breakdown */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={14} className="text-blue-500" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Payment Methods
                  </span>
                </div>
                <div className="space-y-3">
                  {insights.paymentMethods.map(({ method, total, count, percentage }) => (
                    <div key={method}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                          {methodLabels[method] || method}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {count} txn{count !== 1 ? 's' : ''}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${methodColors[method] || 'bg-slate-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-right">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee Impact */}
              {insights.totalFees > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Percent size={14} className="text-red-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Fee Impact
                    </span>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-700 dark:text-red-300">Total fees this month</span>
                      <span className="text-sm font-bold text-red-800 dark:text-red-200">
                        {formatCurrency(insights.totalFees)}
                      </span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {insights.feePercentage.toFixed(1)}% of total spending
                    </p>
                  </div>
                </div>
              )}

              {/* Fee by Method */}
              {insights.feeMethods.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt size={14} className="text-orange-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Fee Breakdown
                    </span>
                  </div>
                  <div className="space-y-2">
                    {insights.feeMethods.map(({ method, total, count }) => (
                      <div key={method} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {feeMethodLabels[method] || method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ×{count}
                          </span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
