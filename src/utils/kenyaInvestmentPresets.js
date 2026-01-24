/**
 * Kenya Investment Presets
 * Pre-configured templates for popular Kenyan investment options
 */

export const ACCOUNT_CATEGORIES = {
  // Cash Accounts
  MPESA: 'mpesa',
  BANK: 'bank',
  CASH: 'cash',
  AIRTEL_MONEY: 'airtel_money',
  TKASH: 'tkash',

  // Investment Accounts
  MMF: 'money_market_fund',
  SACCO: 'sacco',
  TREASURY_BILL: 'treasury_bill',
  TREASURY_BOND: 'treasury_bond',
  MAKIBA: 'm_akiba',
  STOCKS: 'stocks',
  UNIT_TRUST: 'unit_trust',
  REIT: 'reit',
  FIXED_DEPOSIT: 'fixed_deposit',
  CHAMA: 'chama',

  // Virtual Accounts
  EMERGENCY_FUND: 'emergency_fund',
  SINKING_FUND: 'sinking_fund',

  // Safaricom/M-Pesa Savings & Investments
  MSHWARI_LOCK: 'mshwari_lock',
  ZIIDI_MMF: 'ziidi_mmf',
  MSHWARI_SAVINGS: 'mshwari_savings',

  // Loan/Liability Accounts
  HELB_LOAN: 'helb_loan',
  BANK_LOAN: 'bank_loan',
  SACCO_LOAN: 'sacco_loan',
  CAR_LOAN: 'car_loan',
  MORTGAGE_LOAN: 'mortgage_loan',
  PERSONAL_LOAN: 'personal_loan',
  CHAMA_LOAN: 'chama_loan',
  CREDIT_CARD: 'credit_card'
}

