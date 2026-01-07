# 🚀 Secured-Ajo Quick Start Guide

Get your Secured-Ajo platform up and running in 15 minutes!

## ⚡ Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Git repository cloned

## 📝 Step-by-Step Setup

### 1️⃣ Create Supabase Project (5 minutes)

1. Go to https://supabase.com and sign in
2. Click **"New Project"**
3. Fill in:
   - Project name: `secured-ajo`
   - Database password: (generate and save securely)
   - Region: Choose closest to your users
4. Wait ~2 minutes for project creation

### 2️⃣ Setup Database (3 minutes)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Open `/supabase/schema.sql` in your code editor
4. Copy entire contents and paste into SQL Editor
5. Click **"Run"** (or Ctrl/Cmd + Enter)
6. Wait for completion (should take 10-30 seconds)
7. Verify: Go to **Table Editor** and see all tables

### 3️⃣ Setup Storage (2 minutes)

1. In Supabase dashboard, go to **Storage**
2. Create 3 buckets:
   
   **Bucket 1:**
   - Name: `avatars`
   - Public: ✅ Yes
   - Size limit: 2MB
   
   **Bucket 2:**
   - Name: `kyc-documents`
   - Public: ❌ No
   - Size limit: 5MB
   
   **Bucket 3:**
   - Name: `group-images`
   - Public: ✅ Yes
   - Size limit: 3MB

3. Go back to **SQL Editor**
4. Open `/supabase/storage.sql` and run it

### 4️⃣ Configure Environment (3 minutes)

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   ```
   Project URL: https://xxxxx.supabase.co
   anon public: eyJhbGc...
   service_role: eyJhbGc... (⚠️ secret!)
   ```

3. Go to **Settings** → **Database**
4. Copy **Connection String (URI)**

5. Create `.env.local` in project root:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Database
   DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
   
   # App
   NEXT_PUBLIC_APP_NAME=Ajo Secure
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NODE_ENV=development
   ```

### 5️⃣ Run the App (2 minutes)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser! 🎉

## ✅ Verify Everything Works

1. **Homepage loads**: Check http://localhost:3000
2. **Signup works**: Go to /signup and create account
3. **Login works**: Go to /login and sign in
4. **Dashboard loads**: After login, see /dashboard

## 🐛 Troubleshooting

### Issue: Build errors about Supabase

**Fix**: Make sure all environment variables are set in `.env.local`

### Issue: "Missing Supabase environment variables"

**Fix**: 
1. Check `.env.local` exists in project root
2. Restart dev server after adding env vars

### Issue: Database connection failed

**Fix**:
1. Verify DATABASE_URL has correct password
2. Check Supabase project is active
3. Try regenerating database password

### Issue: Tables not created

**Fix**:
1. Check SQL Editor for error messages
2. Make sure you ran entire `schema.sql` file
3. Check Supabase plan allows database creation

## 📚 Next Steps

1. **Read Documentation**: Check `/supabase/README.md` for detailed info
2. **Understand Architecture**: Read `/supabase/ARCHITECTURE.md`
3. **Setup Payments**: Add Paystack keys to `.env.local`
4. **Deploy**: Follow production checklist in documentation

## 🆘 Need Help?

- 📖 Full documentation: `/supabase/README.md`
- 🏗️ Architecture guide: `/supabase/ARCHITECTURE.md`
- 🔄 Migration guide: `/supabase/MIGRATION.md`
- 📊 Summary: `/SCHEMA_GENERATION_SUMMARY.md`

## 🎯 What You Can Do Now

After setup, you can:
- ✅ Create user accounts
- ✅ Create savings groups
- ✅ Join groups
- ✅ Make contributions
- ✅ Track transactions
- ✅ View notifications
- ✅ Upload profile pictures

---

**Setup Time**: ~15 minutes  
**Cost**: Free (Supabase free tier)  
**Status**: Production Ready ✅
