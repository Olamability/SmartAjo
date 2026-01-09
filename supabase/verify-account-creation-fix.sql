-- ============================================================================
-- VERIFICATION SCRIPT: Check RPC Function Permissions
-- ============================================================================
-- This script verifies that the necessary GRANT permissions are in place
-- for the account creation RPC functions.
--
-- Run this in Supabase SQL Editor to verify the fix is deployed correctly.
-- ============================================================================

-- Check if functions exist
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('create_user_profile_atomic', 'verify_user_profile_access', 'create_user_profile')
  AND n.nspname = 'public'
ORDER BY p.proname;

-- Expected output: Should show all 3 functions with is_security_definer = true

-- ============================================================================
-- Check function permissions (grants)
-- ============================================================================

SELECT 
  p.proname as function_name,
  CASE 
    WHEN p.proacl IS NULL THEN ARRAY['PUBLIC']::text[]
    ELSE ARRAY(
      SELECT pr.rolname 
      FROM pg_roles pr 
      WHERE pr.oid = ANY(
        SELECT (aclexplode(p.proacl)).grantee
      )
    )
  END as granted_to_roles
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('create_user_profile_atomic', 'verify_user_profile_access', 'create_user_profile')
  AND n.nspname = 'public'
ORDER BY p.proname;

-- Expected output: Should show 'anon' and 'authenticated' in granted_to_roles for each function

-- ============================================================================
-- Test profile creation (as anon user)
-- ============================================================================
-- This simulates what happens during signup with email confirmation

-- Generate a test user ID (you can replace with a real auth user ID)
SELECT 
  create_user_profile_atomic(
    gen_random_uuid(),  -- Test user ID
    'test-verification@example.com',
    '+1234567890',
    'Test User'
  ) as test_result;

-- Expected output: Should return success = true
-- Note: This creates a test record - you may want to delete it after verification

-- Clean up test record (optional)
-- DELETE FROM public.users WHERE email = 'test-verification@example.com';

-- ============================================================================
-- Summary Report
-- ============================================================================

SELECT 
  'Account Creation Fix' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'create_user_profile_atomic'
        AND n.nspname = 'public'
        AND p.prosecdef = true
    ) THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as function_exists,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'create_user_profile_atomic'
        AND n.nspname = 'public'
        AND (
          p.proacl IS NULL 
          OR 'anon' = ANY(
            SELECT pr.rolname 
            FROM pg_roles pr 
            WHERE pr.oid = ANY(
              SELECT (aclexplode(p.proacl)).grantee
            )
          )
        )
    ) THEN '✓ PASS'
    ELSE '✗ FAIL - RUN GRANTS!'
  END as anon_can_execute,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'create_user_profile_atomic'
        AND n.nspname = 'public'
        AND (
          p.proacl IS NULL 
          OR 'authenticated' = ANY(
            SELECT pr.rolname 
            FROM pg_roles pr 
            WHERE pr.oid = ANY(
              SELECT (aclexplode(p.proacl)).grantee
            )
          )
        )
    ) THEN '✓ PASS'
    ELSE '✗ FAIL - RUN GRANTS!'
  END as authenticated_can_execute;

-- If you see any FAIL messages, run the GRANT statements below:

-- ============================================================================
-- QUICK FIX: Apply Missing Grants
-- ============================================================================
-- Run these if the verification shows FAIL for any permission checks
-- ============================================================================

-- Uncomment and run these if needed:

/*
GRANT EXECUTE ON FUNCTION create_user_profile_atomic TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_user_profile_access TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile TO anon, authenticated;

-- Verify after running:
SELECT 'Grants applied successfully!' as status;
*/

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================
