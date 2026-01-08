import { useState, useRef, useEffect } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'

/**
 * Reusable search bar with optional advanced filters
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  showAdvanced = false,
  onAdvancedClick,
  className = '',
  autoFocus = false
}) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--bg-primary)] transition-colors"
          >
            <X className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          </button>
        )}
      </div>
      {showAdvanced && (
        <button
          onClick={onAdvancedClick}
          className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl hover:bg-[var(--bg-primary)] transition-colors"
          title="Advanced filters"
        >
          <SlidersHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      )}
    </div>
  )
}

/**
 * Search helper: filter items by multiple fields
 */
export function searchItems(items, query, fields) {
  if (!query.trim()) return items

  const searchTerms = query.toLowerCase().trim().split(/\s+/)

  return items.filter(item => {
    const searchableText = fields
      .map(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], item)
        return value?.toString()?.toLowerCase() || ''
      })
      .join(' ')

    return searchTerms.every(term => searchableText.includes(term))
  })
}

/**
 * Highlight matching text in search results
 */
export function highlightMatch(text, query) {
  if (!query.trim() || !text) return text

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 rounded px-0.5">
        {part}
      </mark>
    ) : part
  )
}
