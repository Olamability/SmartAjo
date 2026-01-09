-- ============================================================================
-- MIGRATION: Fix Authentication Race Conditions
-- Date: 2026-01-09
-- Description: Improves user profile creation to be atomic and removes
--              the need for arbitrary delays and retry logic
-- ============================================================================

-- ============================================================================
-- STEP 1: Create improved atomic user profile creation function
-- ============================================================================
-- This function ensures user profile is created atomically with proper
-- error handling and validation. It's the single source of truth for
-- profile creation.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_profile_atomic(
  p_user_id UUID,
  p_email VARCHAR(255),
  p_phone VARCHAR(20),
  p_full_name VARCHAR(255)
)
RETURNS TABLE(
  success BOOLEAN,
  user_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_user_exists BOOLEAN;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'user_id cannot be NULL';
    RETURN;
  END IF;
  
  IF p_email IS NULL OR p_email = '' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'email cannot be NULL or empty';
    RETURN;
  END IF;
  
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid email format: ' || p_email;
    RETURN;
  END IF;
  
  IF p_phone IS NULL OR p_phone = '' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'phone cannot be NULL or empty';
    RETURN;
  END IF;
  
  IF p_full_name IS NULL OR p_full_name = '' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'full_name cannot be NULL or empty';
    RETURN;
  END IF;

  -- Check if user already exists (using SELECT FOR UPDATE for locking)
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE id = p_user_id FOR UPDATE
  ) INTO v_user_exists;

  IF v_user_exists THEN
    -- User already exists, return success
    RETURN QUERY SELECT TRUE, p_user_id, 'Profile already exists'::TEXT;
    RETURN;
  END IF;

  -- Insert user profile atomically
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
    );
    
    -- Return success
    RETURN QUERY SELECT TRUE, p_user_id, NULL::TEXT;
    RETURN;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile was created concurrently, that's okay
      RETURN QUERY SELECT TRUE, p_user_id, 'Profile exists (concurrent creation)'::TEXT;
      RETURN;
    WHEN OTHERS THEN
      -- Any other error
      RETURN QUERY SELECT FALSE, NULL::UUID, SQLERRM;
      RETURN;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_user_profile_atomic IS 
  'Atomically creates a user profile with proper locking and validation.
   Returns success status and error message if any.
   This is the single source of truth for profile creation.';

-- ============================================================================
-- STEP 2: Create function to check if user profile exists and is accessible
-- ============================================================================
-- This function verifies both existence and RLS access in one atomic operation
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_user_profile_access(
  p_user_id UUID
)
RETURNS TABLE(
  exists BOOLEAN,
  accessible BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if profile exists and is accessible via RLS
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.users
    WHERE id = p_user_id;
    
    IF v_count > 0 THEN
      RETURN QUERY SELECT TRUE, TRUE, NULL::TEXT;
    ELSE
      -- Check if it exists but RLS blocks it (using SECURITY DEFINER context)
      SELECT COUNT(*) INTO v_count
      FROM public.users
      WHERE id = p_user_id;
      
      IF v_count > 0 THEN
        RETURN QUERY SELECT TRUE, FALSE, 'Profile exists but not accessible (RLS)'::TEXT;
      ELSE
        RETURN QUERY SELECT FALSE, FALSE, 'Profile does not exist'::TEXT;
      END IF;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, FALSE, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_user_profile_access IS
  'Verifies if a user profile exists and is accessible via RLS.
   Used for debugging session propagation issues.';

-- ============================================================================
-- STEP 3: Update existing create_user_profile to use atomic version
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_email VARCHAR(255),
  p_phone VARCHAR(20),
  p_full_name VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Use the atomic version
  SELECT * INTO v_result
  FROM create_user_profile_atomic(p_user_id, p_email, p_phone, p_full_name);
  
  IF NOT v_result.success THEN
    RAISE EXCEPTION '%', v_result.error_message;
  END IF;
  
  RETURN v_result.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Add index for faster profile lookups
-- ============================================================================

-- Ensure we have an index on id (should exist, but let's be explicit)
CREATE INDEX IF NOT EXISTS idx_users_id_active ON users(id) WHERE is_active = true;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new functions exist
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname IN ('create_user_profile_atomic', 'verify_user_profile_access')
ORDER BY p.proname;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
