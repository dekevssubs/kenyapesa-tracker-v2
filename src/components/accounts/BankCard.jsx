import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  TrendingUp,
  Building2,
  Smartphone,
  Users,
  Landmark,
  BarChart3,
  PiggyBank,
  Edit2,
  Trash2,
  History,
  MoreVertical,
  CheckCircle,
  XCircle,
  PauseCircle,
  Eye,
  CreditCard,
  GraduationCap,
  Car,
  Home
} from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'
import { getBankColor, formatCardNumber, getDisplayInstitution } from '../../utils/bankBrandColors'

// Card chip SVG component
function CardChip({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 50 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="50" height="40" rx="5" fill="#CFB53B" />
      <rect x="0" y="15" width="50" height="10" fill="#B8860B" />
      <rect x="20" y="0" width="10" height="40" fill="#B8860B" />
      <rect x="5" y="5" width="15" height="10" rx="2" fill="#DAA520" />
      <rect x="30" y="5" width="15" height="10" rx="2" fill="#DAA520" />
      <rect x="5" y="25" width="15" height="10" rx="2" fill="#DAA520" />
      <rect x="30" y="25" width="15" height="10" rx="2" fill="#DAA520" />
    </svg>
  )
}

// Contactless payment icon
function ContactlessIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Get icon based on account category
function getAccountIcon(category) {
  const iconMap = {
    mpesa: Smartphone,
    bank: Building2,
    cash: Wallet,
    airtel_money: Smartphone,
    tkash: Smartphone,
    money_market_fund: TrendingUp,
    sacco: Users,
    treasury_bill: Landmark,
    treasury_bond: Landmark,
    m_akiba: Landmark,
    stocks: BarChart3,
    reit: Building2,
    fixed_deposit: PiggyBank,
    chama: Users,
    emergency_fund: PiggyBank,
    sinking_fund: PiggyBank,
    // Loan categories
    helb_loan: GraduationCap,
    bank_loan: Building2,
    sacco_loan: Users,
    car_loan: Car,
    mortgage_loan: Home,
    personal_loan: CreditCard,
    chama_loan: Users,
    credit_card: CreditCard
  }
  return iconMap[category] || Wallet
}

// Get account type label
function getAccountTypeLabel(accountType) {
  const labels = {
    cash: 'CASH',
    investment: 'INVESTMENT',
    virtual: 'VIRTUAL',
    loan: 'LOAN'
  }
  return labels[accountType] || 'ACCOUNT'
}

export default function BankCard({
  account,
  showBalance = true,
  onEdit,
  onDelete,
  onStatusChange,
  onViewDetails
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const bankColors = getBankColor(account.institution_name, account.category, account.account_type)
  const Icon = getAccountIcon(account.category)
  const displayInstitution = getDisplayInstitution(account.institution_name, account.category, account.name)
  const cardNumber = formatCardNumber(account.account_number)
  const isInactive = account.is_active === false

  const statusConfig = isInactive
    ? { color: 'text-red-300', bg: 'bg-red-500/30', icon: XCircle, label: 'Inactive' }
    : { color: 'text-green-300', bg: 'bg-green-500/30', icon: CheckCircle, label: 'Active' }
  const StatusIcon = statusConfig.icon

  return (
    <div
      className={`relative group ${isInactive ? 'opacity-75' : ''}`}
      style={{ aspectRatio: '1.586' }}
    >
      {/* Card Container */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${bankColors.gradient} shadow-lg
          hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
      >
        {/* Card Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24" />
        </div>

        {/* Card Content */}
        <div className="relative h-full p-5 flex flex-col justify-between text-white">
          {/* Top Row: Institution & Actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold tracking-wider opacity-90">
                {displayInstitution}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {account.is_primary && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-medium uppercase tracking-wider">
                  Primary
                </span>
              )}

              {/* Dropdown Menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-20">
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        onViewDetails?.(account)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-2" /> View Details
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        onEdit?.(account)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                    >
                      <Edit2 className="h-4 w-4 mr-2" /> Edit
                    </button>
                    <Link
                      to={`/account-history?account=${account.id}`}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                    >
                      <History className="h-4 w-4 mr-2" /> View History
                    </Link>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                    {isInactive ? (
                      <button
                        onClick={() => {
                          setShowDropdown(false)
                          onStatusChange?.(account, true)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" /> Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowDropdown(false)
                          onStatusChange?.(account, false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center"
                      >
                        <PauseCircle className="h-4 w-4 mr-2" /> Deactivate
                      </button>
                    )}
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        onDelete?.(account)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle Row: Chip & Balance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CardChip className="h-10 w-12" />
              <ContactlessIcon className="h-6 w-6 opacity-70" />
            </div>

            <div className="text-right">
              {account.account_type === 'loan' ? (
                <>
                  <p className="text-xs opacity-70 mb-0.5">Amount Owed</p>
                  <p className="text-3xl font-bold tracking-tight">
                    {showBalance ? formatCurrency(Math.abs(account.current_balance)) : '••••••'}
                  </p>
                </>
              ) : (
                <p className="text-3xl font-bold tracking-tight">
                  {showBalance ? formatCurrency(account.current_balance) : '••••••'}
                </p>
              )}
              {/* Interest Rate for investments and loans */}
              {account.interest_rate && (
                <p className="text-xs opacity-80 flex items-center justify-end mt-0.5">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {account.interest_rate}% p.a.
                </p>
              )}
            </div>
          </div>

          {/* Bottom Row: Card Number, Account Name & Status */}
          <div className="space-y-2">
            {/* Card Number */}
            <p className="text-lg font-mono tracking-widest opacity-90">{cardNumber}</p>

            {/* Account Name & Type */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs opacity-60 uppercase tracking-wider mb-0.5">Account Holder</p>
                <p className="text-sm font-medium uppercase tracking-wider truncate max-w-[160px]">
                  {account.name}
                </p>
              </div>

              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                    <StatusIcon className="h-3 w-3 mr-0.5" />
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-wider opacity-60 mt-1">
                  {getAccountTypeLabel(account.account_type)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
