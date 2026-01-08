# Database Setup Guide - Fixing Auth and RLS Issues

## Problem Summary

The Secured-Ajo application had three main issues:

1. **Trigger Permission Error**: Cannot create trigger on `auth.users` in Supabase
2. **Login Gets Stuck**: Login process hangs at "Signing in" indefinitely
3. **Dashboard Shows No Data**: After refresh, dashboard shows loading indicator with no data

## Root Causes

### 1. Trigger Issue
In Supabase, you **CANNOT** create triggers on the `auth.users` table because:
- It's owned by `supabase_auth_admin` role
- Your database role doesn't have permission to modify it
- Attempting to do so results in: `ERROR: 42501: must be owner of relation users`

### 2. RLS Policy Issues
Missing or misconfigured Row Level Security policies prevented:
- Users from reading their own profile data
- Users from inserting their profile during signup
- Proper data access after authentication

### 3. Auth Flow Issues
- Profile loading errors were silently swallowed
- No proper error propagation during login
- Race conditions between auth state changes and profile loading

## Complete Fix

### Step 1: Update Database Schema

Run these SQL files **IN ORDER** in your Supabase SQL Editor:

#### 1.1 Main Schema (if not already done)
```sql
-- Run: supabase/schema.sql
-- This creates all tables, but with the fixed trigger approach
```

#### 1.2 Fix RLS Policies
```sql
-- Run: supabase/fix-rls-policies.sql
-- This ensures all RLS policies are correctly configured
```

Key policies added/fixed:
- `users_insert_own`: Allows users to create their own profile (CRITICAL)
- `users_select_own`: Allows users to read their own profile
- `users_update_own`: Allows users to update their own profile
- Similar policies for all other tables
- `service_role_all` policies for admin operations

#### 1.3 Verify Setup
```sql
-- Run: supabase/post-setup-verification.sql
-- This checks that everything is configured correctly
```

Look for:
- ✅ All 11 tables created
- ✅ RLS enabled on all tables
- ✅ At least 30+ RLS policies created
- ✅ Critical policies exist: `users_insert_own`, `users_select_own`
- ✅ Helper functions exist: `create_user_profile`, etc.
- ✅ NO trigger on `auth.users` (should not exist)

### Step 2: Understand the New Approach

#### Before (Broken)
```sql
-- ❌ This FAILS in Supabase
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

#### After (Working)
```typescript
// ✅ Client-side profile creation
await supabase.from('users').insert({
  id: authUser.id,
  email: email,
  full_name: fullName,
  phone: phone,
  // ... other fields
});
```

The RLS policy `users_insert_own` allows this to work:
```sql
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Step 3: Application Code (Already Updated)

The following files have been fixed:

#### `src/contexts/AuthContext.tsx`
- ✅ Improved error handling in `loadUserProfile`
- ✅ Better error propagation in `login`
- ✅ Retry logic for profile creation in `signUp`
- ✅ Proper cleanup and race condition handling
- ✅ Detailed logging for debugging

#### Key Changes:
```typescript
// Before: Silent failure
const loadUserProfile = async (userId: string) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error || !data) {
    setUser(null); // ❌ Silent failure
    return;
  }
  // ...
};

// After: Proper error handling
const loadUserProfile = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error) {
      throw new Error(`Failed to load user profile: ${error.message}`);
    }
    // ... set user
    return true;
  } catch (error) {
    console.error('Error in loadUserProfile:', error);
    setUser(null);
    throw error; // ✅ Propagate error
  }
};
```

## Testing the Fix

### Test 1: Signup Flow
1. Go to `/signup`
2. Fill in the form with:
   - Email: test@example.com
   - Password: password123
   - Full Name: Test User
   - Phone: +1234567890
3. Submit the form

**Expected Result:**
- ✅ User created in `auth.users`
- ✅ User profile created in `public.users`
- ✅ Redirect to dashboard
- ✅ Dashboard shows user info

**If it fails:**
- Check browser console for errors
- Check Supabase logs for RLS policy violations
- Run verification SQL to check policies

### Test 2: Login Flow
1. Go to `/login`
2. Enter credentials
3. Click "Sign in"

**Expected Result:**
- ✅ No indefinite loading
- ✅ Redirect to dashboard within 2-3 seconds
- ✅ Dashboard shows user data
- ✅ No console errors

**If it fails:**
- Check if `users_select_own` policy exists
- Check if profile exists in `public.users`
- Check browser console for RLS errors

### Test 3: Dashboard Refresh
1. Log in successfully
2. Navigate to dashboard
3. Refresh the page (F5)

