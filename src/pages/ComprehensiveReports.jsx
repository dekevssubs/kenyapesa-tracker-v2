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
  Flag
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

const TABS = [
  { id: 'quick', label: 'Quick Overview', icon: TrendingUp },
  { id: 'overview', label: 'Detailed Overview', icon: FileText },
  { id: 'explorer', label: 'Transaction Explorer', icon: List },
  { id: 'monthly', label: 'Month-to-Month', icon: Calendar },
  { id: 'yearly', label: 'Year-to-Year', icon: TrendingUp },
  { id: 'category', label: 'Category Analysis', icon: PieChartIcon },
  { id: 'cashflow', label: 'Cash Flow', icon: ArrowLeftRight },
  { id: 'budget', label: 'Budget vs Actual', icon: Target },
  { id: 'portfolio', label: 'Portfolio Summary', icon: Briefcase },
  { id: 'goals', label: 'Goals Progress', icon: Flag },
  { id: 'mpesa-fees', label: 'M-Pesa Fees', icon: Receipt }
]

export default function ComprehensiveReports() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('quick')
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1
    to: new Date().toISOString().split('T')[0] // Today
  })

  const handleExportPDF = () => {
    // PDF export will be implemented
    showToast('Coming Soon', 'PDF export feature is under development', 'info')
  }

  const handleExportCSV = () => {
    // CSV export will be implemented
    showToast('Coming Soon', 'CSV export feature is under development', 'info')
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'quick':
        return <QuickOverviewTab dateRange={dateRange} />
      case 'overview':
        return <OverviewTab dateRange={dateRange} />
      case 'monthly':
        return <MonthToMonthTab dateRange={dateRange} />
      case 'yearly':
        return <YearToYearTab />
      case 'category':
        return <CategoryAnalysisTab dateRange={dateRange} />
      case 'cashflow':
        return <CashFlowTab dateRange={dateRange} />
      case 'explorer':
        return <TransactionExplorerTab dateRange={dateRange} />
      case 'budget':
        return <BudgetVsActualTab dateRange={dateRange} />
      case 'portfolio':
        return <PortfolioSummaryTab />
      case 'goals':
        return <GoalsProgressTab />
      case 'mpesa-fees':
        return <MpesaFeeAnalytics period="month" />
      default:
        return <QuickOverviewTab />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <FileText className="h-8 w-8 mr-3 text-blue-500 dark:text-blue-400" />
            Financial Reports
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Complete financial analytics with quick overview, detailed insights, and trend analysis
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="btn btn-primary flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Report Period:</span>
          </div>
          <div className="flex items-center space-x-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">From</label>
              <input
                type="date"
                className="input text-sm ml-2"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <span className="text-gray-400 dark:text-gray-500">—</span>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">To</label>
              <input
                type="date"
                className="input text-sm ml-2"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={() => setDateRange({
                from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
            >
              YTD
            </button>
            <button
              onClick={() => setDateRange({
                from: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
            >
              Last 6 Months
            </button>
            <button
              onClick={() => setDateRange({
                from: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
            >
              Last 12 Months
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-screen">
        {renderActiveTab()}
      </div>
    </div>
  )
}
