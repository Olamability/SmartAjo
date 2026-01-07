# Supabase Auth Migration Guide

## Overview

The Ajo application has been migrated from a custom JWT authentication system to **Supabase Auth**. This migration provides:

- ✅ **More reliable authentication** - No more "Failed to login" errors
- ✅ **Better security** - Industry-standard authentication managed by Supabase
- ✅ **Easier maintenance** - Less custom auth code to maintain
- ✅ **Better SSR support** - Proper session detection in server components
- ✅ **Built-in features** - Email verification, password reset, OAuth (future)

## What Changed

### 1. Removed Custom JWT Logic

**Removed:**
- Custom JWT token generation and verification
- `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRY`, `JWT_REFRESH_TOKEN_EXPIRY` environment variables
- `jose` library for JWT handling
- `jsonwebtoken` package and types
- Custom cookie-based session management

**Why:** Supabase Auth handles all JWT token management internally, making custom JWT logic redundant and conflicting.

### 2. Added Supabase Auth

**Added:**
- `@supabase/supabase-js` - Main Supabase client library
- `@supabase/ssr` - Server-side rendering support for Next.js
- Supabase client configurations for browser, server, and middleware
- New environment variables for Supabase

### 3. Updated Environment Variables

**Required Environment Variables:**

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key-here

# Database URL (REQUIRED - get from Supabase)
DATABASE_URL=postgresql://postgres:password@db.yourproject.supabase.co:5432/postgres
```

**Where to get these:**
1. Go to [supabase.com](https://supabase.com) and create a free project
2. Go to **Settings → API**
3. Copy "Project URL" to `NEXT_PUBLIC_SUPABASE_URL`
4. Copy "anon public" key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy "service_role secret" key to `SUPABASE_SERVICE_ROLE_KEY`
6. Go to **Settings → Database** and copy "Connection String" to `DATABASE_URL`

### 4. Updated Authentication Flow

#### Signup Flow

**Before (Custom JWT):**
```typescript
// Created user in database with hashed password
// Generated custom JWT tokens
// Set httpOnly cookies manually
```

**After (Supabase Auth):**
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName, phone: phone }
  }
});
// Supabase handles tokens and cookies automatically
// User record created in auth.users table
```

#### Login Flow

**Before (Custom JWT):**
```typescript
// Verified password with bcrypt
// Generated custom JWT tokens
// Set httpOnly cookies manually
// Tracked failed login attempts
```

