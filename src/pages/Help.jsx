import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  HelpCircle,
  Search,
  X,
  BookOpen,
  ArrowLeft,
  Rocket,
  Wallet,
  ArrowLeftRight,
  PieChart,
  Target,
  HandCoins,
  BarChart3
} from 'lucide-react'
import HelpCategoryCard from '../components/help/HelpCategoryCard'
import HelpArticleList from '../components/help/HelpArticleList'
import HelpArticleViewer from '../components/help/HelpArticleViewer'
import HelpSearchResults from '../components/help/HelpSearchResults'
import {
  helpCategories,
  searchArticles,
  getCategoryById,
  getArticleBySlug,
  getPopularArticles
} from '../content/help'

const categoryIconMap = {
  Rocket,
  Wallet,
  ArrowLeftRight,
  PieChart,
  Target,
  HandCoins,
  BarChart3
}

export default function Help() {
  const { categoryId: paramCategoryId, articleId: paramArticleId } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  // Parse the params to determine what to show
  const { categoryId, articleId, category, article } = useMemo(() => {
    // If we have both category and article ID
    if (paramCategoryId && paramArticleId) {
      const cat = getCategoryById(paramCategoryId)
      const art = cat?.articles?.find(a => a.id === paramArticleId)
      return { categoryId: paramCategoryId, articleId: paramArticleId, category: cat, article: art }
    }

    // If we only have category ID (could be category or article slug)
    if (paramCategoryId) {
      // First check if it's a category
      const cat = getCategoryById(paramCategoryId)
      if (cat) {
        return { categoryId: paramCategoryId, articleId: null, category: cat, article: null }
      }

      // Otherwise try to find as article
      const art = getArticleBySlug(paramCategoryId)
      if (art) {
        return { categoryId: art.categoryId, articleId: paramCategoryId, category: null, article: art }
      }
    }

    return { categoryId: null, articleId: null, category: null, article: null }
  }, [paramCategoryId, paramArticleId])

  // Search effect
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = searchArticles(searchQuery)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
  }

  const popularArticles = getPopularArticles()

  // Render article view
  if (article) {
    return (
      <div className="space-y-6">
        <HelpArticleViewer article={article} categoryId={categoryId} />
      </div>
    )
  }

  // Render category view
  if (category) {
    const CategoryIcon = categoryIconMap[category.icon] || Rocket
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-2">
          <Link
            to="/help"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className={`${category.color} rounded-xl p-3 text-white`}>
            <CategoryIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {category.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {category.description}
            </p>
          </div>
        </div>

        {/* Articles list */}
        <HelpArticleList articles={category.articles} categoryId={categoryId} />
      </div>
    )
  }

  // Render main help center
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-white/20 rounded-xl p-4">
            <HelpCircle className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Help Center</h1>
            <p className="text-primary-100 mt-1">Find answers and learn how to use KenyaPesa Tracker</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 border-0 focus:ring-2 focus:ring-white/50 shadow-lg"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 ? (
        <HelpSearchResults
          results={searchResults}
          query={searchQuery}
          onClear={clearSearch}
        />
      ) : (
        <>
          {/* Popular Articles */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Popular Articles
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/help/${article.categoryId}/${article.id}`}
                  className="group p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all"
                >
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {article.title}
                  </h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                    {article.readTime} read
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Browse by Category
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {helpCategories.map((category) => (
                <HelpCategoryCard key={category.id} category={category} />
              ))}
            </div>
          </div>

          {/* Still need help */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Still need help?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Can't find what you're looking for? Start the interactive tour or contact us.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/settings"
                className="btn btn-primary"
              >
                Restart Onboarding Tour
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
