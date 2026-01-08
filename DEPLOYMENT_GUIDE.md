# 🔧 Registration Fix Deployment Guide

## Issue Summary
Registration was failing because:
1. No database trigger existed to automatically create `public.users` records when users signed up in `auth.users`
2. No RLS INSERT policy existed to allow users to create their own records
3. Manual insert in code was failing silently due to RLS restrictions

## Solution Applied
This fix adds:
1. **Database trigger** (`handle_new_user()`) that automatically creates user profiles
2. **RLS INSERT policy** (`users_insert_own`) as a backup mechanism
3. **Improved signup code** with retry logic and better error handling

## 🚀 Deployment Steps

### Step 1: Apply Database Migration

You need to run the migration in your Supabase dashboard:

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Open the file: `supabase/migrations/2026-01-08-add-user-creation-trigger.sql`
5. Copy the entire contents and paste into the SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)
7. Wait for completion (~5 seconds)

### Step 2: Verify Migration Success

After running the migration, verify it worked by running these queries in the SQL Editor:

```sql
-- 1. Check if trigger function exists
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
-- Expected: Should return one row with 'handle_new_user'

-- 2. Check if trigger exists on auth.users
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- Expected: Should return one row with 'on_auth_user_created'

-- 3. Check if RLS policy exists
SELECT policyname FROM pg_policies 
WHERE tablename = 'users' AND policyname = 'users_insert_own';
-- Expected: Should return one row with 'users_insert_own'
```

### Step 3: Test Registration

After deploying the migration, test the registration flow:

1. Build and run your application:
   ```bash
   npm run build
   npm run dev
   ```

2. Open your browser and navigate to the signup page
3. Fill in the registration form with:
   - Full Name: Test User
   - Email: test@example.com (use a real email you have access to)
   - Phone: +234 800 000 0000
   - Password: TestPassword123
   - Confirm Password: TestPassword123
4. Click **"Create account"**
5. You should be redirected to the dashboard

### Step 4: Verify User Creation

After successful registration, verify the user was created in both tables:

```sql
-- Check auth.users table
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'test@example.com';

-- Check public.users table
SELECT id, email, phone, full_name, is_verified, kyc_status
FROM public.users
WHERE email = 'test@example.com';
```

Both queries should return matching records with the same `id`.

## 🔍 What Changed

### 1. Database Schema (`supabase/schema.sql`)
- Added `handle_new_user()` trigger function with SECURITY DEFINER
- Added `on_auth_user_created` trigger on `auth.users` table
- Added `users_insert_own` RLS policy for INSERT operations

### 2. Authentication Service (`src/services/auth.ts`)
- Improved signup logic with retry mechanism (up to 3 attempts)
- First attempts to fetch user record created by trigger
- Falls back to manual insert if trigger hasn't completed
- Handles duplicate key errors gracefully
- Returns basic user info if all attempts fail (graceful degradation)

### 3. Migration File (`supabase/migrations/2026-01-08-add-user-creation-trigger.sql`)
- Standalone migration file for easy deployment
- Includes verification queries
- Includes rollback instructions if needed

## 🛠️ Troubleshooting

### Issue: Migration fails with "permission denied"
**Solution**: Make sure you're logged in to the Supabase dashboard with owner/admin privileges.

### Issue: Trigger doesn't fire
**Solution**: 
1. Verify the trigger was created: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. Check trigger is enabled: The `tgenabled` column should be 'O' (origin)
3. If not, enable it: `ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;`

### Issue: RLS policy still blocks inserts
**Solution**:
1. Verify policy exists: `SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_insert_own';`
2. Check RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';`
3. The `rowsecurity` column should be `true`

### Issue: Registration still fails
**Solution**:
1. Check browser console for errors
2. Check Supabase logs in the dashboard: **Logs** → **Postgres Logs**
3. Look for constraint violations or RLS policy errors
4. Verify phone number is unique (change it if testing multiple times)

### Issue: User created in auth.users but not in public.users
**Solution**: This means the trigger isn't firing. Manually check:
```sql
-- Check if trigger exists and is enabled
SELECT 
  tgname, 
  tgenabled,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

## 📊 Expected Behavior After Fix

### Before Fix
- ❌ User clicks "Create account" button
- ❌ Button shows loading state briefly
- ❌ Nothing happens (no redirect, no error)
- ❌ User created in `auth.users` but NOT in `public.users`
- ❌ Subsequent operations fail

### After Fix
- ✅ User clicks "Create account" button
- ✅ Button shows loading state with spinner
- ✅ User created in BOTH `auth.users` AND `public.users` automatically
- ✅ Success toast notification appears
- ✅ User redirected to dashboard
- ✅ User can access protected routes

## 🔐 Security Considerations

### SECURITY DEFINER Function
The `handle_new_user()` function uses `SECURITY DEFINER` to:
- Execute with the privileges of the function owner (superuser)
- Bypass RLS policies during user creation
- Ensure user records are always created successfully

This is safe because:
- Function only creates records with the authenticated user's ID
- Uses `ON CONFLICT DO NOTHING` to prevent duplicates
- No user input is executed as SQL (parameterized values only)

### RLS Policy
The `users_insert_own` policy:
- Only allows users to insert records with their own ID
- Uses `WITH CHECK (auth.uid() = id)` to enforce this
- Acts as a backup if trigger has timing issues

## 📝 Rollback Instructions

If you need to rollback this migration, run these commands in SQL Editor:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove trigger function
DROP FUNCTION IF EXISTS handle_new_user();

-- Remove RLS policy
DROP POLICY IF EXISTS users_insert_own ON users;
```

## ✅ Success Criteria

The fix is successful when:
- [ ] Migration runs without errors
- [ ] Trigger function exists and is enabled
- [ ] RLS policy exists for INSERT operations
- [ ] New user registration creates records in both tables
- [ ] User can log in immediately after registration
- [ ] User can access dashboard and other protected routes
- [ ] No console errors during registration

## 🆘 Support

If you continue to experience issues:
1. Check the verification queries in the migration file
2. Review Supabase logs for detailed error messages
3. Test with a completely new email and phone number
4. Clear browser cache and try again
5. Check if email confirmation is required in Supabase settings

---

**Migration Version**: 2026-01-08  
**Estimated Deployment Time**: 5 minutes  
**Risk Level**: Low (backwards compatible, includes rollback)
