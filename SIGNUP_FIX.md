# User Registration Stuck Issue - Fix Documentation

## Problem Description

When users tried to register/create an account:
1. ✅ Confirmation email was sent and received
2. ❌ Create account page remained stuck with "Creating account..." spinner
3. ✅ User details were created in `auth.users` table
4. ❌ User details were NOT created in `public.users` table

## Root Cause

The issue was in the signup flow order in `AuthContext.tsx`:

### Before (Incorrect Flow)
```typescript
// 1. Sign up user with Supabase Auth
const { data, error } = await supabase.auth.signUp({...});

// 2. Try to create profile in public.users using RPC
await supabase.rpc('create_user_profile', {...});  // ❌ This was called even when email confirmation is required

// 3. Check if email confirmation is required
if (needsEmailConfirmation) {
  throw new Error('CONFIRMATION_REQUIRED:...');
}
```

**Problem**: When email confirmation is required, there's no active session yet, but the code was still trying to create the profile. This could cause:
- RPC call to hang or fail silently
- Loading spinner to never stop
- User to be stuck on the signup page

### After (Correct Flow)
```typescript
// 1. Sign up user with Supabase Auth
const { data, error } = await supabase.auth.signUp({...});

// 2. Check if email confirmation is required FIRST
if (needsEmailConfirmation) {
  throw new Error('CONFIRMATION_REQUIRED:...');  // ✅ Exit immediately, don't try to create profile
}

// 3. Only create profile if we have an active session
await supabase.rpc('create_user_profile', {...});  // ✅ Only called when session exists
```

## How It Works Now

### Scenario 1: Email Confirmation Required (Most Common)

1. **User submits signup form**
   - `AuthContext.signUp()` is called
   - User created in `auth.users` ✓
   - No session created yet (email confirmation pending)

2. **Check email confirmation requirement**
   - Code detects `needsEmailConfirmation = true`
   - Throws `CONFIRMATION_REQUIRED` error immediately
   - Profile creation is skipped (will happen later)

3. **SignupPage catches error**
   - Shows success message: "Account created! Please check your email..."
   - Redirects user to login page after 2 seconds

4. **User clicks confirmation link in email**
   - Email is verified
   - User is redirected to app
   - `SIGNED_IN` event fires in AuthContext

5. **Profile is created automatically**
   - `onAuthStateChange` event handler catches `SIGNED_IN`
   - Tries to load profile → Fails (doesn't exist yet)
   - Calls `ensureUserProfile()` which creates profile using RPC
   - Loads profile successfully
   - User is now fully set up ✓

### Scenario 2: No Email Confirmation Required

1. **User submits signup form**
   - `AuthContext.signUp()` is called
   - User created in `auth.users` ✓
   - Session created immediately (no confirmation needed)

2. **Check email confirmation requirement**
   - Code detects `needsEmailConfirmation = false`
   - Continues to create profile immediately

3. **Profile is created**
   - RPC call `create_user_profile` executes
   - Profile created in `public.users` ✓
   - Profile loaded successfully
   - User redirected to dashboard ✓

## Fallback Mechanisms

The code has multiple fallback mechanisms to ensure profile creation:

### 1. Auth State Change Handler (`SIGNED_IN` event)
```typescript
if (event === 'SIGNED_IN' && session?.user) {
  try {
    await loadUserProfile(session.user.id);
  } catch (error) {
    // Profile doesn't exist, create it
    await ensureUserProfile(supabase, session.user);
    await loadUserProfile(session.user.id);
  }
}
```

### 2. Login Function
```typescript
try {
  await loadUserProfile(data.user.id);
} catch (profileError) {
  // Profile doesn't exist, create it
  await ensureUserProfile(supabase, data.user);
  await loadUserProfile(data.user.id);
}
```

### 3. Token Refresh Handler
```typescript
if (event === 'TOKEN_REFRESHED' && session?.user) {
  try {
    await loadUserProfile(session.user.id);
  } catch (error) {
    console.error('Error loading profile on token refresh:', error);
  }
}
```

## Files Modified

- **`src/contexts/AuthContext.tsx`**: Reordered signup flow to check email confirmation before profile creation

## Testing Checklist

- [ ] Sign up with email confirmation required
  - [ ] Verify "Creating account..." spinner stops
  - [ ] Verify success message is shown
  - [ ] Verify redirect to login page
  - [ ] Verify entry created in `auth.users` table
  - [ ] Verify NO entry in `public.users` table yet

- [ ] Confirm email and login
  - [ ] Click confirmation link in email
  - [ ] Verify redirect to app
  - [ ] Verify entry created in `public.users` table
  - [ ] Verify successful login and redirect to dashboard
  - [ ] Verify user profile loads correctly

- [ ] Sign up without email confirmation (if applicable)
  - [ ] Verify immediate profile creation
  - [ ] Verify redirect to dashboard
  - [ ] Verify entries in both `auth.users` and `public.users`

## Database Setup Verification

Ensure the following SQL has been run in your Supabase SQL Editor:

1. **Core Schema**: `supabase/schema.sql`
   - Creates `users` table with proper structure
   - Creates RLS policies including `users_insert_own` policy

2. **Migration**: `supabase/migrations/2026-01-08-add-user-creation-trigger.sql`
   - Creates `create_user_profile()` RPC function with `SECURITY DEFINER`
   - This function bypasses RLS and handles profile creation

## Verification Queries

Run these queries in Supabase SQL Editor to verify setup:

```sql
-- 1. Check if create_user_profile function exists
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'create_user_profile';

-- 2. Check if users table has correct RLS policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'users';

-- 3. After signup, verify user in auth.users
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'your-test-email@example.com';

-- 4. After confirmation and login, verify user in public.users
SELECT id, email, full_name, phone, created_at
FROM public.users
WHERE email = 'your-test-email@example.com';
```

## Additional Notes

- The `create_user_profile()` function uses `SECURITY DEFINER` to bypass RLS policies
- The function uses `ON CONFLICT (id) DO NOTHING` to handle concurrent creation attempts
- Multiple fallback mechanisms ensure profile is created even if one path fails
- The fix maintains backward compatibility with existing code
