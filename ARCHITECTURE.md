# Architecture Documentation

This document describes the architecture and file organization of the Secured Ajo application, following the RentFlow architecture pattern.

## Overview

This application follows a **strict client/server separation** pattern within a **single monorepo**. All code is organized to prevent ChunkLoadError issues and ensure clear boundaries between client and server logic.

## Technology Stack

### Frontend / Client
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Client behavior**: All UI-only, layout/page files contain no server logic

### Backend / Server Logic
- **Backend**: Server-only code inside the same repo (not a separate repo)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email + password)
- **Storage**: Supabase Storage
- **API**: Next.js API Routes

## File Organization

### Root Level Structure

```
secured-ajo/
├── app/                 ← Next.js App Router
│   ├── layout.tsx       ← Root layout (no server logic)
│   ├── page.tsx         ← Home page (server component, no logic)
│   ├── login/
│   ├── signup/
│   ├── dashboard/
│   └── api/             ← API route handlers (server-side)
│
├── lib/                 ← Core library code (NEW ROOT LOCATION)
│   ├── server/          ← Server-only code
│   │   ├── db.ts        ← Database queries
│   │   ├── auth.ts      ← Auth logic
│   │   ├── supabase.ts  ← Supabase server client
│   │   ├── storage.ts   ← File storage helpers
│   │   ├── validation.ts← Input validation
│   │   └── ...          ← Other server utilities
│   │
│   └── client/          ← Client-safe code
│       └── supabase.ts  ← Supabase browser client
│
├── src/                 ← Application source code
│   ├── components/      ← React components (client-side)
│   ├── contexts/        ← React contexts
│   ├── hooks/           ← Custom React hooks
│   ├── services/        ← Client-side services
│   ├── types/           ← TypeScript type definitions
│   └── lib/             ← Legacy lib (will be migrated)
│
├── sql/                 ← Database migrations and queries
└── supabase/            ← Supabase configuration
```

## Key Architecture Rules

### 1. Server-Only Code (`lib/server/`)

**Location**: `/lib/server/`

**Purpose**: Contains all server-side business logic, database operations, and sensitive operations.

**Rules**:
- ✅ Every file MUST start with `import 'server-only';`
- ✅ Can import Node.js modules (fs, crypto, etc.)
- ✅ Can access environment variables
- ✅ Can perform database queries
- ❌ NEVER import into client components
- ❌ NEVER expose sensitive data

**Files**:
- `db.ts` - PostgreSQL connection pool and query helpers
- `auth.ts` - Authentication utilities (password hashing, OTP generation)
- `supabase.ts` - Supabase server client (SSR)
- `storage.ts` - Supabase Storage operations
- `validation.ts` - Zod schemas for input validation
- `apiResponse.ts` - Standardized API response helpers
- `rateLimit.ts` - Rate limiting logic
- `paystack.ts` - Payment gateway integration
- `contributions.ts` - Contribution tracking logic
- `rotation.ts` - Group rotation and payout logic
- `penalties.ts` - Penalty calculation logic
- `cron.ts` - Scheduled tasks
- `middleware.ts` - Session management middleware

### 2. Client-Safe Code (`lib/client/`)

**Location**: `/lib/client/`

**Purpose**: Contains client-safe utilities that can be used in browser environments.

**Rules**:
- ✅ Can be imported by client components
- ✅ Safe for browser environment
- ❌ NO server-only code
- ❌ NO sensitive data or secrets

**Files**:
- `supabase.ts` - Supabase browser client (CSR)

### 3. React Components (`src/components/`)

**Location**: `/src/components/`

**Purpose**: Reusable React components for the UI.

**Rules**:
- ✅ Must have `'use client'` directive if using hooks/interactivity
- ✅ Can import from `lib/client/`
- ✅ Can import from `src/services/`
- ❌ NEVER import from `lib/server/`

**Organization**:
- `ui/` - Shadcn UI components
- Root level - Application-specific components

### 4. API Routes (`app/api/`)

**Location**: `/app/api/`

**Purpose**: REST API endpoints for client-server communication.

**Rules**:
- ✅ Server-side only (no need for 'use client')
- ✅ Can import from `lib/server/`
- ✅ Should use standardized response helpers
- ✅ Should implement rate limiting
- ✅ Should validate inputs with Zod schemas

**Pattern**:
```typescript
import { createClient } from '@/lib/server/supabase';
import { query } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/apiResponse';

export async function POST(req: NextRequest) {
  // 1. Rate limit check
  // 2. Validate input
  // 3. Authenticate user
  // 4. Perform business logic
  // 5. Return response
}
```

### 5. Client Services (`src/services/`)

**Location**: `/src/services/`

**Purpose**: Client-side service layer for API communication and local storage.

