import { Link } from 'react-router-dom'
import {
  Search,
  Clock,
  ChevronRight,
  Rocket,
  Zap,
  Compass,
  Wallet,
  CreditCard,
  ArrowLeftRight,
  TrendingUp,
  ShoppingCart,
  Smartphone,
  PieChart,
  Bell,
  Lightbulb,
  Target,
  BarChart2,
  PlusCircle,
  HandCoins,
  Send,
  Download,
  LayoutDashboard,
  BarChart3
} from 'lucide-react'

const iconMap = {
  Rocket,
  Zap,
  Compass,
  Wallet,
  CreditCard,
  ArrowLeftRight,
  TrendingUp,
  ShoppingCart,
  Smartphone,
  PieChart,
  Bell,
  Lightbulb,
  Target,
  BarChart2,
  PlusCircle,
  HandCoins,
  Send,
  Download,
  LayoutDashboard,
  BarChart3
}

export default function HelpSearchResults({ results, query, onClear }) {
  if (!query || query.length < 2) {
    return null
  }

  if (results.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No results found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          We couldn't find any articles matching "{query}"
        </p>
        <button
          onClick={onClear}
          className="text-primary-600 dark:text-primary-400 hover:underline"
        >
          Clear search
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Found {results.length} {results.length === 1 ? 'result' : 'results'} for "{query}"
        </p>
        <button
          onClick={onClear}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          Clear search
        </button>
      </div>

      <div className="space-y-3">
        {results.map((article) => {
          const Icon = iconMap[article.icon] || Rocket
          const slug = article.categoryId ? `${article.categoryId}/${article.id}` : article.id

          return (
            <Link
              key={article.id}
              to={`/help/${slug}`}
              className="group flex items-start p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all duration-200"
            >
              <div className={`${article.categoryColor || 'bg-gray-500'} rounded-lg p-2.5 text-white mr-4 flex-shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {article.title}
                  </h4>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {article.content.slice(0, 150).replace(/[#*`]/g, '').trim()}...
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-500">
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                    {article.categoryTitle}
                  </span>
                  <span className="mx-2">•</span>
                  <Clock className="h-3 w-3 mr-1" />
                  {article.readTime}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
