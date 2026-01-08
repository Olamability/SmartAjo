# Legacy Server Code

⚠️ **IMPORTANT**: This directory contains legacy Next.js server-side code that is **NOT used** by the current Vite frontend.

## Current Architecture

The project now uses:
- **Frontend**: Vite + React (uses `src/lib/client/`)
- **Backend**: Express.js API server (uses `backend/src/lib/`)

## Status of This Directory

These files were created for a Next.js architecture but are not imported or used by the current Vite-based frontend:

- `auth.ts` - Legacy Next.js server auth
- `db.ts` - Legacy database utilities
- `paystack.ts` - Legacy payment integration
- `contributions.ts` - Legacy business logic
- `penalties.ts` - Legacy penalty calculation
- `rotation.ts` - Legacy rotation logic
- `cron.ts` - Legacy cron jobs
- `sql-loader.ts` - Legacy SQL loading
- `sql-examples.ts` - Legacy SQL examples
- `apiResponse.ts` - Legacy API response helpers
- `validation.ts` - Legacy validation schemas
- `rateLimit.ts` - Legacy rate limiting

## Migration Notes

If you need server-side functionality:
1. ✅ Use `backend/src/lib/` for backend API code
2. ✅ Use `src/lib/client/` for frontend client code
3. ❌ Do NOT use `src/lib/server/` (legacy, not compatible with Vite)

## Cleanup

This directory can potentially be removed in the future, but is kept for reference during the migration from Next.js to Vite architecture.

See [ARCHITECTURE_SEPARATION.md](../../ARCHITECTURE_SEPARATION.md) for current architecture details.
