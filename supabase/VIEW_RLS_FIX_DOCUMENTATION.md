# RLS Security Fix for Unrestricted Views

## Overview

This document describes the security improvements made to secure 9 previously unrestricted views in the Secured-Ajo database.

## Date

2026-01-08

## Problem

The following views were identified as having unrestricted access:

1. `user_notifications_unread`
2. `user_group_detail` (actual name: `user_groups_detail`)
3. `user_dashboard_view`
4. `pending_payout_view` (actual name: `pending_payouts_view`)
5. `group_financial_summary`
6. `group_contribution_progress`
7. `cron_jobs_status`
8. `audit_trial_view` (actual name: `audit_trail_view`)
9. `active_group_summary` (actual name: `active_groups_summary`)

## Solution

### Understanding View RLS

In PostgreSQL/Supabase, **views do not have their own Row Level Security (RLS) policies**. Instead, they inherit RLS from the underlying tables they query. This means:

- If a view queries the `notifications` table, the RLS policies on `notifications` are automatically applied
- Users can only see data in the view that they would be able to see in the underlying tables
- We secure views by ensuring the underlying tables have proper RLS policies

### Security Implementation

The file `supabase/fix-view-rls-policies.sql` implements security for all 9 views by:

1. **Enabling RLS on underlying tables** - Ensures RLS is active
2. **Creating appropriate RLS policies** - Defines who can access what data
3. **Documenting security model** - Explains access control for each view
4. **Adding verification function** - Allows checking security status

### Detailed Security Model

#### 1. user_notifications_unread
- **Underlying table**: `notifications`
- **Access control**: Users can only see their own notifications
- **Policy**: `WHERE auth.uid() = user_id`
- **Service role**: Full access

#### 2. user_groups_detail
- **Underlying table**: `group_members`
- **Access control**: Users can only see groups they are members of
- **Policy**: `WHERE auth.uid() = user_id`
- **Service role**: Full access

#### 3. user_dashboard_view
- **Underlying table**: `users` (primary) + joins to other tables
- **Access control**: Users can only see their own dashboard data
- **Policy**: Enforced by all underlying table RLS policies
- **Service role**: Full access

#### 4. pending_payouts_view
- **Underlying table**: `payouts`
- **Access control**: Users can see payouts if they are:
  - The recipient, OR
  - A member of the related group
- **Policy**: `WHERE auth.uid() = recipient_id OR EXISTS (SELECT 1 FROM group_members WHERE user_id = auth.uid())`
- **Service role**: Full access

#### 5. group_financial_summary
- **Underlying table**: `groups`
- **Access control**: Users can see financial summaries for:
  - Groups they are members of, OR
  - Groups with status = 'forming' (public for discovery)
- **Policy**: Multiple policies for member access and public forming groups
- **Service role**: Full access

#### 6. group_contribution_progress
- **Underlying table**: `groups`
- **Access control**: Same as group_financial_summary
- **Policy**: Same as group_financial_summary
- **Service role**: Full access

#### 7. cron_jobs_status
- **Underlying table**: N/A (queries pg_cron extension)
- **Access control**: 
  - Authenticated users: Read-only (monitoring)
  - Service role: Full access
- **Implementation**: GRANT statements instead of RLS
- **Note**: This is a system monitoring view

#### 8. audit_trail_view
- **Underlying table**: `audit_logs`
- **Access control**: Users can only see their own audit logs
- **Policy**: `WHERE auth.uid() = user_id`
- **Service role**: Full access

#### 9. active_groups_summary
- **Underlying table**: `groups`
- **Access control**: Same as group_financial_summary
- **Policy**: Same as group_financial_summary
- **Service role**: Full access

## Verification

### How to Verify Security

Run the verification function to check RLS status:

```sql
SELECT * FROM verify_view_rls_security();
```

Expected output should show all views as "SECURED" with RLS enabled and policies in place.

### Manual Verification

You can also manually check each table:

```sql
-- Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN (
  'notifications', 'group_members', 'users', 'payouts', 
  'groups', 'audit_logs'
);

-- Check policies for a specific table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications';
```

## Testing

### Test User Isolation

1. **Create test users**:
   - User A
   - User B

2. **Test notification isolation**:
   ```sql
   -- As User A, try to view User B's notifications
   -- Should return empty or access denied
   SELECT * FROM user_notifications_unread;
   ```

3. **Test group isolation**:
   ```sql
   -- As User A (not in Group X), try to view Group X details
   -- Should not see Group X in results
   SELECT * FROM user_groups_detail;
   ```

4. **Test dashboard isolation**:
   ```sql
   -- As User A, try to view dashboard
   -- Should only see User A's data
   SELECT * FROM user_dashboard_view;
   ```

## Migration Steps

To apply these security fixes:

1. **Backup your database** (always recommended before security changes)
   ```bash
   pg_dump -h your-host -U postgres your-db > backup.sql
   ```

2. **Run the RLS fix file**:
   ```bash
   psql -h your-host -U postgres your-db < supabase/fix-view-rls-policies.sql
   ```

3. **Verify the changes**:
   ```sql
   SELECT * FROM verify_view_rls_security();
   ```

4. **Test with actual users** to ensure application functionality is maintained

## Impact on Application

### Expected Behavior

After applying these fixes:

1. **Users will only see their own data** in views (as expected)
2. **Group members will see group data** they're authorized to see
3. **Public forming groups** remain visible for discovery
4. **Service role operations** continue to work for admin tasks

### Potential Issues

If you see:

- **"No data returned"** where data should exist:
  - Check if user is properly authenticated (`auth.uid()` is set)
  - Check if user has proper group memberships
  - Check if group status is correct (forming vs active)

- **"Permission denied"** errors:
  - Check if RLS policies were applied correctly
  - Verify service role has necessary permissions
  - Check if application is using correct authentication

### Rollback Plan

If issues occur, you can temporarily disable RLS on a table:

```sql
-- ONLY FOR EMERGENCY DEBUGGING - NOT FOR PRODUCTION
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

Then restore from backup once issues are identified.

## Security Benefits

1. **Data Isolation**: Users cannot see other users' private data
2. **Group Privacy**: Financial and member data only visible to group members
3. **Audit Trail**: Users can only see their own actions
4. **Compliance**: Meets data privacy requirements (GDPR, etc.)
5. **Defense in Depth**: Multiple layers of security checks

## Performance Considerations

- **RLS policies add minor query overhead** (typically < 5ms)
- **Views remain as performant** as before, with security added
- **Indexes on underlying tables** help RLS policy evaluation
- Consider adding indexes on:
  - `notifications(user_id)`
  - `group_members(user_id, group_id)`
  - `audit_logs(user_id)`
  - `payouts(recipient_id)`

## Maintenance

### When Adding New Views

When creating new views:

1. Identify the underlying tables
2. Ensure those tables have RLS enabled
3. Create appropriate RLS policies
4. Document the security model
5. Test with multiple users
6. Update the verification function if needed

### Regular Security Audits

Periodically run:

```sql
-- Check for tables without RLS
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = FALSE;

-- Check for views without proper underlying RLS
SELECT * FROM verify_view_rls_security()
WHERE status != 'SECURED';
```

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security#security-best-practices)

## Conclusion

All 9 previously unrestricted views are now properly secured through RLS policies on their underlying tables. Users can only access data they are authorized to see, while maintaining proper functionality for group operations and public group discovery.
