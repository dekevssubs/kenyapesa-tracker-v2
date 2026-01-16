/**
 * Category Service - Centralized Category Management
 *
 * Purpose: Provide categories from the database to all components
 *
 * Core Principles (from canonical spec categories_ledger_architecture.md):
 * - Categories are system-wide (classify transactions, not budgets)
 * - Ledger-first (categories attached to ledger transactions)
 * - Budgets do not own categories (budgets reference categories)
 * - Goals do not use categories (goals use allocations)
 */

import { supabase } from './supabase'

/**
 * Get all expense categories for a user (hierarchical structure)
 * @param {UUID} userId - User ID
 * @returns {Object} { success, categories, hierarchy }
 */
export async function getAllExpenseCategories(userId) {
  try {
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return { success: false, error: error.message, categories: [], hierarchy: [] }
    }

    // Separate parents and children
    const parents = categories.filter(c => !c.parent_category_id)
    const children = categories.filter(c => c.parent_category_id)

    // Build hierarchy
    const hierarchy = parents.map(parent => ({
      ...parent,
      subcategories: children
        .filter(c => c.parent_category_id === parent.id)
        .sort((a, b) => a.display_order - b.display_order)
    }))

    return {
      success: true,
      categories,
      hierarchy
    }
  } catch (err) {
    console.error('Error in getAllExpenseCategories:', err)
    return { success: false, error: err.message, categories: [], hierarchy: [] }
  }
}

/**
 * Get flat list of categories suitable for expense/transaction selection
 * Returns subcategories with parent info (leaf nodes for transactions)
 * @param {UUID} userId - User ID
 * @returns {Array} Array of { id, slug, name, parentName, parentSlug, color, icon }
 */
export async function getExpenseCategoriesForSelection(userId) {
  try {
    const { data: allCategories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    if (!allCategories || allCategories.length === 0) {
      console.warn('No categories found for user:', userId)
      return []
    }

    // Separate parents and subcategories
    const parents = allCategories.filter(c => !c.parent_category_id)
    const subcategories = allCategories.filter(c => c.parent_category_id)

    // Map subcategories with parent info
    const categoriesForSelection = subcategories.map(sub => {
      const parent = parents.find(p => p.id === sub.parent_category_id)
      return {
        id: sub.id,
        slug: sub.slug,
        name: sub.name,
        description: sub.description,
        parentId: sub.parent_category_id,
        parentName: parent?.name || null,
        parentSlug: parent?.slug || null,
        color: sub.color || parent?.color || '#6B7280',
        icon: sub.icon || parent?.icon || 'package',
        displayOrder: sub.display_order
      }
    })

    // Also include standalone parent categories (those without children)
    const standaloneParents = parents
      .filter(parent => !subcategories.some(sub => sub.parent_category_id === parent.id))
      .map(parent => ({
        id: parent.id,
        slug: parent.slug,
        name: parent.name,
        description: parent.description,
        parentId: null,
        parentName: null,
        parentSlug: null,
        color: parent.color || '#6B7280',
        icon: parent.icon || 'package',
        displayOrder: parent.display_order
      }))

    return [...categoriesForSelection, ...standaloneParents]
  } catch (err) {
    console.error('Error in getExpenseCategoriesForSelection:', err)
    return []
  }
}

/**
 * Get categories grouped by parent for dropdown display
 * @param {UUID} userId - User ID
 * @returns {Array} Array of { parentName, parentSlug, categories: [...] }
 */
export async function getCategoriesGroupedByParent(userId) {
  try {
    const { data: allCategories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    if (!allCategories || allCategories.length === 0) {
      return []
    }

    // Separate parents and subcategories
    const parents = allCategories.filter(c => !c.parent_category_id)
    const subcategories = allCategories.filter(c => c.parent_category_id)

    // Group subcategories by parent
    const grouped = parents
      .filter(parent => subcategories.some(sub => sub.parent_category_id === parent.id))
      .map(parent => ({
        parentId: parent.id,
        parentName: parent.name,
        parentSlug: parent.slug,
        parentIcon: parent.icon,
        parentColor: parent.color,
        categories: subcategories
          .filter(sub => sub.parent_category_id === parent.id)
          .map(sub => ({
            id: sub.id,
            slug: sub.slug,
            name: sub.name,
            description: sub.description,
            color: sub.color || parent.color,
            icon: sub.icon || parent.icon
          }))
      }))

    // Add standalone parents as their own group
    const standaloneParents = parents
      .filter(parent => !subcategories.some(sub => sub.parent_category_id === parent.id))

    if (standaloneParents.length > 0) {
      grouped.push({
        parentId: null,
        parentName: 'Other',
        parentSlug: 'other',
        parentIcon: 'package',
        parentColor: '#6B7280',
        categories: standaloneParents.map(parent => ({
          id: parent.id,
          slug: parent.slug,
          name: parent.name,
          description: parent.description,
          color: parent.color,
          icon: parent.icon
        }))
      })
    }

    return grouped
  } catch (err) {
    console.error('Error in getCategoriesGroupedByParent:', err)
    return []
  }
}

/**
 * Get category by slug
 * @param {UUID} userId - User ID
 * @param {string} slug - Category slug
 * @returns {Object|null} Category object or null
 */
export async function getCategoryBySlug(userId, slug) {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) return null
    return data
  } catch (err) {
    console.error('Error in getCategoryBySlug:', err)
    return null
  }
}

