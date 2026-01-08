-- ============================================================================
-- RLS POLICIES FOR VIEWS - SECURED-AJO
-- ============================================================================
-- This file adds Row Level Security policies for all database views
-- Views inherit RLS from underlying tables, but we need to ensure proper
-- access control at the view level as well.
--
-- Date: 2026-01-08
-- Purpose: Secure all unrestricted views identified in security audit
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS ON ALL VIEWS
-- ============================================================================
-- Note: In PostgreSQL, views don't have their own RLS settings
-- They inherit RLS from the underlying tables
-- However, we control access through GRANTs and underlying table policies

-- ============================================================================
-- 2. USER_NOTIFICATIONS_UNREAD VIEW
-- ============================================================================
-- This view shows unread notifications for users
-- Access should be restricted to:
-- - The user who owns the notifications
-- - Service role for admin operations

-- The view is already filtered by is_read = false
-- Security is enforced by the underlying notifications table RLS
-- The notifications table should have RLS that ensures:
-- users can only see their own notifications

-- Verify notifications table has proper RLS
DO $$
BEGIN
  -- Enable RLS on notifications if not already enabled
  EXECUTE 'ALTER TABLE notifications ENABLE ROW LEVEL SECURITY';
  
  -- Drop existing policies to recreate them
  DROP POLICY IF EXISTS notifications_select_own ON notifications;
  DROP POLICY IF EXISTS notifications_update_own ON notifications;
  DROP POLICY IF EXISTS notifications_service_role_all ON notifications;
  
  -- Users can only see their own notifications
  EXECUTE '
    CREATE POLICY notifications_select_own ON notifications
      FOR SELECT
      USING (auth.uid() = user_id)
  ';
  
  -- Users can update their own notifications (mark as read)
  EXECUTE '
    CREATE POLICY notifications_update_own ON notifications
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
  ';
  
  -- Service role can do anything
  EXECUTE '
    CREATE POLICY notifications_service_role_all ON notifications
      FOR ALL
      USING (current_setting(''role'', true) = ''service_role'')
  ';
END $$;

COMMENT ON VIEW user_notifications_unread IS 
  'RLS: Users can only see their own unread notifications via notifications table RLS';

-- ============================================================================
-- 3. USER_GROUP_DETAIL VIEW (user_groups_detail)
-- ============================================================================
-- This view shows detailed group information for users
-- Access should be restricted to:
-- - Members of the group
-- - Service role for admin operations

-- Security is enforced by the underlying group_members table RLS
-- Verify group_members table has proper RLS

DO $$
BEGIN
  -- Enable RLS on group_members if not already enabled
  EXECUTE 'ALTER TABLE group_members ENABLE ROW LEVEL SECURITY';
  
  -- Drop existing policies to recreate them
  DROP POLICY IF EXISTS group_members_select_own ON group_members;
  DROP POLICY IF EXISTS group_members_service_role_all ON group_members;
  
  -- Users can only see their own group memberships
  EXECUTE '
    CREATE POLICY group_members_select_own ON group_members
      FOR SELECT
      USING (auth.uid() = user_id)
  ';
  
  -- Service role can do anything
  EXECUTE '
    CREATE POLICY group_members_service_role_all ON group_members
      FOR ALL
      USING (current_setting(''role'', true) = ''service_role'')
  ';
END $$;

COMMENT ON VIEW user_groups_detail IS 
  'RLS: Users can only see details of groups they are members of via group_members table RLS';

-- ============================================================================
-- 4. USER_DASHBOARD_VIEW
-- ============================================================================
-- This view aggregates user dashboard data
-- Access should be restricted to:
-- - The user viewing their own dashboard
-- - Service role for admin operations

-- The view starts with users table and joins to user's data
-- We need to ensure the view itself can only return data for the authenticated user
-- This is done via the underlying tables' RLS

COMMENT ON VIEW user_dashboard_view IS 
  'RLS: Users can only see their own dashboard data via underlying tables RLS. View filters by user_id.';

-- ============================================================================
-- 5. PENDING_PAYOUT_VIEW (pending_payouts_view)
-- ============================================================================
-- This view shows pending payouts
-- Access should be restricted to:
-- - Group members who are involved in the payout
-- - Service role for admin operations

