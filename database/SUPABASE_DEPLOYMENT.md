# 🚀 Supabase Deployment Guide for Secured Ajo

This guide provides step-by-step instructions to deploy the complete Secured Ajo database schema to Supabase.

## 📋 Prerequisites

- A Supabase account (free tier is sufficient to start)
- Basic understanding of SQL
- Access to the project repository

## ⚡ Quick Deployment (Recommended)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the project details:
   - **Project Name**: `secured-ajo` (or your preferred name)
   - **Database Password**: Generate a strong password and **save it securely**
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free tier is fine for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be provisioned

### Step 2: Deploy the Main Schema

1. In your Supabase project dashboard, navigate to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file `database/supabase_schema.sql` from this repository
4. Copy the **entire contents** of the file
5. Paste it into the SQL Editor
6. Click **"Run"** or press `Ctrl/Cmd + Enter`
7. Wait for execution to complete (should take 10-30 seconds)
8. You should see a success message: "Success. No rows returned"

### Step 3: Configure Storage (Optional but Recommended)

1. In the SQL Editor, create a **new query**
2. Open the file `database/supabase_storage.sql`
3. Copy and paste the entire contents
4. Click **"Run"**
5. Verify storage buckets are created:
   - Go to **Storage** in the left sidebar
   - You should see `profile-images` and `kyc-documents` buckets

### Step 4: Get Your Connection String

1. Go to **Project Settings** (gear icon in left sidebar)
2. Navigate to **Database** section
3. Find the **Connection String** section
4. Copy the **URI** format connection string
5. It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
6. Replace `[YOUR-PASSWORD]` with the password you created in Step 1

### Step 5: Configure Your Application

1. In your project root, copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and update the `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

3. Update other environment variables as needed (JWT_SECRET, Paystack keys, etc.)

### Step 6: Verify Deployment

1. In Supabase dashboard, go to **Table Editor**
2. You should see all tables created:
   - ✅ users
   - ✅ groups
   - ✅ group_members
   - ✅ contributions
   - ✅ payouts
   - ✅ transactions
   - ✅ penalties
   - ✅ notifications
   - ✅ audit_logs
   - ✅ kyc_documents
   - ✅ payment_webhooks
   - ✅ email_verification_tokens
   - ✅ refresh_tokens

3. Check that one admin user was created:
   - Click on the **users** table
   - You should see one row with email: `admin@ajosecure.com`
   - ⚠️ **CRITICAL SECURITY**: The default password is `ChangeMe123!SecureAjo`
   - ⚠️ **CHANGE THIS IMMEDIATELY** in production! See security checklist below.

4. Verify views are created:
   - Go to **SQL Editor**
   - Run: `SELECT * FROM group_statistics LIMIT 1;`
   - Should execute without errors (may return 0 rows, which is fine)

### Step 7: Test Your Connection

From your development environment:

```bash
# Install dependencies if you haven't
npm install

# Test database connection
npm run dev
```

The application should start without database connection errors.

## 🔧 Advanced Configuration

### Enable Row Level Security (RLS)

RLS is already enabled in the schema. To verify:

1. Go to **Authentication > Policies** in Supabase dashboard
2. You should see policies for each table
3. Common policies include:
   - Users can view their own data
   - Users can view groups they belong to
   - Users can view their own contributions/transactions

### Configure Realtime Subscriptions

Realtime is enabled for these tables:
- `notifications` - Real-time notification updates
- `group_members` - Live group membership changes
- `contributions` - Live payment tracking
- `transactions` - Live transaction history

To test realtime in your app, use Supabase client:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Subscribe to notifications
supabase
  .channel('notifications')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('Notification received:', payload)
  })
  .subscribe()
```

### Setup Storage Buckets

Storage buckets are created automatically via `supabase_storage.sql`. To verify:

1. Go to **Storage** in Supabase dashboard
2. You should see two buckets:
   - **profile-images** (5MB limit, images only)
   - **kyc-documents** (10MB limit, images + PDFs)

To upload files:

```typescript
const { data, error } = await supabase.storage
  .from('profile-images')
  .upload(`${userId}/avatar.png`, file)
```

### Configure Edge Functions (Optional)

For advanced webhook processing and scheduled tasks, you can deploy Edge Functions:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize functions:
   ```bash
   supabase functions new webhook-handler
   ```

3. Deploy function:
   ```bash
   supabase functions deploy webhook-handler
   ```

### Setup Database Backups

