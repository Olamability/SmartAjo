# Supabase PostgreSQL Setup Guide for Ajo Secure

This guide will walk you through setting up a cloud PostgreSQL database using Supabase for the Ajo Secure backend.

## 📋 Table of Contents

1. [Why Supabase?](#why-supabase)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Connecting Your Backend](#connecting-your-backend)
5. [Testing the Connection](#testing-the-connection)
6. [Troubleshooting](#troubleshooting)
7. [Next Steps](#next-steps)

## 🎯 Why Supabase?

Supabase is a hosted PostgreSQL database that offers:

- ✅ **No local installation required** - Works from any computer
- ✅ **Free tier** - 500MB storage, perfect for development and small projects
- ✅ **Production-ready** - Built on top of PostgreSQL with automatic backups
- ✅ **Visual dashboard** - Easy to view and manage your data
- ✅ **Built-in API** - Optional REST API for your data
- ✅ **SSL/TLS encryption** - Secure connections by default
- ✅ **Real-time features** - Optional real-time subscriptions

## 📚 Prerequisites

Before starting, you'll need:

- A GitHub, GitLab, or email account (for Supabase signup)
- Your `database/schema.sql` file from the Ajo Secure repository
- Basic understanding of databases (helpful but not required)

## 🚀 Step-by-Step Setup

### Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up using:
   - GitHub (recommended for developers)
   - GitLab
   - Email address
4. Verify your email if required

### Step 2: Create a New Project

1. After logging in, you'll see your dashboard
2. Click **"New Project"** button
3. If prompted, create an organization first (you can use your name)
4. Fill in the project details:
   - **Name**: `ajo-secure` (or any name you prefer)
   - **Database Password**: Choose a strong password
     - ⚠️ **IMPORTANT**: Save this password! You'll need it later
     - Suggestion: Use a password manager
   - **Region**: Select the region closest to your users
     - For Nigeria: Choose Europe (West) or EU-West-1
     - For USA: Choose US West or US East
     - For global: Choose US East (best general option)
   - **Pricing Plan**: Free (perfect for development)
5. Click **"Create new project"**
6. Wait 2-3 minutes for your database to be provisioned

### Step 3: Run the Database Schema

Now we'll create all the tables and structure for Ajo Secure:

1. In your Supabase project dashboard, look at the left sidebar
2. Click on **"SQL Editor"** (icon looks like </> )
3. You'll see a blank editor
4. Open the `database/schema.sql` file from your local Ajo Secure repository
5. Copy the **entire contents** of the file
   - **Tip**: Use Ctrl+A (Select All) then Ctrl+C (Copy)
6. Paste into the Supabase SQL Editor
   - Use Ctrl+V (Paste)
7. Click the **"Run"** button (or press Ctrl+Enter)
8. Wait for the execution to complete (should take 5-10 seconds)
9. You should see a green success message: ✅ "Success. No rows returned"

### Step 4: Verify Tables Were Created

1. In the left sidebar, click **"Table Editor"**
2. You should see a list of tables including:
   - users
   - groups
   - group_members
   - contributions
   - payouts
   - transactions
   - penalties
   - notifications
   - audit_logs
   - kyc_documents
   - payment_webhooks
   - email_verification_tokens
   - refresh_tokens

**If you see these tables, congratulations! Your database is set up!** 🎉

### Step 5: Get Your Connection String

Now we need to get the connection details for your backend:

1. Click the **gear icon** (⚙️) in the left sidebar to open Settings
2. Click **"Database"** in the Settings menu
3. Scroll down to the **"Connection string"** section
4. Make sure **"URI"** is selected (not "Connection parameters")
5. You'll see a connection string that looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmno.supabase.co:5432/postgres
   ```
6. Click the **copy icon** to copy it
7. **Important**: The string has `[YOUR-PASSWORD]` as a placeholder
   - You need to replace this with your actual database password
   - The password you created in Step 2

### Step 6: Save Your Connection String

Save this information securely:

```bash
# Your Supabase Connection Details
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.abcdefghijklmno.supabase.co:5432/postgres

# Example (with fake password):
# DATABASE_URL=postgresql://postgres:MySecureP@ssw0rd123@db.xyzabcdefghijklmno.supabase.co:5432/postgres
```

**⚠️ Important Note about Special Characters in Passwords:**
If your password contains special characters (like `@`, `#`, `$`, `%`, `/`, `?`, etc.), you need to URL-encode them in the connection string:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`
- `/` becomes `%2F`
- `?` becomes `%3F`
- `&` becomes `%26`

**Example**: If your password is `MyStr0ng#Pass@2024!`, use `MyStr0ng%23Pass%402024%21` in the connection string.

**💡 Pro Tips to Avoid URL Encoding:**
- Choose a password without special characters when creating your Supabase project (use letters, numbers, and underscores only)
- Or use individual connection parameters (DB_HOST, DB_PORT, etc.) instead of DATABASE_URL

**Security Notes:**
- ⚠️ Never commit this connection string to Git
- ⚠️ Never share it publicly
- ⚠️ Keep it in your `.env` file (which is in `.gitignore`)

## 🔌 Connecting Your Backend

### For backend-starter (Node.js/Express)

1. Navigate to your backend directory:
   ```bash
   cd backend-starter
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` file in your text editor

4. Add your Supabase connection string:
   ```bash
   # In .env file, uncomment and update this line:
   DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xyzabc.supabase.co:5432/postgres
   
   # Make sure to comment out the local database settings:
   # DB_HOST=localhost
   # DB_PORT=5432
   # DB_NAME=ajo_secure
   # DB_USER=postgres
   # DB_PASSWORD=your_password_here
   ```

5. Save the file

6. The database configuration file (`src/config/database.js`) already supports Supabase!
   - It automatically detects `DATABASE_URL` and uses it
   - It automatically enables SSL for cloud connections

## ✅ Testing the Connection

### Test 1: Start the Backend Server

```bash
# In backend-starter directory
npm install  # If you haven't already
npm run dev
```

**Expected output:**
```
✅ Connected to PostgreSQL database
🚀 Server is running on port 3000
```

**If you see the ✅ "Connected" message, your connection is working!**

### Test 2: Check Health Endpoint

In another terminal or browser:

```bash
# Using curl
curl http://localhost:3000/health

# Or open in browser:
# http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "database": "connected"
}
```

### Test 3: Create a Test User (Optional)

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "+2348012345678",
    "password": "Test123!",
    "confirmPassword": "Test123!"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "userId": "...",
    "email": "test@example.com"
  }
}
```

### Test 4: Verify in Supabase Dashboard

1. Go back to your Supabase dashboard
2. Click **"Table Editor"** in the left sidebar
3. Click on the **"users"** table
4. You should see your test user in the list!

## 🐛 Troubleshooting

### Error: "Connection timeout"

**Cause**: Your IP might not be allowed or internet connection issue

**Solutions**:
1. Check your internet connection
2. In Supabase dashboard, go to Settings > Database > Connection pooling
3. Try using the "Connection pooling" connection string instead

### Error: "password authentication failed"

**Cause**: Incorrect password in connection string

**Solutions**:
1. Double-check your password in the `.env` file
2. Make sure there are no extra spaces
3. If password has special characters, they might need URL encoding:
   - `@` becomes `%40`
   - `#` becomes `%23`
   - `$` becomes `%24`
   - `%` becomes `%25`

### Error: "database 'ajo_secure' does not exist"

**Cause**: Using wrong database name

**Solution**:
- Supabase database is always named `postgres`, not `ajo_secure`
- Make sure your connection string ends with `/postgres`

### Error: "SSL connection required"

**Cause**: SSL not configured properly

**Solution**:
- The updated `database.js` file should handle this automatically
- Make sure you're using the latest version of the code

### Tables not showing in Supabase

**Cause**: Schema wasn't run successfully

**Solutions**:
1. Go back to SQL Editor
2. Re-run the schema.sql contents
3. Check for any error messages
4. Try running in smaller chunks if the full schema fails

### Can't see my data in the dashboard

**Solution**:
1. Click "Table Editor" in sidebar
2. Click on specific table name (e.g., "users")
3. Click "Refresh" icon if data doesn't appear immediately

## 🎯 Next Steps

Now that your database is set up:

1. **Continue Backend Development**
   - Implement group management endpoints
   - Set up payment integration (Paystack)
   - Add email/SMS services

2. **Learn More About Supabase**
   - [Supabase Documentation](https://supabase.com/docs)
   - [PostgreSQL Basics](https://supabase.com/docs/guides/database)
   - [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

3. **Monitor Your Database**
   - Check Supabase dashboard regularly
   - Review the "Database" section for usage stats
   - Set up backups in production

4. **Security Best Practices**
   - Never commit `.env` file
   - Use environment variables in production
   - Enable Row Level Security for sensitive tables
   - Regular backups before major changes

## 📚 Additional Resources

- [Ajo Secure Backend Guide](./BACKEND_STEP_BY_STEP_GUIDE.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [API Documentation](./API.md)
- [Database Schema](./database/schema.sql)

## 🆘 Getting Help

If you're stuck:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review [Supabase Documentation](https://supabase.com/docs)
3. Open an issue on [GitHub](https://github.com/Olamability/secured-ajo/issues)
4. Join the Supabase Discord for community support

---

**Congratulations! You now have a production-ready cloud database for Ajo Secure!** 🎉

The best part? You can access this database from anywhere, and it's already backed up and secured by Supabase.
