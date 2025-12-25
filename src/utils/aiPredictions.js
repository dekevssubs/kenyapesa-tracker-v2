/**
 * Enhanced AI Budget Predictions
 * Uses statistical analysis: weighted moving average, trend detection, and seasonality
 */

/**
 * Main Budget Predictor Class
 */
export class BudgetPredictor {
  constructor(historicalExpenses) {
    this.expenses = historicalExpenses || []
  }

  /**
   * Main prediction function
   * Returns predictions for all categories with detailed metrics
   */
  predictAllCategories() {
    const categoryData = this.groupByCategory()
    const predictions = {}

    for (const [category, expenses] of Object.entries(categoryData)) {
      predictions[category] = this.predictCategory(category, expenses)
    }

    return predictions
  }

  /**
   * Predict spending for a specific category
   */
  predictCategory(category, expenses) {
    const monthlyData = this.aggregateByMonth(expenses)

    // Need at least 2 months of data for meaningful prediction
    if (monthlyData.length < 2) {
      return this.fallbackPrediction(expenses, category)
    }

    const movingAvg = this.calculateMovingAverage(monthlyData, 3)
    const trend = this.detectTrend(monthlyData)
    const seasonality = this.detectSeasonality(monthlyData)
    const variance = this.calculateVariance(monthlyData)

    // Weighted prediction formula:
    // 40% moving average + 30% trend-adjusted + 20% seasonal + 10% last month
    const predicted = this.calculateWeightedPrediction({
      movingAvg,
      trend,
      seasonality,
      lastMonth: monthlyData[monthlyData.length - 1].amount
    })

    const confidence = this.calculateConfidence(monthlyData, variance)
    const recommendation = this.generateRecommendation(category, trend, predicted, movingAvg, confidence)

    return {
      predicted: Math.round(predicted * 100) / 100,
      movingAverage: Math.round(movingAvg * 100) / 100,
      trend: trend.direction,
      trendPercentage: Math.round(trend.percentage * 100) / 100,
      seasonalityFactor: Math.round(seasonality.factor * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      recommendation,
      dataPoints: monthlyData.length
    }
  }

  /**
   * Group expenses by category
   */
  groupByCategory() {
    const grouped = {}

    this.expenses.forEach(expense => {
      const category = expense.category
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(expense)
    })

    return grouped
  }

  /**
   * Aggregate expenses by month
   */
  aggregateByMonth(expenses) {
    const monthly = {}

    expenses.forEach(expense => {
      const date = new Date(expense.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthly[monthKey]) {
        monthly[monthKey] = {
          month: monthKey,
          amount: 0,
          count: 0,
          monthNumber: date.getMonth()
        }
      }

      monthly[monthKey].amount += parseFloat(expense.amount)
      monthly[monthKey].count++
    })

    // Sort by month chronologically
    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month))
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(monthlyData, period = 3) {
    if (monthlyData.length < period) {
      // If not enough data, return simple average
      const total = monthlyData.reduce((sum, m) => sum + m.amount, 0)
      return total / monthlyData.length
    }

    // Take last 'period' months
    const recent = monthlyData.slice(-period)
    const total = recent.reduce((sum, m) => sum + m.amount, 0)
    return total / period
  }

  /**
   * Detect spending trend using linear regression
   */
  detectTrend(monthlyData) {
    if (monthlyData.length < 3) {
      return { direction: 'stable', percentage: 0, slope: 0 }
    }

    const n = monthlyData.length
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0

    monthlyData.forEach((data, index) => {
      sumX += index
      sumY += data.amount
      sumXY += index * data.amount
      sumX2 += index * index
    })

    // Calculate slope using least squares method
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const avgAmount = sumY / n

    // Calculate percentage change
    const percentage = avgAmount > 0 ? (slope / avgAmount) * 100 : 0

    // Determine direction (threshold: 5% change)
    let direction = 'stable'
    if (percentage > 5) direction = 'increasing'
    else if (percentage < -5) direction = 'decreasing'

    return {
      direction,
      percentage,
      slope
    }
  }

