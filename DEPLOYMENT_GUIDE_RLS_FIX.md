# Deployment Guide: RLS Infinite Recursion Fix

## Overview
This guide explains how to deploy the fix for the infinite recursion error in the `group_members` RLS policy.

## Problem Summary
When users tried to view their groups from the dashboard, they encountered:
- Error: "infinite recursion detected in policy for relation 'group_members'"
- PostgreSQL Error Code: 42P17
- Multiple error toasts appearing

## Root Cause
The RLS policy on `group_members` was causing infinite recursion:
1. Query fetches groups with a join on `group_members`
2. The `group_members` RLS policy checks if user is a member by querying `group_members` again
3. This triggers the policy recursively, causing infinite loop

## Solution
Created a `SECURITY DEFINER` function that bypasses RLS to check membership, breaking the recursion cycle.

## Deployment Steps

### Step 1: Backup Current Schema (Recommended)
Before making changes, backup your current database:
1. Go to Supabase Dashboard → Database → Backups
2. Create a manual backup or note your latest backup time

### Step 2: Deploy the Fix

#### Option A: Run Full Schema (Recommended for consistency)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create a new query
4. Copy the **entire** contents of `supabase/schema.sql` from this repository
5. Run the query
6. Wait for completion (should take a few seconds)

#### Option B: Run Only the New Function and Updated Policies
If you prefer to apply only the changes:

1. **Create the helper functions:**
```sql
-- Function to check group membership (bypasses RLS)
CREATE OR REPLACE FUNCTION is_group_member(p_user_id UUID, p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE user_id = p_user_id
      AND group_id = p_group_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_group_member IS 
  'Checks if a user is a member of a group. 
   Uses SECURITY DEFINER to bypass RLS and avoid infinite recursion in policies.';

-- Function to check if user is group creator (bypasses RLS)
CREATE OR REPLACE FUNCTION is_group_creator(p_user_id UUID, p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE user_id = p_user_id
      AND group_id = p_group_id
      AND is_creator = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_group_creator IS 
  'Checks if a user is the creator of a group (has is_creator = true). 
   Uses SECURITY DEFINER to bypass RLS and avoid infinite recursion in policies.';
```

2. **Update the group_members policy:**
```sql
-- Drop old policy
DROP POLICY IF EXISTS group_members_select_own_groups ON group_members;

-- Create new policy using the helper function
CREATE POLICY group_members_select_own_groups ON group_members
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    is_group_member(auth.uid(), group_members.group_id)
  );
```

3. **Update the groups policy:**
```sql
-- Drop old policy
DROP POLICY IF EXISTS groups_select_public ON groups;

-- Create new policy using the helper function
CREATE POLICY groups_select_public ON groups
  FOR SELECT
  USING (
    status IN ('forming', 'active') OR
    is_group_member(auth.uid(), groups.id)
  );
```

4. **Update the groups update policy:**
```sql
-- Drop old policy
DROP POLICY IF EXISTS groups_update_creator ON groups;

-- Create new policy using both helper functions
CREATE POLICY groups_update_creator ON groups
  FOR UPDATE
  USING (
    auth.uid() = created_by OR
    is_group_creator(auth.uid(), groups.id)
  );
```

### Step 3: Verify the Fix

1. **Test the helper functions:**
```sql
-- Test the is_group_member function
SELECT is_group_member(auth.uid(), 'any-group-id-here');

-- Test the is_group_creator function
SELECT is_group_creator(auth.uid(), 'any-group-id-here');
```

2. **Test in the Application:**
- Log in to the application
- Navigate to "My Groups" from the dashboard
- Verify groups load without errors
- Check browser console - no errors should appear
- Verify no duplicate error toasts

3. **Test Security:**
- Verify users can only see groups they're members of
- Try accessing a group you're not a member of (should be denied)

### Step 4: Monitor

After deployment, monitor for:
- No "infinite recursion" errors in logs
- Groups page loads successfully for all users
- Query performance remains acceptable

## Technical Details

### What Changed?

1. **New Functions:**
   - `is_group_member()`: Checks if user is a member of a group
   - `is_group_creator()`: Checks if user is the creator of a group
   - Both use `SECURITY DEFINER` to bypass RLS
   - Both marked as `STABLE` for query optimization
   - Simple EXISTS queries that don't trigger RLS policies

2. **Updated Policies:**
   - `group_members_select_own_groups`: Uses `is_group_member()` instead of recursive subquery
   - `groups_select_public`: Uses `is_group_member()` for consistency
   - `groups_update_creator`: Uses `is_group_creator()` to fully eliminate direct table access in policies

### Why This Works

- `SECURITY DEFINER` functions execute with the privileges of the function owner (postgres)
- This bypasses RLS policies during the membership check
- Breaking the recursion cycle while maintaining security

### Security Considerations

- The function is safe because it only checks membership, doesn't return sensitive data
- RLS policies on other tables still protect sensitive information
- Users can only see groups they're members of (security maintained)

## Rollback Plan

If issues occur after deployment:

### Important Note
The original code had an infinite recursion bug. Rolling back will restore that bug, so rollback should only be a temporary emergency measure while you investigate and find a proper solution.

### Option 1: Emergency RLS Disable (DANGEROUS - Use only as last resort)
If the system is completely broken and you need immediate access:
```sql
-- EMERGENCY ONLY: Temporarily disable RLS on group_members
-- WARNING: This removes all access control - anyone can see all group members!
-- Only use this for a few minutes while you restore from backup or fix the issue
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable after fixing:
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
```

### Option 2: Restore from Backup (Recommended)
- Go to Supabase Dashboard → Database → Backups
- Look for the backup created before applying this fix (check the timestamp from Step 1)
- Select the backup that matches the date/time just before you ran the SQL changes
- Click "Restore" and confirm
- Follow Supabase's restore process
- **Important**: After restoring, you'll have the original recursion bug back. Users won't be able to access "My Groups" page. You'll need to find an alternative solution or re-apply a corrected version of this fix.

### Option 3: Partial Rollback (Restores recursion bug)
Only use this if you understand you're restoring broken functionality:
```sql
-- WARNING: This restores the policy that has the infinite recursion bug
-- Users will get "infinite recursion detected" errors when viewing groups

DROP POLICY IF EXISTS group_members_select_own_groups ON group_members;

CREATE POLICY group_members_select_own_groups ON group_members
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.id != group_members.id
    )
  );
```

2. **Restore from Backup (if needed):**
- Go to Supabase Dashboard → Database → Backups
- Look for the backup created before applying this fix (check the timestamp from Step 1)
- Select the backup that matches the date/time just before you ran the SQL changes
- Click "Restore" and confirm
- Follow Supabase's restore process
- Note: You'll need to find an alternative fix as restoring brings back the recursion bug

## Support

If you encounter issues:
1. Check Supabase logs for error messages
2. Verify the functions were created:
```sql
SELECT proname, prosecdef FROM pg_proc 
WHERE proname IN ('is_group_member', 'is_group_creator');
-- Should return both functions with prosecdef = true
```
3. Verify policies were updated:
```sql
SELECT policyname, tablename FROM pg_policies 
WHERE tablename IN ('group_members', 'groups');
```
4. Contact support with error messages and logs

## Related Files
- `supabase/schema.sql` - Main schema file with the fix
- `src/api/groups.ts` - Groups API that triggers the query
- `src/pages/GroupsPage.tsx` - Page component that calls getUserGroups()
