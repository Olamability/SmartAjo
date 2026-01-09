# Troubleshooting Guide

This guide helps you resolve common issues with the Secured Ajo application.

## Authentication Issues

### Problem: Stuck at "Signing in..." after login

**Symptoms:**
- Login button shows spinning loader indefinitely
- User cannot access dashboard after entering valid credentials
- Console shows profile loading errors

**Root Cause:**
The user profile cannot be loaded from the database, usually because:
1. The `create_user_profile()` RPC function doesn't exist in Supabase
2. Row Level Security (RLS) policies are blocking access
3. The user profile was never created during signup

**Solutions:**

#### Solution 1: Run the Database Migration (Recommended)
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run the migration file: `/supabase/migrations/2026-01-08-add-user-creation-trigger.sql`
4. This creates the `create_user_profile()` function needed for user registration

#### Solution 2: Verify RLS Policies
1. Check that RLS is enabled on the `users` table
2. Ensure the `users_insert_own` policy exists:
   ```sql
   CREATE POLICY users_insert_own ON users
     FOR INSERT
     WITH CHECK (auth.uid() = id);
   ```
3. Verify users can read their own profile:
   ```sql
   CREATE POLICY users_select_own ON users
     FOR SELECT
     USING (auth.uid() = id);
   ```

#### Solution 3: Manually Create Missing Profile
If you have existing auth users without profiles:
```sql
-- Replace with actual user ID and details
SELECT create_user_profile(
  'user-uuid-here'::uuid,
  'user@example.com',
  '+1234567890',
  'User Name'
);
```

### Problem: Cannot login after successful signup

**Symptoms:**
- Signup appears successful
- Redirected to login page
- Login fails with "Unable to access your account" error

**Root Cause:**
The user profile was not created during signup.

**Solutions:**

#### Solution 1: Enable Direct Insert Fallback
The application now includes automatic fallback mechanisms:
1. It tries RPC function first
2. Falls back to direct INSERT if RPC fails
3. Uses retry logic with exponential backoff

The latest code changes include these improvements automatically.

#### Solution 2: Check Supabase Email Confirmation
1. Go to Supabase Dashboard → Authentication → Settings
2. Check if "Enable email confirmations" is enabled
3. If enabled, users must confirm their email before logging in
4. Check the user's email for confirmation link

#### Solution 3: Disable Email Confirmation (Development Only)
For local development:
1. Go to Supabase Dashboard → Authentication → Settings
2. Disable "Enable email confirmations"
3. Users can login immediately after signup

### Problem: Profile loading takes too long

**Symptoms:**
- Long wait times during login
- Multiple retry attempts in console logs

**Root Cause:**
Database latency or connection issues.

**Solutions:**

#### Solution 1: Check Network Connection
- Verify internet connectivity
- Check Supabase project status at status.supabase.com
- Try using a different network

#### Solution 2: Adjust Retry Settings
The auth system now includes:
- Automatic retries (up to 3 attempts)
- Exponential backoff (1s, 2s delays)
- Better error messages

These are built into the latest code.

## Database Setup Issues

### Problem: "Database setup incomplete" error

**Symptoms:**
- Error message mentioning RPC function not found
- Cannot create user profiles

**Solution:**
1. Run the migration file in Supabase SQL Editor:
   ```
   /supabase/migrations/2026-01-08-add-user-creation-trigger.sql
   ```
2. Verify the function exists:
   ```sql
   SELECT proname, pg_get_functiondef(oid) 
   FROM pg_proc 
   WHERE proname = 'create_user_profile';
   ```

### Problem: RLS Policy Violations

**Symptoms:**
- "new row violates row-level security" errors
- Cannot insert user profiles

**Solution:**
1. Verify RLS policies with:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```
2. Ensure `users_insert_own` policy exists
3. Run the fix from `/supabase/fix-rls-policies.sql` if needed

## Environment Configuration

### Problem: Cannot connect to Supabase

**Symptoms:**
- Network errors in console
- "Failed to fetch" errors
- Authentication timeouts

**Solution:**
1. Check `.env` file has correct values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
2. Verify the anon key is correct (get from Supabase Dashboard → Settings → API)
3. Ensure URL has `https://` prefix
4. Restart the dev server after changing `.env`

