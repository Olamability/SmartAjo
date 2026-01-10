# Authentication Flow Testing Guide

## Overview
This guide provides comprehensive testing procedures for the authentication flow after the recent improvements.

## Prerequisites

### Environment Setup
1. Ensure Supabase is configured correctly:
   ```bash
   # Check .env.development or create .env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_BYPASS_AUTH=false  # Important: should be false
   ```

2. Run the SQL migrations:
   ```sql
   -- In Supabase SQL Editor, run:
   -- 1. supabase/schema.sql (if not already run)
   -- 2. supabase/functions.sql (contains create_user_profile_atomic)
   -- 3. supabase/triggers.sql (if not already run)
   ```

3. Install dependencies and start dev server:
   ```bash
   npm install
   npm run dev
   ```

## Test Scenarios

### 1. New User Signup

#### Test Case 1.1: Successful Signup
**Steps:**
1. Navigate to `/signup`
2. Fill in the form:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Phone: "+1234567890"
   - Password: "password123"
   - Confirm Password: "password123"
3. Click "Create account"

**Expected Result:**
- ✅ Loading spinner appears
- ✅ User is redirected to `/dashboard`
- ✅ User profile is loaded
- ✅ Success toast appears: "Account created successfully! Redirecting to dashboard..."
- ✅ Dashboard shows user's full name
- ✅ In browser console:
  - "signUp: Starting signup for: test@example.com"
  - "signUp: Creating user profile in database"
  - "createUserProfileViaRPC: Profile created successfully"
  - "User signed in via auth state change, loading profile"

**If email confirmation is required:**
- ✅ Success toast: "Account created! Please check your email to confirm your account before signing in."
- ✅ Redirected to `/login` after 2 seconds
- ✅ Check email for confirmation link

#### Test Case 1.2: Duplicate Email
**Steps:**
1. Try signing up with an email that already exists
2. Submit the form

**Expected Result:**
- ✅ Error toast appears
- ✅ Error message indicates email is already in use
- ✅ User stays on signup page
- ✅ Loading state is reset

#### Test Case 1.3: Invalid Input
**Steps:**
1. Test each validation:
   - Short full name (< 2 chars)
   - Invalid email format
   - Short phone number (< 10 chars)
   - Short password (< 6 chars)
   - Mismatched passwords

**Expected Result:**
- ✅ Validation errors appear inline
- ✅ Form cannot be submitted
- ✅ Appropriate error messages shown

#### Test Case 1.4: Network Timeout (Simulated)
**Steps:**
1. Open browser DevTools
2. Throttle network to "Slow 3G"
3. Submit signup form

**Expected Result:**
- ✅ Loading spinner shows for longer
- ✅ Either succeeds after delay OR shows timeout error
- ✅ Error message: "Request timed out..."
- ✅ User can retry

### 2. User Login

#### Test Case 2.1: Successful Login
**Steps:**
1. Navigate to `/login`
2. Enter valid credentials
3. Click "Sign in"

**Expected Result:**
- ✅ Loading spinner appears
- ✅ Redirected to `/dashboard`
- ✅ User profile loaded
- ✅ Success toast: "Welcome back!"
- ✅ In console:
  - "login: Starting login for: [email]"
  - "login: Auth successful, waiting for profile to load..."
  - "Profile loaded, login complete"

#### Test Case 2.2: Invalid Credentials
**Steps:**
1. Enter wrong password
2. Click "Sign in"

**Expected Result:**
- ✅ Error toast appears
- ✅ Error message: "Invalid email or password"
- ✅ User stays on login page
- ✅ Loading state is reset

#### Test Case 2.3: Missing Profile (Edge Case)
**Steps:**
1. Create a user in Supabase Auth but don't create profile in users table
2. Try to log in

**Expected Result:**
- ✅ System detects missing profile
- ✅ Automatically creates profile from auth metadata
- ✅ User is logged in successfully
- ✅ In console:
  - "User profile not found, attempting to create from auth metadata"
  - "Profile created and loaded successfully"

