-- ============================================================================
-- MIGRATION: Fix user profile creation on signup
-- Date: 2026-01-08
-- Description: Provides client-side user profile creation function
--              Note: Cannot create trigger on auth.users in Supabase (permission denied)
--              Solution: Use client-side profile creation with RLS policy
-- ============================================================================

-- ============================================================================
-- IMPORTANT: Supabase Limitation
-- ============================================================================
-- In Supabase, you CANNOT create triggers on auth.users because:
-- 1. auth.users is owned by supabase_auth_admin role
-- 2. Your database role doesn't have permission to modify it
-- 
-- Solutions:
-- 1. Client-side profile creation (FREE TIER - implemented in this project)
-- 2. Database Webhooks (REQUIRES PRO TIER)
-- 3. Auth Hooks via Edge Functions (REQUIRES PRO TIER)
--
-- This migration implements Solution #1
-- ============================================================================

-- ============================================================================
-- STEP 1: Create helper function for manual profile creation
-- ============================================================================
-- This function can be called from client-side or RPC
-- Runs with SECURITY DEFINER to bypass RLS during user creation
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_email VARCHAR(255),
  p_phone VARCHAR(20),
  p_full_name VARCHAR(255)
)
RETURNS UUID AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    phone,
    full_name,
    is_verified,
    is_active,
    kyc_status
  ) VALUES (
    p_user_id,
    p_email,
    p_phone,
    p_full_name,
    FALSE,
    TRUE,
    'not_started'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_user_profile IS 
  'Creates a user profile in public.users. Called from client-side during signup.
   Note: Cannot use trigger on auth.users in Supabase due to permission restrictions.';

-- ============================================================================
-- STEP 2: Ensure RLS policy for user self-registration exists
-- ============================================================================
-- PRIMARY mechanism: Allow users to insert their own records during signup
-- This is essential since we cannot use triggers on auth.users
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS users_insert_own ON users;

-- Create INSERT policy for self-registration
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY users_insert_own ON users IS 
  'Allows users to insert their own profile during registration. This is the primary
   mechanism for profile creation since triggers on auth.users are not possible in Supabase.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration was successful
-- ============================================================================

-- Verify helper function exists
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
WHERE p.proname = 'create_user_profile';

-- Verify RLS policy exists
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
WHERE tablename = 'users' AND policyname = 'users_insert_own';

-- Test profile creation (replace with actual values)
-- SELECT create_user_profile(
--   'test-uuid'::uuid,
--   'test@example.com',
--   '+1234567890',
--   'Test User'
-- );

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- Uncomment and run these commands to rollback this migration
-- ============================================================================

-- DROP FUNCTION IF EXISTS create_user_profile(UUID, VARCHAR, VARCHAR, VARCHAR);
-- DROP POLICY IF EXISTS users_insert_own ON users;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
