# Troubleshooting Guide: resource_id Type Error

## Problem
Getting error: **"column 'resource_id' is of type uuid but expression is of type text"** when creating a group.

## Root Cause
The `audit_logs` table in your Supabase database has `resource_id` column defined as TEXT, but the application code (triggers and functions) is trying to insert UUID values into it.

## Solution

### Option 1: Run Migration Script (Recommended)
Run the migration script to fix the column type:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open and run: `supabase/migration-fix-resource-id-type.sql`
4. Verify the fix by checking the column type

### Option 2: Recreate audit_logs Table
If the migration fails, you can recreate the table:

```sql
-- Backup existing data (if needed)
CREATE TABLE audit_logs_backup AS SELECT * FROM audit_logs;

-- Drop and recreate the table
DROP TABLE audit_logs CASCADE;

-- Then run the CREATE TABLE statement from schema.sql
-- (Lines 406-424 in schema.sql)
```

### Option 3: Fresh Database Setup
If you're okay losing data, the cleanest solution is:

1. Delete all tables in your Supabase project
2. Run `supabase/schema.sql` in SQL Editor
3. Run `supabase/functions.sql`
4. Run `supabase/triggers.sql`
5. Run `supabase/views.sql`
6. Run `supabase/storage.sql`
7. Run `supabase/realtime.sql`
8. Run `supabase/scheduled-jobs.sql` (optional)

## Verification
After applying the fix, verify it worked:

```sql
-- Check column type
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'audit_logs'
  AND column_name = 'resource_id';
-- Should show: data_type = 'uuid'

-- Test creating a group
-- Try creating a new group through the UI
```

## Prevention
This error typically occurs when:
1. The database schema was partially updated
2. An old version of schema.sql was used
3. Manual changes were made to the database

**To prevent in future:**
- Always run the complete schema setup in order
- Don't manually modify table structures
- Use migration scripts for schema changes
- Keep track of which SQL files have been run

## Other Fixed Issues
This fix also addresses several other column mismatches found during investigation:
- ✅ Fixed `penalty_type` → `type` in triggers
- ✅ Fixed `payment_reference` → `transaction_ref` in contributions trigger
- ✅ Fixed missing `payment_method` in contributions trigger
- ✅ Fixed `scheduled_date` column reference in payouts
- ✅ Fixed `rotation_order` column reference in API code

## Still Having Issues?
If you're still experiencing errors after applying these fixes:

1. Check Supabase logs in Dashboard → Logs
2. Run `supabase/verify-setup.sql` to check database status
3. Review the error message for specific table/column names
4. Check if all SQL files have been run in correct order

## Contact
If the issue persists, please provide:
- Complete error message from Supabase logs
- Output of `verify-setup.sql`
- Steps to reproduce the error
