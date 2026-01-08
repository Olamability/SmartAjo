# Authentication Testing Guide

## Quick Test (5 minutes)

### Prerequisites
1. Ensure your Supabase project is running
2. Database schema is applied (`supabase/schema.sql`)
3. `.env` file has correct credentials

### Test Signup Flow
1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/signup`
3. Fill in the form:
   - Full Name: `Test User`
   - Email: `test@example.com` (use a unique email)
   - Phone: `1234567890` (at least 10 digits)
   - Password: `TestPass123` (at least 6 characters)
   - Confirm Password: `TestPass123`
4. Click "Create account"
5. **Expected**: You should see a success toast and be redirected to `/dashboard`

### Test Login Flow
1. Navigate to `http://localhost:3000/login`
2. Enter the credentials you just created:
   - Email: `test@example.com`
   - Password: `TestPass123`
3. Click "Sign in"
4. **Expected**: You should see "Welcome back!" toast and be redirected to `/dashboard`

## Troubleshooting

### "Failed to fetch" Error
**Cause**: Cannot connect to Supabase
**Solutions**:
- Check your internet connection
- Verify `VITE_SUPABASE_URL` in `.env` is correct
- Verify `VITE_SUPABASE_ANON_KEY` in `.env` is correct
- Check if Supabase project is paused (free tier auto-pauses after inactivity)
- Visit your Supabase project dashboard to wake it up

### Form Doesn't Submit (No Error)
**Cause**: This was the bug that was fixed!
**Solution**: Make sure you've pulled the latest changes from this PR

### Database Error After Signup
**Causes**:
1. Schema not applied
2. RLS policies not configured correctly
3. Trigger not created

**Solutions**:
1. Run the full schema: 
   ```sql
   -- Copy and run supabase/schema.sql in Supabase SQL Editor
   ```
2. Verify the `on_auth_user_created` trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
3. Check RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';
   ```

### User Already Exists
**Cause**: Email already registered
**Solutions**:
- Use a different email address
- Or delete the user from Supabase Auth dashboard
- Or use the forgot password flow (if implemented)

## Manual Database Check

If you want to verify the user was created:

```sql
-- Check auth.users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Check public.users  
SELECT id, email, full_name, phone, created_at FROM public.users ORDER BY created_at DESC LIMIT 5;
```

Both tables should have matching records with the same `id`.

## Advanced Testing

### Test Form Validation
1. Try submitting with empty fields - should show validation errors
2. Try email without @ symbol - should show "Invalid email"
3. Try password less than 6 characters - should show error
4. Try mismatched passwords - should show "Passwords don't match"
5. Try phone number less than 10 digits - should show error

### Test Session Persistence
1. Login successfully
2. Refresh the page
3. You should still be logged in (check AuthContext state)

### Test Logout
1. Login successfully
2. Click logout (if button exists in UI)
3. You should be redirected to home page
4. Navigate to `/dashboard` - should redirect to login

## Browser Console Debugging

If issues persist, open browser DevTools (F12) and check:

1. **Console Tab**: Look for error messages
2. **Network Tab**: 
   - Filter by "Fetch/XHR"
   - Look for requests to Supabase
   - Check status codes (200 = success, 401 = unauthorized, 500 = server error)
3. **Application Tab**:
   - Check "Local Storage" for Supabase auth tokens
   - Look for `sb-[project-id]-auth-token`

## Success Indicators

✅ Form submits without errors
✅ Success toast appears
✅ Redirected to dashboard
✅ User record created in both `auth.users` and `public.users`
✅ Can login with created credentials
✅ Session persists across page reloads

## Next Steps After Testing

Once authentication works:
1. Test KYC flow
2. Test group creation
3. Test contribution flow
4. Test payout flow
5. Test all protected routes require authentication
