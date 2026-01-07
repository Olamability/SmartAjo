# Authentication Troubleshooting Guide

This guide helps you fix common registration and login issues in the Secured Ajo application.

## 🚨 Quick Fixes for Common Issues

### Issue 1: "Cannot register" or "Cannot login"

**Most common cause:** Missing or incorrect environment variables

**Solution:**

1. **Check if `.env.local` exists:**
   ```bash
   ls -la .env.local
   ```

2. **If file doesn't exist, create it:**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Edit `.env.local` and set your Supabase credentials:**
   ```bash
   # Get these from https://supabase.com → Your Project → Settings → API
   NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   
   # Get this from Settings → Database → Connection String
   DATABASE_URL=postgresql://postgres:password@db.yourproject.supabase.co:5432/postgres
   ```

4. **Validate your environment:**
   ```bash
   npm run validate-env
   ```

5. **Restart the dev server:**
   ```bash
   npm run dev
   ```

### Issue 2: "500 Internal Server Error"

**Possible causes:**
- Missing Supabase environment variables
- Database not initialized
- Invalid Supabase credentials

**Solution:**

1. **Validate environment variables:**
   ```bash
   npm run validate-env
   ```

2. **Check if database schema is loaded:**
   - Go to your Supabase Dashboard
   - Navigate to SQL Editor
   - Run the SQL from `database/schema.sql`

3. **Verify Supabase credentials:**
   - Go to https://supabase.com
   - Select your project
   - Go to Settings → API
   - Copy the URL and keys to `.env.local`

4. **Check server logs:**
   ```bash
   npm run dev
   ```
   Look for error messages in the terminal

### Issue 3: Page loads but nothing happens when clicking "Sign Up" or "Login"

**Possible causes:**
- Client-side Supabase initialization failed
- JavaScript errors in browser console

**Solution:**

1. **Open browser developer tools** (F12 or right-click → Inspect)

2. **Check the Console tab for errors**

3. **Common error fixes:**

   **Error:** "Missing Supabase environment variables"
   - Solution: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are in `.env.local`
   - Restart dev server after adding them

   **Error:** "Failed to fetch" or "Network error"
   - Solution: Check if dev server is running on http://localhost:3000
   - Check if there are CORS issues

4. **Clear browser cache and reload:**
   ```
   Ctrl/Cmd + Shift + R (hard reload)
   ```

### Issue 4: "User with this email already exists" but I can't login

**Possible causes:**
- User exists in Supabase Auth but not in custom users table
- Database connection issue

**Solution:**

1. **Check Supabase Auth dashboard:**
   - Go to Authentication → Users
   - See if user exists there

2. **Check custom users table:**
   ```sql
   SELECT * FROM users WHERE email = 'your-email@example.com';
   ```

3. **If user exists in Auth but not in users table:**
   ```sql
   -- Delete from Supabase Auth and try registering again
   -- Or manually insert into users table with matching ID
   ```

4. **If both exist but login fails:**
   - Check if `is_active = true` in users table
   - Verify password is correct

### Issue 5: Environment variables not loading

**Next.js environment variable rules:**

1. **Client-side variables MUST start with `NEXT_PUBLIC_`:**
   - ✅ `NEXT_PUBLIC_SUPABASE_URL` - Works in browser
   - ❌ `SUPABASE_URL` - Only works on server

2. **Restart required:** Changes to `.env.local` require server restart

3. **Build-time variables:** Some variables are loaded at build time
   ```bash
   # After changing .env.local
   rm -rf .next
   npm run dev
   ```

## 🔍 Debugging Checklist

Run through this checklist to diagnose issues:

- [ ] `.env.local` file exists
- [ ] All required variables are set (run `node scripts/validate-env.js`)
- [ ] Supabase project is created and active
- [ ] Database schema is loaded (from `database/schema.sql`)
- [ ] Dev server is running (`npm run dev`)
- [ ] Browser console shows no errors (F12)
- [ ] Network tab shows API calls are being made (F12 → Network)
- [ ] API responses are not 500/401 errors

## 🧪 Test Your Setup

### 1. Test Supabase Connection

Create a test file `test-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ Connection failed:', error.message);
  } else {
    console.log('✅ Supabase connection successful!');
  }
}

test();
```

Run it:
```bash
node test-supabase.js
```

### 2. Test Database Connection

```bash
# Using psql
psql "$DATABASE_URL" -c "SELECT 1;"

# Should output: (1 row)
```

### 3. Test API Endpoints

```bash
# Test signup endpoint
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","phone":"1234567890","password":"password123"}'

# Should return JSON with user data or error message
```

## 📚 Additional Resources

- **Environment Setup Guide:** See `ENV_SETUP.md` for detailed configuration
- **Local Setup Guide:** See `LOCAL_SETUP.md` for step-by-step setup
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Env Vars:** https://nextjs.org/docs/app/building-your-application/configuring/environment-variables

## 🆘 Still Having Issues?

1. **Check the logs:**
   - Server logs: Terminal where `npm run dev` is running
   - Browser logs: Browser console (F12)
   - Supabase logs: Supabase Dashboard → Logs

2. **Verify file structure:**
   ```bash
   # Should have these key files:
   ls app/api/auth/signup/route.ts
   ls app/api/auth/login/route.ts
   ls src/lib/supabase/client.ts
   ls .env.local
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   # Should be v18 or higher
   ```

4. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

5. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

## ✅ Working Setup Verification

If everything is configured correctly, you should be able to:

1. ✅ Visit http://localhost:3000
2. ✅ Navigate to /signup
3. ✅ Fill out the registration form
4. ✅ Click "Create account" without errors
5. ✅ See a success message and receive an OTP (check terminal logs)
6. ✅ Use /login to sign in with your credentials
7. ✅ Be redirected to /dashboard after successful login

If all these work, your setup is correct! 🎉