  /**
   * Detect seasonality patterns
   */
  detectSeasonality(monthlyData) {
    if (monthlyData.length < 6) {
      return { factor: 1.0, hasSeason: false }
    }

    // Calculate overall average
    const totalAvg = monthlyData.reduce((sum, m) => sum + m.amount, 0) / monthlyData.length

    // Get current month number (0-11)
    const currentMonth = new Date().getMonth()

    // Find historical data for the current month
    const currentMonthData = monthlyData.filter(m => m.monthNumber === currentMonth)

    if (currentMonthData.length === 0) {
      return { factor: 1.0, hasSeason: false }
    }

    // Calculate average for current month
    const currentMonthAvg = currentMonthData.reduce((sum, m) => sum + m.amount, 0) / currentMonthData.length

    // Calculate seasonal factor
    const factor = totalAvg > 0 ? currentMonthAvg / totalAvg : 1.0

    // Consider it seasonal if deviation is > 15%
    const hasSeason = Math.abs(factor - 1.0) > 0.15

    return {
      factor,
      hasSeason
    }
  }

  /**
   * Calculate variance (standard deviation)
   */
  calculateVariance(monthlyData) {
    const amounts = monthlyData.map(m => m.amount)
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length

    const squaredDiffs = amounts.map(a => Math.pow(a - mean, 2))
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / amounts.length

    return Math.sqrt(variance) // Return standard deviation
  }

  /**
   * Calculate weighted prediction
   */
  calculateWeightedPrediction({ movingAvg, trend, seasonality, lastMonth }) {
    // Apply trend adjustment
    const trendAdjustment = movingAvg * (trend.percentage / 100)

    // Apply seasonal adjustment
    const seasonalAdjustment = movingAvg * (seasonality.factor - 1.0)

    // Weighted combination
    const prediction = (
      movingAvg * 0.4 +                              // 40% moving average
      (movingAvg + trendAdjustment) * 0.3 +          // 30% trend-adjusted
      (movingAvg + seasonalAdjustment) * 0.2 +       // 20% seasonal
      lastMonth * 0.1                                 // 10% last month
    )

    return Math.max(0, prediction) // Can't be negative
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(monthlyData, variance) {
    const dataPoints = monthlyData.length
    const avg = monthlyData.reduce((sum, m) => sum + m.amount, 0) / dataPoints

    // Coefficient of variation (lower is better)
    const cv = avg > 0 ? variance / avg : 1

    let confidence = 0.5 // Base confidence

    // More data points = higher confidence
    if (dataPoints >= 12) confidence += 0.3
    else if (dataPoints >= 6) confidence += 0.2
    else if (dataPoints >= 4) confidence += 0.1

    // Lower variance = higher confidence
    if (cv < 0.2) confidence += 0.2
    else if (cv < 0.4) confidence += 0.1
    else if (cv > 0.8) confidence -= 0.1

    // Cap between 0.3 and 0.95
    return Math.max(0.3, Math.min(0.95, confidence))
  }

  /**
   * Generate recommendation based on prediction
   */
  generateRecommendation(category, trend, predicted, movingAvg, confidence) {
    const confidenceLevel = confidence > 0.7 ? 'high' : confidence > 0.5 ? 'medium' : 'low'

    // Increasing trend warning
    if (trend.direction === 'increasing' && trend.percentage > 10) {
      return `⚠️ Your ${category} spending is rising by ${Math.abs(trend.percentage).toFixed(1)}%. Consider reviewing expenses.`
    }

    // Decreasing trend praise
    if (trend.direction === 'decreasing' && trend.percentage < -10) {
      return `✅ Great! Your ${category} spending decreased by ${Math.abs(trend.percentage).toFixed(1)}%.`
    }

    // Spike prediction
    if (predicted > movingAvg * 1.2) {
      return `📈 ${category} spending may spike this month. Budget cautiously.`
    }

    // Drop prediction
    if (predicted < movingAvg * 0.8) {
      return `📉 ${category} spending expected to be lower this month.`
    }

    // Stable
    return `✓ ${category} spending is stable. Maintain current budget.`
  }

  /**
   * Fallback prediction for insufficient data
   */
  fallbackPrediction(expenses, category) {
    if (expenses.length === 0) {
      return {
        predicted: 0,
        movingAverage: 0,
        trend: 'insufficient_data',
        trendPercentage: 0,
        seasonalityFactor: 1.0,
        variance: 0,
        confidence: 0.2,
        recommendation: `Not enough data for ${category}. Add more expense history for predictions.`,
        dataPoints: 0
      }
    }

    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
    const avg = total / expenses.length

    return {
      predicted: Math.round(avg * 100) / 100,
      movingAverage: Math.round(avg * 100) / 100,
      trend: 'insufficient_data',
      trendPercentage: 0,
      seasonalityFactor: 1.0,
      variance: 0,
      confidence: 0.3,
      recommendation: `Limited data for ${category}. Prediction based on ${expenses.length} transaction(s).`,
      dataPoints: 1
    }
  }
}

/**
 * Helper function to fetch and predict
 * Usage: const predictions = await fetchAndPredict(userId, supabase)
 */
export async function fetchAndPredict(userId, supabase) {
  try {
    // Fetch last 12 months of expenses for better accuracy
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const startDate = twelveMonthsAgo.toISOString().split('T')[0]

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching expenses for prediction:', error)
      return {}
    }

    if (!expenses || expenses.length === 0) {
      return {}
    }

    const predictor = new BudgetPredictor(expenses)
    return predictor.predictAllCategories()
  } catch (error) {
    console.error('Error in fetchAndPredict:', error)
    return {}
  }
}

