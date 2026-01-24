import { Link } from 'react-router-dom'
import {
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
  BarChart3,
  Clock,
  ChevronRight
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

export default function HelpArticleList({ articles, categoryId }) {
  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No articles found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {articles.map((article) => {
        const Icon = iconMap[article.icon] || Rocket
        const slug = categoryId ? `${categoryId}/${article.id}` : article.id

        return (
          <Link
            key={article.id}
            to={`/help/${slug}`}
            className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2.5 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 transition-colors">
                <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                  {article.title}
                </h4>
                <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {article.readTime} read
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </Link>
        )
      })}
    </div>
  )
}
