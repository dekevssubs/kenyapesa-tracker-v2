# Supabase Issues to Address

## Trigger Function Issues (Fixed Temporarily)

### `on_user_created_create_categories` Trigger
- **Status**: Fixed with workaround
- **Issue**: Trigger was causing 500 errors on signup
- **Fix Applied**: Added `SECURITY DEFINER` and `SET search_path = public`
- **TODO**: Review if categories are actually being created for new users

### Functions to Review
```sql
-- These functions were modified to prevent signup failures:
-- 1. create_default_categories_for_user(uuid)
-- 2. handle_new_user() trigger function

-- Both now have EXCEPTION handlers that log warnings instead of failing
```

## Category Unification (Pending)

### Issue
- Expenses and Budgets use different category sources
- Should share the same `expense_categories` table with subcategories

### TODO
- [ ] Audit Budget.jsx category usage
- [ ] Audit Expenses.jsx category usage
- [ ] Ensure both use `categoryService.js`
- [ ] Verify subcategories work in both modules

## RLS Policies to Review

### `expense_categories` Table
- **Current State**: RLS disabled (`relrowsecurity: false`)
- **TODO**: Decide if RLS should be enabled
- **Consideration**: System categories vs user categories

## Database Warnings

### CRLF Warnings
```
warning: LF will be replaced by CRLF the next time Git touches it
```
- Affects: `.claude/settings.local.json`, `src/App.jsx`
- **TODO**: Add `.gitattributes` to normalize line endings

## Migration Scripts Applied

The following migrations were added but may need verification:
- `026_create_budgets_table.sql`
- `027_seed_subcategories.sql`
- `028_add_category_id_to_expenses.sql`
- `029_add_category_id_to_remaining_tables.sql`

### TODO
- [ ] Verify all migrations ran successfully in production
- [ ] Check if `category_id` columns are populated correctly
- [ ] Verify foreign key constraints are working

---

## Build Warnings (Non-blocking)

### Recharts Circular Dependency Warnings
```
Export "Bar" of module "recharts/es6/cartesian/Bar.js" was reexported through
module "recharts/es6/index.js" while both modules are dependencies of each other...
```
- **Status**: Known recharts library issue
- **Impact**: Warnings only, no functional issues
- **Files Affected**: Dashboard, all report tab components
- **Potential Fix**: Configure `output.manualChunks` in vite.config.js or import directly from recharts submodules

### CRLF Line Ending Warnings
- Add `.gitattributes` to normalize line endings

---

*Created: January 2026*
*Last Updated: January 2026*
