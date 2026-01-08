# Manual Testing Guide for Signup Fix

## Prerequisites

### 1. Ensure Database Migration is Applied

Run these verification queries in Supabase SQL Editor:

```sql
-- Verify trigger function exists
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
-- Expected: Returns 1 row with 'handle_new_user'

-- Verify trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- Expected: Returns 1 row with 'on_auth_user_created'

-- Verify RLS policy exists
SELECT policyname FROM pg_policies 
WHERE tablename = 'users' AND policyname = 'users_insert_own';
-- Expected: Returns 1 row with 'users_insert_own'
```

If any query returns no rows, run the migration:
```bash
# File: supabase/migrations/2026-01-08-add-user-creation-trigger.sql
```

### 2. Environment Setup

Ensure `.env` file has valid credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Start Development Server

```bash
npm install
npm run dev
```

Server should start at: http://localhost:3000

## Test Cases

### Test 1: Normal Signup (Happy Path) ✅

**Objective**: Verify successful account creation with all data properly saved

**Steps:**
1. Open browser to `http://localhost:3000/signup`
2. Fill in the form:
   - **Full Name**: `Test User`
   - **Email**: `test+1@example.com` (use your real domain)
   - **Phone**: `+234 800 000 0001`
   - **Password**: `TestPassword123`
   - **Confirm Password**: `TestPassword123`
3. Click "Create account"

**Expected Results:**
- ✅ Button shows loading spinner with text "Creating account..."
- ✅ Spinner appears for 0.1-1.5 seconds (normal trigger completion time)
- ✅ Success toast appears: "Account created successfully!"
- ✅ User is redirected to `/dashboard`
- ✅ User can see their name in the dashboard
- ✅ No errors in browser console (F12)

**Verify in Database:**
```sql
-- Check auth.users
SELECT id, email, 
       raw_user_meta_data->>'full_name' as full_name,
       raw_user_meta_data->>'phone' as phone
FROM auth.users 
WHERE email = 'test+1@example.com';
-- Expected: 1 row with correct email, full_name, phone

-- Check public.users
SELECT id, email, phone, full_name, 
       is_verified, is_active, kyc_status, created_at
FROM public.users 
WHERE email = 'test+1@example.com';
-- Expected: 1 row with matching id, correct data, is_active=true
```

**Cleanup:**
```sql
-- Delete test user (run after verification)
DELETE FROM auth.users WHERE email = 'test+1@example.com';
-- Note: CASCADE delete will also remove from public.users
```

---

### Test 2: Duplicate Email ✅

**Objective**: Verify proper handling of duplicate email addresses

**Steps:**
1. Create a user with email `test+2@example.com` (use Test 1 steps)
2. Try to create another account with same email
3. Fill different phone number: `+234 800 000 0002`

**Expected Results:**
- ✅ Error message appears: "User already registered" or similar
- ✅ Spinner stops
- ✅ User remains on signup page
- ✅ Form is still editable
- ✅ No account created in database

**Verify in Database:**
```sql
SELECT COUNT(*) FROM auth.users WHERE email = 'test+2@example.com';
-- Expected: 1 (only the first account)
```

**Cleanup:**
```sql
DELETE FROM auth.users WHERE email = 'test+2@example.com';
```

---

### Test 3: Duplicate Phone Number ✅

**Objective**: Verify unique constraint on phone numbers

**Steps:**
1. Create a user with phone `+234 800 000 0003`
2. Try to create another account with same phone
3. Use different email: `test+3b@example.com`

**Expected Results:**
- ✅ Error message appears about duplicate phone
- ✅ Spinner stops
- ✅ User remains on signup page
- ✅ Can retry with different phone number

**Verify in Database:**
```sql
SELECT COUNT(*) FROM public.users WHERE phone = '+234 800 000 0003';
-- Expected: 1 (only the first account)
```

**Cleanup:**
```sql
DELETE FROM auth.users WHERE email LIKE 'test+3%@example.com';
```

---

### Test 4: Form Validation ✅

**Objective**: Verify client-side form validation

**Test 4a: Short Full Name**
- Enter: `A` (less than 2 characters)
- Expected: Validation error: "Full name must be at least 2 characters"
- Form cannot be submitted

**Test 4b: Invalid Email**
- Enter: `notanemail`
- Expected: Validation error: "Invalid email address"

**Test 4c: Short Phone**
- Enter: `123` (less than 10 characters)
- Expected: Validation error: "Phone number must be at least 10 characters"

**Test 4d: Weak Password**
- Enter: `12345` (less than 6 characters)
- Expected: Validation error: "Password must be at least 6 characters"

**Test 4e: Password Mismatch**
- Password: `TestPassword123`
- Confirm: `DifferentPassword`
- Expected: Validation error: "Passwords don't match"

---

### Test 5: Slow Network / Trigger Delay ✅

**Objective**: Verify retry logic handles slow database operations

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Set throttling to "Slow 3G"
4. Attempt signup with valid data