1. Go to **Project Settings > Database**
2. Under **Backups**, configure:
   - **Point-in-Time Recovery**: Recommended for production
   - **Daily Backups**: Automatically enabled
   - **Backup Retention**: Default is 7 days (configurable on paid plans)

## 🔐 Security Checklist

Before going to production:

- [ ] **CRITICAL: Change the default admin password immediately**
  ```sql
  UPDATE users 
  SET password_hash = crypt('YourNewStrongPassword123!@#', gen_salt('bf'))
  WHERE email = 'admin@ajosecure.com';
  ```
  Default password: `ChangeMe123!SecureAjo` (MUST BE CHANGED)

- [ ] Review RLS policies and ensure they match your security requirements
- [ ] Enable 2FA for your Supabase account
- [ ] Set up database backups
- [ ] Configure connection pooling for high traffic
- [ ] Review storage bucket policies
- [ ] Set up monitoring and alerts in Supabase dashboard
- [ ] Rotate all secrets (JWT, API keys) from examples

## 📊 Database Schema Overview

### Core Tables
- **users**: User accounts and authentication
- **groups**: Savings groups configuration
- **group_members**: Group membership and rotation tracking
- **contributions**: User contributions per cycle
- **payouts**: Automated payout distribution
- **transactions**: All financial transactions
- **penalties**: Late payment tracking
- **notifications**: User notifications

### Supporting Tables
- **email_verification_tokens**: Email verification OTPs
- **refresh_tokens**: JWT refresh tokens
- **kyc_documents**: KYC verification documents
- **payment_webhooks**: Payment gateway webhooks
- **audit_logs**: Security and compliance audit trail

### Views
- **group_statistics**: Aggregated group metrics
- **user_group_participation**: User engagement metrics

### Functions
- `update_updated_at_column()`: Auto-update timestamps
- `update_group_member_count()`: Auto-maintain member counts
- `get_cycle_total()`: Calculate cycle contributions
- `is_cycle_complete()`: Check if cycle is complete
- `cleanup_expired_tokens()`: Remove old tokens
- `get_profile_image_url()`: Get user profile image

## 🔄 Migration Management

For future schema changes:

1. **Never modify `supabase_schema.sql` directly** - it's the baseline
2. Create new migration files in `database/migrations/`:
   ```
   002_add_new_feature.sql
   003_modify_table.sql
   ```
3. Apply migrations manually in Supabase SQL Editor
4. Keep track of applied migrations

### Migration Template

```sql
-- Migration: [Description]
-- Date: YYYY-MM-DD
-- Author: [Name]

BEGIN;

-- Your changes here
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'new_field';

COMMIT;
```

## 🐛 Troubleshooting

### Connection Errors

**Error: "Could not connect to database"**
- Check your connection string is correct
- Verify the database password
- Ensure your IP is not blocked (Supabase allows all IPs by default)
- Check if the project is paused (free tier projects pause after 7 days of inactivity)

**Error: "SSL connection required"**
- Ensure `ssl: { rejectUnauthorized: false }` is in your connection config
- Supabase requires SSL for all connections

### Schema Errors

**Error: "relation already exists"**
- Tables might already exist from a previous deployment
- Either drop existing tables or modify the schema to use `CREATE TABLE IF NOT EXISTS`

**Error: "function already exists"**
- Functions might already exist
- Use `CREATE OR REPLACE FUNCTION` (already in the schema)

### RLS Errors

**Error: "new row violates row-level security policy"**
- Check that RLS policies allow the operation
- Ensure `auth.uid()` matches the user making the request
- Verify the user is authenticated

### Storage Errors

**Error: "Bucket already exists"**
- Buckets were already created
- Check the Storage dashboard to verify

**Error: "File size exceeds limit"**
- Default limits: 5MB for profile images, 10MB for KYC
- Increase limits in storage bucket settings if needed

## 🎯 Next Steps

After successful deployment:

1. **Test the application**: Run your app and test all features
2. **Monitor performance**: Use Supabase dashboard to monitor queries
3. **Setup production environment**: Create a separate Supabase project for production
4. **Configure CI/CD**: Automate deployments using GitHub Actions
5. **Setup monitoring**: Configure error tracking and performance monitoring
6. **Review security**: Regular security audits and updates

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

## 💬 Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review Supabase logs in the dashboard
3. Check application logs for detailed error messages
4. Open an issue in the GitHub repository
5. Contact the development team

---

**Last Updated**: 2026-01-07  
**Schema Version**: 1.0.0  
**Compatible With**: Supabase PostgreSQL 14+