### 3. Session Persistence

#### Test Case 3.1: Page Refresh While Logged In
**Steps:**
1. Log in successfully
2. Refresh the page (F5 or Ctrl+R)

**Expected Result:**
- ✅ User stays logged in
- ✅ Profile is loaded from existing session
- ✅ In console:
  - "Initializing auth context..."
  - "Found existing session, loading user profile..."
  - "Profile loaded successfully"

#### Test Case 3.2: Browser Restart (with cookies)
**Steps:**
1. Log in
2. Close browser
3. Reopen browser and navigate to app

**Expected Result:**
- ✅ User is still logged in (if session hasn't expired)
- ✅ Profile is loaded automatically

#### Test Case 3.3: Token Refresh
**Steps:**
1. Log in
2. Wait for 1 hour (token refresh interval)
3. Navigate around the app

**Expected Result:**
- ✅ Token is refreshed automatically
- ✅ In console: "Token refreshed, session updated (no profile reload needed)"
- ✅ Profile is NOT reloaded (optimization)
- ✅ User can continue using the app

### 4. Logout

#### Test Case 4.1: Normal Logout
**Steps:**
1. Click logout button (in header or user menu)
2. Observe the result

**Expected Result:**
- ✅ User is logged out
- ✅ Redirected to `/login` or homepage
- ✅ Session is cleared
- ✅ In console:
  - "logout: Starting logout process"
  - "logout: Successfully signed out"

#### Test Case 4.2: Logout Clears All State
**Steps:**
1. Log out
2. Try to navigate to `/dashboard` directly

**Expected Result:**
- ✅ Redirected to `/login`
- ✅ Protected routes are inaccessible

### 5. Protected Routes

#### Test Case 5.1: Accessing Protected Route When Not Logged In
**Steps:**
1. Ensure you're logged out
2. Navigate to `/dashboard` directly

**Expected Result:**
- ✅ Redirected to `/login`
- ✅ URL changes to `/login`

#### Test Case 5.2: Loading State on Protected Route
**Steps:**
1. Clear cache and cookies
2. Navigate to `/dashboard`

**Expected Result:**
- ✅ Loading spinner appears while checking auth
- ✅ Then redirected to `/login`

### 6. Race Condition Tests

#### Test Case 6.1: Multiple Concurrent Logins (Advanced)
**Steps:**
1. Open multiple tabs
2. Log in on one tab
3. Quickly switch to other tabs

**Expected Result:**
- ✅ Only one profile load happens
- ✅ All tabs show the same logged-in user
- ✅ In console: "Already loading profile, skipping duplicate request"

#### Test Case 6.2: Login During Initialization
**Steps:**
1. Have a valid session cookie
2. Refresh page
3. Quickly navigate during loading

**Expected Result:**
- ✅ No duplicate profile loads
- ✅ Smooth navigation after loading completes
- ✅ In console: "Auth state change (SIGNED_IN) during init, skipping to avoid race condition"

### 7. Error Recovery

#### Test Case 7.1: Profile Creation Failure
**Steps:**
1. Simulate database error (disable RLS temporarily)
2. Try to sign up

**Expected Result:**
- ✅ Error message appears
- ✅ Auth user is cleaned up (signed out)
- ✅ User can try again
- ✅ No broken state

#### Test Case 7.2: Network Error During Login
**Steps:**
1. Disconnect network
2. Try to log in

**Expected Result:**
- ✅ Timeout error appears
- ✅ User can retry when network is back
- ✅ Loading state is reset

### 8. Development Bypass (Security Test)

#### Test Case 8.1: Bypass Auth in Development
**Steps:**
1. Set `VITE_BYPASS_AUTH=true` in `.env.development`
2. Start dev server (`npm run dev`)
3. Navigate to `/dashboard` without logging in

**Expected Result:**
- ✅ Console warning: "⚠️ BYPASS_AUTH is enabled..."
- ✅ Can access dashboard without authentication
- ✅ Only works in dev mode

#### Test Case 8.2: Bypass Auth in Production (Should NOT Work)
**Steps:**
1. Build for production: `npm run build`
2. Set `VITE_BYPASS_AUTH=true` in environment
3. Serve production build
4. Try to access `/dashboard` without logging in

**Expected Result:**
- ✅ Redirected to `/login` (bypass does NOT work)
- ✅ No console warning
- ✅ Production is secure

## Performance Testing

### Test Case P.1: Fast Network
**Steps:**
1. Use normal network
2. Measure login time

**Expected Result:**
- ✅ Login completes in < 2 seconds
- ✅ Profile loads in < 1 second

### Test Case P.2: Slow Network
**Steps:**
1. Throttle to "Slow 3G" in DevTools
2. Try login

**Expected Result:**
- ✅ Login completes (may take longer)
- ✅ Retry logic works for transient errors
- ✅ Exponential backoff prevents server overload

## Browser Console Checklist

### Expected Logs (Normal Flow)

**Signup:**
```
signUp: Starting signup for: test@example.com
signUp: Creating user profile in database
createUserProfileViaRPC: Calling RPC with params: {...}
createUserProfileViaRPC: Profile created successfully
signUp: Signup complete. Session established...
User signed in via auth state change, loading profile
loadUserProfile: Loading profile for user: [uuid]
loadUserProfile: Profile loaded successfully
```

**Login:**
```
login: Starting login for: test@example.com
login: Auth successful, waiting for profile to load...
User signed in via auth state change, loading profile
loadUserProfile: Loading profile for user: [uuid]
loadUserProfile: Profile loaded successfully
Profile loaded, login complete
```

**Token Refresh:**
```
Token refreshed, session updated (no profile reload needed)
```

### ⚠️ Warning Logs to Investigate

- "Already loading profile, skipping duplicate request" (multiple times rapidly)
- "Transient error, will retry: ..." (more than 3 times)
- "Failed to create profile on auth state change"
- Any errors during normal operation

## Automated Testing (Future)

### Unit Tests
```javascript
// Example test structure (to be implemented)
describe('AuthContext', () => {
  it('should load profile only once', async () => {
    // Test concurrent load prevention
  });
  
  it('should handle missing profile', async () => {
    // Test profile creation fallback
  });
  
  it('should cleanup on error', async () => {
    // Test error recovery
  });
});
```

### Integration Tests
```javascript
// Example Playwright/Cypress test
test('user can sign up and log in', async ({ page }) => {
  await page.goto('/signup');
  // ... test steps
  expect(page.url()).toContain('/dashboard');
});
```

## Troubleshooting

### Issue: "User profile not found" error
**Solution:**
- Ensure `create_user_profile_atomic` function exists in database
- Check RLS policies allow user to read their own profile
- Verify user exists in auth.users table

### Issue: Infinite loading on login
**Solution:**
- Check network tab for failed requests
- Verify Supabase URL and keys are correct
- Check browser console for errors
- Try clearing cache and cookies

### Issue: "Session user mismatch" error
**Solution:**
- Clear all cookies and cache
- Log out and log back in
- Check if session is corrupted

### Issue: Profile loaded multiple times
**Solution:**
- This should not happen after the fixes
- If it does, check for concurrent auth state changes
- Review recent code changes

## Success Criteria

A successful authentication flow should have:

- ✅ No race conditions (single profile load)
- ✅ Proper error handling (all errors caught and handled)
- ✅ State cleanup (no broken states)
- ✅ Fast performance (< 2 seconds on normal network)
- ✅ Secure (BYPASS_AUTH only in dev, RLS enforced)
- ✅ User-friendly (clear error messages, loading indicators)
- ✅ Reliable (works consistently across browsers)

## Reporting Issues

If you find any issues:

1. Document the steps to reproduce
2. Include browser console logs
3. Include network tab screenshot
4. Note environment (dev/prod, browser version)
5. Create an issue with all information

---

**Last Updated**: 2026-01-10
**Maintainer**: @Olamability
