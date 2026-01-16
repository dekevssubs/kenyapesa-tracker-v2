import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronDown, Check, Search, X } from 'lucide-react'
import { getCategoryIcon, getCategoryColor } from '../../utils/iconMappings'
import { getAllExpenseCategories, getParentCategories, getSubcategories } from '../../utils/categoryService'

/**
 * Two-Step Category Selector Component
 *
 * Step 1: Grid of parent categories with icons
 * Step 2: List of subcategories for the selected parent
 *
 * @param {Object} props
 * @param {string} props.userId - User ID
 * @param {string} props.value - Selected category ID
 * @param {Function} props.onChange - Callback when category is selected: ({ id, slug, name, parentId, parentName })
 * @param {string} props.placeholder - Placeholder text when no category selected
 * @param {boolean} props.disabled - Whether the selector is disabled
 * @param {boolean} props.showDescription - Whether to show category descriptions
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.selectParentOnly - If true, only allow selecting parent categories (for budgets)
 */
export default function CategorySelector({
  userId,
  value,
  onChange,
  placeholder = 'Select category',
  disabled = false,
  showDescription = false,
  className = '',
  selectParentOnly = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1 = parent selection, 2 = subcategory selection
  const [searchQuery, setSearchQuery] = useState('')
  const [parentCategories, setParentCategories] = useState([])
  const [selectedParent, setSelectedParent] = useState(null)
  const [subcategories, setSubcategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [hierarchy, setHierarchy] = useState([])

  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  // Fetch all categories on mount to build the lookup
  useEffect(() => {
    if (userId) {
      fetchCategories()
    }
  }, [userId])

  // Find selected category when value changes
  useEffect(() => {
    if (value && hierarchy.length > 0) {
      // Search through hierarchy to find the category
      for (const parent of hierarchy) {
        if (parent.id === value) {
          setSelectedCategory({
            ...parent,
            parentId: null,
            parentName: null
          })
          return
        }
        for (const sub of parent.subcategories || []) {
          if (sub.id === value) {
            setSelectedCategory({
              ...sub,
              parentId: parent.id,
              parentName: parent.name
            })
            return
          }
        }
      }
    } else if (!value) {
      setSelectedCategory(null)
    }
  }, [value, hierarchy])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setStep(1)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const result = await getAllExpenseCategories(userId)
      if (result.success) {
        setParentCategories(result.hierarchy)
        setHierarchy(result.hierarchy)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleParentSelect = async (parent) => {
    if (selectParentOnly) {
      // Directly select the parent category
      handleCategorySelect({
        id: parent.id,
        slug: parent.slug,
        name: parent.name,
        parentId: null,
        parentName: null,
        color: parent.color,
        icon: parent.icon
      })
      return
    }

    setSelectedParent(parent)
    setSubcategories(parent.subcategories || [])
    setStep(2)
    setSearchQuery('')
  }

  const handleBack = () => {
    setStep(1)
    setSelectedParent(null)
    setSubcategories([])
    setSearchQuery('')
  }

  const handleCategorySelect = (category) => {
    setSelectedCategory(category)
    onChange(category)
    setIsOpen(false)
    setStep(1)
    setSearchQuery('')
  }

  const handleSubcategorySelect = (subcategory) => {
    handleCategorySelect({
      id: subcategory.id,
      slug: subcategory.slug,
      name: subcategory.name,
      parentId: selectedParent.id,
      parentName: selectedParent.name,
      color: subcategory.color || selectedParent.color,
      icon: subcategory.icon || selectedParent.icon
    })
  }

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setStep(1)
        setSearchQuery('')
      }
    }
  }

  // Filter categories based on search
  const filteredParentCategories = searchQuery
    ? parentCategories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.subcategories || []).some(sub =>
          sub.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : parentCategories

  const filteredSubcategories = searchQuery
    ? subcategories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : subcategories

  // Render the selected category display
  const renderSelectedDisplay = () => {
    if (selectedCategory) {
      const IconComponent = getCategoryIcon(selectedCategory.slug)
      const colorClasses = getCategoryColor(selectedCategory.parentId ?
        hierarchy.find(p => p.id === selectedCategory.parentId)?.slug :
        selectedCategory.slug
      )

      return (
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${colorClasses}`}>
            <IconComponent size={16} />
          </div>
          <span className="truncate">
            {selectedCategory.parentName ? (
              <span className="text-slate-500 dark:text-slate-400">
                {selectedCategory.parentName} &gt;{' '}
              </span>
            ) : null}
            <span className="font-medium">{selectedCategory.name}</span>
          </span>
        </div>
      )
    }
    return <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-3 py-2.5
          bg-white dark:bg-slate-800
          border border-slate-200 dark:border-slate-700
          rounded-lg text-left
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-green-500 border-green-500' : ''}
          transition-colors
        `}
      >
        {renderSelectedDisplay()}
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {/* Header with Search and Back Button */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            {step === 2 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 mb-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                <ChevronLeft size={16} />
                Back to categories
              </button>
            )}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={step === 1 ? 'Search categories...' : `Search in ${selectedParent?.name}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">
                Loading categories...
              </div>
            ) : step === 1 ? (
              /* Step 1: Parent Categories Grid */
              <div className="p-2 grid grid-cols-2 gap-2">
                {filteredParentCategories.length > 0 ? (
                  filteredParentCategories.map((parent) => {
                    const IconComponent = getCategoryIcon(parent.slug)
                    const colorClasses = getCategoryColor(parent.slug)
                    const isSelected = selectedCategory?.id === parent.id ||
                      (selectedCategory?.parentId === parent.id)

                    return (
                      <button
                        key={parent.id}
                        type="button"
                        onClick={() => handleParentSelect(parent)}
                        className={`
                          flex items-center gap-2 p-2.5 rounded-lg text-left
                          ${isSelected
                            ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                            : 'bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                          }
                          transition-colors
                        `}
                      >
                        <div className={`p-1.5 rounded ${colorClasses}`}>
                          <IconComponent size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                            {parent.name}
                          </div>
                          {!selectParentOnly && parent.subcategories?.length > 0 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {parent.subcategories.length} subcategories
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check size={16} className="text-green-600 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })
                ) : (
                  <div className="col-span-2 p-4 text-center text-slate-500">
                    No categories found
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Subcategories List */
              <div className="p-2">
                {/* Parent category header */}
                {selectedParent && (
                  <div className="flex items-center gap-2 p-2 mb-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    {(() => {
                      const IconComponent = getCategoryIcon(selectedParent.slug)
                      const colorClasses = getCategoryColor(selectedParent.slug)
                      return (
                        <>
                          <div className={`p-1.5 rounded ${colorClasses}`}>
                            <IconComponent size={18} />
                          </div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {selectedParent.name}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

                {/* Subcategories */}
                <div className="space-y-1">
                  {filteredSubcategories.length > 0 ? (
                    filteredSubcategories.map((sub) => {
                      const isSelected = selectedCategory?.id === sub.id

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSubcategorySelect(sub)}
                          className={`
                            w-full flex items-center justify-between p-2.5 rounded-lg text-left
                            ${isSelected
                              ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                            }
                            transition-colors
                          `}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                              {sub.name}
                            </div>
                            {showDescription && sub.description && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {sub.description}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <Check size={16} className="text-green-600 flex-shrink-0" />
                          )}
                        </button>
                      )
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-500">
                      No subcategories found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Inline Category Display Component
 * Shows category with icon for display purposes
 */
export function CategoryDisplay({ category, showParent = true, size = 'md' }) {
  if (!category) return null

  const IconComponent = getCategoryIcon(category.slug || category.parentSlug)
  const colorClasses = getCategoryColor(category.parentSlug || category.slug)

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  }

  return (
    <div className={`flex items-center gap-1.5 ${sizeClasses[size]}`}>
      <div className={`p-1 rounded ${colorClasses}`}>
        <IconComponent size={iconSizes[size]} />
      </div>
      <span>
        {showParent && category.parentName && (
          <span className="text-slate-500 dark:text-slate-400">
            {category.parentName} &gt;{' '}
          </span>
        )}
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {category.name}
        </span>
      </span>
    </div>
  )
}
