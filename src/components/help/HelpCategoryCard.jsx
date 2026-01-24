import { Link } from 'react-router-dom'
import {
  Rocket,
  Wallet,
  ArrowLeftRight,
  PieChart,
  Target,
  HandCoins,
  BarChart3,
  ChevronRight
} from 'lucide-react'

const iconMap = {
  Rocket,
  Wallet,
  ArrowLeftRight,
  PieChart,
  Target,
  HandCoins,
  BarChart3
}

export default function HelpCategoryCard({ category }) {
  const Icon = iconMap[category.icon] || Rocket
  const articleCount = category.articles?.length || 0

  return (
    <Link
      to={`/help/${category.id}`}
      className="group block p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className={`${category.color} rounded-xl p-3 text-white`}>
          <Icon className="h-6 w-6" />
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
        {category.title}
      </h3>

      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
        {category.description}
      </p>

      <p className="mt-4 text-xs font-medium text-gray-500 dark:text-gray-500">
        {articleCount} {articleCount === 1 ? 'article' : 'articles'}
      </p>
    </Link>
  )
}
