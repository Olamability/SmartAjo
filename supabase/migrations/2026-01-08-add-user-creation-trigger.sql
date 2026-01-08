-- ============================================================================
-- MIGRATION: Add automatic user profile creation on signup
-- Date: 2026-01-08
-- Description: Fixes registration issue by automatically creating user records
--              in public.users when a user signs up in auth.users
-- ============================================================================

-- ============================================================================
-- STEP 1: Create trigger function to auto-create user profiles
-- ============================================================================
-- This function runs with SECURITY DEFINER to bypass RLS during user creation
-- It extracts user metadata from auth.users and creates a corresponding record
-- in public.users table
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    FALSE,
    TRUE,
    'not_started'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 
  'Automatically creates a user profile in public.users when a user signs up in auth.users';

-- ============================================================================
-- STEP 2: Create trigger on auth.users table
-- ============================================================================
-- This trigger fires after a new user is inserted into auth.users
-- and automatically creates the corresponding record in public.users
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
  'Triggers automatic user profile creation on signup';

-- ============================================================================
-- STEP 3: Add RLS policy for user self-registration
-- ============================================================================
-- As a backup mechanism, allow users to insert their own records
-- This ensures registration works even if the trigger has a delay
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS users_insert_own ON users;

-- Create INSERT policy for self-registration
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY users_insert_own ON users IS 
  'Allows users to insert their own profile during registration as a backup to the trigger';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration was successful
-- ============================================================================

-- Verify trigger function exists
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
WHERE p.proname = 'handle_new_user';

-- Verify trigger exists on auth.users
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

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

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- Uncomment and run these commands to rollback this migration
-- ============================================================================

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS handle_new_user();
-- DROP POLICY IF EXISTS users_insert_own ON users;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