**Expected Results:**
- ✅ Spinner shows for longer duration (up to 1.5 seconds)
- ✅ Signup eventually succeeds
- ✅ Profile is loaded correctly
- ✅ No errors or stuck spinner

**Note**: If you see console warnings about "attempting manual insert", this means the trigger took longer than expected, but the fallback worked correctly.

---

### Test 6: Network Failure ✅

**Objective**: Verify proper error handling for network issues

**Steps:**
1. Disconnect internet or set DevTools to "Offline"
2. Attempt signup

**Expected Results:**
- ✅ Error message appears about network failure
- ✅ Spinner stops
- ✅ User can retry after reconnecting
- ✅ No browser crashes or infinite loading

---

### Test 7: Invalid Supabase Credentials ✅

**Objective**: Verify error handling for configuration issues

**Steps:**
1. Edit `.env` and set invalid `VITE_SUPABASE_URL`
2. Restart dev server
3. Attempt signup

**Expected Results:**
- ✅ Clear error message about configuration
- ✅ Error is logged to console
- ✅ User sees friendly error message

---

### Test 8: Concurrent Signups ✅

**Objective**: Verify system handles multiple simultaneous signups

**Steps:**
1. Open 3 browser tabs to signup page
2. Fill different data in each tab
3. Click "Create account" in all tabs quickly (within 1 second)

**Expected Results:**
- ✅ All 3 accounts created successfully
- ✅ No duplicate key errors
- ✅ Each user gets redirected to their own dashboard

**Verify in Database:**
```sql
SELECT email, phone, full_name, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 3;
-- Expected: 3 rows with unique emails and phones
```

---

### Test 9: Component Unmount During Signup ✅

**Objective**: Verify cleanup on component unmount

**Steps:**
1. Fill signup form
2. Click "Create account"
3. Immediately click browser back button while spinner is showing

**Expected Results:**
- ✅ No errors in console
- ✅ No memory leaks
- ✅ Account may or may not be created (race condition)
- ✅ If created, user can login normally

---

### Test 10: Signup After Previous Error ✅

**Objective**: Verify form recovers properly after errors

**Steps:**
1. Attempt signup with invalid email
2. See validation error
3. Fix email and try again
4. Get duplicate email error
5. Change email and try again

**Expected Results:**
- ✅ Each error is shown clearly
- ✅ Form remains functional after each error
- ✅ Final attempt succeeds
- ✅ Loading state properly resets after each error

---

## Performance Benchmarks

### Typical Signup Times

| Scenario | Expected Time | Max Acceptable |
|----------|--------------|----------------|
| Normal (trigger works immediately) | 100-300ms | 500ms |
| Slow (1 retry) | 300-500ms | 1s |
| Very slow (multiple retries) | 500-1500ms | 2s |
| Fallback (manual insert) | 1500-2000ms | 3s |

### Monitoring During Tests

Watch browser console for these logs:
- No warnings = Trigger worked perfectly
- `"attempting manual insert"` = Trigger was slow, fallback used (OK)
- `"Error checking profile"` = Potential issue, investigate

---

## Common Issues and Solutions

### Issue: "Missing Supabase environment variables"
**Solution**: Check `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Issue: "User already registered" immediately
**Solution**: Clean up test data from previous runs

### Issue: Spinner never stops
**Potential causes:**
1. Network is offline - check internet connection
2. Invalid Supabase credentials - verify `.env`
3. Database trigger not applied - run migration
4. RLS policies blocking access - verify policies

**Debug steps:**
1. Open browser console (F12)
2. Check Network tab for failed requests
3. Look for error messages
4. Verify Supabase dashboard is accessible

### Issue: "duplicate key value violates unique constraint"
**Solution**: 
- This means trigger worked but is being too strict
- Check if unique constraints on email/phone are causing issues
- Clean up test data

---

## Success Criteria

All tests pass if:
- ✅ Normal signup completes in < 1 second
- ✅ Clear error messages for all failure cases
- ✅ No stuck spinners
- ✅ No console errors (except expected network failures)
- ✅ Data correctly saved in both auth.users and public.users
- ✅ User can login immediately after signup
- ✅ Dashboard shows correct user information

---

## Reporting Issues

If any test fails, report:
1. **Test number** (e.g., "Test 1: Normal Signup")
2. **Browser** (Chrome, Firefox, Safari, etc.)
3. **Console errors** (screenshot or copy/paste)
4. **Network tab** (any failed requests)
5. **Database state** (run verification queries)
6. **Expected vs actual** behavior

---

## Cleanup After Testing

Remove all test accounts:
```sql
-- Be careful with this query!
DELETE FROM auth.users 
WHERE email LIKE 'test+%@example.com';

-- Verify cleanup
SELECT COUNT(*) FROM auth.users WHERE email LIKE 'test+%@example.com';
-- Expected: 0
```

---

## Next Steps After Testing

1. If all tests pass ✅:
   - Mark issue as resolved
   - Deploy to staging environment
   - Run tests again in staging
   - Deploy to production

2. If any tests fail ❌:
   - Document the failure
   - Review error logs
   - Fix the issue
   - Re-run failed test
   - Run full test suite again
