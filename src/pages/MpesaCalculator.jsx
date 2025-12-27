import { useState, useEffect } from 'react'
import {
  Calculator,
  Send,
  Banknote,
  CreditCard,
  Building2,
  ShoppingBag,
  Receipt,
  ArrowRight,
  Info,
  TrendingDown,
  Smartphone
} from 'lucide-react'
import {
  FEE_METHODS,
  calculateDetailedFee,
  getMpesaFeeMethods,
  getFeeTierInfo
} from '../utils/kenyaTransactionFees'
import { formatCurrency } from '../utils/calculations'

// Icon mapping for transaction types
const TRANSACTION_ICONS = {
  mpesa_send: Send,
  mpesa_withdraw_agent: Banknote,
  mpesa_withdraw_atm: CreditCard,
  mpesa_paybill: Receipt,
  mpesa_buy_goods: ShoppingBag,
  mpesa_to_bank: Building2
}

export default function MpesaCalculator() {
  const [transactionType, setTransactionType] = useState(FEE_METHODS.MPESA_SEND)
  const [amount, setAmount] = useState('')
  const [feeDetails, setFeeDetails] = useState(null)
  const [tierInfo, setTierInfo] = useState(null)

  const mpesaMethods = getMpesaFeeMethods()
  const selectedMethod = mpesaMethods.find(m => m.value === transactionType)

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const details = calculateDetailedFee(amount, transactionType)
      setFeeDetails(details)

      const tier = getFeeTierInfo(parseFloat(amount), transactionType)
      setTierInfo(tier)
    } else {
      setFeeDetails(null)
      setTierInfo(null)
    }
  }, [amount, transactionType])

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, '')
    setAmount(value)
  }

  const handleQuickAmount = (quickAmount) => {
    setAmount(quickAmount.toString())
  }

  const quickAmounts = [500, 1000, 2500, 5000, 10000, 20000]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <div className="p-2 bg-green-500 rounded-lg mr-3">
              <Calculator className="h-7 w-7 text-white" />
            </div>
            M-Pesa Fee Calculator
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Calculate transaction fees before you transact
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Input */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Smartphone className="h-5 w-5 text-green-500 mr-2" />
            Transaction Details
          </h3>

          {/* Transaction Type Selection */}
          <div className="form-group mb-6">
            <label className="label">Transaction Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mpesaMethods.map((method) => {
                const Icon = TRANSACTION_ICONS[method.value] || Send
                const isSelected = transactionType === method.value

                return (
                  <button
                    key={method.value}
                    onClick={() => setTransactionType(method.value)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
                    }`}
                  >
                    <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`} />
                    <p className={`text-sm font-medium ${isSelected ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {method.label}
                    </p>
                    {method.value === FEE_METHODS.MPESA_BUY_GOODS && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">FREE</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div className="form-group mb-4">
            <label className="label">Amount (KES)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                KES
              </span>
              <input
                type="text"
                className="input pl-14 text-2xl font-bold h-16"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
              />
            </div>
            {selectedMethod?.minAmount && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Min: {formatCurrency(selectedMethod.minAmount)} | Max: {formatCurrency(selectedMethod.maxAmount)}
              </p>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => handleQuickAmount(quickAmount)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 transition-colors"
              >
                {formatCurrency(quickAmount)}
              </button>
            ))}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  {selectedMethod?.description}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  All fees shown are inclusive of 15% Excise Duty (Government Tax)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Receipt className="h-5 w-5 text-green-500 mr-2" />
            Fee Breakdown
          </h3>

          {feeDetails && feeDetails.amount > 0 ? (
            <div className="space-y-6">
              {/* Main Result Card */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
                <p className="text-green-100 text-sm font-medium mb-1">Total Amount to be Debited</p>
                <p className="text-4xl font-bold mb-4">
                  {formatCurrency(feeDetails.totalDebit)}
                </p>
                <div className="flex items-center text-green-100">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    {transactionType.includes('withdraw')
                      ? `Cash received: ${formatCurrency(feeDetails.amount)}`
                      : `Recipient gets: ${formatCurrency(feeDetails.amount)}`}
                  </span>
                </div>
              </div>

              {/* Fee Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Transaction Amount</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(feeDetails.amount)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <span className="text-gray-600 dark:text-gray-400">Transaction Fee</span>
                    <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      Incl. 15% Excise
                    </span>
                  </div>
                  <span className="font-bold text-red-600 dark:text-red-400 text-lg">
                    {formatCurrency(feeDetails.fee)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg px-4">
                  <span className="text-gray-900 dark:text-gray-100 font-semibold">Total Debit</span>
                  <span className="font-bold text-green-600 dark:text-green-400 text-xl">
                    {formatCurrency(feeDetails.totalDebit)}
                  </span>
                </div>
              </div>

              {/* Fee Tier Info */}
              {tierInfo && tierInfo.nextTier && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start">
                    <TrendingDown className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                        Fee Tier Tip
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Current tier: {formatCurrency(tierInfo.min)} - {formatCurrency(tierInfo.max)} (Fee: {formatCurrency(tierInfo.fee)})
                      </p>
                      {tierInfo.nextTier.fee > tierInfo.fee && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Send {formatCurrency(tierInfo.nextTier.amountUntilNextTier)} more and fee increases to {formatCurrency(tierInfo.nextTier.fee)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Free Transaction Note */}
              {feeDetails.totalFee === 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-500 rounded-full mr-3">
                      <ShoppingBag className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                        Free Transaction!
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {transactionType === FEE_METHODS.MPESA_BUY_GOODS
                          ? 'Buy Goods (Till) payments are free for customers'
                          : 'Transactions up to KES 100 are free'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Calculator className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-2">Enter an amount to calculate fees</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Select transaction type and enter amount above
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fee Comparison Table */}
      {amount && parseFloat(amount) > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Compare Transaction Methods
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            All fees shown are inclusive of 15% Excise Duty
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Method</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Fee</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Total Debit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {mpesaMethods.map((method) => {
                  const details = calculateDetailedFee(amount, method.value)
                  const isSelected = method.value === transactionType
                  const Icon = TRANSACTION_ICONS[method.value] || Send

                  return (
                    <tr
                      key={method.value}
                      className={`${isSelected ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <Icon className={`h-5 w-5 mr-3 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
                          <div>
                            <p className={`font-medium ${isSelected ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                              {method.label}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{method.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(details.fee)}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(details.totalDebit)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
