import { gettingStarted } from './articles/getting-started'
import { accounts } from './articles/accounts'
import { transactions } from './articles/transactions'
import { budgeting } from './articles/budgeting'
import { goals } from './articles/goals'
import { lending } from './articles/lending'
import { reports } from './articles/reports'

// Help categories with their articles
export const helpCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of KenyaPesa Tracker',
    icon: 'Rocket',
    color: 'bg-blue-500',
    articles: gettingStarted
  },
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Managing your M-Pesa, bank, and cash accounts',
    icon: 'Wallet',
    color: 'bg-teal-500',
    articles: accounts
  },
  {
    id: 'transactions',
    title: 'Transactions',
    description: 'Recording income, expenses, and M-Pesa parsing',
    icon: 'ArrowLeftRight',
    color: 'bg-green-500',
    articles: transactions
  },
  {
    id: 'budgeting',
    title: 'Budgeting',
    description: 'Creating budgets and managing spending limits',
    icon: 'PieChart',
    color: 'bg-purple-500',
    articles: budgeting
  },
  {
    id: 'goals',
    title: 'Savings Goals',
    description: 'Setting and tracking your financial goals',
    icon: 'Target',
    color: 'bg-orange-500',
    articles: goals
  },
  {
    id: 'lending',
    title: 'Lending',
    description: 'Tracking loans given and received',
    icon: 'HandCoins',
    color: 'bg-amber-500',
    articles: lending
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'Understanding your financial data and exports',
    icon: 'BarChart3',
    color: 'bg-indigo-500',
    articles: reports
  }
]

// Get all articles flattened with category info
export const getAllArticles = () => {
  return helpCategories.flatMap(category =>
    category.articles.map(article => ({
      ...article,
      categoryId: category.id,
      categoryTitle: category.title,
      categoryIcon: category.icon,
      categoryColor: category.color
    }))
  )
}

// Get article by ID
export const getArticleById = (articleId) => {
  const allArticles = getAllArticles()
  return allArticles.find(article => article.id === articleId)
}

// Get article by slug (category-id/article-id format or just article-id)
export const getArticleBySlug = (slug) => {
  if (!slug) return null

  // If slug contains '/', split it
  if (slug.includes('/')) {
    const [categoryId, articleId] = slug.split('/')
    const category = helpCategories.find(c => c.id === categoryId)
    if (category) {
      return category.articles.find(a => a.id === articleId)
    }
  }

  // Otherwise, search all articles by ID
  return getArticleById(slug)
}

// Get category by ID
export const getCategoryById = (categoryId) => {
  return helpCategories.find(category => category.id === categoryId)
}

// Search articles by query
export const searchArticles = (query) => {
  if (!query || query.trim().length < 2) {
    return []
  }

  const searchTerms = query.toLowerCase().trim().split(/\s+/)
  const allArticles = getAllArticles()

  // Score each article based on matches
  const scoredArticles = allArticles.map(article => {
    let score = 0
    const titleLower = article.title.toLowerCase()
    const contentLower = article.content.toLowerCase()
    const keywordsLower = article.keywords.map(k => k.toLowerCase())

    searchTerms.forEach(term => {
      // Title match (highest weight)
      if (titleLower.includes(term)) {
        score += 10
        // Exact word match in title
        if (titleLower.split(/\s+/).includes(term)) {
          score += 5
        }
      }

      // Keyword match (high weight)
      if (keywordsLower.some(k => k.includes(term))) {
        score += 8
        // Exact keyword match
        if (keywordsLower.includes(term)) {
          score += 4
        }
      }

      // Content match (lower weight)
      if (contentLower.includes(term)) {
        score += 3
        // Count occurrences (max 5)
        const occurrences = (contentLower.match(new RegExp(term, 'g')) || []).length
        score += Math.min(occurrences, 5)
      }

      // Category match
      if (article.categoryTitle.toLowerCase().includes(term)) {
        score += 4
      }
    })

    return { ...article, score }
  })

  // Filter and sort by score
  return scoredArticles
    .filter(article => article.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) // Limit to top 10 results
}

// Get popular/featured articles
export const getPopularArticles = () => {
  return [
    getArticleById('welcome'),
    getArticleById('quick-start'),
    getArticleById('mpesa-parsing'),
    getArticleById('creating-budgets'),
    getArticleById('savings-goals')
  ].filter(Boolean)
}

// Get related articles based on category
export const getRelatedArticles = (articleId, limit = 3) => {
  const article = getArticleById(articleId)
  if (!article) return []

  const category = getCategoryById(article.categoryId)
  if (!category) return []

  return category.articles
    .filter(a => a.id !== articleId)
    .slice(0, limit)
}
