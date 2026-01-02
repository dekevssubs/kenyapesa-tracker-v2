/**
 * Dashboard Service
 *
 * Provides read-only, ledger-derived data for the Dashboard.
 * Acts as a facade over ReportsService and PortfolioService.
 *
 * Architectural Compliance:
 * - Ledger-first: All data from account_transactions via ReportsService
 * - Read-only: Dashboard never writes data
 * - No direct DB queries: Uses service layer only
 * - Exclusions: Automatically excludes transfers and reversals
 */

import { ReportsService } from './reportsService'
import { PortfolioService } from './portfolioService'

export class DashboardService {
  constructor(supabase, userId) {
    this.reports = new ReportsService(supabase, userId)
    this.portfolio = new PortfolioService(supabase, userId)
  }

  /**
   * Get complete dashboard data for a given period
   * Returns all metrics needed for Dashboard UI
   */
  async getDashboardData(currentPeriod, comparisonPeriod, yoyPeriod, ytdPeriod) {
    try {
      // Fetch all data in parallel
      const [
        currentStats,
        comparisonStats,
        yoyStats,
        ytdStats,
        categoryBreakdown
      ] = await Promise.all([
        this.getPeriodStats(currentPeriod.startDate, currentPeriod.endDate),
        comparisonPeriod ? this.getPeriodStats(comparisonPeriod.startDate, comparisonPeriod.endDate) : null,
        this.getPeriodStats(yoyPeriod.startDate, yoyPeriod.endDate),
        this.getPeriodStats(ytdPeriod.startDate, ytdPeriod.endDate),
        this.reports.getCategoryBreakdown(currentPeriod.startDate, currentPeriod.endDate)
      ])

      // Calculate comparisons
      const comparisons = {
        mom: comparisonStats ? this.calculateComparison(currentStats, comparisonStats, comparisonPeriod.label) : null,
        yoy: this.calculateComparison(currentStats, yoyStats, yoyPeriod.label),
        ytd: {
          income: ytdStats.totalIncome,
          expenses: ytdStats.totalExpenses,
          savings: ytdStats.netSavings,
          projectedAnnualIncome: this.projectAnnualValue(ytdStats.totalIncome, ytdPeriod.daysElapsed, ytdPeriod.daysInYear),
          projectedAnnualExpenses: this.projectAnnualValue(ytdStats.totalExpenses, ytdPeriod.daysElapsed, ytdPeriod.daysInYear),
          daysElapsed: ytdPeriod.daysElapsed,
          daysInYear: ytdPeriod.daysInYear
        }
      }

      // Format category data for charts
      const categoryData = this.formatCategoryData(categoryBreakdown.categories, currentStats.totalExpenses)

      // Build monthly comparison for bar chart
      const monthlyComparison = comparisonStats ? [
        {
          month: comparisonPeriod.label,
          income: comparisonStats.totalIncome,
          expenses: comparisonStats.totalExpenses
        },
        {
          month: currentPeriod.label,
          income: currentStats.totalIncome,
          expenses: currentStats.totalExpenses
        }
      ] : []

      return {
        success: true,
        stats: {
          ...currentStats,
          periodLabel: currentPeriod.label
        },
        comparisons,
        categoryData,
        topExpenses: categoryData.slice(0, 5),
        monthlyComparison
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get statistics for a specific period
   * Uses ReportsService to query ledger
   */
  async getPeriodStats(startDate, endDate) {
    const summary = await this.reports.getReportSummary(startDate, endDate)

    if (!summary.success) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netSavings: 0,
        savingsRate: 0
      }
    }

    return {
      totalIncome: summary.summary.totalIncome,
      totalExpenses: summary.summary.totalExpenses,
      netSavings: summary.summary.netSavings,
      savingsRate: summary.summary.savingsRate
    }
  }

  /**
   * Calculate percentage changes between periods
   */
  calculateComparison(current, previous, label) {
    const incomeChange = this.calculatePercentageChange(current.totalIncome, previous.totalIncome)
    const expenseChange = this.calculatePercentageChange(current.totalExpenses, previous.totalExpenses)
    const savingsChange = this.calculatePercentageChange(current.netSavings, previous.netSavings)

    return {
      incomeChange,
      expenseChange,
      savingsChange,
      label
    }
  }

  /**
   * Calculate percentage change between two values
   */
  calculatePercentageChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  /**
   * Project annual value from YTD data
   */
  projectAnnualValue(ytdValue, daysElapsed, daysInYear) {
    if (daysElapsed === 0) return 0
    return (ytdValue / daysElapsed) * daysInYear
  }

  /**
   * Format category data for pie charts and lists
   */
  formatCategoryData(categories, totalExpenses) {
    return categories.map(cat => ({
      name: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
      value: cat.total,
      percentage: cat.percentage
    }))
  }

  /**
   * Get 12-month trend data
   * Used by TwelveMonthTrendWidget
   */
  async getTwelveMonthTrend() {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12)

    const trends = await this.reports.getMonthlyTrends(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )

    if (!trends.success) {
      return { success: false, error: trends.error }
    }

    return {
      success: true,
      months: trends.months
    }
  }

  /**
   * Get financial health indicators
   * Used by FinancialHealthScoreWidget
   */
  async getFinancialHealthIndicators(stats, comparisons) {
    // All calculations are done client-side from provided stats
    // This method is here for future expansion if we need ledger-derived health metrics
    return {
      success: true,
      indicators: {
        savingsRate: stats.savingsRate,
        incomeGrowth: comparisons.yoy.incomeChange,
        expenseControl: comparisons.yoy.expenseChange,
        netWorthTrend: comparisons.ytd.savings
      }
    }
  }
}

export default DashboardService
