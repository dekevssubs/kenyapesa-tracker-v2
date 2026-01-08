/**
 * Skeleton - Reusable loading skeleton components
 * Used as fallbacks for lazy-loaded pages and components
 */

// Base skeleton with shimmer animation
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-[var(--bg-tertiary)] rounded ${className}`}
      {...props}
    />
  )
}

// Card skeleton - matches the card component style
export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" style={{ width: `${100 - i * 15}%` }} />
        ))}
      </div>
    </div>
  )
}

// Stats card skeleton - for dashboard stats
export function StatCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

// Chart skeleton - for Recharts placeholders
export function ChartSkeleton({ height = 300 }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <Skeleton className="w-full rounded-xl" style={{ height }} />
    </div>
  )
}

// Table skeleton - for data tables
export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      {/* Rows */}
      <div className="divide-y divide-[var(--border-primary)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// List skeleton - for simple lists
export function ListSkeleton({ items = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 bg-[var(--bg-secondary)] rounded-xl">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Page header skeleton - matches the gradient headers
export function PageHeaderSkeleton() {
  return (
    <div className="bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-8 animate-pulse">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-16 w-16 rounded-xl bg-white/20" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-white/20" />
          <Skeleton className="h-4 w-64 bg-white/20" />
        </div>
      </div>
    </div>
  )
}

// Full page skeleton - complete page loading state
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <TableSkeleton rows={4} />
      </div>
    </div>
  )
}

// Compact page skeleton - for simpler pages
export function CompactPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderSkeleton />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </div>
  )
}

export default Skeleton
