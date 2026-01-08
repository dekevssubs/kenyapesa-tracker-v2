import {
  Inbox,
  Plus,
  TrendingDown,
  DollarSign,
  Target,
  Wallet,
  HandCoins,
  Bell,
  RefreshCw,
  BarChart3,
  FileText
} from 'lucide-react'

// Icon mapping for different empty state types
const icons = {
  default: Inbox,
  expenses: TrendingDown,
  income: DollarSign,
  goals: Target,
  accounts: Wallet,
  lending: HandCoins,
  bills: Bell,
  subscriptions: RefreshCw,
  reports: BarChart3,
  transactions: FileText
}

// Preset configurations for common empty states
const presets = {
  expenses: {
    icon: 'expenses',
    title: 'No expenses yet',
    description: 'Start tracking your spending by adding your first expense.',
    actionLabel: 'Add Expense'
  },
  income: {
    icon: 'income',
    title: 'No income recorded',
    description: 'Record your salary, freelance earnings, or other income sources.',
    actionLabel: 'Add Income'
  },
  goals: {
    icon: 'goals',
    title: 'No savings goals',
    description: 'Set financial goals to track your progress towards what matters.',
    actionLabel: 'Create Goal'
  },
  accounts: {
    icon: 'accounts',
    title: 'No accounts added',
    description: 'Add your bank accounts, M-Pesa, and wallets to track balances.',
    actionLabel: 'Add Account'
  },
  lending: {
    icon: 'lending',
    title: 'No lending activity',
    description: 'Track money you\'ve lent to others or borrowed.',
    actionLabel: 'Add Entry'
  },
  bills: {
    icon: 'bills',
    title: 'No bill reminders',
    description: 'Never miss a payment by setting up bill reminders.',
    actionLabel: 'Add Reminder'
  },
  subscriptions: {
    icon: 'subscriptions',
    title: 'No subscriptions tracked',
    description: 'Keep track of your recurring subscriptions and services.',
    actionLabel: 'Add Subscription'
  },
  transactions: {
    icon: 'transactions',
    title: 'No transactions found',
    description: 'Transactions will appear here once you start recording activity.',
    actionLabel: null
  },
  filtered: {
    icon: 'default',
    title: 'No matching results',
    description: 'Try adjusting your filters or search terms.',
    actionLabel: 'Clear Filters'
  }
}

export default function EmptyState({
  preset,
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) {
  // Use preset values if provided, otherwise use direct props
  const config = preset ? { ...presets[preset], ...{ icon, title, description, actionLabel } } : { icon, title, description, actionLabel }

  // Filter out undefined values from config
  const finalConfig = {
    icon: config.icon || (preset ? presets[preset]?.icon : 'default'),
    title: config.title || (preset ? presets[preset]?.title : 'No data'),
    description: config.description || (preset ? presets[preset]?.description : 'Nothing to show here yet.'),
    actionLabel: config.actionLabel !== undefined ? config.actionLabel : (preset ? presets[preset]?.actionLabel : null)
  }

  const IconComponent = icons[finalConfig.icon] || icons.default

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
          <IconComponent className="h-10 w-10 text-[var(--text-muted)]" />
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-900/30" />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-primary-200 dark:bg-primary-800/30" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 text-center">
        {finalConfig.title}
      </h3>
      <p className="text-sm text-[var(--text-muted)] text-center max-w-sm mb-6">
        {finalConfig.description}
      </p>

      {/* Action Button */}
      {finalConfig.actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {finalConfig.actionLabel}
        </button>
      )}
    </div>
  )
}

// Compact variant for smaller spaces
export function EmptyStateCompact({
  icon = 'default',
  message = 'No data available',
  className = ''
}) {
  const IconComponent = icons[icon] || icons.default

  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
        <IconComponent className="h-6 w-6 text-[var(--text-muted)]" />
      </div>
      <p className="text-sm text-[var(--text-muted)] text-center">{message}</p>
    </div>
  )
}

// Inline variant for tables/lists
export function EmptyStateInline({ message = 'No items', className = '' }) {
  return (
    <div className={`py-8 text-center ${className}`}>
      <Inbox className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
    </div>
  )
}