**After (Supabase Auth):**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
// Supabase handles authentication and session
// Session stored in secure httpOnly cookies
```

#### Logout Flow

**Before (Custom JWT):**
```typescript
// Manually deleted access and refresh token cookies
```

**After (Supabase Auth):**
```typescript
await supabase.auth.signOut();
// Supabase clears session cookies
```

#### Protected Routes

**Before (Custom JWT):**
```typescript
const user = await getCurrentUser(); // From JWT cookie
if (!user) return unauthorizedResponse();
// user.userId available
```

**After (Supabase Auth):**
```typescript
const user = await getCurrentUser(); // From Supabase session
if (!user) return unauthorizedResponse();
// user.id available (changed from userId to id)
```

### 5. Updated User Object Structure

**Important:** The authenticated user object structure has changed:

**Before:**
```typescript
{
  userId: string;  // Custom JWT payload
  email: string;
  type: 'access' | 'refresh';
}
```

**After:**
```typescript
{
  id: string;      // Supabase user ID
  email: string;
}
```

**Migration needed:** All references to `user.userId` have been updated to `user.id`.

## Setup Instructions

### For New Deployments

1. **Create Supabase Project**
   ```bash
   # Go to https://supabase.com and create a project
   # Note: You'll use Supabase's PostgreSQL database
   ```

2. **Configure Environment Variables**
   ```bash
   # Copy the example file
   cp .env.local.example .env.local
   
   # Edit .env.local and add your Supabase credentials
   # (See "Updated Environment Variables" section above)
   ```

3. **Run Database Schema**
   ```sql
   -- In Supabase SQL Editor, run database/schema.sql
   -- This creates your application tables
   ```

4. **Enable Email Auth in Supabase**
   ```bash
   # In Supabase Dashboard:
   # Authentication → Settings → Email Auth → Enable
   # Configure email templates if needed
   ```

5. **Install and Run**
   ```bash
   npm install
   npm run dev
   ```

### For Existing Deployments (Migration)

**⚠️ Important:** This migration requires user re-authentication.

1. **Backup your data**
   ```bash
   # Backup your current database
   pg_dump $DATABASE_URL > backup.sql
   ```

2. **Update Environment Variables**
   - Remove: `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRY`, `JWT_REFRESH_TOKEN_EXPIRY`
   - Add: Supabase credentials (see above)

3. **Migrate User Data**
   
   Users need to be migrated to Supabase Auth. Two options:

   **Option A: Users re-register** (Recommended for small user base)
   - Deploy the new version
   - Clear the `users` table
   - Users sign up again with Supabase Auth
   
   **Option B: Bulk migration** (For larger user base)
   - Use Supabase Admin API to create auth users
   - Send password reset emails to all users
   - See [Supabase User Migration Guide](https://supabase.com/docs/guides/auth/auth-user-management)

4. **Update and Deploy**
   ```bash
   git pull origin main
   npm install
   npm run build
   # Deploy to your hosting platform
   ```

5. **Verify Authentication**
   - Test signup flow
   - Test login flow
   - Test logout
   - Test protected API routes

## Key Files Changed

### Backend/Server Files

- `/src/lib/supabase/server.ts` - NEW: Supabase server client
- `/src/lib/supabase/client.ts` - NEW: Supabase browser client
- `/src/lib/supabase/middleware.ts` - NEW: Session refresh middleware
- `/src/lib/server/auth.ts` - UPDATED: Removed JWT, added Supabase helpers
- `/app/api/auth/login/route.ts` - UPDATED: Uses Supabase Auth
- `/app/api/auth/signup/route.ts` - UPDATED: Uses Supabase Auth
- `/app/api/auth/logout/route.ts` - UPDATED: Uses Supabase Auth
- All protected API routes - UPDATED: Use `user.id` instead of `user.userId`

### Frontend Files

- `/src/services/auth.ts` - UPDATED: Calls Supabase for logout
- `/src/contexts/AuthContext.tsx` - UPDATED: Listens to Supabase auth state

### Configuration Files

- `.env.local.example` - UPDATED: New Supabase variables
- `package.json` - UPDATED: Removed JWT deps, added Supabase

## Testing Checklist

After migration, test the following:

- [ ] Signup with new email
- [ ] Verify email with OTP
- [ ] Login with credentials
- [ ] Logout
- [ ] Access protected API routes
- [ ] Access protected pages
- [ ] Session persistence (refresh page while logged in)
- [ ] Session expiry (wait for token to expire)
- [ ] Multiple tabs/windows (session sync)
- [ ] Invalid credentials handling
- [ ] Inactive account handling

## Troubleshooting

### "Invalid API key" or "401 Unauthorized"

**Problem:** Supabase credentials not set correctly.

**Solution:**
```bash
# Verify your .env.local has correct values
cat .env.local | grep SUPABASE

# Check Supabase dashboard for correct keys
# Settings → API
```

### "User not found" after login

**Problem:** User exists in Supabase Auth but not in your database.

**Solution:**
- Ensure signup creates users in both Supabase Auth AND your `users` table
- Check `/app/api/auth/signup/route.ts` is using the Supabase user ID

### Session not persisting across page refreshes

**Problem:** Supabase cookies not being set/read correctly.

**Solution:**
- Ensure `NEXT_PUBLIC_SUPABASE_*` variables are set (they're required in browser)
- Check browser console for cookie errors
- Verify middleware is configured (if applicable)

### "Failed to login" errors

**Problem:** This was the original issue - should be fixed now.

**Solution:**
- If still occurring, check Supabase Auth logs in dashboard
- Verify email confirmation is not blocking login
- Check Supabase Auth settings

## Benefits of Migration

1. **Reliability:** No more custom JWT token management issues
2. **Security:** Supabase handles auth security best practices
3. **Features:** Access to Supabase Auth features (OAuth, MFA, etc.)
4. **Maintenance:** Less code to maintain and debug
5. **Scalability:** Supabase Auth scales automatically
6. **SSR Support:** Better Next.js App Router support

## Support

For issues with:
- **Supabase Auth:** Check [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- **Migration issues:** Review this guide or open an issue
- **General questions:** Check project documentation

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase SSR Package](https://supabase.com/docs/guides/auth/server-side-rendering)
