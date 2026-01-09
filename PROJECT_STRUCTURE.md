# Smart Ajo - Project Structure Documentation

This document provides a comprehensive overview of the Smart Ajo project structure and how all components work together.

## Overview

Smart Ajo is a **single-repository** full-stack application with:
- **Frontend**: Vite + React + TypeScript (Port 3000)
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **Architecture**: Serverless with Row Level Security

## Directory Structure

### Root Level
```
SmartAjo/
├── src/                    # Frontend application source
├── supabase/               # Backend configuration & database
├── public/                 # Static assets
├── .env.example            # Environment variable template
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── README.md               # Main documentation
└── ARCHITECTURE.md         # Architecture documentation
```

## Frontend (`src/`)

### 1. API Layer (`src/api/`)
**Purpose**: Type-safe wrapper functions for Supabase operations

```typescript
src/api/
├── index.ts           # Central exports
├── groups.ts          # Group management
├── contributions.ts   # Contribution tracking
├── transactions.ts    # Transaction history
├── notifications.ts   # Notification management
└── README.md          # API documentation
```

**Key Features**:
- All functions return `{ success, data?, error? }` format
- Uses Supabase client with RLS enforcement
- Type-safe with TypeScript
- Error handling built-in

**Example Usage**:
```typescript
import { createGroup, getUserGroups } from '@/api';

const result = await createGroup(formData);
if (result.success) {
  console.log('Group created:', result.group);
} else {
  console.error('Error:', result.error);
}
```

### 2. Components (`src/components/`)
**Purpose**: Reusable React components

```typescript
src/components/
├── ui/                # shadcn/ui components (40+ components)
├── ErrorBoundary.tsx  # Error handling wrapper
├── Providers.tsx      # App-wide providers
├── Header.tsx         # Navigation header
├── Footer.tsx         # Page footer
└── ...                # Feature-specific components
```

### 3. Pages (`src/pages/`)
**Purpose**: Route-based page components

```typescript
src/pages/
├── HomePage.tsx       # Landing page
├── LoginPage.tsx      # Login form
├── SignupPage.tsx     # Registration form
└── DashboardPage.tsx  # Main dashboard
```

### 4. Contexts (`src/contexts/`)
**Purpose**: React Context providers for state management

```typescript
src/contexts/
└── AuthContext.tsx    # Authentication state & methods
```

**Features**:
- User authentication state
- Login/Signup/Logout methods
- Session management
- Auto-refresh on page load

### 5. Services (`src/services/`)
**Purpose**: Business logic and external service integrations

```typescript
src/services/
└── auth.ts            # Authentication service
```

**Note**: This is being gradually migrated to `src/api/` for consistency.

### 6. Lib (`src/lib/`)
**Purpose**: Utility functions and shared code

```typescript
src/lib/
├── client/
│   └── supabase.ts    # Supabase client initialization
├── constants/
│   ├── database.ts    # Database constants
│   ├── timeout.ts     # Timeout configurations
│   └── index.ts       # General constants
├── utils/
│   ├── errorHandling.ts  # Error utilities
│   ├── errorTracking.ts  # Error logging
│   ├── profile.ts        # Profile utilities
│   └── validation.ts     # Input validation
├── errors.ts          # Custom error classes
└── utils.ts           # General utilities
```

### 7. Types (`src/types/`)
**Purpose**: TypeScript type definitions

```typescript
src/types/
└── index.ts           # All type definitions
```

**Key Types**:
- `User` - User account and profile
- `Group` - Ajo group structure
- `Contribution` - Payment tracking
- `Transaction` - Financial transactions
- `Notification` - User notifications
- Form data types

### 8. Hooks (`src/hooks/`)
**Purpose**: Custom React hooks

```typescript
src/hooks/
├── use-mobile.tsx     # Mobile detection
└── use-toast.ts       # Toast notifications
```

## Backend (`supabase/`)

### Database Configuration
```
supabase/
├── schema.sql         # Complete database schema
├── triggers.sql       # Database triggers
├── functions.sql      # PostgreSQL functions
├── views.sql          # Database views
├── storage.sql        # Storage bucket configuration
├── realtime.sql       # Real-time subscriptions
└── README.md          # Setup documentation
```

**Key Features**:
- Row Level Security (RLS) on all tables
- Automated triggers for data consistency
- Database functions for complex operations
- Materialized views for performance

### Main Tables
1. **users** - User accounts and profiles
2. **ajo_groups** - Ajo group information
3. **group_members** - Group membership
4. **contributions** - Payment tracking
5. **transactions** - Financial records
6. **payouts** - Distribution records
7. **penalties** - Late payment penalties
8. **notifications** - User notifications

