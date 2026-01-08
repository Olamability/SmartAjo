# Architecture Separation Verification Guide

This document provides steps to verify that the frontend and backend are properly separated.

## ✅ Verification Checklist

### 1. Verify Two Separate Processes

**Test**: Start the development servers and check running processes

```bash
# Terminal 1: Start both servers
npm run dev

# Terminal 2: Check running processes
ps aux | grep -E "(vite|tsx)" | grep -v grep
```

**Expected Result**:
- You should see at least 2 separate Node.js processes
- One running `vite` (frontend)
- One running `tsx watch src/server.ts` (backend)

**Output Example**:
```
runner    1234  ... node ...vite/bin/vite.js
runner    5678  ... node ...tsx watch src/server.ts
```

### 2. Verify Environment Variable Isolation

**Test**: Check that frontend cannot access backend environment variables

Create a test component:
```typescript
// src/components/EnvTest.tsx
export function EnvTest() {
  console.log('Frontend env check:');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL); // ✅ Should work
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY); // ✅ Should work
  
  // @ts-expect-error - Testing that this is undefined
  console.log('SUPABASE_SERVICE_ROLE_KEY:', import.meta.env.SUPABASE_SERVICE_ROLE_KEY); // ❌ Should be undefined
  
  return <div>Check console for env vars</div>;
}
```

**Expected Result**:
- `VITE_*` variables are accessible
- Non-`VITE_*` variables are `undefined`
- Service role key is NOT accessible in frontend

### 3. Verify API Communication

**Test**: Check that frontend communicates with backend via HTTP

```bash
# Start both servers
npm run dev

# In browser console (http://localhost:3000):
fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(console.log);
```

**Expected Result**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-08T00:00:00.000Z"
}
```

**Or test through Vite proxy**:
```javascript
fetch('/api/health')  // Proxied to http://localhost:3001/health
  .then(r => r.json())
  .then(console.log);
```

### 4. Verify Supabase Client Separation

**Test**: Confirm frontend and backend use different Supabase clients

**Frontend** (`src/lib/client/supabase.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // ✅ Anon key
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
```

**Backend** (`backend/src/lib/supabase.ts`):
```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ✅ Service role key
  return createSupabaseClient(supabaseUrl, supabaseServiceKey);
}
```

**Expected Result**:
- Frontend uses `@supabase/ssr` with anon key
- Backend uses `@supabase/supabase-js` with service role key
- No cross-imports between frontend and backend

### 5. Verify Network Separation

**Test**: Use browser DevTools to verify network requests

1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to http://localhost:3000
4. Make an API call (e.g., login, fetch data)

**Expected Result**:
- All API calls go to `http://localhost:3001/api/*` or `/api/*` (proxied)
- Frontend and backend are on different ports
- No direct database connections from browser

### 6. Verify Build Separation

**Test**: Build both frontend and backend separately

```bash
# Build frontend
npm run build
ls -la dist/  # Should contain static assets

# Build backend
npm run build:backend
ls -la backend/dist/  # Should contain compiled JS
```

**Expected Result**:
- Frontend builds to `dist/` (static HTML, CSS, JS)
- Backend builds to `backend/dist/` (Node.js code)
- Completely separate build outputs

### 7. Verify No Dangerous Imports

**Test**: Search for dangerous import patterns

```bash
# Check if frontend imports backend code
grep -r "from.*backend" src/ --include="*.ts" --include="*.tsx"
# Should return: no results

# Check if frontend uses service role key
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/ --include="*.ts" --include="*.tsx"
# Should return: no results

# Check if frontend uses process.env for sensitive vars
grep -r "process\.env\.SUPABASE" src/ --include="*.ts" --include="*.tsx"
# Should only find NEXT_PUBLIC_* usage in legacy files
```

**Expected Result**:
- No imports from `backend/` in `src/`
- No service role key references in frontend
- Only `VITE_*` or `import.meta.env` in frontend code

## 🔍 Common Issues and Solutions

### Issue 1: Backend can't start - "Cannot find module"

**Symptom**: Backend fails with module not found errors

**Solution**:
```bash
cd backend
npm install
cd ..
```

### Issue 2: Frontend can't access VITE_* variables

**Symptom**: `import.meta.env.VITE_SUPABASE_URL` is undefined

**Solution**:
1. Check `.env` file exists in project root
2. Ensure variables are prefixed with `VITE_`
3. Restart the dev server (Vite needs restart to pick up .env changes)

### Issue 3: CORS errors when calling backend

**Symptom**: Browser shows CORS policy errors

**Solution**:
1. Verify backend CORS is configured:
```typescript
// backend/src/server.ts
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

2. Or use Vite proxy (recommended for development):
```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
}
```

### Issue 4: Port already in use

**Symptom**: "EADDRINUSE: address already in use"

**Solution**:
```bash
# Find and kill process using port 3000 or 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Or change ports in configuration
```

## ✅ Success Criteria

Your architecture is properly separated if ALL of these are true:

- [ ] Two separate Node.js processes run when you start dev servers
- [ ] Frontend cannot access `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Backend API responds on http://localhost:3001
- [ ] Frontend makes HTTP requests to backend (visible in Network tab)
- [ ] No imports from `backend/` in `src/` directory
- [ ] `npm run build` and `npm run build:backend` produce separate outputs
- [ ] Frontend only uses `VITE_*` environment variables
- [ ] Backend has access to all environment variables

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Browser (http://localhost:3000)                       │
│  ┌───────────────────────────────────┐                 │
│  │  Frontend (Vite + React)          │                 │
│  │  - Uses VITE_* env vars           │                 │
│  │  - Supabase anon key              │                 │
│  │  - Makes HTTP requests to backend │                 │
│  └───────────────┬───────────────────┘                 │
│                  │                                      │
└──────────────────┼──────────────────────────────────────┘
                   │ HTTP Request
                   │ (fetch/axios)
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Server (http://localhost:3001)                        │
│  ┌───────────────────────────────────┐                 │
│  │  Backend (Express + Node.js)      │                 │
│  │  - Uses all env vars              │                 │
│  │  - Supabase service role key      │                 │
│  │  - Direct database access         │                 │
│  │  - Admin operations               │                 │
│  └───────────────┬───────────────────┘                 │
│                  │                                      │
└──────────────────┼──────────────────────────────────────┘
                   │
                   ▼
            ┌──────────────┐
            │  Supabase    │
            │  PostgreSQL  │
            └──────────────┘
```

## 🎯 Final Test

Run this complete test to verify everything:

```bash
# 1. Install dependencies
npm install
cd backend && npm install && cd ..

# 2. Start servers
npm run dev &

# 3. Wait for servers to start
sleep 5

# 4. Test frontend
curl http://localhost:3000 | grep -q "Secured Ajo" && echo "✅ Frontend running"

# 5. Test backend
curl http://localhost:3001/health | grep -q "ok" && echo "✅ Backend running"

# 6. Test they're separate processes
ps aux | grep -c "vite\|tsx" | grep -q "2" && echo "✅ Two separate processes"

# 7. Clean up
pkill -f "vite|tsx"
```

If all tests pass, your architecture is properly separated! 🎉