/**
 * Save predictions to database for caching
 */
export async function savePredictions(userId, predictions, supabase) {
  try {
    const currentMonth = new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
    const records = []

    for (const [category, data] of Object.entries(predictions)) {
      records.push({
        user_id: userId,
        category,
        month: currentMonth,
        predicted_amount: data.predicted,
        confidence_score: data.confidence,
        trend: data.trend,
        seasonality_factor: data.seasonalityFactor,
        moving_average: data.movingAverage,
        historical_variance: data.variance,
        calculation_metadata: {
          trendPercentage: data.trendPercentage,
          dataPoints: data.dataPoints,
          recommendation: data.recommendation
        }
      })
    }

    // Upsert predictions (insert or update if exists)
    const { error } = await supabase
      .from('ai_predictions')
      .upsert(records, {
        onConflict: 'user_id,category,month'
      })

    if (error) {
      console.error('Error saving predictions:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in savePredictions:', error)
    return false
  }
}

/**
 * Fetch cached predictions from database
 */
export async function getCachedPredictions(userId, supabase) {
  try {
    const currentMonth = new Date().toISOString().split('T')[0].slice(0, 7) + '-01'

    const { data, error } = await supabase
      .from('ai_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('month', currentMonth)

    if (error) {
      console.error('Error fetching cached predictions:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    // Convert back to predictions object
    const predictions = {}
    data.forEach(record => {
      predictions[record.category] = {
        predicted: record.predicted_amount,
        confidence: record.confidence_score,
        trend: record.trend,
        seasonalityFactor: record.seasonality_factor,
        movingAverage: record.moving_average,
        variance: record.historical_variance,
        trendPercentage: record.calculation_metadata?.trendPercentage || 0,
        dataPoints: record.calculation_metadata?.dataPoints || 0,
        recommendation: record.calculation_metadata?.recommendation || ''
      }
    })

    return predictions
  } catch (error) {
    console.error('Error in getCachedPredictions:', error)
    return null
  }
}
