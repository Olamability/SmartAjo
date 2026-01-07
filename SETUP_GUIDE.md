# Secured-Ajo Setup Guide

> Complete guide for setting up and running the Secured-Ajo app with Supabase Auth

## ✅ What's Been Done

The Secured-Ajo app has been restructured to properly use Supabase Auth:

### Architecture
- ✅ **Single Next.js fullstack app** - All code in one repo, runs on one port (3000)
- ✅ **Supabase Auth integration** - No custom JWT handling
- ✅ **Proper session management** - Uses Supabase httpOnly cookies
- ✅ **SSR-compatible** - Auth works on both server and client
- ✅ **Middleware** - Automatically refreshes sessions

### What Changed
- ❌ Removed custom JWT logic
- ❌ Removed localStorage for auth state
- ❌ Removed `password_hash` from users table
- ✅ Added root `middleware.ts` for session refresh
- ✅ Updated AuthContext to use Supabase sessions
- ✅ Updated database schema for Supabase Auth compatibility
- ✅ Added RLS policies for profile inserts

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/Olamability/secured-ajo.git
cd secured-ajo

# Install dependencies
npm install
```

### Step 2: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose a name, database password, and region
4. Wait for the project to be created (~2 minutes)

### Step 3: Get Your Credentials

Once your project is ready:

1. Go to **Settings → API** in Supabase dashboard
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

3. Go to **Settings → Database**
4. Copy **Connection String (URI)** → `DATABASE_URL`

### Step 4: Configure Environment Variables

```bash
# Create environment file
cp .env.local.example .env.local

# Edit .env.local with your values
nano .env.local  # or use your preferred editor
```

**Required variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:password@db.yourproject.supabase.co:5432/postgres
```

### Step 5: Setup Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy contents of `database/supabase_schema.sql`
4. Paste and click **Run**
5. Wait for completion (should take ~10 seconds)

**Important:** The schema creates:
- `users` table for profiles (references `auth.users`)
- All group/transaction tables
- RLS policies for security
- Functions and triggers for automation

### Step 6: Configure Auth Settings (Optional)

In Supabase dashboard, go to **Authentication → Settings**:

**For Development:**
- Disable email confirmation: Set "Enable email confirmations" to OFF
- This allows testing without setting up email

**For Production:**
- Keep email confirmation enabled
- Configure email templates
- Set up custom SMTP if needed

### Step 7: Run the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🧪 Testing Authentication

### Test Registration

1. Go to [http://localhost:3000/signup](http://localhost:3000/signup)
2. Fill in:
   - Full Name: Test User
   - Email: test@example.com
   - Phone: +1234567890
   - Password: Test123!

3. Click "Create account"
4. You should be redirected to `/dashboard`

### Test Login

1. Go to [http://localhost:3000/login](http://localhost:3000/login)
2. Enter the email and password you just created
3. Click "Sign in"
4. You should be redirected to `/dashboard`

### Verify Session Persistence

1. After logging in, refresh the page
2. You should remain logged in (session persists)
3. Open DevTools → Application → Cookies
4. You should see Supabase auth cookies

## 🔍 Troubleshooting

### "Failed to register" Error

**Cause:** Usually database RLS policy or connection issue

**Solution:**
1. Check that you ran `database/supabase_schema.sql`
2. Verify `DATABASE_URL` is correct
3. Check Supabase dashboard for errors in Database → Logs

### "Failed to login" Error

**Cause:** Wrong credentials or Supabase config issue

**Solution:**
1. Verify email/password are correct
2. Check that user exists in Supabase Auth dashboard
3. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Session Not Persisting

**Cause:** Middleware not running or cookie issues

**Solution:**
1. Check that `middleware.ts` exists in root directory
2. Clear browser cookies
3. Restart dev server

### "Cannot find module" Errors

**Cause:** Missing dependencies

**Solution:**
```bash
npm install
```

### Build Errors

**Cause:** TypeScript or linting errors

**Solution:**
```bash
# Check TypeScript
npx tsc --noEmit

# Try building
npm run build
```

## 📊 What's Next?

After successful setup:

1. **Explore the Dashboard** - See user profile and auth status
2. **Check API Routes** - Browse `/app/api/` to see backend structure
3. **Review Database** - Look at Supabase dashboard → Table Editor
4. **Add Features** - Build on top of the auth foundation

## 🔐 Security Notes

### Environment Variables
- **Never commit `.env.local`** to git (already in .gitignore)
- **Keep `SUPABASE_SERVICE_ROLE_KEY` secret** - Has admin access
- **Use `NEXT_PUBLIC_*`** only for client-safe variables

### Database Security
- **RLS is enabled** - Users can only access their own data
- **Service role bypasses RLS** - Use carefully in API routes
- **Test policies** - Always verify users can't access others' data

### Production Deployment

When deploying to production:

1. **Enable email confirmation** in Supabase Auth settings
2. **Set up custom domain** for better branding
3. **Configure SMTP** for reliable email delivery
4. **Add environment variables** to hosting platform (Vercel/Netlify)
5. **Enable HTTPS** (usually automatic on modern platforms)

## 📚 Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 Need Help?

If you're still having issues:

1. Check Supabase logs: Dashboard → Logs
2. Check browser console for errors
3. Check terminal for server errors
4. Review the problem statement resolution docs in the repo

---

**Last Updated:** January 2026  
**Version:** 2.0.0 (Supabase Auth Migration)
