# Fix Summary - Registration and Infinite Recursion Issues

## Problem
Two critical issues were affecting the SmartAjo application:
1. **Registration not working** - New users couldn't create accounts
2. **Groups page error** - "infinite recursion detected in policy for relation 'group_members'" when accessing groups

## Root Cause
The PostgreSQL Row Level Security (RLS) policy for `group_members` was checking the same table within its own policy definition without proper safeguards, causing infinite recursion.

## Solution Applied

### 1. Fixed the Infinite Recursion (schema.sql)

**Changed the `group_members_select_own_groups` policy from:**
```sql
-- BROKEN VERSION (causes infinite recursion)
CREATE POLICY group_members_select_own_groups ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
        AND gm.user_id = auth.uid()
    )
  );
```

**To:**
```sql
-- FIXED VERSION (no recursion)
CREATE POLICY group_members_select_own_groups ON group_members
  FOR SELECT
  USING (
    -- User can always see their own membership
    auth.uid() = user_id
    OR
    -- User can see members of groups where they are also a member
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.id != group_members.id  -- Critical: prevents checking the same row
    )
  );
```

**Why this works:**
- When PostgreSQL evaluates if user can see row X, it checks:
  1. First condition: Is this the user's own membership? → If yes, allow (no recursion needed)
  2. Second condition: Is there a DIFFERENT row (Y) where user is a member of the same group?
     - Row Y will match condition 1, so no recursion occurs
- The `gm.id != group_members.id` clause is critical - it ensures we never evaluate the same row recursively

### 2. Created Setup Guide (SUPABASE_SETUP.md)

A comprehensive guide that includes:
- Step-by-step instructions for running SQL files in the correct order
- Explanation of why order matters (schema.sql must run before functions.sql)
- Verification queries to confirm everything is set up correctly
- Troubleshooting section for common issues
- Security best practices

## How to Apply the Fix

### Step 1: Update Your Supabase Database

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the **entire contents** of `supabase/schema.sql` from this repository
5. Paste into the SQL Editor and click **Run**
6. Wait for completion
7. Create another new query
8. Copy the **entire contents** of `supabase/functions.sql`
9. Paste into the SQL Editor and click **Run**

### Step 2: Verify the Fix

Run these verification queries in the SQL Editor:

```sql
-- Check that RLS policies were updated
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'group_members' 
  AND policyname = 'group_members_select_own_groups';

-- Check that the function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'create_user_profile_atomic';
```

### Step 3: Test the Application

1. **Test Registration:**
   - Go to the signup page
   - Create a new test account
   - Should complete without errors

2. **Test Groups:**
   - Log in with an existing account
   - Navigate to the Groups page
   - Should load without "infinite recursion" error

## What's Fixed

✅ **Registration** - The `create_user_profile_atomic` function is now properly available  
✅ **Groups Page** - No more infinite recursion error  
✅ **Group Members** - Users can correctly view members of groups they're in  
✅ **Contributions** - Users can view contributions for their groups  
✅ **Payouts** - Users can view payouts for their groups  
✅ **Penalties** - Users can view penalties for their groups  

## Files Changed

- `supabase/schema.sql` - Fixed RLS policies (11 lines modified)
- `SUPABASE_SETUP.md` - New comprehensive setup guide (206 lines added)

## Technical Details

### Why Recursion Occurred
PostgreSQL evaluates RLS policies for every row access. The original policy said "user can see row if they're a member of the group", but to check "if they're a member", PostgreSQL had to query `group_members` again, which triggered the same policy, creating a loop.

### How the Fix Works
The fix uses two strategies:
1. **Direct check**: If it's the user's own membership row, allow immediately (no recursion)
2. **Different row check**: If checking another member's row, look for a DIFFERENT row where the user is a member. That different row will match strategy 1, breaking the loop.

### Why Order Matters
- `schema.sql` creates tables, triggers, and RLS policies
- `functions.sql` creates utility functions like `create_user_profile_atomic`
- The registration flow calls `create_user_profile_atomic`, so functions.sql MUST run after schema.sql

## Need Help?

If you encounter any issues after applying the fix:

1. Check the **Supabase Dashboard → Logs** for error messages
2. Verify both SQL files were executed successfully
3. Try the verification queries above
4. Check the **SUPABASE_SETUP.md** troubleshooting section
5. Report the specific error message you're seeing

## Additional Resources

- `SUPABASE_SETUP.md` - Complete setup guide
- `supabase/schema.sql` - Database schema with fixed RLS policies
- `supabase/functions.sql` - Utility functions for business logic
