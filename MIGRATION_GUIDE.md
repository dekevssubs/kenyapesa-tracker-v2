# Database Migration Guide

## Quick Start (Recommended - 2 minutes)

### Option 1: Copy-Paste Method (Easiest)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/ojigypxfwwxlcpuyjjlw/sql/new
   - Click "New Query"

2. **Copy ALL_MIGRATIONS.sql content**
   - Open the file: `ALL_MIGRATIONS.sql` in this directory
   - Copy the entire file content (Ctrl+A, Ctrl+C)

3. **Paste and Run**
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - Wait for confirmation message

4. **Verify Success**
   - Go to Table Editor: https://supabase.com/dashboard/project/ojigypxfwwxlcpuyjjlw/editor
   - You should see these new tables:
     - ✅ lending_tracker
     - ✅ bill_reminders
     - ✅ budget_alerts
     - ✅ pending_expenses
     - ✅ ai_predictions
     - ✅ recurring_transactions (updated with new columns)

---

## Alternative Methods

### Option 2: Individual Migration Files

If you prefer to run migrations one-by-one:

1. Go to SQL Editor
2. Run each file in order:
   ```
   001_lending_tracker.sql
   002_bill_reminders.sql
   003_budget_alerts.sql
   004_pending_expenses.sql
   005_ai_predictions.sql
   006_update_recurring.sql
   ```

### Option 3: Using Supabase CLI

**Install CLI:**
```bash
npm install -g supabase
```

**Link Project:**
```bash
supabase link --project-ref ojigypxfwwxlcpuyjjlw
```

**Run Migrations:**
```bash
supabase db push
```

---

## What Gets Created?

### New Tables

1. **lending_tracker**
   - Track money lent to people
   - Fields: person_name, amount, date_lent, repayment_status, amount_repaid
   - Features: repayment tracking, status filtering

2. **bill_reminders**
   - Upcoming bills and subscriptions
   - Fields: name, amount, due_date, frequency, is_active
   - Features: mark-as-paid, recurring bills, overdue alerts

3. **budget_alerts**
   - Budget notification history
   - Fields: budget_id, alert_type, spent_amount, budget_percentage
   - Features: prevents duplicate alerts (24hr cooldown)

4. **pending_expenses**
   - Auto-created expenses awaiting approval
   - Fields: recurring_transaction_id, amount, category, status
   - Features: approve/reject workflow, amount editing

5. **ai_predictions**
   - Cached budget predictions
   - Fields: category, predicted_amount, confidence_score, trend
   - Features: statistical analysis results storage

### Updated Tables

6. **recurring_transactions** (2 new columns)
   - `last_auto_created_at` - Timestamp of last auto-creation
   - `auto_create_days_before` - How many days before due date to create

---

## Security Features

All tables include:
- ✅ Row Level Security (RLS) enabled
- ✅ User-scoped access (users only see their own data)
- ✅ Foreign key constraints
- ✅ Automatic timestamps (created_at, updated_at)
- ✅ Data validation (CHECK constraints)

---

## Troubleshooting

### Error: "relation already exists"
- **Solution**: Table already created. Safe to ignore or drop table and re-run.

### Error: "permission denied"
- **Solution**: Using anon key instead of service role key. Use Supabase dashboard instead.

### Error: "foreign key constraint"
- **Cause**: Reference table doesn't exist yet
- **Solution**: Ensure migrations run in order (001, 002, 003, etc.)

### Can't see tables in dashboard
- **Solution**: Refresh browser, check project connection

---

## Verification Checklist

After running migrations, verify:

- [ ] 5 new tables appear in Table Editor
- [ ] recurring_transactions has 2 new columns
- [ ] RLS policies show in table settings
- [ ] No error messages in SQL editor
- [ ] Application runs without errors: `npm run dev`

---

## Next Steps

1. ✅ Run migrations (you're here!)
2. Start dev server: `npm run dev`
3. Test new features:
   - Navigate to `/lending` - Add lending records
   - Navigate to `/bills` - Set up bill reminders
   - Check Dashboard - See pending expenses review
   - Budget page - Enhanced AI predictions
4. Monitor toast notifications for budget alerts

---

## Rollback (if needed)

If you need to undo the migrations:

```sql
-- Drop tables in reverse order
DROP TABLE IF EXISTS ai_predictions CASCADE;
DROP TABLE IF EXISTS pending_expenses CASCADE;
DROP TABLE IF EXISTS budget_alerts CASCADE;
DROP TABLE IF EXISTS bill_reminders CASCADE;
DROP TABLE IF EXISTS lending_tracker CASCADE;

-- Remove columns from recurring_transactions
ALTER TABLE recurring_transactions
  DROP COLUMN IF EXISTS last_auto_created_at,
  DROP COLUMN IF EXISTS auto_create_days_before;
```

---

## Support

- Supabase Dashboard: https://supabase.com/dashboard/project/ojigypxfwwxlcpuyjjlw
- Project Reference: `ojigypxfwwxlcpuyjjlw`
- Migration Files: `/supabase/migrations/`

---

**Good luck! 🚀**
