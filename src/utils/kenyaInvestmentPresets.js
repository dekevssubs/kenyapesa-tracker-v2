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
  SINKING_FUND: 'sinking_fund'
}

export const KENYA_INVESTMENT_PRESETS = {
  // ============================================================================
  // MONEY MARKET FUNDS (MMF)
  // ============================================================================
  mmf: [
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
      color: '#10B981'
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
      color: '#059669'
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
      color: '#047857'
    },
    {
      name: 'NCBA Money Market Fund',
      institution: 'NCBA Investment Bank',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 11.5,
      min_investment: 5000,
      liquidity: 'T+1',
      description: 'Bank-backed MMF with institutional reliability.',
      icon: 'TrendingUp',
      color: '#065F46'
    },
    {
      name: 'GenCap Hela Imara',
      institution: 'GenAfrica Asset Managers',
      category: ACCOUNT_CATEGORIES.MMF,
      account_type: 'investment',
      typical_rate: 13.0,
      min_investment: 1000,
      liquidity: 'T+1',
      description: 'High-performing MMF with mobile accessibility.',
      icon: 'TrendingUp',
      color: '#10B981'
    }
  ],

  // ============================================================================
  // SACCOS
  // ============================================================================
  saccos: [
    {
      name: 'Stima Sacco',
      institution: 'Stima DT Sacco Society Ltd',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 12,
      min_contribution: 500,
      description: 'Kenya Power employees Sacco. Open to public with high dividends.',
      icon: 'Users',
      color: '#3B82F6'
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
      color: '#2563EB'
    },
    {
      name: 'Mwalimu National Sacco',
      institution: 'Mwalimu National Sacco',
      category: ACCOUNT_CATEGORIES.SACCO,
      account_type: 'investment',
      typical_dividend: 11,
      min_contribution: 500,
      description: 'Teachers Sacco with nationwide presence.',
      icon: 'Users',
      color: '#1D4ED8'
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
      color: '#1E40AF'
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
      color: '#1E3A8A'
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
    ...KENYA_INVESTMENT_PRESETS.cash
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
  virtual: 'Virtual Account'
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
  [ACCOUNT_CATEGORIES.SINKING_FUND]: 'Sinking Fund'
}
