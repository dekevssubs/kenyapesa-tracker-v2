import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import {
  FileText,
  Calendar,
  TrendingUp,
  PieChart as PieChartIcon,
  Download,
  ArrowLeftRight,
  DollarSign,
  Receipt,
  List,
  Target,
  Briefcase,
  Flag,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Wallet
} from 'lucide-react'
import QuickOverviewTab from '../components/reports/QuickOverviewTab'
import MonthToMonthTab from '../components/reports/MonthToMonthTab'
import YearToYearTab from '../components/reports/YearToYearTab'
import CategoryAnalysisTab from '../components/reports/CategoryAnalysisTab'
import CashFlowTab from '../components/reports/CashFlowTab'
import OverviewTab from '../components/reports/OverviewTab'
import TransactionExplorerTab from '../components/reports/TransactionExplorerTab'
import BudgetVsActualTab from '../components/reports/BudgetVsActualTab'
import PortfolioSummaryTab from '../components/reports/PortfolioSummaryTab'
import GoalsProgressTab from '../components/reports/GoalsProgressTab'
import MpesaFeeAnalytics from '../components/MpesaFeeAnalytics'

// Two-tier tab structure for reduced cognitive load
const PRIMARY_TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'detailed', label: 'Detailed', icon: FileText },
  { id: 'transactions', label: 'Transactions', icon: List },
  { id: 'analysis', label: 'Analysis', icon: PieChartIcon },
  { id: 'cashflow', label: 'Cash Flow', icon: ArrowLeftRight },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase }
]

// Secondary tabs that appear based on primary selection
const SECONDARY_TABS = {
  overview: [], // No subtabs - shows Quick Overview
  detailed: [
    { id: 'month-to-month', label: 'Month-to-Month', icon: Calendar },
    { id: 'year-to-year', label: 'Year-to-Year', icon: BarChart3 },
    { id: 'budget-vs-actual', label: 'Budget vs Actual', icon: Target }
  ],
  transactions: [
    { id: 'explorer', label: 'All Transactions', icon: List },
    { id: 'mpesa-fees', label: 'M-Pesa Fees', icon: Receipt }
  ],
  analysis: [
    { id: 'categories', label: 'By Category', icon: PieChartIcon },
    { id: 'detailed-overview', label: 'Full Breakdown', icon: FileText }
  ],
  cashflow: [], // No subtabs - shows Cash Flow
  portfolio: [
    { id: 'summary', label: 'Net Worth', icon: Wallet },
    { id: 'goals', label: 'Goals Progress', icon: Flag }
  ]
}

// Default secondary tab for each primary tab
const DEFAULT_SECONDARY = {
  overview: null,
  detailed: 'month-to-month',
  transactions: 'explorer',
  analysis: 'categories',
  cashflow: null,
  portfolio: 'summary'
}

