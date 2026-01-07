# 🚀 Quick Fix Guide for Registration/Login Issues

## Problem: "Cannot register" or "Cannot login"

### ✅ Solution (5 minutes):

```bash
# 1. Check if environment file exists
ls .env.local

# 2. If it doesn't exist, create it
cp .env.local.example .env.local

# 3. Edit .env.local and add your Supabase credentials
# Get them from: https://supabase.com → Your Project → Settings → API

# 4. Validate your configuration
npm run validate-env

# 5. If validation fails, fix the issues shown
# Then run validation again until it passes

# 6. Start/restart the development server
npm run dev
```

## Get Your Supabase Credentials

1. Go to https://supabase.com
2. Sign in or create a free account
3. Create a new project (or use existing)
4. Go to **Settings → API**
5. Copy these values to your `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`
6. Go to **Settings → Database**
7. Copy **Connection String (URI)** → `DATABASE_URL`

## Setup Database Schema

1. Open Supabase SQL Editor
2. Copy contents of `database/schema.sql`
3. Paste and run in SQL Editor
4. Verify tables were created

## Test Your Setup

```bash
# Run validation
npm run validate-env

# Expected output: "Environment validation PASSED! ✨"
```

## Still Not Working?

See [AUTHENTICATION_TROUBLESHOOTING.md](./AUTHENTICATION_TROUBLESHOOTING.md) for detailed troubleshooting.

## Key Files Changed to Fix Issues

- ✅ `src/lib/supabase/client.ts` - Fixed client-side environment variable access
- ✅ `src/lib/supabase/server.ts` - Added validation for server-side client
- ✅ `src/contexts/AuthContext.tsx` - Added error handling for Supabase initialization
- ✅ `src/services/auth.ts` - Made Supabase client initialization lazy and safe
- ✅ `scripts/validate-env.cjs` - New validation script to check environment setup
- ✅ `AUTHENTICATION_TROUBLESHOOTING.md` - Complete troubleshooting guide

## What Was Wrong?

1. **Critical Bug**: Client-side Supabase client used `process.env` which doesn't work in browser
2. **Missing Validation**: No error messages when environment variables were missing
3. **Poor Error Handling**: Supabase client errors crashed the entire app
4. **No Setup Guidance**: Users didn't know environment variables were required

All fixed! 🎉
