import { Link } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'

/**
 * HelpButton - Contextual help icon that links to relevant help articles
 *
 * Usage:
 * <HelpButton articleId="creating-budgets" />
 * <HelpButton articleId="budgeting/creating-budgets" tooltip="Learn about budgets" />
 */
export default function HelpButton({
  articleId,
  tooltip = 'Get help',
  size = 'sm',
  className = ''
}) {
  const sizeClasses = {
    xs: 'h-3.5 w-3.5',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const buttonSizeClasses = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5'
  }

  return (
    <Link
      to={`/help/${articleId}`}
      className={`
        inline-flex items-center justify-center
        ${buttonSizeClasses[size]}
        rounded-full
        text-gray-400 hover:text-primary-500
        hover:bg-gray-100 dark:hover:bg-gray-700
        transition-colors duration-200
        ${className}
      `}
      title={tooltip}
      aria-label={tooltip}
    >
      <HelpCircle className={sizeClasses[size]} />
    </Link>
  )
}

/**
 * InlineHelp - Help icon with inline text for section headers
 *
 * Usage:
 * <InlineHelp articleId="budget-alerts">Budget Alerts</InlineHelp>
 */
export function InlineHelp({ articleId, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {children}
      <HelpButton articleId={articleId} size="xs" tooltip={`Learn more about ${children}`} />
    </span>
  )
}
