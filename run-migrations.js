/**
 * Database Migration Runner for KenyaPesa Tracker
 *
 * This script helps you run all pending migrations.
 *
 * IMPORTANT: You need the Supabase SERVICE ROLE key to run migrations.
 * The ANON key does not have permission to create/alter tables.
 *
 * Usage Options:
 *
 * Option 1: Using Supabase CLI (Recommended)
 * ------------------------------------------
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. Link your project: supabase link --project-ref ojigypxfwwxlcpuyjjlw
 * 3. Run migrations: supabase db push
 *
 * Option 2: Using Supabase Dashboard (Manual)
 * -------------------------------------------
 * 1. Go to https://supabase.com/dashboard/project/ojigypxfwwxlcpuyjjlw/editor
 * 2. Click on "SQL Editor" in the left sidebar
 * 3. Copy and paste each migration file content (in order):
 *    - supabase/migrations/001_lending_tracker.sql
 *    - supabase/migrations/002_bill_reminders.sql
 *    - supabase/migrations/003_budget_alerts.sql
 *    - supabase/migrations/004_pending_expenses.sql
 *    - supabase/migrations/005_ai_predictions.sql
 *    - supabase/migrations/006_update_recurring.sql
 * 4. Click "Run" for each migration
 *
 * Option 3: Using this script (Requires Service Role Key)
 * -------------------------------------------------------
 * 1. Get your SERVICE ROLE key from Supabase dashboard:
 *    Settings > API > service_role key (secret)
 * 2. Set environment variable:
 *    - Linux/Mac: export SUPABASE_SERVICE_KEY=your_service_role_key
 *    - Windows: set SUPABASE_SERVICE_KEY=your_service_role_key
 * 3. Run: node run-migrations.js
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = 'https://ojigypxfwwxlcpuyjjlw.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SERVICE_KEY) {
  console.error('\n❌ ERROR: SUPABASE_SERVICE_KEY environment variable not set!\n')
  console.log('Please set the service role key:')
  console.log('  Windows: set SUPABASE_SERVICE_KEY=your_service_role_key')
  console.log('  Linux/Mac: export SUPABASE_SERVICE_KEY=your_service_role_key\n')
  console.log('Get your service role key from:')
  console.log('  https://supabase.com/dashboard/project/ojigypxfwwxlcpuyjjlw/settings/api\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const migrations = [
  '001_lending_tracker.sql',
  '002_bill_reminders.sql',
  '003_budget_alerts.sql',
  '004_pending_expenses.sql',
  '005_ai_predictions.sql',
  '006_update_recurring.sql'
]

async function runMigrations() {
  console.log('\n🚀 Starting database migrations...\n')

  for (const migrationFile of migrations) {
    const filePath = path.join(__dirname, 'supabase', 'migrations', migrationFile)

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${migrationFile}`)
      continue
    }

    console.log(`📝 Running migration: ${migrationFile}`)
    const sql = fs.readFileSync(filePath, 'utf8')

    try {
      const { error } = await supabase.rpc('exec_sql', { sql })

      if (error) {
        // Try alternative method using REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
          },
          body: JSON.stringify({ query: sql })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        console.log(`✅ ${migrationFile} completed successfully`)
      } else {
        console.log(`✅ ${migrationFile} completed successfully`)
      }
    } catch (err) {
      console.error(`❌ Error running ${migrationFile}:`, err.message)
      console.log('\n⚠️  Migration failed. Please run this migration manually in Supabase dashboard.')
      console.log(`   File: supabase/migrations/${migrationFile}\n`)
    }
  }

  console.log('\n✨ Migration process completed!\n')
  console.log('Next steps:')
  console.log('  1. Verify tables were created in Supabase dashboard')
  console.log('  2. Run: npm run dev')
  console.log('  3. Test the new features\n')
}

runMigrations()
