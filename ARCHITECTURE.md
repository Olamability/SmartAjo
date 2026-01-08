# Architecture Documentation

This document describes the architecture and file organization of the Secured Ajo application.

## Overview

This application follows a **modern serverless architecture** with a single frontend process and Supabase as the complete backend platform. All backend logic is handled by Supabase's built-in features including authentication, database with Row Level Security (RLS), storage, and serverless functions.

## Technology Stack

### Frontend / Client
- **Framework**: Vite + React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Context API + React Query
- **Routing**: React Router v6
- **Client behavior**: Direct Supabase client calls with RLS enforcement

### Backend / Serverless
- **Platform**: Supabase
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (email + password, social providers)
- **Storage**: Supabase Storage with bucket policies
- **Serverless Functions**: Supabase Edge Functions (Deno runtime)
- **Real-time**: Supabase Realtime (when needed)

## File Organization

### Root Level Structure

```
secured-ajo/
├── src/                    ← Frontend application
│   ├── components/         ← React components
│   │   ├── ui/            ← shadcn/ui components
│   │   └── ...            ← Custom components
│   │
│   ├── pages/             ← Page components
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── DashboardPage.tsx
│   │
│   ├── contexts/          ← React contexts
│   │   └── AuthContext.tsx ← Authentication state
│   │
│   ├── services/          ← Service layer (Supabase calls)
│   │   └── auth.ts        ← Authentication service
│   │
│   ├── lib/               ← Utilities and client libraries
│   │   ├── client/        ← Client-safe code
│   │   │   └── supabase.ts ← Supabase browser client
│   │   └── utils.ts       ← Utility functions
│   │
│   ├── types/             ← TypeScript type definitions
│   │   └── index.ts       ← Shared types
│   │
│   ├── hooks/             ← Custom React hooks
│   ├── App.tsx            ← Root component
│   ├── main.tsx           ← Application entry point
│   └── index.css          ← Global styles
│
├── supabase/              ← Supabase configuration
│   ├── schema.sql         ← Database schema with RLS policies
│   ├── storage.sql        ← Storage bucket configuration
│   └── functions/         ← Edge Functions (if needed)
│
├── sql/                   ← Database migrations and SQL queries
├── public/                ← Static assets
├── index.html             ← HTML entry point
├── vite.config.ts         ← Vite configuration
├── tailwind.config.ts     ← Tailwind CSS configuration
└── package.json           ← Dependencies and scripts
```

## Key Architecture Rules

### 1. Client-Side Code (`src/`)

**Location**: `/src/`

**Purpose**: Contains all frontend code that runs in the browser.

**Rules**:
- ✅ Can use Supabase browser client (anon key only)
- ✅ All data access goes through Supabase client
- ✅ RLS policies enforce authorization at database level
- ✅ Can use React hooks and state management
- ❌ NO server-only operations
- ❌ NO service role keys or sensitive secrets

**Key Files**:
- `services/auth.ts` - Authentication service using Supabase Auth
- `contexts/AuthContext.tsx` - Authentication state management
- `lib/client/supabase.ts` - Supabase browser client initialization

### 2. Supabase Client (`src/lib/client/`)

**Location**: `/src/lib/client/`

**Purpose**: Contains the Supabase browser client for client-side operations.

**Rules**:
- ✅ Uses VITE_SUPABASE_ANON_KEY (public key)
- ✅ Safe for browser environment
- ✅ All security enforced via RLS
- ❌ NO server-only operations
- ❌ NO service role key

**Files**:
- `supabase.ts` - Supabase browser client (anon key)

### 3. React Components (`src/components/`)

**Location**: `/src/components/`

**Purpose**: Reusable React components for the UI.

**Rules**:
- ✅ Can use React hooks and state
- ✅ Can import from `src/services/`
- ✅ Can import from `src/lib/client/`
- ✅ Access data via Supabase client with RLS
- ❌ NO direct database connections

**Organization**:
- `ui/` - shadcn/ui components
- Root level - Application-specific components

### 4. Database & Security (Supabase)

**Location**: `/supabase/`

**Purpose**: Database schema, RLS policies, and Supabase configuration.

**Security Model**:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ RLS policies enforce data access rules
- ✅ Users can only access their own data
- ✅ Group members can only see group data
- ✅ All authentication via Supabase Auth

**Files**:
- `schema.sql` - Complete database schema with RLS policies
- `storage.sql` - Storage buckets and policies
- `functions/` - Supabase Edge Functions for complex server-side logic

**Pattern**:
**Example** - Authentication Service:
```typescript
import { createClient } from '@/lib/client/supabase';

export async function login(email: string, password: string) {
  const supabase = createClient();
  
  // Supabase Auth handles authentication
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) return { success: false, error: error.message };
  
  // Fetch user data from database (RLS enforced)
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();
    
  return { success: true, user: userData };
}
```

### 5. Services Layer (`src/services/`)

**Location**: `/src/services/`

**Purpose**: Client-side service layer for Supabase operations and business logic.

**Rules**:
- ✅ Client-safe code only
- ✅ Uses Supabase browser client
- ✅ RLS enforces all authorization
- ❌ NO server-side operations
- ❌ NO service role key access

**Files**:
- `auth.ts` - Authentication service (Supabase Auth)

## Authentication Flow

### Registration & Login

1. **Client-side** (`src/services/auth.ts`):
   - Collects user input
   - Calls Supabase Auth directly
   - Creates user record in database via RLS
   - Returns user data

2. **Supabase Auth**:
   - Validates credentials
   - Creates auth.users record
   - Issues JWT token
   - Manages session