/**
 * Get category by ID
 * @param {UUID} categoryId - Category ID
 * @returns {Object|null} Category object or null
 */
export async function getCategoryById(categoryId) {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('id', categoryId)
      .single()

    if (error || !data) return null
    return data
  } catch (err) {
    console.error('Error in getCategoryById:', err)
    return null
  }
}

/**
 * Get category ID from slug (utility function)
 * @param {UUID} userId - User ID
 * @param {string} slug - Category slug
 * @returns {UUID|null} Category ID or null
 */
export async function getCategoryIdFromSlug(userId, slug) {
  const category = await getCategoryBySlug(userId, slug)
  return category?.id || null
}

/**
 * Map legacy category string to new category ID
 * Used for backward compatibility during migration
 * @param {UUID} userId - User ID
 * @param {string} legacyCategory - Legacy category string (e.g., 'food', 'transport')
 * @returns {UUID|null} Matching category ID or null
 */
export async function mapLegacyCategoryToId(userId, legacyCategory) {
  if (!legacyCategory) return null

  // Mapping from legacy category strings to new slugs
  const legacyToSlugMap = {
    // Direct mappings
    'rent': 'rent',
    'food': 'groceries',
    'transport': 'fuel',
    'utilities': 'electricity',
    'airtime': 'airtime',
    'entertainment': 'subscriptions',
    'health': 'medical-bills',
    'education': 'school-fees',
    'clothing': 'clothing',
    'savings': null, // Savings are not expense categories
    'debt': null, // Handled differently
    'loan': null, // Handled differently
    'other': 'uncategorized'
  }

  const targetSlug = legacyToSlugMap[legacyCategory.toLowerCase()] || 'uncategorized'

  if (!targetSlug) return null

  return await getCategoryIdFromSlug(userId, targetSlug)
}

/**
 * Get parent categories only (for high-level grouping)
 * @param {UUID} userId - User ID
 * @returns {Array} Array of parent categories
 */
export async function getParentCategories(userId) {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .is('parent_category_id', null)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching parent categories:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getParentCategories:', err)
    return []
  }
}

/**
 * Get subcategories for a parent category
 * @param {UUID} userId - User ID
 * @param {UUID} parentId - Parent category ID
 * @returns {Array} Array of subcategories
 */
export async function getSubcategories(userId, parentId) {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('parent_category_id', parentId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching subcategories:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getSubcategories:', err)
    return []
  }
}

/**
 * Ensure user has categories (seeds default categories if none exist)
 * This is a client-side fallback for when the database trigger fails
 * @param {UUID} userId - User ID
 * @returns {Object} { success, seeded, categories }
 */
export async function ensureUserHasCategories(userId) {
  try {
    // First check if user has any categories
    const { data: existingCategories, error: checkError } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (checkError) {
      console.error('Error checking categories:', checkError)
      return { success: false, seeded: false, error: checkError.message }
    }

    // If categories exist, we're good
    if (existingCategories && existingCategories.length > 0) {
      return { success: true, seeded: false }
    }

    // No categories found - try to seed them via database function
    console.log('No categories found for user, attempting to seed...')

    const { error: seedError } = await supabase
      .rpc('create_default_categories_for_user', { p_user_id: userId })

    if (seedError) {
      console.error('Error seeding categories via RPC:', seedError)
      // If RPC fails, the function might not exist in production
      // Return error but don't block - categories might need manual seeding
      return { success: false, seeded: false, error: seedError.message }
    }

    console.log('Successfully seeded default categories for user')
    return { success: true, seeded: true }
  } catch (err) {
    console.error('Error in ensureUserHasCategories:', err)
    return { success: false, seeded: false, error: err.message }
  }
}

/**
 * Get categories with auto-seeding fallback
 * Use this instead of getAllExpenseCategories when you want to ensure categories exist
 * @param {UUID} userId - User ID
 * @returns {Object} { success, categories, hierarchy }
 */
export async function getCategoriesWithFallback(userId) {
  // First, ensure user has categories
  const ensureResult = await ensureUserHasCategories(userId)

  if (!ensureResult.success && ensureResult.error) {
    console.warn('Could not ensure categories exist:', ensureResult.error)
    // Continue anyway - might have partial categories
  }

  // Now fetch categories
  return getAllExpenseCategories(userId)
}

/**
 * Category service default export
 */
const categoryService = {
  getAllExpenseCategories,
  getExpenseCategoriesForSelection,
  getCategoriesGroupedByParent,
  getCategoryBySlug,
  getCategoryById,
  getCategoryIdFromSlug,
  mapLegacyCategoryToId,
  getParentCategories,
  getSubcategories,
  ensureUserHasCategories,
  getCategoriesWithFallback
}

export default categoryService