### Problem: Environment variables not loading

**Symptoms:**
- `undefined` values for Supabase config
- "Missing Supabase credentials" errors

**Solution:**
1. Environment variables must start with `VITE_` prefix
2. Restart the dev server after changes
3. Check the file is named exactly `.env` (not `.env.example`)
4. Verify no typos in variable names

## Development Issues

### Problem: Port 3000 already in use

**Symptoms:**
- "Port 3000 is in use" message
- Dev server starts on port 3001 or higher

**Solution:**
This is normal behavior. Vite automatically finds an available port:
- Port 3000 is preferred
- Falls back to 3001, 3002, etc. if busy
- Check console output for actual port being used

### Problem: Build fails with TypeScript errors

**Symptoms:**
- `npm run build` fails
- Type checking errors

**Solution:**
1. Ensure all dependencies are installed:
   ```bash
   npm install
   ```
2. Clear cache and rebuild:
   ```bash
   rm -rf node_modules dist
   npm install
   npm run build
   ```
3. Check for import errors in files
4. Verify TypeScript version matches package.json

### Problem: Tailwind styles not working

**Symptoms:**
- Components have no styling
- CSS classes not applied

**Solution:**
1. Verify `tailwind.config.ts` exists
2. Check `index.css` has Tailwind directives:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
3. Restart dev server
4. Clear browser cache

## Testing & Debugging

### Enable Detailed Logging

The application includes extensive console logging for debugging:

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for messages prefixed with:
   - `loadUserProfile:` - Profile loading steps
   - `login:` - Login process
   - `signUp:` - Signup process
   - `ensureUserProfile:` - Profile creation

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to Logs → Auth Logs
3. Check for authentication events
4. Look for error messages

### Test Database Connection

Run in Supabase SQL Editor:
```sql
-- Test if you can query users table
SELECT * FROM users LIMIT 1;

-- Test if RPC function exists
SELECT create_user_profile(
  gen_random_uuid(),
  'test@example.com',
  '+1234567890',
  'Test User'
);

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';
```

## Getting Help

If you're still experiencing issues:

1. **Check Console Logs**: Look for detailed error messages in browser console
2. **Check Supabase Logs**: Review auth and database logs in Supabase dashboard
3. **Verify Database Setup**: Ensure all migration files have been run
4. **Review Documentation**: 
   - `README.md` - Setup instructions
   - `ARCHITECTURE.md` - System architecture
   - `supabase/README.md` - Database setup guide

## Quick Fixes Checklist

- [ ] Run database migration: `/supabase/migrations/2026-01-08-add-user-creation-trigger.sql`
- [ ] Verify `.env` file has correct Supabase credentials
- [ ] Check RLS policies exist on `users` table
- [ ] Ensure `create_user_profile()` function exists
- [ ] Restart dev server after configuration changes
- [ ] Clear browser cache and cookies
- [ ] Check Supabase project is active and not paused
- [ ] Verify internet connection is stable

## Known Limitations

1. **Email Confirmation**: If enabled in Supabase, users must confirm email before logging in
2. **Supabase Free Tier**: Has rate limits; may cause delays under heavy load
3. **Browser Compatibility**: Works best in Chrome, Firefox, Safari, Edge (recent versions)
4. **Temporary Phone Numbers**: Users without phone numbers get auto-generated temporary ones

## Recent Improvements

The codebase now includes:
- ✅ Automatic retry logic for profile loading (3 attempts with exponential backoff)
- ✅ Fallback from RPC to direct INSERT for profile creation
- ✅ Better error messages with actionable guidance
- ✅ Improved logging for debugging
- ✅ Graceful handling of missing RPC function
- ✅ Profile existence checks before operations
- ✅ Automatic profile creation on auth state changes
