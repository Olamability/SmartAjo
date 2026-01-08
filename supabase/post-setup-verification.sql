-- ============================================================================
-- POST-SETUP VERIFICATION AND FIXES
-- ============================================================================
-- Run this file AFTER running schema.sql and fix-rls-policies.sql
-- This ensures everything is correctly configured
-- Date: 2026-01-08
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify Extensions
-- ============================================================================
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- ============================================================================
-- STEP 2: Verify All Tables Exist
-- ============================================================================
SELECT 
  tablename,
  tableowner,
  tablespace
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'email_verification_tokens',
    'groups',
    'group_members',
    'contributions',
    'payouts',
    'penalties',
    'transactions',
    'notifications',
    'audit_logs',
    'user_presence'
  )
ORDER BY tablename;

-- ============================================================================
-- STEP 3: Verify RLS is Enabled
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'email_verification_tokens',
    'groups',
    'group_members',
    'contributions',
    'payouts',
    'penalties',
    'transactions',
    'notifications',
    'audit_logs',
    'user_presence'
  )
ORDER BY tablename;

-- ============================================================================
-- STEP 4: Count RLS Policies Per Table
-- ============================================================================
SELECT 
  tablename,
  COUNT(*) as policy_count,
  array_agg(policyname ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- STEP 5: Verify Critical Policies Exist
-- ============================================================================
-- Check users table has all required policies
SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Expected policies for users:
-- - users_select_own (SELECT)
-- - users_insert_own (INSERT) ← CRITICAL for signup
-- - users_update_own (UPDATE)
-- - users_service_role_all (ALL)

-- ============================================================================
-- STEP 6: Verify Helper Functions Exist
-- ============================================================================
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_user_profile',
    'update_updated_at_column',
    'get_user_stats',
    'get_group_progress',
    'is_cycle_complete',
    'calculate_payout_amount',
    'generate_payment_reference'
  )
ORDER BY p.proname;

-- ============================================================================
-- STEP 7: Verify Triggers Exist (excluding auth.users)
-- ============================================================================
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    WHEN 'R' THEN 'Replica'
    WHEN 'A' THEN 'Always'
  END as status,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid::regclass::text LIKE 'public.%'
  AND tgname NOT LIKE 'pg_%'
  AND tgname NOT LIKE 'RI_%'
ORDER BY table_name, trigger_name;

-- ============================================================================
-- STEP 8: Test RLS Policies (as authenticated user)
-- ============================================================================
-- These queries should return 0 rows when run without authentication
-- But should work when authenticated

-- Test: Can authenticated users see their own data?
-- Run this after logging in to test:
-- SELECT * FROM users WHERE id = auth.uid();

-- Test: Can users insert their own profile?
-- This is CRITICAL - if this policy doesn't exist, signup will fail

SELECT 
  policyname,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
  AND policyname = 'users_insert_own';

-- ============================================================================
-- STEP 9: Check for Common Issues
-- ============================================================================

-- Issue 1: Check if there are orphaned auth users without profiles
-- (This query requires service role access)
-- SELECT COUNT(*) as orphaned_users
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id
-- WHERE pu.id IS NULL;

-- Issue 2: Check if RLS is blocking legitimate access
-- Run as authenticated user:
-- SET ROLE authenticated;
-- SELECT COUNT(*) FROM users; -- Should see own user
-- RESET ROLE;

-- Issue 3: Check for missing indexes on foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  EXISTS (
    SELECT 1
    FROM pg_indexes pi
    WHERE pi.tablename = tc.table_name
      AND pi.indexdef LIKE '%' || kcu.column_name || '%'
  ) as has_index
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- STEP 10: Final Summary
-- ============================================================================
SELECT 
  'Tables' as item,
  COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'email_verification_tokens', 'groups', 'group_members',
    'contributions', 'payouts', 'penalties', 'transactions',
    'notifications', 'audit_logs', 'user_presence'
  )
UNION ALL
SELECT 
  'RLS Policies' as item,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Functions' as item,
  COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
UNION ALL
SELECT 
  'Triggers' as item,
  COUNT(*) as count
FROM pg_trigger
WHERE tgrelid::regclass::text LIKE 'public.%'
  AND tgname NOT LIKE 'pg_%'
  AND tgname NOT LIKE 'RI_%';

-- ============================================================================
-- EXPECTED RESULTS SUMMARY
-- ============================================================================
-- Tables: 11 (users, email_verification_tokens, groups, group_members,
--             contributions, payouts, penalties, transactions,
--             notifications, audit_logs, user_presence)
-- 
-- RLS Policies: Should have at least 30+ policies (4-5 per table minimum)
-- 
-- Critical Policies:
-- - users_insert_own: MUST exist for signup to work
-- - users_select_own: MUST exist for profile loading
-- - All tables should have service_role_all policy
--
-- Functions: Should include:
-- - create_user_profile (for manual profile creation)
-- - update_updated_at_column (for timestamps)
-- - get_user_stats (for dashboard)
-- - Other business logic functions
--
-- Triggers: Should include:
-- - update_*_updated_at for all main tables
-- - Various business logic triggers
-- - NO trigger on auth.users (not allowed in Supabase)
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING GUIDE
-- ============================================================================
-- 
-- Issue: Login gets stuck / Dashboard shows no data
-- Check:
-- 1. Run: SELECT * FROM pg_policies WHERE tablename = 'users';
--    - Ensure users_select_own exists
--    - Ensure users_insert_own exists
-- 2. Run: SELECT rowsecurity FROM pg_tables WHERE tablename = 'users';
--    - Should return 't' (true)
-- 3. Check browser console for RLS policy errors
--
-- Issue: Signup fails / User profile not created
-- Check:
-- 1. Verify users_insert_own policy exists
-- 2. Check if user record was created in auth.users but not in public.users
-- 3. Review application logs for INSERT errors
--
-- Issue: "ERROR: 42501: must be owner of relation users"
-- This means:
-- 1. You tried to create a trigger on auth.users (not allowed)
-- 2. Solution: Remove trigger, use client-side profile creation
-- 3. This is fixed in the updated schema.sql
--
-- ============================================================================
-- END OF VERIFICATION
-- ============================================================================