## Development Workflow

### 1. Start Development Server
```bash
npm run dev
```
- Runs on port 3000
- Hot module replacement
- TypeScript type checking

### 2. Build for Production
```bash
npm run build
```
- TypeScript compilation
- Vite optimization
- Output to `dist/`

### 3. Preview Production Build
```bash
npm run preview
```
- Test production build locally

### 4. Lint Code
```bash
npm run lint
```
- ESLint checks
- TypeScript validation

## Environment Setup

### Required Environment Variables
```env
# Supabase (Public keys only)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Application
VITE_APP_NAME=Ajo Secure
VITE_APP_URL=http://localhost:3000

# Payments (Public key only)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxx
```

### Security Notes
- ✅ Only `VITE_*` prefixed variables are exposed to frontend
- ✅ Supabase anon key is public and safe for frontend
- ❌ Never put service role keys in frontend
- ❌ Never put payment secret keys in frontend

## Data Flow

### Example: User Creates Group

1. **User fills form** → `DashboardPage.tsx`
2. **Call API function** → `createGroup()` from `src/api/groups.ts`
3. **Supabase client** → Uses anon key (RLS protected)
4. **Database insert** → `ajo_groups` table with RLS check
5. **Trigger fires** → Creates group_members record
6. **Response returned** → Success/error to component
7. **UI updates** → Display new group

### Example: User Login

1. **User submits credentials** → `LoginPage.tsx`
2. **Call auth service** → `login()` from `src/services/auth.ts`
3. **Supabase Auth** → Validates credentials
4. **Session created** → JWT token stored
5. **Load profile** → Fetch from users table (RLS)
6. **Context updates** → AuthContext sets user state
7. **Redirect** → Navigate to dashboard

## Best Practices

### 1. API Calls
- Always use functions from `src/api/`
- Handle both success and error cases
- Show loading states
- Use TypeScript types

### 2. Authentication
- Check `useAuth()` hook for user state
- Protect routes with authentication checks
- Handle unauthenticated states gracefully

### 3. Error Handling
- Use ErrorBoundary for component errors
- Log errors appropriately
- Show user-friendly error messages

### 4. Type Safety
- Import types from `@/types`
- Avoid `any` type
- Use proper TypeScript practices

### 5. Code Organization
- Keep components small and focused
- Extract reusable logic to hooks
- Use context for global state
- Put business logic in API layer

## Integration Points

### Supabase
- **Authentication**: Handled by Supabase Auth
- **Database**: PostgreSQL with RLS
- **Storage**: File uploads (avatars, documents)
- **Real-time**: Live updates for groups

### Paystack
- **Frontend**: Initialize payments with public key
- **Backend**: Verify webhooks in Edge Functions
- **Security**: Secret key only in backend

## Adding New Features

### 1. Database Changes
1. Update `supabase/schema.sql`
2. Add RLS policies
3. Create triggers if needed
4. Run migrations

### 2. API Functions
1. Add function to `src/api/[feature].ts`
2. Define return types
3. Handle errors
4. Export from `src/api/index.ts`

### 3. UI Components
1. Create component in `src/components/`
2. Use shadcn/ui components
3. Follow existing patterns
4. Add proper TypeScript types

### 4. New Pages
1. Create page in `src/pages/`
2. Add route in `src/App.tsx`
3. Handle authentication if needed
4. Connect to API layer

## Deployment

### Frontend (Vercel/Netlify)
- Connect GitHub repository
- Set environment variables
- Deploy from main branch
- Automatic deployments on push

### Backend (Supabase)
- Already deployed in cloud
- No separate deployment needed
- Configure via Supabase dashboard
- Run SQL migrations when needed

## Troubleshooting

### Build Errors
- Run `npm install` to ensure dependencies
- Check TypeScript errors
- Verify imports are correct

### Runtime Errors
- Check browser console
- Verify environment variables
- Check Supabase connection
- Review RLS policies

### Authentication Issues
- Verify Supabase URL and key
- Check email confirmation settings
- Review RLS policies on users table

## Related Documentation

- [README.md](../README.md) - Quick start guide
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture details
- [src/api/README.md](../src/api/README.md) - API documentation
- [supabase/README.md](../supabase/README.md) - Database setup

## Summary

Smart Ajo is a well-structured, modern web application with:
- ✅ Clear separation of concerns
- ✅ Type-safe with TypeScript
- ✅ Secure with RLS policies
- ✅ Scalable architecture
- ✅ Single repository for easy development
- ✅ Comprehensive documentation

All backend logic is handled by Supabase, making this a true serverless application with no separate backend server to manage.
