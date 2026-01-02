import { useState } from 'react'
import { MessageSquare, CheckCircle, AlertCircle, Copy, X, Building2, Smartphone, AlertTriangle } from 'lucide-react'
import { parseTransactionMessage, SAMPLE_MESSAGES } from '../utils/transactionMessageParser'
import { formatCurrency } from '../utils/calculations'

export default function TransactionMessageParser({ onParsed, onClose }) {
  const [message, setMessage] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [showSamples, setShowSamples] = useState(false)

  const handleParse = () => {
    if (!message.trim()) {
      alert('Please paste a transaction message')
      return
    }

    const result = parseTransactionMessage(message)
    setParsedData(result)
  }

  const handleConfirm = () => {
    if (parsedData && parsedData.success) {
      onParsed({
        amount: parsedData.amount,
        transactionFee: parsedData.transactionCost || 0,
        description: parsedData.recipient || '',
        reference: parsedData.transactionCode || parsedData.reference || '',
        transactionDate: parsedData.date || null, // Date extracted from message
        provider: parsedData.provider,
        // Bank transfer specific fields
        isBankTransfer: parsedData.transactionType === 'bank_transfer' || parsedData.transactionType === 'bank_debit',
        bankTransferType: parsedData.bankTransferType || null,
        bankName: parsedData.bankName || null,
        bankReference: parsedData.bankReference || null,
        mpesaReference: parsedData.mpesaReference || null,
        recipientNumber: parsedData.recipientNumber || null,
        requiresManualFee: parsedData.requiresManualFee || false
      })
      onClose()
    }
  }

  const loadSample = (sampleKey) => {
    setMessage(SAMPLE_MESSAGES[sampleKey])
    setShowSamples(false)
  }

  // Get friendly name for bank transfer type
  const getBankTransferTypeName = (type) => {
    switch (type) {
      case 'bank_to_till': return 'Bank → Till (Buy Goods)'
      case 'bank_to_mpesa': return 'Bank → M-Pesa User'
      case 'bank_to_paybill': return 'Bank → Paybill'
      default: return 'Bank Transfer'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-xl">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <MessageSquare className="h-6 w-6 mr-2 text-blue-500" />
              Parse Transaction Message
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Paste your M-Pesa or Bank SMS to auto-fill details
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Message Input */}
          <div>
            <label className="label">Transaction Message</label>
            <textarea
              className="input min-h-[120px] dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              placeholder="Paste your M-Pesa or Bank transaction message here...&#10;&#10;For bank transfers, you can paste both messages together (debit notification + M-Pesa confirmation)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>

          {/* Sample Messages Button */}
          <div>
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              {showSamples ? 'Hide' : 'Show'} Sample Messages
            </button>

            {showSamples && (
              <div className="mt-3 space-y-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Click to load a sample:</p>

                {/* M-Pesa Samples */}
                <p className="text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 font-bold mt-3">M-Pesa</p>
                {Object.keys(SAMPLE_MESSAGES).filter(k => k.startsWith('mpesa')).map((key) => (
                  <button
                    key={key}
                    onClick={() => loadSample(key)}
                    className="block w-full text-left p-2 text-xs bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30 rounded border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300">{key.replace(/_/g, ' ').toUpperCase()}</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 truncate">{SAMPLE_MESSAGES[key].substring(0, 60)}...</p>
                  </button>
                ))}

                {/* Bank Samples */}
                <p className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold mt-3">Bank Transfers</p>
                {Object.keys(SAMPLE_MESSAGES).filter(k => k.startsWith('bank')).map((key) => (
                  <button
                    key={key}
                    onClick={() => loadSample(key)}
                    className="block w-full text-left p-2 text-xs bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300">{key.replace(/_/g, ' ').toUpperCase()}</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 truncate">{SAMPLE_MESSAGES[key].substring(0, 60)}...</p>
                  </button>
                ))}

                {/* Legacy Bank Samples */}
                <p className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold mt-3">Other Banks</p>
                {Object.keys(SAMPLE_MESSAGES).filter(k => !k.startsWith('mpesa') && !k.startsWith('bank')).map((key) => (
                  <button
                    key={key}
                    onClick={() => loadSample(key)}
                    className="block w-full text-left p-2 text-xs bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300">{key.replace(/_/g, ' ').toUpperCase()}</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 truncate">{SAMPLE_MESSAGES[key].substring(0, 60)}...</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Parse Button */}
          <button
            onClick={handleParse}
            className="btn btn-primary w-full"
            disabled={!message.trim()}
          >
            Parse Message
          </button>

          {/* Parsed Results */}
          {parsedData && (
            <div className={`mt-4 p-4 rounded-lg border ${
              parsedData.success
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start mb-3">
                {parsedData.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${
                    parsedData.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                  }`}>
                    {parsedData.success ? 'Message Parsed Successfully!' : 'Could Not Parse Message'}
                  </p>
                  {!parsedData.success && (
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      Please check the message format and try again, or enter details manually.
                    </p>
                  )}
                </div>
              </div>

              {parsedData.success && (
                <div className="space-y-3 mt-4">
                  {/* Provider with icon */}
                  {parsedData.provider && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Provider:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        {(parsedData.transactionType === 'bank_transfer' || parsedData.transactionType === 'bank_debit') ? (
                          <Building2 className="h-4 w-4 mr-1 text-blue-500" />
                        ) : (
                          <Smartphone className="h-4 w-4 mr-1 text-green-500" />
                        )}
                        {parsedData.provider}
                      </span>
                    </div>
                  )}

                  {/* Bank Transfer Type (for bank transfers) */}
                  {parsedData.bankTransferType && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Transfer Type:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        {getBankTransferTypeName(parsedData.bankTransferType)}
                      </span>
                    </div>
                  )}

                  {/* Transaction Type (for M-Pesa) */}
                  {parsedData.transactionType && parsedData.transactionType !== 'bank_transfer' && parsedData.transactionType !== 'bank_debit' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                        {parsedData.transactionType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}

                  {/* Amount */}
                  {parsedData.amount !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Amount:</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                        {formatCurrency(parsedData.amount)}
                      </span>
                    </div>
                  )}

                  {/* Transaction Cost - or manual fee warning for bank */}
                  {parsedData.requiresManualFee ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                            Bank transfer fee not included in message
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            You'll need to enter the transaction fee manually in the form
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : parsedData.transactionCost !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Transaction Fee:</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(parsedData.transactionCost)}
                      </span>
                    </div>
                  )}

                  {/* Total (only if fee is available) */}
                  {parsedData.amount !== null && parsedData.transactionCost !== null && !parsedData.requiresManualFee && (
                    <div className="flex justify-between pt-2 border-t border-green-300 dark:border-green-700">
                      <span className="text-gray-700 dark:text-gray-300 font-bold">Total (Amount + Fee):</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                        {formatCurrency(parsedData.amount + parsedData.transactionCost)}
                      </span>
                    </div>
                  )}

                  {/* Recipient */}
                  {parsedData.recipient && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Recipient:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{parsedData.recipient}</span>
                    </div>
                  )}

                  {/* Recipient Number (Till/Phone) */}
                  {parsedData.recipientNumber && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {parsedData.bankTransferType === 'bank_to_till' ? 'Till Number:' :
                         parsedData.bankTransferType === 'bank_to_paybill' ? 'Paybill Number:' : 'Phone Number:'}
                      </span>
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{parsedData.recipientNumber}</span>
                    </div>
                  )}

                  {/* Bank Reference */}
                  {parsedData.bankReference && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Bank Ref:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100 flex items-center">
                        {parsedData.bankReference}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(parsedData.bankReference)
                          }}
                          className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title="Copy reference"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  )}

                  {/* M-Pesa Reference (for bank transfers) */}
                  {parsedData.mpesaReference && parsedData.bankReference !== parsedData.mpesaReference && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">M-Pesa Ref:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100 flex items-center">
                        {parsedData.mpesaReference}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(parsedData.mpesaReference)
                          }}
                          className="ml-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                          title="Copy reference"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  )}

                  {/* Transaction Code (for M-Pesa) */}
                  {parsedData.transactionCode && !parsedData.bankReference && !parsedData.mpesaReference && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Ref Code:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100 flex items-center">
                        {parsedData.transactionCode}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(parsedData.transactionCode)
                          }}
                          className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title="Copy reference"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  )}

                  {/* Date & Time */}
                  {(parsedData.date || parsedData.time) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Date:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {parsedData.date}{parsedData.time ? ` at ${parsedData.time}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Balance */}
                  {(parsedData.newBalance !== null || parsedData.balance !== null) && (
                    <div className="flex justify-between text-sm pt-2 border-t border-green-300 dark:border-green-700">
                      <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(parsedData.newBalance || parsedData.balance)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!parsedData || !parsedData.success}
            className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use This Data
          </button>
        </div>
      </div>
    </div>
  )
}
