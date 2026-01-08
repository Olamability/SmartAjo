# Supabase Auth Trigger Fix

## Problem

The following SQL fails in Supabase:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Error**: `ERROR: 42501: must be owner of relation users`

## Why This Happens

In Supabase, the `auth.users` table is owned by the `supabase_auth_admin` role, not by your project's database role. This means you cannot create triggers directly on `auth.users`.

## Solutions for Supabase

### Solution 1: Client-Side Profile Creation (CURRENT - Needs Fixing)

The application already has client-side logic to create user profiles during signup. This is implemented in:
- `src/services/auth.ts` - signUp function
- `src/contexts/AuthContext.tsx` - signUp function

**Pros:**
- Works with free tier
- No additional setup needed
- Already implemented

**Cons:**
- Race conditions possible
- Requires retry logic
- Not guaranteed to run

**Status:** Already implemented with retry logic, but needs RLS policy fixes

### Solution 2: Database Webhooks (Requires Supabase Pro)

Use Supabase Database Webhooks to trigger a function when a user signs up.

**Setup:**
1. Go to Database > Webhooks in Supabase Dashboard
2. Create webhook for `INSERT` on `auth.users`
3. Point to a Supabase Edge Function that creates the profile

**Pros:**
- Reliable
- Server-side execution
- Guaranteed to run

**Cons:**
- Requires Pro plan ($25/month)
- More complex setup

### Solution 3: Supabase Auth Hooks (Recommended for Pro Users)

Use Supabase Auth hooks (custom access token hook) to create profiles.

**Setup:**
1. Create an Edge Function that runs on user creation
2. Configure in Supabase Dashboard under Authentication > Hooks

**Pros:**
- Built specifically for this use case
- Server-side execution
- Most reliable

**Cons:**
- Requires Pro plan
- Need to create Edge Function

## Current Implementation (Free Tier Compatible)

Since the project uses the free tier, we rely on **client-side profile creation** with:

1. **RLS Policy** allowing users to insert their own profile:
```sql
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

2. **Retry Logic** in the client code to handle race conditions

3. **Fallback Manual Insert** if trigger doesn't work

## What Needs to be Fixed

1. **Remove the trigger attempt from schema files** - it will always fail
2. **Ensure RLS policies are correct** - allow user self-insertion
3. **Fix retry logic in auth services** - handle all edge cases
4. **Add better error handling** - don't block signup on profile creation failure

## Files to Update

1. `supabase/schema.sql` - Remove lines 482-489 (trigger creation)
2. `supabase/migrations/2026-01-08-add-user-creation-trigger.sql` - Update to not create trigger
3. Verify `src/services/auth.ts` has proper retry logic (already exists)
4. Verify `src/contexts/AuthContext.tsx` has proper retry logic (already exists)
