-- ============================================================================
-- FIX RLS POLICIES FOR SECURED-AJO
-- ============================================================================
-- This file ensures all tables have proper RLS policies configured
-- Run this after the main schema.sql to fix any missing or incorrect policies
-- Date: 2026-01-08
-- ============================================================================

-- ============================================================================
-- ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIX USERS TABLE POLICIES
-- ============================================================================

-- Drop all existing policies and recreate them correctly
DROP POLICY IF EXISTS users_select_own ON users;
DROP POLICY IF EXISTS users_update_own ON users;
DROP POLICY IF EXISTS users_insert_own ON users;
DROP POLICY IF EXISTS users_service_role_all ON users;

-- Users can view their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile during signup (CRITICAL for free tier)
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role can do anything (for admin operations)
-- Note: Using current_setting for cleaner service role check
CREATE POLICY users_service_role_all ON users
  FOR ALL
  USING (
    CASE 
      WHEN current_setting('role', true) = 'service_role' THEN true
      ELSE false
    END
  );

-- ============================================================================
-- FIX EMAIL VERIFICATION TOKENS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS email_verification_tokens_select_own ON email_verification_tokens;
DROP POLICY IF EXISTS email_verification_tokens_insert_own ON email_verification_tokens;
DROP POLICY IF EXISTS email_verification_tokens_update_own ON email_verification_tokens;
DROP POLICY IF EXISTS email_verification_tokens_service_role_all ON email_verification_tokens;

-- Users can view their own tokens
CREATE POLICY email_verification_tokens_select_own ON email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own tokens
CREATE POLICY email_verification_tokens_insert_own ON email_verification_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens (mark as used)
CREATE POLICY email_verification_tokens_update_own ON email_verification_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can do anything
-- Note: Using current_setting for cleaner service role check
CREATE POLICY email_verification_tokens_service_role_all ON email_verification_tokens
  FOR ALL
  USING (
    CASE 
      WHEN current_setting('role', true) = 'service_role' THEN true
      ELSE false
    END
  );

-- ============================================================================
-- FIX GROUPS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS groups_select_public ON groups;
DROP POLICY IF EXISTS groups_insert_authenticated ON groups;
DROP POLICY IF EXISTS groups_update_creator ON groups;
DROP POLICY IF EXISTS groups_service_role_all ON groups;

-- Anyone authenticated can view active/forming groups (for browsing)
CREATE POLICY groups_select_public ON groups
  FOR SELECT
  USING (
    status IN ('forming', 'active') OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
    )
  );

-- Authenticated users can create groups
CREATE POLICY groups_insert_authenticated ON groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by AND auth.uid() IS NOT NULL);

-- Group creators and members can update their groups
CREATE POLICY groups_update_creator ON groups
  FOR UPDATE
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.is_creator = true
    )
  );

-- Service role can do anything
CREATE POLICY groups_service_role_all ON groups
  FOR ALL
  USING (
    CASE 
      WHEN current_setting('role', true) = 'service_role' THEN true
      ELSE false
    END
  );

-- ============================================================================
-- FIX GROUP MEMBERS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS group_members_select_own_groups ON group_members;
DROP POLICY IF EXISTS group_members_insert_own ON group_members;
DROP POLICY IF EXISTS group_members_update_own ON group_members;
DROP POLICY IF EXISTS group_members_service_role_all ON group_members;

-- Users can view members of groups they're in
CREATE POLICY group_members_select_own_groups ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
        AND gm.user_id = auth.uid()
    )
  );

-- Users can join groups (insert their own membership)
CREATE POLICY group_members_insert_own ON group_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own membership
CREATE POLICY group_members_update_own ON group_members
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY group_members_service_role_all ON group_members
  FOR ALL
  USING (
    CASE 
      WHEN current_setting('role', true) = 'service_role' THEN true
      ELSE false
    END
  );

-- ============================================================================
-- FIX CONTRIBUTIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS contributions_select_own_groups ON contributions;
DROP POLICY IF EXISTS contributions_insert_own ON contributions;
DROP POLICY IF EXISTS contributions_update_own ON contributions;
DROP POLICY IF EXISTS contributions_service_role_all ON contributions;

-- Users can view contributions for groups they're in
CREATE POLICY contributions_select_own_groups ON contributions
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = contributions.group_id 
        AND gm.user_id = auth.uid()
    )
  );