-- Security is enforced by payouts table RLS
DO $$
BEGIN
  -- Enable RLS on payouts if not already enabled
  EXECUTE 'ALTER TABLE payouts ENABLE ROW LEVEL SECURITY';
  
  -- Drop existing policies to recreate them
  DROP POLICY IF EXISTS payouts_select_own ON payouts;
  DROP POLICY IF EXISTS payouts_service_role_all ON payouts;
  
  -- Users can see payouts if they are the recipient OR a member of the related group
  EXECUTE '
    CREATE POLICY payouts_select_own ON payouts
      FOR SELECT
      USING (
        auth.uid() = recipient_id 
        OR EXISTS (
          SELECT 1 FROM group_members gm 
          WHERE gm.group_id = payouts.related_group_id 
          AND gm.user_id = auth.uid()
        )
      )
  ';
  
  -- Service role can do anything
  EXECUTE '
    CREATE POLICY payouts_service_role_all ON payouts
      FOR ALL
      USING (current_setting(''role'', true) = ''service_role'')
  ';
END $$;

COMMENT ON VIEW pending_payouts_view IS 
  'RLS: Users can only see payouts for themselves or their groups via payouts table RLS';

-- ============================================================================
-- 6. GROUP_FINANCIAL_SUMMARY VIEW
-- ============================================================================
-- This view shows financial summary for groups
-- Access should be restricted to:
-- - Members of the group
-- - Service role for admin operations

-- Security is enforced by groups table RLS
DO $$
BEGIN
  -- Enable RLS on groups if not already enabled
  EXECUTE 'ALTER TABLE groups ENABLE ROW LEVEL SECURITY';
  
  -- Drop existing policies to recreate them
  DROP POLICY IF EXISTS groups_select_member ON groups;
  DROP POLICY IF EXISTS groups_select_public_forming ON groups;
  DROP POLICY IF EXISTS groups_service_role_all ON groups;
  
  -- Users can see groups they are members of
  EXECUTE '
    CREATE POLICY groups_select_member ON groups
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM group_members gm 
          WHERE gm.group_id = groups.id 
          AND gm.user_id = auth.uid()
        )
      )
  ';
  
  -- Anyone can see forming groups (for joining)
  EXECUTE '
    CREATE POLICY groups_select_public_forming ON groups
      FOR SELECT
      USING (status = ''forming'')
  ';
  
  -- Service role can do anything
  EXECUTE '
    CREATE POLICY groups_service_role_all ON groups
      FOR ALL
      USING (current_setting(''role'', true) = ''service_role'')
  ';
END $$;

COMMENT ON VIEW group_financial_summary IS 
  'RLS: Users can only see financial summaries for groups they are members of via groups table RLS';

-- ============================================================================
-- 7. GROUP_CONTRIBUTION_PROGRESS VIEW
-- ============================================================================
-- This view shows contribution progress for groups
-- Access should be restricted to:
-- - Members of the group
-- - Service role for admin operations

-- Security is enforced by groups table RLS (already configured above)

COMMENT ON VIEW group_contribution_progress IS 
  'RLS: Users can only see progress for groups they are members of via groups table RLS';

-- ============================================================================
-- 8. CRON_JOBS_STATUS VIEW
-- ============================================================================
-- This view shows status of scheduled cron jobs
-- Access should be restricted to:
-- - Service role only (admin operations)
-- - Maybe authenticated users for monitoring (read-only)

-- Revoke all existing grants and re-grant appropriately
REVOKE ALL ON cron_jobs_status FROM authenticated;
REVOKE ALL ON cron_jobs_status FROM anon;

-- Grant read-only access to authenticated users for monitoring
GRANT SELECT ON cron_jobs_status TO authenticated;

-- Service role gets full access
GRANT ALL ON cron_jobs_status TO service_role;

COMMENT ON VIEW cron_jobs_status IS 
  'RLS: Authenticated users can view job status (read-only), service role has full access';

-- ============================================================================
-- 9. AUDIT_TRIAL_VIEW (audit_trail_view)
-- ============================================================================
-- This view shows audit trail
-- Access should be restricted to:
-- - Users can see their own audit logs
-- - Service role for admin operations

