# Architecture Separation Guide

## Overview

This project uses a **strict client-server separation** with two separate processes running concurrently:

- **Frontend**: Vite dev server (port 3000)
- **Backend**: Express.js API server (port 3001)

```
┌─────────────────────────────────────────────────────────────┐
│                     Single Command                          │
│                   npm run dev                               │
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐     │
│  │   Frontend (Vite)    │    │   Backend (Express)  │     │
│  │   Port: 3000         │    │   Port: 3001         │     │
│  │   React + TS         │◄───┤   Node.js + TS       │     │
│  │   Browser Client     │    │   API Server         │     │
│  │   Anon Key Only      │    │   Service Role Key   │     │
│  └──────────────────────┘    └──────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## ✅ What We HAVE

### 1. Separate Processes
- **Frontend Process**: Vite development server
  - Runs on port 3000
  - Serves React application
  - Only has access to `VITE_*` environment variables
  - Uses Supabase anon key (public, browser-safe)

- **Backend Process**: Express.js API server
  - Runs on port 3001
  - Handles API requests
  - Has access to ALL environment variables
  - Uses Supabase service role key (private, server-only)

### 2. Single Command Orchestration
```json
{
  "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\""
}
```

The `concurrently` package runs both servers simultaneously with a single command, but they remain **completely separate processes**.

### 3. Clear Separation of Concerns

**Frontend (`src/`):**
- React components
- Client-side routing
- UI logic
- API calls to backend
- Only uses `VITE_SUPABASE_ANON_KEY`

**Backend (`backend/src/`):**
- Express routes
- Database operations
- Admin operations
- Business logic
- Uses `SUPABASE_SERVICE_ROLE_KEY`

## ❌ What We DO NOT Have

### No Backend Logic in Frontend
- ❌ No server-only code in `src/`
- ❌ No service role key in frontend environment
- ❌ No direct database access from browser
- ❌ No admin operations in frontend code

### No Single Server Pretending to be Full-Stack
- ❌ Not using Next.js API routes that run in the same process
- ❌ Not embedding backend logic in Vite plugins
- ❌ Not using SSR with sensitive operations

## 🔒 Security Boundaries

### Frontend Environment (`.env`)
```bash
# ✅ SAFE - These are exposed to browser
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_BASE_URL=http://localhost:3001
```

### Backend Environment (`backend/.env`)
```bash
# 🔐 PRIVATE - These are NEVER exposed to browser
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # ⚠️ SENSITIVE
DATABASE_URL=postgresql://...  # ⚠️ SENSITIVE
PAYSTACK_SECRET_KEY=sk_test_...  # ⚠️ SENSITIVE
```

## 📁 File Structure

```
secured-ajo/
├── src/                          # Frontend (Vite)
│   ├── components/               # React components
│   ├── pages/                    # Page components
│   ├── contexts/                 # React contexts
│   ├── services/                 # API client services
│   ├── lib/
│   │   ├── client/               # Browser-safe utilities
│   │   │   └── supabase.ts       # ✅ Uses anon key
│   │   └── utils.ts              # Shared utilities
│   ├── App.tsx
│   └── main.tsx
│
├── backend/                      # Backend (Express)
│   ├── src/
│   │   ├── routes/               # API endpoints
│   │   │   ├── auth.ts
│   │   │   ├── groups.ts
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── supabase.ts       # 🔐 Uses service role key
│   │   │   ├── db.ts             # Database operations
│   │   │   ├── auth.ts           # Server auth utilities
│   │   │   └── ...
│   │   └── server.ts             # Express app
│   └── package.json              # Backend dependencies
│
├── .env                          # Frontend env vars
├── backend/.env                  # Backend env vars
├── package.json                  # Frontend dependencies
└── vite.config.ts                # Vite configuration
```

## 🔄 Request Flow

### Example: User Login

1. **User submits login form** (Frontend)
   ```typescript
   // src/services/auth.ts
   const response = await fetch('http://localhost:3001/api/auth/login', {
     method: 'POST',
     body: JSON.stringify({ email, password })
   });
   ```

2. **Request proxied through Vite** (Development)
   ```typescript
   // vite.config.ts
   proxy: {
     '/api': {
       target: 'http://localhost:3001',
       changeOrigin: true,
     }
   }
   ```

3. **Backend processes request** (Backend)
   ```typescript
   // backend/src/routes/auth.ts
   router.post('/login', async (req, res) => {
     // Uses service role key for admin operations
     const supabase = createClient(); // Service role client
     // ... authentication logic
   });
   ```

4. **Response sent back to frontend**

## 🚀 Development Workflow

### Starting Development
```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Start both servers with one command
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Building for Production
```bash
# Build frontend
npm run build

# Build backend
npm run build:backend
```

## 🔍 Verification

### How to verify the separation:

1. **Check running processes**
   ```bash
   # You should see TWO separate Node.js processes
   ps aux | grep node
   ```

2. **Check environment variables**
   ```bash
   # Frontend can only access VITE_* variables
   console.log(import.meta.env.VITE_SUPABASE_URL); // ✅ Works
   console.log(import.meta.env.SUPABASE_SERVICE_ROLE_KEY); // ❌ undefined
   ```

3. **Check network requests**
   - Open browser DevTools → Network
   - All API calls go to `http://localhost:3001/api/*`
   - Frontend and backend are separate origins

## 📚 Key Principles

1. **Two Separate Processes**: Frontend and backend run as independent Node.js processes
2. **Environment Isolation**: Frontend only sees `VITE_*` variables, backend sees all
3. **Single Command**: `concurrently` orchestrates both, but doesn't merge them
4. **Clear API Boundary**: Frontend communicates with backend only through HTTP API
5. **Security**: Service role key never leaves the backend process

## ⚠️ Common Pitfalls to Avoid

❌ **Don't** import backend code in frontend:
```typescript
// ❌ WRONG - This won't work in Vite
import { createClient } from '../backend/src/lib/supabase';
```

✅ **Do** use the frontend Supabase client:
```typescript
// ✅ CORRECT
import { createClient } from '@/lib/client/supabase';
```

❌ **Don't** use service role key in frontend:
```typescript
// ❌ WRONG - Security risk!
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
```

✅ **Do** use anon key in frontend:
```typescript
// ✅ CORRECT
const supabase = createClient(url, import.meta.env.VITE_SUPABASE_ANON_KEY);
```

❌ **Don't** make direct database queries from frontend:
```typescript
// ❌ WRONG - Bypasses RLS and security
await supabase.from('users').delete().eq('id', userId);
```

✅ **Do** call backend API for sensitive operations:
```typescript
// ✅ CORRECT - Backend handles security
await fetch('/api/users/delete', { method: 'POST', body: { userId } });
```

## 🎯 Summary

This architecture provides:
- ✅ **True separation** between frontend and backend
- ✅ **Security** through environment isolation
- ✅ **Developer experience** with single command
- ✅ **Production ready** with separate build processes
- ✅ **Scalability** - can deploy frontend and backend independently

The key is that while we have a single command to start both servers, they remain **separate processes** with **separate responsibilities** and **separate security contexts**.
