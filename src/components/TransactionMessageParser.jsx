import { useState } from 'react'
import { MessageSquare, CheckCircle, AlertCircle, Copy, X } from 'lucide-react'
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
        provider: parsedData.provider
      })
      onClose()
    }
  }

  const loadSample = (sampleKey) => {
    setMessage(SAMPLE_MESSAGES[sampleKey])
    setShowSamples(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <MessageSquare className="h-6 w-6 mr-2 text-blue-500" />
              Parse Transaction Message
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Paste your M-Pesa or Bank SMS to auto-fill expense details
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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
              className="input min-h-[120px]"
              placeholder="Paste your M-Pesa or Bank transaction message here...&#10;Example: SHK1ABC123 Confirmed. Ksh500.00 paid to JAVA HOUSE..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>

          {/* Sample Messages Button */}
          <div>
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showSamples ? 'Hide' : 'Show'} Sample Messages
            </button>

            {showSamples && (
              <div className="mt-3 space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Click to load a sample:</p>
                {Object.keys(SAMPLE_MESSAGES).map((key) => (
                  <button
                    key={key}
                    onClick={() => loadSample(key)}
                    className="block w-full text-left p-2 text-xs bg-white hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <span className="font-medium text-gray-700">{key.replace(/_/g, ' ').toUpperCase()}</span>
                    <p className="text-gray-500 mt-1 truncate">{SAMPLE_MESSAGES[key].substring(0, 80)}...</p>
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
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start mb-3">
                {parsedData.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${
                    parsedData.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {parsedData.success ? 'Message Parsed Successfully!' : 'Could Not Parse Message'}
                  </p>
                  {!parsedData.success && (
                    <p className="text-sm text-red-700 mt-1">
                      Please check the message format and try again, or enter details manually.
                    </p>
                  )}
                </div>
              </div>

              {parsedData.success && (
                <div className="space-y-3 mt-4">
                  {/* Provider */}
                  {parsedData.provider && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Provider:</span>
                      <span className="font-semibold text-gray-900">{parsedData.provider}</span>
                    </div>
                  )}

                  {/* Transaction Type */}
                  {parsedData.transactionType && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-semibold text-gray-900 capitalize">
                        {parsedData.transactionType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}

                  {/* Amount */}
                  {parsedData.amount !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Amount:</span>
                      <span className="font-bold text-gray-900 text-lg">
                        {formatCurrency(parsedData.amount)}
                      </span>
                    </div>
                  )}

                  {/* Transaction Cost */}
                  {parsedData.transactionCost !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Transaction Fee:</span>
                      <span className="font-bold text-orange-600">
                        {formatCurrency(parsedData.transactionCost)}
                      </span>
                    </div>
                  )}

                  {/* Total */}
                  {parsedData.amount !== null && parsedData.transactionCost !== null && (
                    <div className="flex justify-between pt-2 border-t border-green-300">
                      <span className="text-gray-700 font-bold">Total (Amount + Fee):</span>
                      <span className="font-bold text-gray-900 text-lg">
                        {formatCurrency(parsedData.amount + parsedData.transactionCost)}
                      </span>
                    </div>
                  )}

                  {/* Recipient */}
                  {parsedData.recipient && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Recipient:</span>
                      <span className="font-semibold text-gray-900">{parsedData.recipient}</span>
                    </div>
                  )}

                  {/* Transaction Code */}
                  {parsedData.transactionCode && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ref Code:</span>
                      <span className="font-mono text-gray-900 flex items-center">
                        {parsedData.transactionCode}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(parsedData.transactionCode)
                            alert('Reference code copied!')
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-700"
                          title="Copy reference"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  )}

                  {/* Date */}
                  {parsedData.date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-semibold text-gray-900">{parsedData.date}</span>
                    </div>
                  )}

                  {/* Balance */}
                  {parsedData.newBalance !== null && (
                    <div className="flex justify-between text-sm pt-2 border-t border-green-300">
                      <span className="text-gray-600">New Balance:</span>
                      <span className="font-semibold text-gray-900">
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
        <div className="flex space-x-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-xl">
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
