# User Registration Flow - Visual Diagram

## Before Fix (BROKEN) ❌

```
User submits signup form
         |
         v
    [Supabase Auth]
    Creates user in auth.users ✓
         |
         v
    [RPC: create_user_profile]
    Tries to create profile in public.users
         |
         +---> If email confirmation required:
         |     - No active session yet
         |     - RPC call may hang/fail ❌
         |     - Loading spinner stuck ❌
         |
         v
    [Check if confirmation needed]
    Too late! Already stuck above ❌
```

## After Fix (WORKING) ✅

```
User submits signup form
         |
         v
    [Supabase Auth]
    Creates user in auth.users ✓
         |
         v
    [Check if confirmation needed] ← MOVED HERE!
         |
         +---> YES → Exit immediately with message ✓
         |           User redirected to login ✓
         |           Profile will be created later ✓
         |
         +---> NO → Continue below
         |
         v
    [RPC: create_user_profile]
    Creates profile in public.users ✓
    (Only called when session exists)
         |
         v
    User redirected to dashboard ✓
```

## Email Confirmation Flow

```
1. USER SIGNS UP
   [Signup Page]
        |
        v
   [Creates auth.users entry] ✓
        |
        v
   [Detects confirmation needed]
        |
        v
   [Shows success message]
        |
        v
   [Redirects to login page] ✓


2. USER CONFIRMS EMAIL
   [User clicks email link]
        |
        v
   [Email verified in auth.users]
        |
        v
   [User redirected to app]
        |
        v
   [SIGNED_IN event fires]


3. PROFILE AUTO-CREATED
   [SIGNED_IN event handler]
        |
        v
   [Tries loadUserProfile]
        |
        v
   [Profile not found - ERROR]
        |
        v
   [Calls ensureUserProfile] ← FALLBACK!
        |
        v
   [RPC: create_user_profile]
        |
        v
   [Creates public.users entry] ✓
        |
        v
   [Loads profile successfully] ✓
        |
        v
   [User logged in!] ✓
```

## Fallback Mechanisms

The code has 3 places that can create missing profiles:

```
┌─────────────────────────────────────────┐
│  1. SIGNED_IN Event Handler             │
│     (When user signs in after confirm)  │
│     ↓                                    │
│     ensureUserProfile()                 │
│     ↓                                    │
│     RPC: create_user_profile            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  2. Login Function                      │
│     (When user manually logs in)        │
│     ↓                                    │
│     ensureUserProfile()                 │
│     ↓                                    │
│     RPC: create_user_profile            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  3. Token Refresh Handler               │
│     (When session token is refreshed)   │
│     ↓                                    │
│     loadUserProfile()                   │
│     ↓                                    │
│     (Loads existing profile)            │
└─────────────────────────────────────────┘
```

## Database State

### Before Confirmation
```
auth.users:
+----------+-------------------+---------------------+
| id       | email             | email_confirmed_at  |
+----------+-------------------+---------------------+
| uuid-123 | user@example.com  | NULL                |
+----------+-------------------+---------------------+

public.users:
(empty - no entry yet) ← This is expected!
```

### After Confirmation + Login
```
auth.users:
+----------+-------------------+---------------------+
| id       | email             | email_confirmed_at  |
+----------+-------------------+---------------------+
| uuid-123 | user@example.com  | 2026-01-09 10:30:00 |
+----------+-------------------+---------------------+

public.users:
+----------+-------------------+-----------+---------------+
| id       | email             | full_name | phone         |
+----------+-------------------+-----------+---------------+
| uuid-123 | user@example.com  | John Doe  | +1234567890   |
+----------+-------------------+-----------+---------------+
                                ↑
                        Now created! ✓
```

## Key Points

1. ✅ **Check confirmation requirement FIRST**
   - Prevents attempting profile creation without session
   - Avoids hanging RPC calls

2. ✅ **Profile created when user logs in**
   - Automatic via fallback mechanisms
   - Multiple retry opportunities

3. ✅ **Loading spinner no longer stuck**
   - Error thrown immediately when confirmation needed
   - UI properly updated and redirects

4. ✅ **Data integrity maintained**
   - auth.users created during signup
   - public.users created after confirmation + login
   - All data properly synchronized
