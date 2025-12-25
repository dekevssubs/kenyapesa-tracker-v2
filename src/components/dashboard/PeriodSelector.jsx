import { useState } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'
import { PERIOD_TYPES, getPeriodDisplayName } from '../../utils/periodUtils'

export default function PeriodSelector({ selectedPeriod, onPeriodChange, customRange, onCustomRangeChange }) {
  const [showCustom, setShowCustom] = useState(false)

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
    if (customRange.from && customRange.to) {
      onPeriodChange(PERIOD_TYPES.CUSTOM)
      setShowCustom(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Period</h3>
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
                value={customRange.from || ''}
                onChange={(e) => onCustomRangeChange({ ...customRange, from: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">To Date</label>
              <input
                type="date"
                className="input text-sm"
                value={customRange.to || ''}
                onChange={(e) => onCustomRangeChange({ ...customRange, to: e.target.value })}
              />
            </div>
          </div>

          <button
            onClick={handleCustomApply}
            disabled={!customRange.from || !customRange.to}
            className="btn btn-primary w-full text-sm py-2"
          >
            Apply Custom Range
          </button>
        </div>
      )}
    </div>
  )
}
