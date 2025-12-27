import { useState, useEffect } from 'react'
import { Calendar, X, RotateCcw } from 'lucide-react'
import { PERIOD_TYPES } from '../../utils/periodUtils'

export default function PeriodSelector({ selectedPeriod, onPeriodChange, customRange, onCustomRangeChange }) {
  const [showCustom, setShowCustom] = useState(false)
  // Local draft state for custom dates - only updates parent when Apply is clicked
  const [draftFrom, setDraftFrom] = useState(customRange.from || '')
  const [draftTo, setDraftTo] = useState(customRange.to || '')

  // Sync draft with parent when custom range changes externally
  useEffect(() => {
    setDraftFrom(customRange.from || '')
    setDraftTo(customRange.to || '')
  }, [customRange.from, customRange.to])

  // Keep custom panel open if custom is selected
  useEffect(() => {
    if (selectedPeriod === PERIOD_TYPES.CUSTOM) {
      setShowCustom(true)
    }
  }, [selectedPeriod])

  const periods = [
    { value: PERIOD_TYPES.THIS_MONTH, label: 'This Month' },
    { value: PERIOD_TYPES.LAST_MONTH, label: 'Last Month' },
    { value: PERIOD_TYPES.THIS_QUARTER, label: 'This Quarter' },
    { value: PERIOD_TYPES.THIS_YEAR, label: 'This Year' },
    { value: PERIOD_TYPES.LAST_YEAR, label: 'Last Year' },
    { value: PERIOD_TYPES.CUSTOM, label: 'Custom Range' }
  ]

  const handlePeriodClick = (period) => {
    if (period === PERIOD_TYPES.CUSTOM) {
      setShowCustom(true)
    } else {
      setShowCustom(false)
      onPeriodChange(period)
    }
  }

  const handleCustomApply = () => {
    if (draftFrom && draftTo) {
      // Only update parent state when Apply is clicked
      onCustomRangeChange({ from: draftFrom, to: draftTo })
      onPeriodChange(PERIOD_TYPES.CUSTOM)
    }
  }

  const handleClearFilter = () => {
    setDraftFrom('')
    setDraftTo('')
    onCustomRangeChange({ from: '', to: '' })
    setShowCustom(false)
    onPeriodChange(PERIOD_TYPES.THIS_MONTH)
  }

  const isCustomActive = selectedPeriod === PERIOD_TYPES.CUSTOM && customRange.from && customRange.to

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Period</h3>
        </div>
        {/* Clear filter button - visible when custom is active */}
        {isCustomActive && (
          <button
            onClick={handleClearFilter}
            className="flex items-center space-x-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
            title="Clear custom filter"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      {/* Period Buttons */}
      <div className="flex flex-wrap gap-2">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => handlePeriodClick(period.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === period.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Show active custom date range info */}
      {isCustomActive && !showCustom && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <span className="text-xs text-blue-700 dark:text-blue-300">
            Custom: {new Date(customRange.from).toLocaleDateString()} - {new Date(customRange.to).toLocaleDateString()}
          </span>
          <button
            onClick={() => setShowCustom(true)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Edit
          </button>
        </div>
      )}

      {/* Custom Range Picker */}
      {showCustom && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Custom Date Range</h4>
            <button
              onClick={() => setShowCustom(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="label text-xs">From Date</label>
              <input
                type="date"
                className="input text-sm"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs">To Date</label>
              <input
                type="date"
                className="input text-sm"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleCustomApply}
              disabled={!draftFrom || !draftTo}
              className="btn btn-primary flex-1 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Custom Range
            </button>
            {isCustomActive && (
              <button
                onClick={handleClearFilter}
                className="btn btn-secondary text-sm py-2 px-4"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
