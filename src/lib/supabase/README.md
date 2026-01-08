# Legacy Next.js Supabase Clients

⚠️ **IMPORTANT**: This directory contains legacy Next.js Supabase client code that is **NOT compatible** with the current Vite frontend.

## Current Architecture

The project now uses **Vite + React**, not Next.js.

### ✅ What to Use

**For Frontend (Browser)**:
```typescript
// ✅ CORRECT - Use this for frontend
import { createClient } from '@/lib/client/supabase';
```
Located at: `src/lib/client/supabase.ts`

**For Backend (API Server)**:
```typescript
// ✅ CORRECT - Use this for backend
import { createClient } from '../lib/supabase.js';
```
Located at: `backend/src/lib/supabase.ts`

### ❌ What NOT to Use

**Do NOT use these legacy files:**
- ❌ `src/lib/supabase/server.ts` - Uses Next.js `cookies()` from `next/headers`
- ❌ `src/lib/supabase/middleware.ts` - Uses Next.js `NextRequest`/`NextResponse`
- ❌ `src/lib/supabase/client.ts` - Uses `NEXT_PUBLIC_*` env vars (use `VITE_*` instead)

## Why These Don't Work

1. **Next.js Dependencies**: These files import from `next/headers` and `next/server` which don't exist in a Vite project
2. **Wrong Environment Variables**: They use `NEXT_PUBLIC_*` instead of `VITE_*`
3. **Wrong Client Types**: They use `@supabase/ssr` with Next.js-specific APIs

## Migration Status

These files are kept for reference but should be considered deprecated. The active Supabase clients are:

- **Frontend**: `src/lib/client/supabase.ts` (uses `VITE_*` env vars)
- **Backend**: `backend/src/lib/supabase.ts` (uses service role key)

## Cleanup

This directory can be removed in the future once the migration is complete and validated.

See [ARCHITECTURE_SEPARATION.md](../../ARCHITECTURE_SEPARATION.md) for current architecture details.