**Expected Result:**
- ✅ Dashboard loads with user data
- ✅ No persistent loading state
- ✅ No console errors

**If it fails:**
- Check if session is maintained
- Verify RLS policies allow reading own data
- Check network tab for failed requests

## Common Issues & Solutions

### Issue 1: "Login gets stuck at 'Signing in'"

**Cause:** Profile cannot be loaded due to RLS policy

**Solution:**
```sql
-- Check if policy exists
SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_select_own';

-- If missing, run fix-rls-policies.sql
```

### Issue 2: "User profile not found"

**Cause:** Profile wasn't created during signup

**Solution:**
1. Check if `users_insert_own` policy exists
2. Check if user exists in `auth.users` but not in `public.users`
3. Manually create profile:
```sql
SELECT create_user_profile(
  'user-id-from-auth'::uuid,
  'user@example.com',
  '+1234567890',
  'User Name'
);
```

### Issue 3: "ERROR: 42501: must be owner of relation users"

**Cause:** Trying to create trigger on `auth.users`

**Solution:**
- ✅ Already fixed in updated `schema.sql`
- The trigger creation has been removed
- Client-side profile creation is used instead

### Issue 4: "Dashboard shows no data after refresh"

**Cause:** Session not persisting or RLS blocking access

**Solution:**
1. Check if RLS policies are correct
2. Verify session is being stored
3. Check browser console for errors
4. Run verification SQL

## Architecture: How It Works Now

### User Signup Flow
```
1. User fills signup form
   ↓
2. Frontend calls supabase.auth.signUp()
   ↓
3. Supabase creates user in auth.users
   ↓
4. Frontend creates profile in public.users (via RLS policy)
   ↓
5. Retry logic ensures profile creation succeeds
   ↓
6. User is logged in and redirected to dashboard
```

### User Login Flow
```
1. User enters credentials
   ↓
2. Frontend calls supabase.auth.signInWithPassword()
   ↓
3. Supabase validates credentials
   ↓
4. Frontend loads profile from public.users (via RLS policy)
   ↓
5. Profile data is set in React context
   ↓
6. User is redirected to dashboard
```

### Session Persistence
```
1. Supabase stores session in localStorage
   ↓
2. On page load, AuthContext checks for session
   ↓
3. If session exists, load user profile
   ↓
4. Auth state is restored
   ↓
5. Dashboard shows user data
```

## Files Modified

### Database
- ✅ `supabase/schema.sql` - Removed trigger, added helper function
- ✅ `supabase/migrations/2026-01-08-add-user-creation-trigger.sql` - Updated approach
- ✅ `supabase/fix-rls-policies.sql` - NEW: Comprehensive RLS fixes
- ✅ `supabase/post-setup-verification.sql` - NEW: Verification queries
- ✅ `supabase/TRIGGER_FIX.md` - NEW: Documentation
- ✅ `supabase/DATABASE_SETUP.md` - NEW: This file

### Frontend
- ✅ `src/contexts/AuthContext.tsx` - Improved error handling and retry logic

## Alternative Solutions (For Pro Users)

If you have Supabase Pro plan ($25/month), you can use:

### Option 1: Database Webhooks
1. Go to Database > Webhooks in Supabase Dashboard
2. Create webhook for `INSERT` on `auth.users`
3. Point to Edge Function that creates profile

### Option 2: Auth Hooks
1. Create Edge Function for profile creation
2. Configure in Authentication > Hooks
3. Enable "Custom Access Token" hook

Both options are more reliable but require Pro plan.

## Monitoring & Maintenance

### Check RLS Policies
```sql
-- Run periodically to ensure policies are in place
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename;
```

### Check for Orphaned Users
```sql
-- Users in auth.users but not in public.users
-- (Requires service role access)
SELECT COUNT(*)
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

### Monitor Failed Logins
Check Supabase logs for:
- RLS policy violations
- Profile load failures
- Authentication errors

## Support

If you encounter issues:

1. **Check Console**: Open browser DevTools and check console for errors
2. **Check Logs**: Check Supabase Dashboard > Logs
3. **Run Verification**: Run `post-setup-verification.sql`
4. **Check Policies**: Verify RLS policies exist and are correct
5. **Check Session**: Verify Supabase session is being stored

## Next Steps

After completing this setup:

1. ✅ Test signup flow thoroughly
2. ✅ Test login flow thoroughly
3. ✅ Test session persistence
4. ✅ Test all other features (groups, contributions, etc.)
5. ✅ Run security audit (CodeQL)
6. ✅ Deploy to production

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
