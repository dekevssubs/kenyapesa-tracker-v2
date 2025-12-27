import { useState, useEffect } from 'react'
import {
  Send,
  Banknote,
  CreditCard,
  Receipt,
  ShoppingBag,
  Building2,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react'
import {
  FEE_METHODS,
  calculateTransactionFee,
  getFeeTierInfo,
  getMpesaFeeMethods
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

// Category to suggested transaction type mapping
const CATEGORY_SUGGESTIONS = {
  utilities: FEE_METHODS.MPESA_PAYBILL,
  rent: FEE_METHODS.MPESA_PAYBILL,
  food: FEE_METHODS.MPESA_BUY_GOODS,
  entertainment: FEE_METHODS.MPESA_BUY_GOODS,
  clothing: FEE_METHODS.MPESA_BUY_GOODS,
  health: FEE_METHODS.MPESA_PAYBILL,
  education: FEE_METHODS.MPESA_PAYBILL,
  transport: FEE_METHODS.MPESA_SEND,
  airtime: FEE_METHODS.MPESA_BUY_GOODS,
  savings: FEE_METHODS.MPESA_TO_BANK,
  debt: FEE_METHODS.MPESA_SEND,
  loan: FEE_METHODS.MPESA_SEND,
  other: FEE_METHODS.MPESA_SEND
}

export default function MpesaFeePreview({
  amount,
  category,
  selectedFeeMethod,
  onFeeMethodChange,
  onFeeCalculated
}) {
  const [expanded, setExpanded] = useState(true)
  const [showComparison, setShowComparison] = useState(false)

  const parsedAmount = parseFloat(amount) || 0
  const mpesaMethods = getMpesaFeeMethods()
  const suggestedMethod = CATEGORY_SUGGESTIONS[category] || FEE_METHODS.MPESA_SEND

  // Calculate fee for selected method
  const currentFee = calculateTransactionFee(parsedAmount, selectedFeeMethod)
  const tierInfo = parsedAmount > 0 ? getFeeTierInfo(parsedAmount, selectedFeeMethod) : null

  // Calculate fees for all methods for comparison
  const allFees = mpesaMethods.map(method => ({
    ...method,
    fee: calculateTransactionFee(parsedAmount, method.value),
    isCurrent: method.value === selectedFeeMethod,
    isSuggested: method.value === suggestedMethod,
    isFree: method.value === FEE_METHODS.MPESA_BUY_GOODS
  })).sort((a, b) => a.fee - b.fee)

  const cheapestMethod = allFees[0]
  const potentialSavings = currentFee - cheapestMethod.fee

  // Notify parent of calculated fee
  useEffect(() => {
    if (onFeeCalculated) {
      onFeeCalculated(currentFee)
    }
  }, [currentFee, onFeeCalculated])

  // Auto-suggest based on category when component mounts or category changes
  useEffect(() => {
    if (suggestedMethod && selectedFeeMethod === FEE_METHODS.MPESA_SEND && suggestedMethod !== FEE_METHODS.MPESA_SEND) {
      // Only auto-suggest if currently on default Send Money
      // Don't override user's explicit selection
    }
  }, [category, suggestedMethod, selectedFeeMethod])

  if (parsedAmount <= 0) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
        <div className="flex items-center text-green-700 dark:text-green-400">
          <div className="p-2 bg-green-500 rounded-lg mr-3">
            <Send className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-medium text-sm">M-Pesa Transaction</p>
            <p className="text-xs text-green-600 dark:text-green-500">Enter amount to see fee estimate</p>
          </div>
        </div>
      </div>
    )
  }

  const SelectedIcon = TRANSACTION_ICONS[selectedFeeMethod] || Send

  return (
    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20 rounded-xl border border-green-200 dark:border-green-800 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center">
          <div className="p-2 bg-green-500 rounded-lg mr-3">
            <SelectedIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300 text-sm">M-Pesa Fee Preview</p>
            <p className="text-xs text-green-600 dark:text-green-500">
              Fee: {formatCurrency(currentFee)} {currentFee === 0 && '(FREE!)'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg font-bold text-green-700 dark:text-green-400">
            {formatCurrency(parsedAmount + currentFee)}
          </span>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-green-600 dark:text-green-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-green-600 dark:text-green-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Transaction Type Selection */}
          <div>
            <label className="block text-xs font-medium text-green-700 dark:text-green-400 mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {mpesaMethods.slice(0, 6).map((method) => {
                const Icon = TRANSACTION_ICONS[method.value] || Send
                const isSelected = selectedFeeMethod === method.value
                const methodFee = calculateTransactionFee(parsedAmount, method.value)

                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => onFeeMethodChange(method.value)}
                    className={`p-2 rounded-lg border transition-all text-center ${
                      isSelected
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-green-300 dark:border-green-700 bg-white dark:bg-gray-800 hover:border-green-400 dark:hover:border-green-600'
                    }`}
                  >
                    <Icon className={`h-4 w-4 mx-auto mb-1 ${isSelected ? 'text-white' : 'text-green-600 dark:text-green-500'}`} />
                    <p className={`text-[10px] font-medium leading-tight ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {method.label.replace('M-Pesa ', '').replace(' (P2P)', '')}
                    </p>
                    <p className={`text-[9px] mt-0.5 ${isSelected ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {methodFee === 0 ? 'FREE' : formatCurrency(methodFee)}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Amount</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(parsedAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 flex items-center">
                Fee
                <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                  Incl. Excise
                </span>
              </span>
              <span className={`font-medium ${currentFee === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {currentFee === 0 ? 'FREE' : formatCurrency(currentFee)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-gray-100">Total Debit</span>
              <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(parsedAmount + currentFee)}</span>
            </div>
          </div>

          {/* Savings Tip */}
          {potentialSavings > 0 && cheapestMethod.value !== selectedFeeMethod && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start">
              <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Save {formatCurrency(potentialSavings)}!
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  Use {cheapestMethod.label} instead ({cheapestMethod.fee === 0 ? 'FREE' : formatCurrency(cheapestMethod.fee)} fee)
                </p>
                <button
                  type="button"
                  onClick={() => onFeeMethodChange(cheapestMethod.value)}
                  className="text-[10px] text-amber-700 dark:text-amber-400 underline mt-1"
                >
                  Switch now
                </button>
              </div>
            </div>
          )}

          {/* Fee Tier Info */}
          {tierInfo && tierInfo.nextTier && tierInfo.nextTier.fee > tierInfo.fee && (
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-start">
              <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-[10px] text-blue-700 dark:text-blue-400">
                Current tier: {formatCurrency(tierInfo.min)} - {formatCurrency(tierInfo.max)}.
                Fee increases to {formatCurrency(tierInfo.nextTier.fee)} above {formatCurrency(tierInfo.max)}.
              </p>
            </div>
          )}

          {/* Compare All Methods Toggle */}
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className="w-full text-center text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium flex items-center justify-center"
          >
            <TrendingDown className="h-3.5 w-3.5 mr-1" />
            {showComparison ? 'Hide' : 'Compare all methods'}
          </button>

          {/* Comparison Table */}
          {showComparison && (
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-400 font-medium">Method</th>
                    <th className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400 font-medium">Fee</th>
                    <th className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {allFees.map((method) => (
                    <tr
                      key={method.value}
                      onClick={() => onFeeMethodChange(method.value)}
                      className={`cursor-pointer transition-colors ${
                        method.isCurrent
                          ? 'bg-green-50 dark:bg-green-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <td className="px-2 py-1.5">
                        <span className={`${method.isCurrent ? 'text-green-700 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                          {method.label.replace('M-Pesa ', '')}
                        </span>
                        {method.isFree && (
                          <span className="ml-1 text-[9px] px-1 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 rounded">
                            FREE
                          </span>
                        )}
                      </td>
                      <td className={`px-2 py-1.5 text-right ${method.fee === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {method.fee === 0 ? '-' : formatCurrency(method.fee)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(parsedAmount + method.fee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