export default function ComprehensiveReports() {
  const { user } = useAuth()
  const { showToast } = useToast()

  // Two-tier navigation state
  const [primaryTab, setPrimaryTab] = useState('overview')
  const [secondaryTab, setSecondaryTab] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1
    to: new Date().toISOString().split('T')[0] // Today
  })

  // Handle primary tab change - set default secondary tab
  const handlePrimaryTabChange = (tabId) => {
    setPrimaryTab(tabId)
    setSecondaryTab(DEFAULT_SECONDARY[tabId])
  }

  const handleExportPDF = () => {
    showToast('Coming Soon', 'PDF export feature is under development', 'info')
  }

  const handleExportCSV = () => {
    showToast('Coming Soon', 'CSV export feature is under development', 'info')
  }

  // Get current secondary tabs based on primary selection
  const currentSecondaryTabs = SECONDARY_TABS[primaryTab] || []

  // Render the active content based on primary + secondary tab
  const renderActiveTab = () => {
    // Primary tabs with no subtabs
    if (primaryTab === 'overview') {
      return <QuickOverviewTab dateRange={dateRange} />
    }
    if (primaryTab === 'cashflow') {
      return <CashFlowTab dateRange={dateRange} />
    }

    // Secondary tab content
    switch (secondaryTab) {
      // Detailed section
      case 'month-to-month':
        return <MonthToMonthTab dateRange={dateRange} />
      case 'year-to-year':
        return <YearToYearTab />
      case 'budget-vs-actual':
        return <BudgetVsActualTab dateRange={dateRange} />

      // Transactions section
      case 'explorer':
        return <TransactionExplorerTab dateRange={dateRange} />
      case 'mpesa-fees':
        return <MpesaFeeAnalytics period="month" dateRange={dateRange} />

      // Analysis section
      case 'categories':
        return <CategoryAnalysisTab dateRange={dateRange} />
      case 'detailed-overview':
        return <OverviewTab dateRange={dateRange} />

      // Portfolio section
      case 'summary':
        return <PortfolioSummaryTab />
      case 'goals':
        return <GoalsProgressTab />

      default:
        return <QuickOverviewTab dateRange={dateRange} />
    }
  }

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <BarChart3 className="h-8 w-8 mr-3 text-blue-500 dark:text-blue-400" />
            Financial Reports
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive financial analytics and insights
          </p>
        </div>

        {/* Export Buttons - Right Edge */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center transition-colors"
          >
            <Download className="h-4 w-4 mr-1.5" />
            CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center transition-colors"
          >
            <Download className="h-4 w-4 mr-1.5" />
            PDF
          </button>
        </div>
      </div>

      {/* Centered Period Control Bar */}
      <div className="card bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center justify-center py-2">
          {/* Main Date Display with Navigation */}
          <div className="flex items-center space-x-4 mb-3">
            <button
              onClick={() => {
                const from = new Date(dateRange.from)
                const to = new Date(dateRange.to)
                const diff = to - from
                from.setTime(from.getTime() - diff)
                to.setTime(to.getTime() - diff)
                setDateRange({
                  from: from.toISOString().split('T')[0],
                  to: to.toISOString().split('T')[0]
                })
              }}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Previous period"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="flex items-center space-x-3">
              <input
                type="date"
                className="input text-sm py-1.5 px-3 bg-white dark:bg-gray-800"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
              <span className="text-lg font-medium text-gray-500 dark:text-gray-400">—</span>
              <input
                type="date"
                className="input text-sm py-1.5 px-3 bg-white dark:bg-gray-800"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>

            <button
              onClick={() => {
                const from = new Date(dateRange.from)
                const to = new Date(dateRange.to)
                const diff = to - from
                from.setTime(from.getTime() + diff)
                to.setTime(to.getTime() + diff)
                setDateRange({
                  from: from.toISOString().split('T')[0],
                  to: to.toISOString().split('T')[0]
                })
              }}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Next period"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Quick Presets - Centered */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDateRange({
                from: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
              })}
              className="px-4 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-full border border-gray-200 dark:border-gray-600 transition-colors"
            >
              Last 6M
            </button>
            <button
              onClick={() => setDateRange({
                from: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
              })}
              className="px-4 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-full border border-gray-200 dark:border-gray-600 transition-colors"
            >
              Last 12M
            </button>
            <button
              onClick={() => setDateRange({
                from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
              })}
              className="px-4 py-1.5 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 rounded-full transition-colors"
            >
              YTD
            </button>
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation - Tier 1 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <nav className="flex" aria-label="Primary Tabs">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = primaryTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handlePrimaryTabChange(tab.id)}
                className={`
                  flex-1 flex items-center justify-center py-4 px-4 font-medium text-sm transition-all relative
                  ${isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }
                `}
              >
                <Icon className={`h-5 w-5 mr-2 ${isActive ? 'text-blue-500 dark:text-blue-400' : ''}`} />
                {tab.label}
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Secondary Tab Navigation - Tier 2 (Contextual) */}
      {currentSecondaryTabs.length > 0 && (
        <div className="flex items-center justify-center space-x-2">
          {currentSecondaryTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = secondaryTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSecondaryTab(tab.id)}
                className={`
                  flex items-center py-2 px-4 rounded-full font-medium text-sm transition-all
                  ${isActive
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {renderActiveTab()}
      </div>
    </div>
  )
}
