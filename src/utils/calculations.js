// Kenyan Tax Calculation Utilities (2024/2025 Rates)

export const TAX_BANDS = [
  { min: 0, max: 24000, rate: 0.10 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: 500000, rate: 0.30 },
  { min: 500001, max: 800000, rate: 0.325 },
  { min: 800001, max: Infinity, rate: 0.35 }
]

export const PERSONAL_RELIEF = 2400
export const NSSF_AMOUNT = 1080
export const SHIF_RATE = 0.0275
export const HOUSING_LEVY_RATE = 0.015

export function calculatePAYE(taxableIncome) {
  let paye = 0
  let remainingIncome = taxableIncome

  for (const band of TAX_BANDS) {
    if (remainingIncome <= 0) break

    const bandSize = band.max === Infinity 
      ? remainingIncome 
      : Math.min(band.max - band.min + 1, remainingIncome)
    
    const taxInBand = bandSize * band.rate
    paye += taxInBand
    remainingIncome -= bandSize
  }

  paye = Math.max(0, paye - PERSONAL_RELIEF)
  return Math.round(paye * 100) / 100
}

export function calculateNetSalary(grossSalary) {
  if (!grossSalary || grossSalary < 0) return null

  const gross = parseFloat(grossSalary)
  const nssf = NSSF_AMOUNT
  const housingLevy = Math.round(gross * HOUSING_LEVY_RATE * 100) / 100
  const taxableIncome = gross - nssf - housingLevy
  const paye = calculatePAYE(taxableIncome)
  const shif = Math.round(gross * SHIF_RATE * 100) / 100
  const totalDeductions = Math.round((paye + nssf + shif + housingLevy) * 100) / 100
  const netSalary = Math.round((gross - totalDeductions) * 100) / 100

  return {
    grossSalary: gross,
    nssf,
    housingLevy,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    paye,
    personalRelief: PERSONAL_RELIEF,
    shif,
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