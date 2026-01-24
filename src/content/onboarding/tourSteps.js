// Shared styles for sidebar items to ensure visibility
const sidebarStepStyles = {
  spotlight: {
    backgroundColor: 'transparent',
  },
  options: {
    zIndex: 10001
  }
}

// Config for fixed sidebar items
const sidebarStepConfig = {
  styles: sidebarStepStyles,
  isFixed: true,
  disableScrollParentFix: true
}

export const tourSteps = [
  {
    target: '[data-tour="dashboard-summary"]',
    title: 'Financial Overview',
    content: 'This is your financial dashboard. See your income, expenses, savings, and trends at a glance. The cards show your current period performance with comparisons to previous periods.',
    placement: 'bottom',
    disableBeacon: true
  },
  {
    target: '[data-tour="sidebar-nav"]',
    title: 'Navigation Sidebar',
    content: 'Use the sidebar to access different sections of the app. Groups are collapsible - click on a group header to expand or collapse it.',
    placement: 'right',
    ...sidebarStepConfig
  },
  {
    target: '[data-tour="accounts-link"]',
    title: 'Your Accounts',
    content: 'Set up your M-Pesa, bank accounts, and cash wallets here. Tracking accounts helps you see exactly where your money is.',
    placement: 'right',
    ...sidebarStepConfig
  },
  {
    target: '[data-tour="income-link"]',
    title: 'Track Income',
    content: 'Record your salary and other income sources. You can even track salary deductions like PAYE, NHIF, and NSSF automatically.',
    placement: 'right',
    ...sidebarStepConfig
  },
  {
    target: '[data-tour="expenses-link"]',
    title: 'Record Expenses',
    content: 'Log your daily expenses here. Pro tip: You can paste M-Pesa messages directly and we\'ll extract the transaction details automatically!',
    placement: 'right',
    ...sidebarStepConfig
  },
  {
    target: '[data-tour="budget-link"]',
    title: 'Budget Planning',
    content: 'Create monthly budgets to control your spending. Set limits by category and get alerts when you\'re close to overspending.',
    placement: 'right',
    ...sidebarStepConfig
  },
  {
    target: '[data-tour="goals-link"]',
    title: 'Savings Goals',
    content: 'Set savings goals and track your progress. Whether it\'s an emergency fund, car deposit, or vacation - visualize your journey to financial success.',
    placement: 'right-start',
    ...sidebarStepConfig
  },
  {
    target: '[data-tour="lending-link"]',
    title: 'Lending Tracker',
    content: 'Keep track of money you\'ve lent to friends or borrowed from others. Never forget who owes you money again!',
    placement: 'right-start',
    ...sidebarStepConfig
  },
  {
    target: '[data-tour="help-link"]',
    title: 'Help Center',
    content: 'Find guides, tips, and answers to your questions in the Help Center. You can restart this tour anytime from Settings.',
    placement: 'right-start',
    ...sidebarStepConfig
  },
  {
    target: '[data-tour="command-palette"]',
    title: 'Quick Actions',
    content: 'Press Ctrl+K (or Cmd+K on Mac) to open the command palette for quick navigation and actions. Search for anything!',
    placement: 'bottom',
    styles: sidebarStepStyles
  },
  {
    target: '[data-tour="theme-toggle"]',
    title: 'Dark Mode',
    content: 'Toggle between light and dark mode for comfortable viewing. Your preference is saved automatically.',
    placement: 'bottom'
  }
]

// Fallback steps if some elements don't exist
export const getAvailableSteps = () => {
  return tourSteps.filter(step => {
    const element = document.querySelector(step.target)
    return element !== null
  })
}