export const KENYA_INVESTMENT_PRESETS = {
  // ============================================================================
  // MONEY MARKET FUNDS (MMF)
  // ============================================================================
  mmf: [
    {
      name: 'Cytonn Money Market Fund',
      institution: 'Cytonn Asset Managers',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 14.0,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'High-yield MMF with competitive returns.',
      icon: 'TrendingUp',
      color: '#10B981'
    },
    {
      name: 'CIC Money Market Fund',
      institution: 'CIC Asset Management',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 12.5,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'Low-risk investment with competitive returns. Withdraw in 1 business day.',
      icon: 'TrendingUp',
      color: '#059669'
    },
    {
      name: 'Britam Money Market Fund',
      institution: 'Britam Asset Managers',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 11.8,
      min_investment: 1000,
      liquidity: 'T+2',
      description: 'Stable returns with easy access to funds.',
      icon: 'TrendingUp',
      color: '#047857'
    },
    {
      name: 'Sanlam Money Market Fund',
      institution: 'Sanlam Investments',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 12.2,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'Trusted MMF from leading insurance provider.',
      icon: 'TrendingUp',
      color: '#065F46'
    },
    {
      name: 'Etica Money Market Fund',
      institution: 'Etica Capital',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 12.0,
      min_investment: 500,
      liquidity: 'T+1',
      description: 'Accessible MMF with low minimum investment.',
      icon: 'TrendingUp',
      color: '#0D9488'
    },
    {
      name: 'Kuza Money Market Fund',
      institution: 'Kuza Asset Management',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 11.5,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'Growing your wealth with steady returns.',
      icon: 'TrendingUp',
      color: '#0F766E'
    },
    {
      name: 'GulfCap Money Market Fund',
      institution: 'GulfCap Investments',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 11.8,
      min_investment: 1000,
      liquidity: 'T+2',
      description: 'Reliable MMF with consistent performance.',
      icon: 'TrendingUp',
      color: '#14B8A6'
    },
    {
      name: 'Ndovu Money Market Fund',
      institution: 'Ndovu Investments',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 12.0,
      min_investment: 500,
      liquidity: 'T+1',
      description: 'Digital-first MMF with mobile app access.',
      icon: 'TrendingUp',
      color: '#2DD4BF'
    },
    {
      name: 'Lofty-Corban Money Market Fund',
      institution: 'Lofty-Corban Investment Management',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 11.5,
      min_investment: 1000,
      liquidity: 'T+2',
      description: 'Professional fund management with stable returns.',
      icon: 'TrendingUp',
      color: '#5EEAD4'
    },
    {
      name: 'Nabo Africa Money Market Fund',
      institution: 'Nabo Capital',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 12.3,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'Innovative MMF with digital investment platform.',
      icon: 'TrendingUp',
      color: '#99F6E4'
    },
    {
      name: 'GenAfrica Money Market Fund',
      institution: 'GenAfrica Asset Managers',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 13.0,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'High-performing MMF with mobile accessibility.',
      icon: 'TrendingUp',
      color: '#115E59'
    },
    {
      name: 'Madison Money Market Fund',
      institution: 'Madison Asset Managers',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 11.0,
      min_investment: 1000,
      liquidity: 'T+2',
      description: 'Insurance-backed MMF with stable returns.',
      icon: 'TrendingUp',
      color: '#134E4A'
    },
    {
      name: 'Old Mutual Money Market Fund',
      institution: 'Old Mutual Investment Group',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 12.0,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'Reliable MMF with consistent performance.',
      icon: 'TrendingUp',
      color: '#0F172A'
    },
    {
      name: 'ICEA Lion Money Market Fund',
      institution: 'ICEA Lion Asset Management',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 11.8,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'Strong institutional backing with competitive rates.',
      icon: 'TrendingUp',
      color: '#1E293B'
    },
    {
      name: 'Orient Kasha Money Market Fund',
      institution: 'Orient Asset Managers',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 12.5,
      min_investment: 500,
      liquidity: 'T+1',
      description: 'Mobile-accessible MMF via Kasha platform.',
      icon: 'TrendingUp',
      color: '#334155'
    },
    {
      name: 'Jubilee Money Market Fund',
      institution: 'Jubilee Insurance',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 11.5,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'Insurance-backed MMF with reliable returns.',
      icon: 'TrendingUp',
      color: '#475569'
    },
    {
      name: 'ArvoCap Money Market Fund',
      institution: 'ArvoCap Investment Management',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 12.0,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'Professional fund management with steady growth.',
      icon: 'TrendingUp',
      color: '#64748B'
    },
    {
      name: 'Enwealth Money Market Fund',
      institution: 'Enwealth Financial Services',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 11.5,
      min_investment: 1000,
      liquidity: 'T+2',
      description: 'Pension-focused MMF with stable returns.',
      icon: 'TrendingUp',
      color: '#94A3B8'
    },
    {
      name: 'Co-op Trust Investment MMF',
      institution: 'Co-operative Bank of Kenya',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 11.8,
      min_investment: 5000,
      liquidity: 'T+1',
      description: 'Bank-backed MMF with institutional reliability.',
      icon: 'TrendingUp',
      color: '#CBD5E1'
    },
    {
      name: 'African Alliance Money Market Fund',
      institution: 'African Alliance Kenya',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 12.0,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'Pan-African investment expertise with local focus.',
      icon: 'TrendingUp',
      color: '#E2E8F0'
    }
  ],

  // ============================================================================
  // SACCOS
  // ============================================================================
  saccos: [
    {
      name: 'Mwalimu National Sacco',
      institution: 'Mwalimu National Sacco',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 11,
      min_contribution: 500,
      description: 'Teachers Sacco with nationwide presence.',
      icon: 'Users',
      color: '#3B82F6'
    },
    {
      name: 'Harambee Sacco',
      institution: 'Harambee Co-operative Savings',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 12,
      min_contribution: 2000,
      description: 'Civil servants Sacco with comprehensive services.',
      icon: 'Users',
      color: '#2563EB'
    },
    {
      name: 'Tower Sacco',
      institution: 'Tower Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 11,
      min_contribution: 1000,
      description: 'Open-membership Sacco with flexible savings options.',
      icon: 'Users',
      color: '#1D4ED8'
    },
    {
      name: 'Unaitas Sacco',
      institution: 'Unaitas Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 13,
      min_contribution: 500,
      description: 'Large open-membership Sacco with extensive branch network.',
      icon: 'Users',
      color: '#1E40AF'
    },
    {
      name: 'Kenya Police Sacco',
      institution: 'Kenya Police Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 13,
      min_contribution: 1000,
      description: 'Police Sacco with competitive dividends and loan facilities.',
      icon: 'Users',
      color: '#1E3A8A'
    },
    {
      name: 'Safaricom Sacco',
      institution: 'Safaricom Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 14,
      min_contribution: 1000,
      description: 'Safaricom staff Sacco with excellent returns.',
      icon: 'Users',
      color: '#312E81'
    },
    {
      name: 'Stima Sacco',
      institution: 'Stima DT Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 12,
      min_contribution: 500,
      description: 'Kenya Power employees Sacco. Open to public with high dividends.',
      icon: 'Users',
      color: '#4338CA'
    },
    {
      name: 'Ukulima Sacco',
      institution: 'Ukulima Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 11,
      min_contribution: 500,
      description: 'Agricultural sector Sacco with farmer-friendly products.',
      icon: 'Users',
      color: '#4F46E5'
    },
    {
      name: 'Ports Sacco',
      institution: 'Ports Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 12,
      min_contribution: 1000,
      description: 'Kenya Ports Authority staff Sacco with good dividends.',
      icon: 'Users',
      color: '#5B21B6'
    },
    {
      name: 'Cosmopolitan Sacco',
      institution: 'Cosmopolitan Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 11,
      min_contribution: 500,
      description: 'Open-membership Sacco serving diverse professionals.',
      icon: 'Users',
      color: '#6D28D9'
    },
    {
      name: 'Afya Sacco',
      institution: 'Afya Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 10,
      min_contribution: 1000,
      description: 'Health workers Sacco with good returns.',
      icon: 'Users',
      color: '#7C3AED'
    },
    {
      name: 'Mhasibu Sacco',
      institution: 'Mhasibu National Sacco',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 11,
      min_contribution: 1000,
      description: 'Accountants and finance professionals Sacco.',
      icon: 'Users',
      color: '#8B5CF6'
    },
    {
      name: 'Yetu Sacco',
      institution: 'Yetu Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 12,
      min_contribution: 500,
      description: 'Community-focused Sacco with accessible services.',
      icon: 'Users',
      color: '#A855F7'
    },
    {
      name: 'Winas Sacco',
      institution: 'Winas Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 13,
      min_contribution: 500,
      description: 'Open-membership Sacco with competitive rates.',
      icon: 'Users',
      color: '#C026D3'
    },
    {
      name: 'Ollin Sacco',
      institution: 'Ollin Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 11,
      min_contribution: 1000,
      description: 'Growth-oriented Sacco with diverse financial products.',
      icon: 'Users',
      color: '#D946EF'
    },
    {
      name: 'Trans Nation Sacco',
      institution: 'Trans Nation Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 10,
      min_contribution: 500,
      description: 'Transport sector Sacco with nationwide reach.',
      icon: 'Users',
      color: '#E879F9'
    },
    {
      name: 'Imarisha Sacco',
      institution: 'Imarisha Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 12,
      min_contribution: 500,
      description: 'Empowering members with savings and credit solutions.',
      icon: 'Users',
      color: '#F0ABFC'
    },
    {
      name: 'Gusii Mwalimu Sacco',
      institution: 'Gusii Mwalimu Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 11,
      min_contribution: 500,
      description: 'Teachers Sacco serving the Gusii region.',
      icon: 'Users',
      color: '#EC4899'
    },
    {
      name: 'Hazina Sacco',
      institution: 'Hazina Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 12,
      min_contribution: 1000,
      description: 'Treasury and government employees Sacco.',
      icon: 'Users',
      color: '#F472B6'
    },
    {
      name: 'Kenya Women Sacco (KWFT)',
      institution: 'Kenya Women Finance Trust DT Sacco',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 10,
      min_contribution: 500,
      description: 'Women-focused Sacco with empowerment programs.',
      icon: 'Users',
      color: '#F9A8D4'
    }
  ],

  // ============================================================================
  // GOVERNMENT SECURITIES
  // ============================================================================
  government: [
    {
      name: 'M-Akiba Retail Bond',
      institution: 'Central Bank of Kenya',
      category: ACCOUNT_CATEGORIES.MAKIBA,
      account_type: 'investment',
      min_investment: 3000,
      term_years: 3,
      description: 'Mobile-based government bond. Buy and sell via M-Pesa.',
      icon: 'Landmark',
      color: '#8B5CF6'
    },
    {
      name: 'Treasury Bill 91-Day',
      institution: 'Central Bank of Kenya',
      category: ACCOUNT_CATEGORIES.TREASURY_BILL,
      account_type: 'investment',
      min_investment: 100000,
      term_days: 91,
      description: 'Short-term government security with guaranteed returns.',
      icon: 'Landmark',
      color: '#7C3AED'
    },
    {
      name: 'Treasury Bill 182-Day',
      institution: 'Central Bank of Kenya',
      category: ACCOUNT_CATEGORIES.TREASURY_BILL,
      account_type: 'investment',
      min_investment: 100000,
      term_days: 182,
      description: '6-month government security with higher yields.',
      icon: 'Landmark',
      color: '#6D28D9'
    },
    {
      name: 'Treasury Bill 364-Day',
      institution: 'Central Bank of Kenya',
      category: ACCOUNT_CATEGORIES.TREASURY_BILL,
      account_type: 'investment',
      min_investment: 100000,
      term_days: 364,
      description: '1-year government security with best T-Bill rates.',
      icon: 'Landmark',
      color: '#5B21B6'
    },
    {
      name: 'Treasury Bond',
      institution: 'Central Bank of Kenya',
      category: ACCOUNT_CATEGORIES.TREASURY_BOND,
      account_type: 'investment',
      min_investment: 50000,
      description: 'Long-term government bonds (2-30 years) with semi-annual interest.',
      icon: 'Landmark',
      color: '#4C1D95'
    }
  ],

  // ============================================================================
  // STOCKS (NSE)
  // ============================================================================
  stocks: [
    {
      name: 'NSE Stock Portfolio',
      institution: 'Nairobi Securities Exchange',
      category: ACCOUNT_CATEGORIES.STOCKS,
      account_type: 'investment',
      description: 'Track your Kenyan stock investments (Safaricom, KCB, Equity, etc.)',
      icon: 'BarChart3',
      color: '#EC4899'
    }
  ],

  // ============================================================================
  // REITs
  // ============================================================================
  reits: [
    {
      name: 'ILAM Fahari I-REIT',
      institution: 'ICEA LION Asset Management',
      category: ACCOUNT_CATEGORIES.REIT,
      account_type: 'investment',
      min_investment: 20,
      description: 'Real Estate Investment Trust. Income from rental properties.',
      icon: 'Building2',
      color: '#F59E0B'
    },
    {
      name: 'Acorn I-REIT',
      institution: 'Acorn Holdings',
      category: ACCOUNT_CATEGORIES.REIT,
      account_type: 'investment',
      min_investment: 50000,
      description: 'Student accommodation REIT with regular dividends.',
      icon: 'Building2',
      color: '#D97706'
    }
  ],

  // ============================================================================
  // CASH ACCOUNTS
  // ============================================================================
  cash: [
    {
      name: 'M-Pesa Wallet',
      institution: 'Safaricom',
      category: ACCOUNT_CATEGORIES.MPESA,
      account_type: 'cash',
      description: 'Primary mobile money wallet for daily transactions.',
      icon: 'Smartphone',
      color: '#10B981'
    },
    {
      name: 'Airtel Money',
      institution: 'Airtel Kenya',
      category: ACCOUNT_CATEGORIES.AIRTEL_MONEY,
      account_type: 'cash',
      description: 'Alternative mobile money wallet.',
      icon: 'Smartphone',
      color: '#EF4444'
    },
    {
      name: 'T-Kash',
      institution: 'Telkom Kenya',
      category: ACCOUNT_CATEGORIES.TKASH,
      account_type: 'cash',
      description: 'Telkom mobile money service.',
      icon: 'Smartphone',
      color: '#3B82F6'
    },
    {
      name: 'Bank Account',
      institution: '',
      category: ACCOUNT_CATEGORIES.BANK,
      account_type: 'cash',
      description: 'Traditional bank account (KCB, Equity, Co-op, etc.)',
      icon: 'Building2',
      color: '#6366F1'
    },
    {
      name: 'Cash on Hand',
      institution: '',
      category: ACCOUNT_CATEGORIES.CASH,
      account_type: 'cash',
      description: 'Physical cash in wallet or at home.',
      icon: 'Wallet',
      color: '#8B5CF6'
    }
  ],

  // ============================================================================
  // SAFARICOM / M-PESA SAVINGS & INVESTMENTS
  // M-Pesa integrated savings and investment products
  // ============================================================================
  safaricom: [
    {
      name: 'Ziidi MMF',
      institution: 'Safaricom / Standard Investment Bank',
      category: ACCOUNT_CATEGORIES.ZIIDI_MMF,
      account_type: 'investment',
      typical_rate: 12.0,
      min_investment: 100,
      liquidity: 'Instant',
      description: 'M-Pesa money market fund. Invest from KES 100, earn daily interest, zero fees.',
      icon: 'TrendingUp',
      color: '#00A859'
    },
    {
      name: 'M-Shwari Lock Savings',
      institution: 'Safaricom / NCBA Bank',
      category: ACCOUNT_CATEGORIES.MSHWARI_LOCK,
      account_type: 'investment',
      typical_rate: 7.35,
      min_investment: 500,
      liquidity: '1-6 months',
      description: 'Lock savings for 1-6 months. Min KES 1,000 to earn interest. Early withdrawal in 48hrs.',
      icon: 'Lock',
      color: '#4CAF50'
    },
    {
      name: 'M-Shwari Savings',
      institution: 'Safaricom / NCBA Bank',
      category: ACCOUNT_CATEGORIES.MSHWARI_SAVINGS,
      account_type: 'investment',
      typical_rate: 5.0,
      min_investment: 1,
      liquidity: 'Instant',
      description: 'Flexible M-Pesa savings account. No minimum balance, instant withdrawals.',
      icon: 'PiggyBank',
      color: '#66BB6A'
    }
  ],

  // ============================================================================
  // LOANS & LIABILITIES
  // Track loan balances with negative values (e.g., -450,000 for amount owed)
  // Payments increase the balance toward 0
  // ============================================================================
  loans: [
    {
      name: 'HELB Loan',
      institution: 'Higher Education Loans Board',
      category: ACCOUNT_CATEGORIES.HELB_LOAN,
      account_type: 'loan',
      description: 'Government student loan. Enter balance as negative (e.g., -450,000).',
      icon: 'GraduationCap',
      color: '#EF4444'
    },
    {
      name: 'Bank Personal Loan',
      institution: 'Local Bank',
      category: ACCOUNT_CATEGORIES.BANK_LOAN,
      account_type: 'loan',
      description: 'Personal loan from bank. Track balance and payroll deductions.',
      icon: 'Building2',
      color: '#DC2626'
    },
    {
      name: 'SACCO Loan',
      institution: 'Local SACCO',
      category: ACCOUNT_CATEGORIES.SACCO_LOAN,
      account_type: 'loan',
      description: 'Loan from your SACCO. Link to payroll deductions to track payments.',
      icon: 'Users',
      color: '#B91C1C'
    },
    {
      name: 'Car Loan / Logbook Loan',
      institution: 'Bank / MFI',
      category: ACCOUNT_CATEGORIES.CAR_LOAN,
      account_type: 'loan',
      description: 'Vehicle financing loan. Track monthly payments.',
      icon: 'Car',
      color: '#991B1B'
    },
    {
      name: 'Mortgage / Home Loan',
      institution: 'Bank',
      category: ACCOUNT_CATEGORIES.MORTGAGE_LOAN,
      account_type: 'loan',
      description: 'Home mortgage loan. Track long-term payments.',
      icon: 'Home',
      color: '#7F1D1D'
    },
    {
      name: 'Chama / Merry-go-round Loan',
      institution: 'Chama Group',
      category: ACCOUNT_CATEGORIES.CHAMA_LOAN,
      account_type: 'loan',
      description: 'Loan from your chama or merry-go-round group.',
      icon: 'Users',
      color: '#F97316'
    },
    {
      name: 'Personal Loan (Other)',
      institution: 'Other Lender',
      category: ACCOUNT_CATEGORIES.PERSONAL_LOAN,
      account_type: 'loan',
      description: 'Other personal loan from MFI, employer, or individual.',
      icon: 'HandCoins',
      color: '#EA580C'
    },
    {
      name: 'Credit Card',
      institution: 'Credit Card Provider',
      category: ACCOUNT_CATEGORIES.CREDIT_CARD,
      account_type: 'loan',
      description: 'Credit card balance. Track outstanding amount.',
      icon: 'CreditCard',
      color: '#C2410C'
    }
  ]
}

