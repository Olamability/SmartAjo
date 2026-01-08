# Signup Rate Limiting and Security Fix

## Problem Statement

The signup flow had two critical issues:

1. **Rate Limiting (429 Error)**: Users were encountering `429 Too Many Requests` errors with the message "For security purposes, you can only request this after 8 seconds." This was caused by duplicate signup requests being sent to Supabase Auth.

2. **Security Vulnerability**: The LoginPage was logging the entire form data including the password in plaintext to the console (`console.log('Login form submitted', data)`), exposing sensitive user credentials.

## Root Cause Analysis

### Rate Limiting Issue
- The signup form submission handler (`onSubmit`) could be called multiple times if:
  - User double-clicks the submit button
  - Form is submitted multiple times due to React state updates
  - Network latency causes user to retry
- Supabase Auth enforces an 8-second rate limit on signup attempts for security
- No mechanism existed to prevent duplicate submissions

### Security Issue  
- `LoginPage.tsx` line 43 had: `console.log('Login form submitted', data)`
- This logged the entire form object including `{ email, password }` in plaintext
- Browser console logs are accessible in production and could expose credentials
- Error objects throughout the codebase might contain sensitive data

## Solutions Implemented

### 1. Prevent Duplicate Signup Submissions

**File**: `src/pages/SignupPage.tsx`

Added a ref-based debouncing mechanism:
```typescript
const isSubmittingRef = useRef(false);

const onSubmit = async (data: SignUpForm) => {
  // Prevent multiple simultaneous signup attempts
  if (isSubmittingRef.current) {
    console.warn('Signup already in progress, ignoring duplicate submission');
    return;
  }

  isSubmittingRef.current = true;
  setIsLoading(true);
  
  try {
    await signUp({ ... });
    // ... success handling
  } catch (error) {
    // ... error handling
  } finally {
    // Always reset the submitting flag
    if (isMountedRef.current) {
      isSubmittingRef.current = false;
    }
  }
};
```

**Benefits**:
- Prevents duplicate API calls to Supabase Auth
- Eliminates 429 rate limiting errors from multiple submissions
- Uses ref instead of state to avoid re-renders
- Properly resets flag in finally block and on unmount

### 2. Improved Rate Limit Error Messaging

**File**: `src/pages/SignupPage.tsx`

Added user-friendly error messages for rate limiting:
```typescript
const errorMessage = getErrorMessage(error, 'Failed to create account');

// Check for rate limiting error and provide helpful message
if (errorMessage.includes('429') || 
    errorMessage.includes('Too Many Requests') || 
    errorMessage.includes('8 seconds')) {
  toast.error('Please wait a moment before trying again. For security, signup attempts are rate-limited.');
} else {
  toast.error(errorMessage);
}
```

### 3. Remove Sensitive Data from Console Logs

**Files Changed**:
- `src/pages/LoginPage.tsx`
- `src/pages/SignupPage.tsx`  
- `src/contexts/AuthContext.tsx`
- `src/services/auth.ts`

**Changes Made**:

1. **Removed password logging in LoginPage**:
   ```typescript
   // BEFORE (SECURITY ISSUE):
   console.log('Login form submitted', data); // Logged { email, password }
   
   // AFTER (SECURE):
   // Removed line completely
   ```

2. **Sanitized error logging**:
   ```typescript
   // BEFORE:
   console.error('Login error:', error); // Could contain sensitive data
   
   // AFTER:
   console.error('Login error:', error instanceof Error ? error.message : 'Unknown error');
   ```

3. **Minimal error logging in auth services**:
   ```typescript
   // BEFORE:
   console.error('Signup auth error:', authError); // Full error object
   
   // AFTER:
   console.error('Signup auth error:', {
     message: authError.message,
     status: authError.status,
   });
   ```

## Security Best Practices Applied

1. **Never log sensitive data**: Passwords, tokens, or full user objects should never be logged
2. **Minimal error logging**: Only log necessary error information (message, status code)
3. **Production-safe logging**: Console logs should assume they're visible in production
4. **Structured error data**: Log only specific fields needed for debugging

## Testing Recommendations

### Manual Testing Steps

1. **Test Rate Limiting Protection**:
   - Navigate to signup page
   - Fill in the form
   - Rapidly click "Create account" button multiple times
   - Expected: Only one signup request sent, no 429 errors
   - Verify in Network tab: Only one POST to `/auth/v1/signup`

2. **Test Error Messages**:
   - Try to sign up with an existing email immediately after signup
   - Expected: User-friendly rate limit message if within 8 seconds
   - Verify message: "Please wait a moment before trying again..."

3. **Verify No Sensitive Data in Console**:
   - Open browser DevTools Console
   - Attempt login with test credentials
   - Verify password is NOT logged anywhere
   - Check that error logs only show message/status, not full objects

### Automated Testing (Future)

If test infrastructure is added, recommended tests:

```typescript
describe('SignupPage', () => {
  it('should prevent duplicate submissions', async () => {
    // Render SignupPage
    // Fill form
    // Click submit multiple times rapidly
    // Assert: signUp called only once
  });

  it('should show rate limit message for 429 errors', async () => {
    // Mock signUp to throw 429 error
    // Submit form
    // Assert: Correct toast message shown
  });

  it('should not log sensitive data', () => {
    // Spy on console methods
    // Submit form with password
    // Assert: Password not in any console call
  });
});
```

## Impact

### Security
- ✅ **Critical**: Removed password logging vulnerability
- ✅ **High**: Sanitized all auth error logging
- ✅ **Medium**: Reduced attack surface by limiting exposed error data

### User Experience  
- ✅ **High**: Eliminated frustrating 429 rate limit errors
- ✅ **Medium**: Added clear, helpful error messages
- ✅ **Medium**: Improved form stability and responsiveness

### Code Quality
- ✅ Consistent error handling patterns across auth flows
- ✅ Proper cleanup of refs on component unmount
- ✅ Better separation of concerns (logging vs business logic)

## Files Modified

1. `src/pages/SignupPage.tsx` - Added submission debouncing, improved error handling
2. `src/pages/LoginPage.tsx` - Removed sensitive logging, sanitized error logs
3. `src/contexts/AuthContext.tsx` - Sanitized error logging
4. `src/services/auth.ts` - Sanitized error logging

## Related Issues

- Rate limiting: Supabase enforces 8-second intervals on auth operations for security
- Error exposure: Full error objects can contain sensitive request/response data
- React state: Using refs instead of state for submission flags avoids re-render issues

## Future Improvements

1. **Rate Limiting UI**: Show countdown timer after signup attempt
2. **Error Tracking**: Send sanitized errors to error monitoring service (Sentry)
3. **Request Deduplication**: Add global request cache to prevent any duplicate API calls
4. **Form Validation**: Add client-side email format check before submission
5. **Test Coverage**: Add unit and integration tests for auth flows

## References

- [Supabase Auth Rate Limiting](https://supabase.com/docs/guides/auth/rate-limiting)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [React useRef Hook](https://react.dev/reference/react/useRef)