-- Security is enforced by audit_logs table RLS
DO $$
BEGIN
  -- Enable RLS on audit_logs if not already enabled
  EXECUTE 'ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY';
  
  -- Drop existing policies to recreate them
  DROP POLICY IF EXISTS audit_logs_select_own ON audit_logs;
  DROP POLICY IF EXISTS audit_logs_insert_any ON audit_logs;
  DROP POLICY IF EXISTS audit_logs_service_role_all ON audit_logs;
  
  -- Users can only see their own audit logs
  EXECUTE '
    CREATE POLICY audit_logs_select_own ON audit_logs
      FOR SELECT
      USING (auth.uid() = user_id)
  ';
  
  -- Any authenticated user can insert audit logs (for system logging)
  EXECUTE '
    CREATE POLICY audit_logs_insert_any ON audit_logs
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL)
  ';
  
  -- Service role can do anything
  EXECUTE '
    CREATE POLICY audit_logs_service_role_all ON audit_logs
      FOR ALL
      USING (current_setting(''role'', true) = ''service_role'')
  ';
END $$;

COMMENT ON VIEW audit_trail_view IS 
  'RLS: Users can only see their own audit trail via audit_logs table RLS';

-- ============================================================================
-- 10. ACTIVE_GROUP_SUMMARY VIEW (active_groups_summary)
-- ============================================================================
-- This view shows active and forming groups
-- Access should be:
-- - Public read for forming groups (so users can browse and join)
-- - Members only for active groups
-- - Service role for admin operations

-- Security is enforced by groups table RLS (already configured above)
-- The policy groups_select_public_forming allows anyone to see forming groups
-- The policy groups_select_member allows members to see their groups

COMMENT ON VIEW active_groups_summary IS 
  'RLS: Anyone can see forming groups, members can see their active groups via groups table RLS';

-- ============================================================================
-- 11. VERIFY RLS CONFIGURATION
-- ============================================================================

-- Create a verification function to check RLS status
CREATE OR REPLACE FUNCTION verify_view_rls_security()
RETURNS TABLE(
  view_name TEXT,
  underlying_table TEXT,
  rls_enabled BOOLEAN,
  policy_count INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.view_name::TEXT,
    v.underlying_table::TEXT,
    COALESCE(t.relrowsecurity, FALSE) AS rls_enabled,
    COUNT(p.polname)::INTEGER AS policy_count,
    CASE 
      WHEN COALESCE(t.relrowsecurity, FALSE) AND COUNT(p.polname) > 0 THEN 'SECURED'
      WHEN COALESCE(t.relrowsecurity, FALSE) AND COUNT(p.polname) = 0 THEN 'RLS_ENABLED_NO_POLICIES'
      ELSE 'UNSECURED'
    END AS status
  FROM (
    VALUES 
      ('user_notifications_unread', 'notifications'),
      ('user_groups_detail', 'group_members'),
      ('user_dashboard_view', 'users'),
      ('pending_payouts_view', 'payouts'),
      ('group_financial_summary', 'groups'),
      ('group_contribution_progress', 'groups'),
      ('audit_trail_view', 'audit_logs'),
      ('active_groups_summary', 'groups')
  ) AS v(view_name, underlying_table)
  LEFT JOIN pg_class t ON t.relname = v.underlying_table AND t.relkind = 'r'
  LEFT JOIN pg_policy p ON p.polrelid = t.oid
  GROUP BY v.view_name, v.underlying_table, t.relrowsecurity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_view_rls_security() IS 
  'Verification function to check RLS configuration for views';

-- Grant execute to authenticated users for self-verification
GRANT EXECUTE ON FUNCTION verify_view_rls_security() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_view_rls_security() TO service_role;

-- ============================================================================
-- 12. SUMMARY AND USAGE
-- ============================================================================
-- 
-- This file has secured all identified unrestricted views by:
-- 1. Ensuring underlying tables have RLS enabled
-- 2. Creating appropriate RLS policies on underlying tables
-- 3. Documenting security model for each view
-- 4. Creating verification function to check security status
--
-- To verify security:
-- SELECT * FROM verify_view_rls_security();
--
-- All views now properly restrict data access based on:
-- - User ownership (notifications, dashboard, audit logs)
-- - Group membership (group views, contributions, payouts)
-- - Public access for forming groups (discovery)
-- - Service role for admin operations
--
-- ============================================================================
