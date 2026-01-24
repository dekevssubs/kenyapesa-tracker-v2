import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
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
import { getRelatedArticles, getCategoryById } from '../../content/help'

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

// Simple markdown-like renderer
function renderContent(content) {
  if (!content) return null

  const lines = content.trim().split('\n')
  const elements = []
  let currentList = []
  let listType = null
  let codeBlock = null

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ul') {
        elements.push(
          <ul key={elements.length} className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
            {currentList.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ul>
        )
      } else if (listType === 'ol') {
        elements.push(
          <ol key={elements.length} className="list-decimal list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
            {currentList.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ol>
        )
      }
      currentList = []
      listType = null
    }
  }

  const formatInline = (text) => {
    return text
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-primary-600 dark:text-primary-400">$1</code>')
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      flushList()
      if (codeBlock === null) {
        codeBlock = []
      } else {
        elements.push(
          <pre key={elements.length} className="my-4 p-4 bg-gray-900 dark:bg-gray-950 rounded-xl overflow-x-auto">
            <code className="text-sm font-mono text-gray-100">
              {codeBlock.join('\n')}
            </code>
          </pre>
        )
        codeBlock = null
      }
      continue
    }

    if (codeBlock !== null) {
      codeBlock.push(line)
      continue
    }

    // Headings
    if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={elements.length} className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
          {line.slice(3)}
        </h2>
      )
      continue
    }

    if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={elements.length} className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
          {line.slice(4)}
        </h3>
      )
      continue
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      currentList.push(line.slice(2))
      continue
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      currentList.push(line.replace(/^\d+\. /, ''))
      continue
    }

    // Paragraph
    if (line.trim()) {
      flushList()
      elements.push(
        <p
          key={elements.length}
          className="my-4 text-gray-700 dark:text-gray-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      )
    }
  }

  flushList()
  return elements
}

export default function HelpArticleViewer({ article, categoryId }) {
  const navigate = useNavigate()
  const Icon = iconMap[article?.icon] || Rocket
  const category = categoryId ? getCategoryById(categoryId) : null
  const relatedArticles = article ? getRelatedArticles(article.id) : []

  if (!article) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Article not found</p>
        <Link to="/help" className="text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
          Back to Help Center
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link to="/help" className="hover:text-primary-600 dark:hover:text-primary-400">
          Help Center
        </Link>
        {category && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link
              to={`/help/${categoryId}`}
              className="hover:text-primary-600 dark:hover:text-primary-400"
            >
              {category.title}
            </Link>
          </>
        )}
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-700 dark:text-gray-300">{article.title}</span>
      </nav>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>

      {/* Article header */}
      <div className="flex items-start space-x-4 mb-8">
        <div className={`${category?.color || 'bg-blue-500'} rounded-xl p-3 text-white`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {article.title}
          </h1>
          <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            {article.readTime} read
            {category && (
              <>
                <span className="mx-2">•</span>
                <span>{category.title}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Article content */}
      <article className="prose prose-gray dark:prose-invert max-w-none">
        {renderContent(article.content)}
      </article>

      {/* Related articles */}
      {relatedArticles.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Related Articles
          </h3>
          <div className="space-y-3">
            {relatedArticles.map((related) => {
              const RelatedIcon = iconMap[related.icon] || Rocket
              return (
                <Link
                  key={related.id}
                  to={`/help/${categoryId}/${related.id}`}
                  className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <RelatedIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-primary-500" />
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      {related.title}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
