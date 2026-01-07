# Project Structure Note

## ⚠️ Important: Old Files Present

This repository contains **legacy Vite/React SPA files** in the `src/` directory that are **NOT USED** by the current application.

### Current Active Framework: **Next.js**

The application currently runs on **Next.js 14** with the App Router.

### File Structure:

**✅ ACTIVE (Next.js):**
- `app/` - Next.js App Router pages and API routes
- `src/components/` - React components (used by Next.js pages)
- `src/lib/` - Server and client utilities
- `src/contexts/` - React contexts
- `src/types/` - TypeScript types
- `next.config.mjs` - Next.js configuration
- `tsconfig.json` - Configured for Next.js

**❌ LEGACY (Not Used - Vite):**
- `src/main.tsx` - Old Vite entry point (excluded in tsconfig.json)
- `src/App.tsx` - Old Vite app component (excluded in tsconfig.json)
- `src/pages/` - Old React Router pages (excluded in tsconfig.json)
- `src/services/http.ts` - Old HTTP client (excluded in tsconfig.json)
- `src/services/api.ts` - Old API client (excluded in tsconfig.json)

These legacy files are **excluded from compilation** in `tsconfig.json` and are kept for reference only.

### Why Two Structures?

The project was **migrated from Vite to Next.js** to:
- Enable server-side rendering and API routes
- Improve SEO and performance
- Unify frontend and backend in one framework
- Leverage Next.js App Router features

The old files remain for historical reference but are not compiled or used in the running application.

### Running the Application

```bash
# This uses Next.js (not Vite)
npm run dev

# Next.js dev server starts on http://localhost:3000
```

### Development

**For new features:**
- ✅ Add pages in `app/` directory
- ✅ Add API routes in `app/api/` directory
- ✅ Use server-side features (Server Components, Server Actions)
- ❌ DO NOT modify files in `src/pages/` or `src/main.tsx`

### Future Cleanup

Consider removing legacy Vite files in a future cleanup PR:
```bash
# Files that can be safely removed:
rm src/main.tsx
rm src/App.tsx
rm src/vite-env.d.ts
rm -rf src/pages/
rm src/services/http.ts
rm src/services/api.ts
```

**Note:** Do NOT remove during this PR to maintain minimal changes.
