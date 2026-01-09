# Architecture Overview

## System Architecture

This project uses a **modern serverless architecture** with a strict client-server separation:

```
┌─────────────────────────────────────────────────────────┐
│                   Secured Ajo Platform                  │
│                                                          │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │   Frontend (Vite)    │    │  Backend (Supabase)  │  │
│  │   Port: 3000         │    │  Cloud Platform      │  │
│  │   React + TypeScript │◄───┤  - PostgreSQL DB     │  │
│  │   Browser Client     │    │  - Row Level Security│  │
│  │   Anon Key Only      │    │  - Auth & Storage    │  │
│  └──────────────────────┘    │  - Edge Functions    │  │
│                               └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Build Tool**: Vite
- **Framework**: React 18
- **Language**: TypeScript
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State Management**: React Query (TanStack Query)
- **Form Handling**: React Hook Form + Zod

### Backend
- **Platform**: Supabase (Complete Backend-as-a-Service)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Serverless Functions**: Supabase Edge Functions (when needed)

### Payments
- **Provider**: Paystack
- **Integration**: Public key in frontend, secret key in Supabase Edge Functions

## Key Architectural Principles

### 1. No Traditional Backend Server
- **No Express.js or Node.js backend**
- **No API server running on port 3001**
- All backend logic is handled by Supabase

### 2. Security Model
- Frontend uses **Supabase anon key** (browser-safe, public)
- Backend logic uses **Supabase service role key** (only in Edge Functions)
- All data access controlled by **Row Level Security (RLS)** policies
- Authentication managed entirely by Supabase Auth

### 3. Client-Server Communication
- Frontend communicates directly with Supabase client library
- No REST API endpoints in the traditional sense
- Database queries run through Supabase client with RLS enforcement
- Sensitive operations handled by Supabase Edge Functions or RPC

## Project Structure

```
secured-ajo/
├── src/                          # Frontend Application
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── ErrorBoundary.tsx
│   │   └── Providers.tsx
│   │
│   ├── pages/                    # Page components
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── DashboardPage.tsx
│   │
│   ├── contexts/                 # React contexts
│   │   └── AuthContext.tsx
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   └── useSupabase.ts
│   │
│   ├── services/                 # Frontend services
│   │   ├── auth.service.ts
│   │   └── groups.service.ts
│   │
│   ├── lib/                      # Utilities and libraries
│   │   ├── client/               # Browser-safe client code
│   │   │   └── supabase.ts       # Supabase client (anon key)
│   │   ├── constants/            # Constants
│   │   ├── utils/                # Utility functions
│   │   ├── errors.ts             # Error classes
│   │   └── utils.ts              # Common utilities
│   │
│   ├── types/                    # TypeScript type definitions
│   │
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Application entry point
│   └── index.css                 # Global styles
│
├── supabase/                     # Supabase Configuration
│   ├── schema.sql                # Database schema with RLS policies
│   ├── storage.sql               # Storage bucket setup
│   └── README.md                 # Supabase setup documentation
│
├── public/                       # Static assets
│
├── .env.example                  # Environment variables template
├── index.html                    # HTML entry point
├── vite.config.ts                # Vite configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

## Development Workflow

### Starting Development
```bash
# Install dependencies
npm install

# Start Vite dev server (port 3000)
npm run dev
```

**Single process only**: Just the Vite development server.

### Building for Production
```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

## Environment Variables

### Frontend Environment (`.env`)
All environment variables must be prefixed with `VITE_` to be accessible in the frontend.

```env
# Supabase Configuration (Public keys only)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Application Settings
VITE_APP_NAME=Ajo Secure
VITE_APP_URL=http://localhost:3000

# Payment Integration (Public key only)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here
```

**Security Note**: Never put service role keys or secrets in frontend environment variables.

## Data Flow Example: User Login

1. **User submits login form**
   ```typescript
   // Frontend: src/services/auth.service.ts
   const { data, error } = await supabase.auth.signInWithPassword({
     email,
     password
   });
   ```

2. **Supabase handles authentication**
   - Validates credentials
   - Creates session
   - Returns JWT token

3. **Frontend stores session**
   - Supabase client automatically handles session storage
   - JWT token stored in browser (httpOnly cookies or localStorage)

4. **Subsequent requests authenticated**
   - Supabase client automatically includes JWT
   - RLS policies enforce data access rules

## Security Features

### Row Level Security (RLS)
All database tables have RLS enabled with policies that:
- Users can only access their own data
- Group members can only see data for groups they belong to
- All policies defined in `/supabase/schema.sql`

### Authentication
- Handled entirely by Supabase Auth
- Email/password authentication
- Email verification
- Password reset flows
- Session management

### Data Access
- Frontend uses anon key (public, limited permissions)
- All database access controlled by RLS policies
- Sensitive operations in Supabase Edge Functions (service role key)

### File Uploads
- Managed through Supabase Storage
- Bucket policies control access
- Secure file URLs with expiration

## Deployment

### Frontend Deployment
- Deploy to Vercel, Netlify, or any static hosting
- Build command: `npm run build`
- Output directory: `dist`

### Backend Configuration
- Already deployed (Supabase cloud)
- Configure environment variables in hosting platform
- Set up custom domain (optional)

## Troubleshooting

### Build Errors
- Ensure all dependencies installed: `npm install`
- Check TypeScript configuration
- Verify all imports are correct

### Cannot Connect to Supabase
- Verify `.env` file has correct Supabase URL and anon key
- Check Supabase project is running
- Ensure RLS policies are configured
- Check browser console for errors

### Authentication Issues
- Verify email confirmation settings in Supabase Auth
- Check RLS policies on auth tables
- Ensure anon key has proper permissions

## Key Differences from Traditional Architecture

### What This App DOES NOT Have:
- ❌ Express.js or Node.js backend server
- ❌ Separate API server on port 3001
- ❌ REST API endpoints in `/api` routes
- ❌ Backend controllers or route handlers
- ❌ Direct database connection from Node.js
- ❌ `concurrently` package for running multiple processes

### What This App DOES Have:
- ✅ Single Vite dev server (port 3000)
- ✅ Direct Supabase client integration
- ✅ Row Level Security for data protection
- ✅ Supabase Edge Functions for sensitive operations
- ✅ Serverless architecture
- ✅ Modern React + TypeScript frontend

## Best Practices

1. **Never expose service role key** in frontend code or environment variables
2. **Always use RLS policies** to control data access
3. **Use Supabase Edge Functions** for operations requiring elevated permissions
4. **Validate user input** on both client and database level
5. **Handle errors gracefully** with proper error boundaries
6. **Use TypeScript** for type safety
7. **Follow React best practices** for component design
8. **Leverage Supabase features** instead of building custom backend

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
