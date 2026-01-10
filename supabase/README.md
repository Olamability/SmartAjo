# Supabase Database Setup

This directory contains SQL files for setting up the Secured-Ajo database on Supabase.

## Quick Start

### 1. Run SQL Files in Order

**IMPORTANT:** Files must be run in this specific order!

```
1. schema.sql          (REQUIRED - creates tables, triggers, RLS policies)
2. functions.sql       (REQUIRED - creates utility functions)
3. verify-setup.sql    (RECOMMENDED - verifies setup is correct)
4. views.sql           (Optional - creates database views)
5. triggers.sql        (Optional - additional triggers)
6. storage.sql         (Optional - storage buckets)
7. realtime.sql        (Optional - realtime subscriptions)
8. scheduled-jobs.sql  (Optional - scheduled jobs)
```

### 2. How to Run

1. Go to **Supabase Dashboard → SQL Editor**
2. Create a new query
3. Copy the **entire contents** of `schema.sql`
4. Paste and click **Run**
5. Wait for completion (should take a few seconds)
6. Repeat for `functions.sql`
7. Run `verify-setup.sql` to confirm everything is set up correctly

### 3. Verify Setup

After running `schema.sql` and `functions.sql`, run `verify-setup.sql`:

```sql
-- Copy and run the entire verify-setup.sql file
-- Look for PASS ✓ on all checks
-- If you see FAIL ✗, review the error and check setup
```

## File Descriptions

### Required Files

- **schema.sql** - Core database schema
  - Creates all tables (users, groups, contributions, etc.)
  - Sets up Row Level Security (RLS) policies
  - Creates indexes for performance
  - Defines triggers for automation
  - **MUST BE RUN FIRST**

- **functions.sql** - Business logic functions
  - `create_user_profile_atomic` - For user registration
  - `calculate_next_payout_recipient` - Payout calculations
  - `process_cycle_completion` - Cycle management
  - And many more utility functions
  - **MUST BE RUN AFTER schema.sql**

### Verification File

- **verify-setup.sql** - Automated setup verification
  - Checks all tables exist
  - Verifies RLS is enabled
  - Confirms policies are correct
  - Tests for the group_members recursion fix
  - Validates functions exist
  - Provides pass/fail status

### Optional Files

- **views.sql** - Database views for reporting
- **triggers.sql** - Additional triggers
- **storage.sql** - Storage bucket configuration
- **realtime.sql** - Realtime subscription setup
- **scheduled-jobs.sql** - Background job scheduling

## Common Issues

### "infinite recursion detected in policy for relation 'group_members'"

**Solution:** Re-run `schema.sql` to get the fixed RLS policy.

### "Could not find the function create_user_profile_atomic"

**Solution:** Make sure you ran `functions.sql` AFTER `schema.sql`.

### "No rows returned" when querying tables

**Solution:** Check that RLS policies are set up correctly. Run `verify-setup.sql` to diagnose.

## What Changed?

### Fixed in This PR

The `group_members_select_own_groups` RLS policy was causing infinite recursion. It has been fixed by adding a condition that prevents checking the same row recursively:

```sql
-- The fix
AND gm.id != group_members.id  -- Critical: prevents same-row check
```

This allows users to see:
1. Their own membership (direct check, no recursion)
2. Other members in groups they belong to (checks different rows)

## Need Help?

See these files for more information:
- **FIX_SUMMARY.md** (in repository root) - User-friendly overview
- **SUPABASE_SETUP.md** (in repository root) - Detailed technical guide
- **verify-setup.sql** (this directory) - Automated verification

## Testing

After setup, test:
1. ✅ Register a new account
2. ✅ Login with existing account
3. ✅ Navigate to Groups page (should load without errors)
4. ✅ Create a new group
5. ✅ View group members