**Rules**:
- ✅ Client-safe code only
- ✅ Can use fetch/axios for API calls
- ✅ Can use localStorage/sessionStorage
- ❌ NO server imports

**Files**:
- `auth.ts` - Authentication service (calls API routes)
- `api.ts` - Axios client with interceptors
- `storage.ts` - Local storage utilities
- `groupService.ts` - Group-related API calls

## Authentication Flow

### Registration & Login

1. **Client-side** (`src/services/auth.ts`):
   - Collects user input
   - Calls API route with credentials
   - Stores tokens/session

2. **Server-side** (`app/api/auth/*/route.ts`):
   - Validates input with Zod
   - Uses Supabase Auth for authentication
   - Creates user record in database
   - Returns user data

3. **Email Verification**:
   - OTP sent via Supabase Auth
   - User verifies email before access
   - Profile completion enforced

4. **Admin Approval**:
   - User status tracked in database
   - Approval workflow implemented
   - RLS policies enforce access control

## Database

### Technology
- **Provider**: Supabase (PostgreSQL)
- **ORM**: Raw SQL with prepared statements
- **Connection**: PostgreSQL connection pool

### Query Pattern

**Preferred**: Use server-side functions for complex queries
```typescript
import { query } from '@/lib/server/db';

const result = await query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

**Alternative**: Use Supabase RPC functions for complex operations
```typescript
const supabase = await createClient();
const { data } = await supabase.rpc('complex_query', { param1: value });
```

### Row Level Security (RLS)

All tables use RLS policies to enforce:
- User can only access their own data
- Admin approval required for certain operations
- Group membership verification

## Storage

### Supabase Storage Buckets

Configured buckets for:
- User profile images
- Documents
- Misc uploads

**Server-side operations** (`lib/server/storage.ts`):
```typescript
import { uploadFile, getPublicUrl } from '@/lib/server/storage';

const data = await uploadFile('avatars', 'user-123.jpg', file);
const url = await getPublicUrl('avatars', 'user-123.jpg');
```

## Environment Variables

### Required Variables

**Public** (NEXT_PUBLIC_*):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**Private** (Server-only):
- `DATABASE_URL` - PostgreSQL connection string
- `PAYSTACK_SECRET_KEY` - Payment gateway secret
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (if needed)

## Import Path Aliases

Configured in `tsconfig.json`:

```json
{
  "paths": {
    "@/*": ["./src/*", "./*"]
  }
}
```

**Usage examples**:
```typescript
// Server imports
import { query } from '@/lib/server/db';
import { createClient } from '@/lib/server/supabase';

// Client imports
import { createClient } from '@/lib/client/supabase';
import { login } from '@/services/auth';
import { Button } from '@/components/ui/button';
```

## Build & Deployment

### Build Process

```bash
npm run build
```

**What happens**:
1. TypeScript compilation
2. Next.js optimization
3. Server/client code separation
4. Static page generation where possible
5. API routes compiled as serverless functions

### Deployment Targets

- **Vercel** (recommended for Next.js)
- **Docker** (see Dockerfile)
- Any Node.js hosting platform

## Security Best Practices

1. ✅ **Server-only enforcement**: All sensitive code has `import 'server-only'`
2. ✅ **Input validation**: All API inputs validated with Zod
3. ✅ **Rate limiting**: API routes implement rate limiting
4. ✅ **RLS policies**: Database enforces row-level security
5. ✅ **Environment variables**: Secrets never exposed to client
6. ✅ **HTTPS only**: All API calls use secure connections
7. ✅ **Session management**: Supabase handles auth tokens securely

## Migration Notes

### What Changed

**Before**:
- Server code in `src/lib/server/`
- Client code mixed throughout
- Supabase clients in `src/lib/supabase/`

**After**:
- Server code in `lib/server/` (root level)
- Client code in `lib/client/` and `src/`
- Clear separation with `server-only` imports
- Updated import paths across the codebase

### If You See Errors

**"Module not found: Can't resolve '@/lib/server/...'"**:
- ✅ Make sure you're not importing server code in client components
- ✅ Use API routes to access server functionality from client

**"You're importing a component that needs..."**:
- ✅ Add `'use client'` directive to the component
- ✅ Move server logic to API routes

## Development Workflow

1. **Client Components**: Use for interactive UI
   ```typescript
   'use client';
   import { useState } from 'react';
   ```

2. **Server Components**: Use for data fetching (default in App Router)
   ```typescript
   // No 'use client' needed
   import { query } from '@/lib/server/db';
   ```

3. **API Routes**: Use for server operations called from client
   ```typescript
   import { createClient } from '@/lib/server/supabase';
   export async function POST(req: NextRequest) { ... }
   ```

## Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Docs](https://supabase.com/docs)
- [Server-only Package](https://www.npmjs.com/package/server-only)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