// Helper to get all presets as flat array
export function getAllPresets() {
  return [
    ...KENYA_INVESTMENT_PRESETS.mmf,
    ...KENYA_INVESTMENT_PRESETS.saccos,
    ...KENYA_INVESTMENT_PRESETS.government,
    ...KENYA_INVESTMENT_PRESETS.stocks,
    ...KENYA_INVESTMENT_PRESETS.reits,
    ...KENYA_INVESTMENT_PRESETS.safaricom,
    ...KENYA_INVESTMENT_PRESETS.cash,
    ...KENYA_INVESTMENT_PRESETS.loans
  ]
}

// Helper to get presets by type
export function getPresetsByType(type) {
  return KENYA_INVESTMENT_PRESETS[type] || []
}

// Helper to get preset by name
export function getPresetByName(name) {
  const allPresets = getAllPresets()
  return allPresets.find(preset => preset.name === name)
}

// Account type labels
export const ACCOUNT_TYPE_LABELS = {
  cash: 'Cash Account',
  investment: 'Investment Account',
  virtual: 'Virtual Account',
  loan: 'Loan / Liability'
}

// Category labels
export const CATEGORY_LABELS = {
  [ACCOUNT_CATEGORIES.MPESA]: 'M-Pesa',
  [ACCOUNT_CATEGORIES.BANK]: 'Bank Account',
  [ACCOUNT_CATEGORIES.CASH]: 'Cash',
  [ACCOUNT_CATEGORIES.AIRTEL_MONEY]: 'Airtel Money',
  [ACCOUNT_CATEGORIES.TKASH]: 'T-Kash',
  [ACCOUNT_CATEGORIES.MMF]: 'Money Market Fund',
  [ACCOUNT_CATEGORIES.SACCO]: 'Sacco',
  [ACCOUNT_CATEGORIES.TREASURY_BILL]: 'Treasury Bill',
  [ACCOUNT_CATEGORIES.TREASURY_BOND]: 'Treasury Bond',
  [ACCOUNT_CATEGORIES.MAKIBA]: 'M-Akiba',
  [ACCOUNT_CATEGORIES.STOCKS]: 'Stocks',
  [ACCOUNT_CATEGORIES.UNIT_TRUST]: 'Unit Trust',
  [ACCOUNT_CATEGORIES.REIT]: 'REIT',
  [ACCOUNT_CATEGORIES.FIXED_DEPOSIT]: 'Fixed Deposit',
  [ACCOUNT_CATEGORIES.CHAMA]: 'Chama',
  [ACCOUNT_CATEGORIES.EMERGENCY_FUND]: 'Emergency Fund',
  [ACCOUNT_CATEGORIES.SINKING_FUND]: 'Sinking Fund',

  // Safaricom/M-Pesa Categories
  [ACCOUNT_CATEGORIES.ZIIDI_MMF]: 'Ziidi MMF',
  [ACCOUNT_CATEGORIES.MSHWARI_LOCK]: 'M-Shwari Lock Savings',
  [ACCOUNT_CATEGORIES.MSHWARI_SAVINGS]: 'M-Shwari Savings',

  // Loan/Liability Categories
  [ACCOUNT_CATEGORIES.HELB_LOAN]: 'HELB Loan',
  [ACCOUNT_CATEGORIES.BANK_LOAN]: 'Bank Loan',
  [ACCOUNT_CATEGORIES.SACCO_LOAN]: 'SACCO Loan',
  [ACCOUNT_CATEGORIES.CAR_LOAN]: 'Car Loan',
  [ACCOUNT_CATEGORIES.MORTGAGE_LOAN]: 'Mortgage',
  [ACCOUNT_CATEGORIES.PERSONAL_LOAN]: 'Personal Loan',
  [ACCOUNT_CATEGORIES.CHAMA_LOAN]: 'Chama Loan',
  [ACCOUNT_CATEGORIES.CREDIT_CARD]: 'Credit Card'
}
