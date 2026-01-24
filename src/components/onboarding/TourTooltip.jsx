import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react'

export default function TourTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size
}) {
  const isLast = index === size - 1
  const isFirst = index === 0

  return (
    <div
      {...tooltipProps}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-sm animate-slideIn"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">
            {index + 1}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Step {index + 1} of {size}
          </span>
        </div>
        <button
          {...closeProps}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {step.title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {step.title}
          </h3>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {step.content}
        </p>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((index + 1) / size) * 100}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          {...skipProps}
          className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <SkipForward className="h-4 w-4" />
          <span>Skip tour</span>
        </button>

        <div className="flex items-center space-x-2">
          {!isFirst && (
            <button
              {...backProps}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          )}
          <button
            {...primaryProps}
            className="flex items-center space-x-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span>{isLast ? 'Finish' : 'Next'}</span>
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