3. **Database Trigger**:
   - Automatically creates public.users record
   - Links to auth.users via ID
   - Sets default values

4. **Email Verification**:
   - OTP sent via Supabase Auth
   - User verifies email before full access
   - RLS policies check verification status

5. **Session Management**:
   - Supabase handles token refresh
   - Client monitors auth state changes
   - Automatic logout on token expiry

## Database

### Technology
- **Provider**: Supabase (PostgreSQL)
- **Access Method**: Supabase JS client with RLS
- **Security**: Row Level Security (RLS) policies

### Query Pattern

**Direct Supabase Queries** (with RLS):
```typescript
import { createClient } from '@/lib/client/supabase';

const supabase = createClient();

// RLS automatically filters based on current user
const { data, error } = await supabase
  .from('groups')
  .select('*')
  .eq('status', 'active');
```

**Complex Operations** (Supabase RPC or Edge Functions):
```typescript
const supabase = createClient();

// Call a database function (RPC)
const { data } = await supabase.rpc('calculate_group_stats', { 
  group_id: groupId 
});

// Or call an Edge Function
const { data } = await supabase.functions.invoke('process-payout', {
  body: { groupId, cycle }
});
```

### Row Level Security (RLS)

All tables have RLS policies that enforce:
- Users can only access their own data
- Group members can only see data for groups they belong to
- Verification status affects data access
- Admin operations restricted to admin users

**Example RLS Policy**:
```sql
-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Group members can view their group
CREATE POLICY "Members can view their groups"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = groups.id
      AND user_id = auth.uid()
    )
  );
```

## Storage

### Supabase Storage Buckets

Configured buckets for:
- `avatars` - User profile images
- `documents` - KYC and verification documents
- `group-files` - Group-related uploads

**Client-side Storage Operations**:
```typescript
import { createClient } from '@/lib/client/supabase';

const supabase = createClient();

// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`user-${userId}.jpg`, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`user-${userId}.jpg`);
```

**Bucket Policies** enforce access control:
- Users can only upload to their own folders
- Public read access where appropriate
- Automatic file validation

## Environment Variables

### Required Variables

**Public** (VITE_*):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (public, browser-safe)
- `VITE_APP_NAME` - Application name
- `VITE_APP_URL` - Application URL
- `VITE_PAYSTACK_PUBLIC_KEY` - Payment gateway public key (optional)

**No Private Variables Required**:
- All backend operations handled by Supabase
- Service role key only used in Supabase dashboard/Edge Functions
- No server secrets in the codebase

## Import Path Aliases

Configured in `tsconfig.json`:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

**Usage examples**:
```typescript
// Client imports
import { createClient } from '@/lib/client/supabase';
import { login } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
```

## Build & Deployment

### Development

```bash
npm install
npm run dev
```

**What happens**:
1. Vite dev server starts on port 3000
2. Hot module replacement enabled
3. Fast refresh for React components
4. TypeScript type checking in background

### Production Build

```bash
npm run build
```

**What happens**:
1. TypeScript compilation check
2. Vite optimization and tree-shaking
3. CSS bundling and minification
4. Asset optimization
5. Output to `dist/` directory

### Deployment Targets

- **Vercel** (recommended - static hosting)
- **Netlify** (static hosting)
- **AWS S3 + CloudFront** (static hosting)
- Any static hosting platform

**Note**: No server deployment needed - all backend is Supabase

## Security Best Practices

1. ✅ **Row Level Security**: All database tables have RLS policies
2. ✅ **Client-only keys**: Only anon key exposed to browser
3. ✅ **RLS enforcement**: All authorization at database level
4. ✅ **Supabase Auth**: Secure authentication and session management
5. ✅ **Storage policies**: Bucket-level access control
6. ✅ **HTTPS only**: All Supabase connections use TLS
7. ✅ **Input validation**: Client-side and database-level validation
8. ✅ **No secrets in code**: All sensitive keys in Supabase dashboard

## Architecture Benefits

### Before (Express.js Backend)
- ❌ Two separate processes to run (frontend + backend)
- ❌ Complex deployment (need Node.js server)
- ❌ Manual session management
- ❌ Rate limiting implementation needed
- ❌ Database connection pool management
- ❌ More code to maintain (~2300 lines)

### After (Supabase Only)
- ✅ Single Vite dev server
- ✅ Simple deployment (static files only)
- ✅ Automatic session management
- ✅ Built-in rate limiting (via Supabase)
- ✅ Managed database connections
- ✅ Less code to maintain
- ✅ Serverless scaling
- ✅ Built-in real-time capabilities

## Development Workflow

1. **All Components are Client Components**:
   ```typescript
   // Use React hooks freely
   import { useState, useEffect } from 'react';
   import { createClient } from '@/lib/client/supabase';
   ```

2. **Direct Supabase Queries**:
   ```typescript
   const supabase = createClient();
   
   // RLS automatically filters data
   const { data, error } = await supabase
     .from('groups')
     .select('*')
     .eq('user_id', userId);
   ```

3. **For Complex Operations**:
   ```typescript
   // Option 1: Database RPC function
   const { data } = await supabase.rpc('complex_operation', params);
   
   // Option 2: Edge Function
   const { data } = await supabase.functions.invoke('function-name', {
     body: params
   });
   ```

## Future Enhancements

When backend logic is needed, use:

1. **Supabase RPC Functions**: SQL functions for complex queries
2. **Supabase Edge Functions**: TypeScript serverless functions
3. **Database Triggers**: Automatic actions on data changes
4. **Webhooks**: External service integrations

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
