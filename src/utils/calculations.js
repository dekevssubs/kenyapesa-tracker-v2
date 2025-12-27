// Kenyan Tax Calculation Utilities (2024/2025 Rates)
// Based on KRA Finance Act 2023 effective 1st July 2023 and Affordable Housing Act 2024

// Tax bands defined by cumulative threshold (KRA rates)
// First 24,000: 10%, Next 8,333: 25%, Next 467,667: 30%, Next 300,000: 32.5%, Above 800,000: 35%
export const TAX_BANDS = [
  { threshold: 24000, rate: 0.10, label: '0 - 24,000' },
  { threshold: 32333, rate: 0.25, label: '24,001 - 32,333' },
  { threshold: 500000, rate: 0.30, label: '32,334 - 500,000' },
  { threshold: 800000, rate: 0.325, label: '500,001 - 800,000' },
  { threshold: Infinity, rate: 0.35, label: '800,001 and above' }
]

export const PERSONAL_RELIEF = 2400
export const NSSF_AMOUNT = 1080 // Fixed employee contribution (Tier I + II)
export const SHIF_RATE = 0.0275 // 2.75% of gross salary
export const HOUSING_LEVY_RATE = 0.015 // 1.5% of gross salary (Affordable Housing Levy)

export function calculatePAYE(taxableIncome) {
  if (taxableIncome <= 0) return 0

  let paye = 0
  let previousThreshold = 0

  for (const band of TAX_BANDS) {
    if (taxableIncome <= previousThreshold) break

    // Calculate the amount taxable in this band
    const upperLimit = band.threshold === Infinity ? taxableIncome : Math.min(taxableIncome, band.threshold)
    const taxableInBand = upperLimit - previousThreshold

    paye += taxableInBand * band.rate
    previousThreshold = band.threshold
  }

  // Apply personal relief (cannot result in negative tax)
  paye = Math.max(0, paye - PERSONAL_RELIEF)
  return Math.round(paye * 100) / 100
}

export function calculateNetSalary(grossSalary) {
  if (!grossSalary || grossSalary < 0) return null

  const gross = parseFloat(grossSalary)

  // Statutory deductions (before PAYE calculation)
  const nssf = NSSF_AMOUNT
  const housingLevy = Math.round(gross * HOUSING_LEVY_RATE * 100) / 100
  const shif = Math.round(gross * SHIF_RATE * 100) / 100

  // Taxable income: Gross - NSSF - Housing Levy - SHIF
  // Per KRA guidelines (Affordable Housing Act 2024), all these are allowable deductions
  const taxableIncome = gross - nssf - housingLevy - shif

  // Calculate PAYE on taxable income
  const paye = calculatePAYE(taxableIncome)

  // Total deductions from gross salary
  const totalDeductions = Math.round((paye + nssf + shif + housingLevy) * 100) / 100
  const netSalary = Math.round((gross - totalDeductions) * 100) / 100

  return {
    grossSalary: gross,
    nssf,
    housingLevy,
    shif,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    paye,
    personalRelief: PERSONAL_RELIEF,
    totalDeductions,
    netSalary,
    deductionPercentage: Math.round((totalDeductions / gross * 100) * 100) / 100
  }
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return 'KES 0.00'
  return `KES ${parseFloat(amount).toLocaleString('en-KE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`
}