-- Users can create their own contributions
CREATE POLICY contributions_insert_own ON contributions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own contributions (e.g., mark as paid)
CREATE POLICY contributions_update_own ON contributions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY contributions_service_role_all ON contributions
  FOR ALL
  USING (
    CASE 
      WHEN current_setting('role', true) = 'service_role' THEN true
      ELSE false
    END
  );

-- ============================================================================
-- FIX PAYOUTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS payouts_select_own_groups ON payouts;
DROP POLICY IF EXISTS payouts_select_own ON payouts;
DROP POLICY IF EXISTS payouts_service_role_all ON payouts;

-- Users can view payouts for groups they're in
CREATE POLICY payouts_select_own_groups ON payouts
  FOR SELECT
  USING (
    auth.uid() = recipient_id OR
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = payouts.related_group_id 
        AND gm.user_id = auth.uid()
    )
  );

-- Service role can do anything
CREATE POLICY payouts_service_role_all ON payouts
  FOR ALL
  USING (
    CASE 
      WHEN current_setting('role', true) = 'service_role' THEN true
      ELSE false
    END
  );

-- ============================================================================
-- FIX PENALTIES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS penalties_select_own ON penalties;
DROP POLICY IF EXISTS penalties_service_role_all ON penalties;

-- Users can view their own penalties or penalties in their groups
CREATE POLICY penalties_select_own ON penalties
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = penalties.group_id 
        AND gm.user_id = auth.uid()
    )
  );

-- Service role can do anything
CREATE POLICY penalties_service_role_all ON penalties
  FOR ALL
  USING (
    CASE 
      WHEN current_setting('role', true) = 'service_role' THEN true
      ELSE false
    END
  );

-- ============================================================================
-- FIX TRANSACTIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS transactions_select_own ON transactions;
DROP POLICY IF EXISTS transactions_insert_own ON transactions;
DROP POLICY IF EXISTS transactions_service_role_all ON transactions;

-- Users can view their own transactions
CREATE POLICY transactions_select_own ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own transactions
CREATE POLICY transactions_insert_own ON transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY transactions_service_role_all ON transactions
  FOR ALL
  USING (
    CASE 
      WHEN current_setting('role', true) = 'service_role' THEN true
      ELSE false
    END
  );

-- ============================================================================
-- FIX NOTIFICATIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS notifications_select_own ON notifications;
DROP POLICY IF EXISTS notifications_update_own ON notifications;
DROP POLICY IF EXISTS notifications_insert_own ON notifications;
DROP POLICY IF EXISTS notifications_service_role_all ON notifications;

-- Users can view their own notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can create their own notifications
CREATE POLICY notifications_insert_own ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY notifications_service_role_all ON notifications
  FOR ALL
  USING (
    CASE 
      WHEN current_setting('role', true) = 'service_role' THEN true
      ELSE false
    END
  );

-- ============================================================================
-- FIX AUDIT LOGS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS audit_logs_service_role_all ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_own ON audit_logs;

-- Users can insert their own audit logs
CREATE POLICY audit_logs_insert_own ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only service role can read/update/delete audit logs
CREATE POLICY audit_logs_service_role_all ON audit_logs
  FOR ALL
  USING (
    CASE 
      WHEN current_setting('role', true) = 'service_role' THEN true
      ELSE false
    END
  );

-- ============================================================================
-- FIX USER PRESENCE TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS user_presence_select_group_members ON user_presence;
DROP POLICY IF EXISTS user_presence_update_own ON user_presence;
DROP POLICY IF EXISTS user_presence_insert_own ON user_presence;
DROP POLICY IF EXISTS user_presence_delete_own ON user_presence;

-- Users can view presence of members in their groups
CREATE POLICY user_presence_select_group_members ON user_presence
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM group_members gm1
      WHERE gm1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM group_members gm2
        WHERE gm2.user_id = user_presence.user_id
        AND gm2.group_id = gm1.group_id
      )
    )
  );

-- Users can insert their own presence
CREATE POLICY user_presence_insert_own ON user_presence
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own presence
CREATE POLICY user_presence_update_own ON user_presence
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own presence
CREATE POLICY user_presence_delete_own ON user_presence
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify policies are correctly set up
-- ============================================================================

-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'users', 'email_verification_tokens', 'groups', 'group_members',
    'contributions', 'payouts', 'penalties', 'transactions',
    'notifications', 'audit_logs', 'user_presence'
  )
ORDER BY tablename;

-- Check all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- END OF RLS POLICY FIXES
-- ============================================================================
