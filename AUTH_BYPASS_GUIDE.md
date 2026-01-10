# Authentication Bypass Guide

## ⚠️  TEMPORARY DEVELOPMENT FEATURE

This guide explains how to temporarily bypass authentication to access the dashboard and test the UI while authentication issues are being resolved.

## Purpose

The authentication bypass feature allows developers to:
- Access and test the dashboard UI without a working login
- Verify dashboard functionality independently of authentication
- Continue development on other features while auth issues are being fixed
- Test UI layouts and components in protected routes

## ⚠️  IMPORTANT WARNINGS

- **NEVER enable this in production**
- **NEVER commit `.env` files with bypass enabled**
- **ONLY use during local development**
- This is a temporary measure - fix authentication issues as soon as possible
- Some features requiring real user data will not work in bypass mode

## How to Enable

### Step 1: Update Environment Variable

Edit your `.env.development` or `.env` file and set:

```env
VITE_BYPASS_AUTH=true
```

### Step 2: Restart Development Server

Stop your dev server (Ctrl+C) and restart it:

```bash
npm run dev
```

### Step 3: Access Protected Routes

You can now navigate directly to protected routes:
- http://localhost:3000/dashboard
- http://localhost:3000/groups
- http://localhost:3000/groups/create

No login required!

## What Works in Bypass Mode

✅ **Fully Functional:**
- Dashboard UI display
- Navigation between protected pages
- UI component rendering
- Page layouts and styling

⚠️  **Limited Functionality:**
- Mock user data is displayed
- No real API calls to Supabase
- Cannot load actual groups or user data
- Cannot create groups or make contributions

❌ **Does Not Work:**
- Actual data persistence
- Real Supabase queries
- File uploads
- Payment processing
- Any feature requiring authenticated API calls

## How to Disable

### Step 1: Update Environment Variable

Edit your `.env.development` or `.env` file and set:

```env
VITE_BYPASS_AUTH=false
```

Or simply remove/comment out the line:

```env
# VITE_BYPASS_AUTH=true
```

### Step 2: Restart Development Server

```bash
npm run dev
```

Authentication will now work normally.

## Visual Indicators

When bypass mode is active, you'll see:
- A yellow warning banner at the top of protected pages
- Console warning: "⚠️  AUTHENTICATION BYPASS ACTIVE"
- Mock user data with name "Demo User (Bypass Mode)"

## Technical Details

### Implementation

The bypass check is implemented in:

1. **ProtectedRoute Component** (`src/components/ProtectedRoute.tsx`)
   - Checks `VITE_BYPASS_AUTH` environment variable
   - Skips authentication check if enabled
   - Logs warning to console

2. **Dashboard Page** (`src/pages/DashboardPage.tsx`)
   - Displays mock user data when no real user exists
   - Shows warning banner when bypass is active
   - Handles logout gracefully in bypass mode

3. **Groups Page** (`src/pages/GroupsPage.tsx`)
   - Skips API calls in bypass mode
   - Shows appropriate messaging
   - Displays warning banner

### Mock User Data

When bypass is active and no real user exists, the following mock data is used:

```typescript
{
  id: 'mock-user-id',
  email: 'demo@example.com',
  phone: '+234-XXX-XXX-XXXX',
  fullName: 'Demo User (Bypass Mode)',
  createdAt: new Date().toISOString(),
  isVerified: false,
  kycStatus: 'Not started',
  bvn: undefined,
  profileImage: undefined,
}
```

## Security Considerations

1. **Environment Variable Safety**
   - `VITE_BYPASS_AUTH` is a frontend variable (exposed to browser)
   - Backend/Supabase security (RLS) is NOT bypassed
   - Only the frontend routing protection is bypassed

2. **Production Safety**
   - Default value in `.env.example` is `false`
   - Not set in production builds
   - Backend security remains intact

3. **Git Safety**
   - `.env` files are in `.gitignore`
   - Only `.env.example` is committed
   - `.env.example` has bypass set to `false`

## When to Use

✅ **Good Reasons:**
- Testing dashboard UI changes
- Developing new dashboard features
- Debugging layout issues
- While waiting for auth fix to be deployed

❌ **Bad Reasons:**
- Avoiding fixing authentication issues
- Permanent solution
- Testing authentication-dependent features
- Production deployments

## Troubleshooting

### Bypass Not Working

1. Check environment variable is set correctly:
   ```env
   VITE_BYPASS_AUTH=true
   ```

2. Restart dev server completely

3. Check browser console for warning message

4. Clear browser cache and reload

### Still Being Redirected to Login

1. Verify `.env.development` or `.env` file exists
2. Check that file is in project root directory
3. Ensure no typos in variable name
4. Try setting it in both `.env` and `.env.development`

### Features Not Working in Bypass Mode

This is expected! Bypass mode only allows UI access. Features requiring real data need actual authentication.

## Restoring Normal Authentication

Once authentication issues are resolved:

1. Set `VITE_BYPASS_AUTH=false` (or remove the line)
2. Restart dev server
3. Test login flow completely
4. Verify all protected routes work with real auth
5. Remove bypass-related warning messages if desired (optional)

## Related Documentation

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General troubleshooting
- [AUTH_FIX_SUMMARY.md](./AUTH_FIX_SUMMARY.md) - Authentication improvements
- [LOGIN_FIX_SUMMARY.md](./LOGIN_FIX_SUMMARY.md) - Login issue fixes
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Complete architecture guide

## Questions?

If you're using bypass mode because authentication isn't working, please:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions
2. Review console logs for error messages
3. Verify Supabase configuration
4. Check database migrations are applied

Remember: This is a temporary development tool. The goal is to fix authentication, not to work around it permanently! 🎯
