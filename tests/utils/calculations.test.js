// tests/utils/calculations.test.js
// Tests for Kenyan PAYE calculations based on KRA Finance Act 2023 rates
import {
  calculatePAYE,
  calculateNetSalary,
  formatCurrency,
  TAX_BANDS,
  PERSONAL_RELIEF,
  NSSF_AMOUNT,
  SHIF_RATE,
  HOUSING_LEVY_RATE
} from '../../src/utils/calculations';

describe('Kenyan Salary Calculations (KRA 2024/2025 Rates)', () => {
  describe('Constants', () => {
    test('should have correct tax bands per KRA', () => {
      expect(TAX_BANDS.length).toBe(5);
      expect(TAX_BANDS[0]).toEqual({ threshold: 24000, rate: 0.10, label: '0 - 24,000' });
      expect(TAX_BANDS[1]).toEqual({ threshold: 32333, rate: 0.25, label: '24,001 - 32,333' });
      expect(TAX_BANDS[2]).toEqual({ threshold: 500000, rate: 0.30, label: '32,334 - 500,000' });
      expect(TAX_BANDS[3]).toEqual({ threshold: 800000, rate: 0.325, label: '500,001 - 800,000' });
      expect(TAX_BANDS[4]).toEqual({ threshold: Infinity, rate: 0.35, label: '800,001 and above' });
    });

    test('should have correct statutory constants', () => {
      expect(PERSONAL_RELIEF).toBe(2400);
      expect(NSSF_AMOUNT).toBe(1080);
      expect(SHIF_RATE).toBe(0.0275);
      expect(HOUSING_LEVY_RATE).toBe(0.015);
    });
  });

  describe('calculatePAYE', () => {
    test('should return 0 for negative or zero taxable income', () => {
      expect(calculatePAYE(0)).toBe(0);
      expect(calculatePAYE(-1000)).toBe(0);
    });

    test('should return 0 for income where tax equals personal relief', () => {
      // First 24,000 at 10% = 2,400
      // Personal relief = 2,400
      // Net PAYE = 0
      expect(calculatePAYE(24000)).toBe(0);
    });

    test('should return 0 for low income where tax is less than relief', () => {
      // 12,000 at 10% = 1,200
      // Personal relief = 2,400
      // Net PAYE = 0 (clamped)
      expect(calculatePAYE(12000)).toBe(0);
    });

    test('should calculate correctly for income in second bracket', () => {
      // Taxable: 28,000
      // Band 1: 24,000 @ 10% = 2,400
      // Band 2: 4,000 @ 25% = 1,000
      // Total before relief = 3,400
      // After relief: 3,400 - 2,400 = 1,000
      expect(calculatePAYE(28000)).toBe(1000);
    });

    test('should calculate correctly for income at end of second bracket', () => {
      // Taxable: 32,333
      // Band 1: 24,000 @ 10% = 2,400
      // Band 2: 8,333 @ 25% = 2,083.25
      // Total before relief = 4,483.25
      // After relief: 4,483.25 - 2,400 = 2,083.25
      expect(calculatePAYE(32333)).toBeCloseTo(2083.25, 2);
    });

    test('should calculate correctly for income in third bracket', () => {
      // Taxable: 50,000
      // Band 1: 24,000 @ 10% = 2,400
      // Band 2: 8,333 @ 25% = 2,083.25
      // Band 3: 17,667 @ 30% = 5,300.10
      // Total before relief = 9,783.35
      // After relief: 9,783.35 - 2,400 = 7,383.35
      expect(calculatePAYE(50000)).toBeCloseTo(7383.35, 2);
    });

    test('should calculate correctly for 100,000 taxable income', () => {
      // Taxable: 100,000
      // Band 1: 24,000 @ 10% = 2,400
      // Band 2: 8,333 @ 25% = 2,083.25
      // Band 3: 67,667 @ 30% = 20,300.10
      // Total before relief = 24,783.35
      // After relief: 24,783.35 - 2,400 = 22,383.35
      expect(calculatePAYE(100000)).toBeCloseTo(22383.35, 2);
    });
  });

  describe('calculateNetSalary', () => {
    test('should return null for invalid inputs', () => {
      expect(calculateNetSalary(null)).toBeNull();
      expect(calculateNetSalary(undefined)).toBeNull();
      expect(calculateNetSalary(-1000)).toBeNull();
      expect(calculateNetSalary(0)).toBeNull();
    });

    test('should calculate correct deductions for 100,000 gross', () => {
      const result = calculateNetSalary(100000);

      // NSSF: 1,080 (fixed)
      expect(result.nssf).toBe(1080);

      // Housing Levy: 1.5% of 100,000 = 1,500
      expect(result.housingLevy).toBe(1500);

      // SHIF: 2.75% of 100,000 = 2,750
      expect(result.shif).toBe(2750);

      // Taxable Income: 100,000 - 1,080 - 1,500 - 2,750 = 94,670
      expect(result.taxableIncome).toBe(94670);

      // PAYE on 94,670:
      // Band 1: 24,000 @ 10% = 2,400
      // Band 2: 8,333 @ 25% = 2,083.25
      // Band 3: 62,337 @ 30% = 18,701.10
      // Total before relief = 23,184.35
      // After relief: 23,184.35 - 2,400 = 20,784.35
      expect(result.paye).toBeCloseTo(20784.35, 2);

      // Total Deductions: 1,080 + 1,500 + 2,750 + 20,784.35 = 26,114.35
      expect(result.totalDeductions).toBeCloseTo(26114.35, 2);

      // Net Salary: 100,000 - 26,114.35 = 73,885.65
      expect(result.netSalary).toBeCloseTo(73885.65, 2);
    });

    test('should calculate correct deductions for 50,000 gross', () => {
      const result = calculateNetSalary(50000);

      // NSSF: 1,080
      expect(result.nssf).toBe(1080);

      // Housing Levy: 1.5% of 50,000 = 750
      expect(result.housingLevy).toBe(750);

      // SHIF: 2.75% of 50,000 = 1,375
      expect(result.shif).toBe(1375);

      // Taxable Income: 50,000 - 1,080 - 750 - 1,375 = 46,795
      expect(result.taxableIncome).toBe(46795);

      // PAYE on 46,795:
      // Band 1: 24,000 @ 10% = 2,400
      // Band 2: 8,333 @ 25% = 2,083.25
      // Band 3: 14,462 @ 30% = 4,338.60
      // Total before relief = 8,821.85
      // After relief: 8,821.85 - 2,400 = 6,421.85
      expect(result.paye).toBeCloseTo(6421.85, 2);
    });

    test('should handle low salary with minimal PAYE', () => {
      const result = calculateNetSalary(25000);

      // Taxable: 25,000 - 1,080 - 375 - 687.50 = 22,857.50
      // PAYE: 22,857.50 @ 10% = 2,285.75 - 2,400 = 0 (clamped)
      expect(result.paye).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    test('should format numbers as KES currency', () => {
      expect(formatCurrency(1000)).toBe('KES 1,000.00');
      expect(formatCurrency(100000)).toBe('KES 100,000.00');
      expect(formatCurrency(73885.65)).toBe('KES 73,885.65');
    });

    test('should handle null and undefined', () => {
      expect(formatCurrency(null)).toBe('KES 0.00');
      expect(formatCurrency(undefined)).toBe('KES 0.00');
    });

    test('should handle zero', () => {
      expect(formatCurrency(0)).toBe('KES 0.00');
    });
  });
});
