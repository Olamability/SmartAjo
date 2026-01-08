# Secured-Ajo Supabase Database Setup Guide

This directory contains the complete Supabase database schema and configuration for the Secured-Ajo platform.

## 📁 Files

### Core Schema Files
- **`schema.sql`** (810 lines) - Complete database schema with tables, indexes, triggers, functions, and RLS policies
- **`storage.sql`** (238 lines) - Storage bucket configuration and policies for file uploads

### Advanced Features (New)
- **`views.sql`** (400+ lines) - Database views for common queries and reporting
- **`functions.sql`** (700+ lines) - Utility functions for business logic and calculations
- **`triggers.sql`** (600+ lines) - Additional triggers for business automation
- **`scheduled-jobs.sql`** (400+ lines) - Automated scheduled jobs using pg_cron
- **`realtime.sql`** (400+ lines) - Realtime configuration for live updates

### Documentation
- **`ARCHITECTURE.md`** - Detailed architecture documentation
- **`MIGRATION.md`** - Database migration guide
- **`README.md`** - This setup guide

## 🚀 Quick Start

### Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. Git repository cloned

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in project details:
   - **Project Name**: secured-ajo (or your choice)
   - **Database Password**: Generate a strong password (save it securely)
   - **Region**: Choose the closest to your users
4. Wait for project to be created (~2 minutes)

### Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `schema.sql` and paste it into the editor
4. Click **Run** or press `Ctrl/Cmd + Enter`
5. Wait for execution to complete
6. Verify tables were created:
   - Go to **Table Editor**
   - You should see: users, groups, group_members, contributions, payouts, penalties, transactions, notifications, audit_logs, email_verification_tokens

### Step 2.5: Run Advanced Features (New!)

After running the core schema, run these additional SQL files in order:

1. **Run `views.sql`** - Creates database views for common queries
   - Paste contents in SQL Editor and run
   - Verify by running: `SELECT * FROM active_groups_summary LIMIT 5;`

2. **Run `functions.sql`** - Adds utility functions for business logic
   - Paste contents in SQL Editor and run
   - Verify by running: `SELECT generate_payment_reference('TEST');`

3. **Run `triggers.sql`** - Adds additional triggers for automation
   - Paste contents in SQL Editor and run
   - Triggers will now automatically create notifications

4. **Run `realtime.sql`** - Configures realtime subscriptions
   - Paste contents in SQL Editor and run
   - Verify by checking: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`

5. **Run `scheduled-jobs.sql`** (Optional - requires Supabase Pro plan)
   - Enables pg_cron extension in Database > Extensions first
   - Paste contents in SQL Editor and run
   - Verify by running: `SELECT * FROM cron_jobs_status;`
   - Note: If on free tier, skip this and use Edge Functions instead (see file for details)

### Step 3: Configure Storage

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**

Create these 3 buckets:

**Bucket 1: avatars**
- Name: `avatars`
- Public: ✅ Yes
- File size limit: 2MB
- Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif`

**Bucket 2: kyc-documents**
- Name: `kyc-documents`
- Public: ❌ No
- File size limit: 5MB
- Allowed MIME types: `image/jpeg, image/png, application/pdf`

**Bucket 3: group-images**
- Name: `group-images`
- Public: ✅ Yes
- File size limit: 3MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

3. After creating buckets, go back to **SQL Editor**
4. Run the `storage.sql` file to create storage policies

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Create storage buckets
supabase storage create avatars --public
supabase storage create kyc-documents
supabase storage create group-images --public

# Apply storage policies
supabase db push storage.sql
```

### Step 4: Configure Environment Variables

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public** key
   - **service_role secret** key (⚠️ keep this secret!)

3. Go to **Settings** → **Database**
4. Copy **Connection String** (URI format)

5. Create `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database Configuration
DATABASE_URL=postgresql://postgres:password@db.yourproject.supabase.co:5432/postgres

# Application Settings
NEXT_PUBLIC_APP_NAME=Ajo Secure
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: Payment Gateway (Paystack)
PAYSTACK_SECRET_KEY=sk_test_your_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_key
```

### Step 5: Test the Setup

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Open browser
open http://localhost:3000
```

## 📊 Database Schema Overview

### Core Tables

#### **users**
Extends Supabase Auth with application-specific user data
- Syncs with `auth.users` table
- Stores profile, KYC status, verification status
- Tracks user activity and login history

#### **groups**
Represents savings groups (ROSCA circles)
- Configuration: contribution amount, frequency, member count
- Security deposits and service fees
- Lifecycle: forming → active → completed
- Cycle management for rotational payouts

#### **group_members**
Junction table linking users to groups
- Position determines payout order
- Tracks security deposit payment
- Member status and role (creator vs member)

#### **contributions**
Individual member contributions per cycle
- Links to groups and users
- Due dates and payment tracking
- Status: pending, paid, overdue, waived

#### **payouts**
Rotational payouts to group members
- One payout per cycle per group
- Ordered by member position
- Payment method and reference tracking

#### **penalties**
Late payment and violation penalties
- Calculated based on group rules
- Types: late_payment, missed_payment, early_exit
- Status: applied, paid, waived

#### **transactions**
Complete financial audit trail
- All money movements (contributions, payouts, penalties)
- Payment gateway integration
- Transaction status tracking

#### **notifications**
User notifications for events
- Contribution reminders, payout alerts
- Group status changes
- Member activities

### Key Features

#### ✅ Row Level Security (RLS)
- All tables protected with RLS policies
- Users can only see their own data and group data
- Service role bypasses RLS for server-side operations

#### 🔄 Automated Triggers
- **Auto-update timestamps** on all record changes
- **Sync member counts** when users join/leave groups
- **Auto-add creator** as first group member

#### 📈 Analytics Functions
- `get_user_stats(user_id)` - User contribution/payout statistics
- `get_group_progress(group_id)` - Current cycle progress
- `get_avatar_url(user_id)` - User avatar URL from storage

#### 🔐 Security
- Password hashing via Supabase Auth
- Row-level security on all tables
- Encrypted database connections (SSL)
- Service role key isolation

## 🗂️ Storage Structure

```
avatars/
  {user_id}/
    avatar.jpg                 # Current profile picture

kyc-documents/
  {user_id}/
    id-front.jpg              # ID card front
    id-back.jpg               # ID card back
    selfie.jpg                # Verification selfie
    proof-of-address.pdf      # Utility bill

group-images/
  {group_id}/
    profile.jpg               # Group profile image
    cover.jpg                 # Group cover image
```

## 🔍 Useful Queries

### Check All Tables Created

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### View User Statistics

```sql
SELECT * FROM get_user_stats('user-uuid-here');
```

### View Group Progress

```sql
SELECT * FROM get_group_progress('group-uuid-here');
```

### Check Storage Usage

```sql
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size
FROM storage.objects
GROUP BY bucket_id;
```

## 🛠️ Troubleshooting

### Issue: Tables not created

**Solution**: Make sure you ran the entire `schema.sql` file without errors. Check the Supabase SQL Editor for error messages.

### Issue: RLS policies blocking access

**Solution**: 
- For client-side queries, ensure user is authenticated (`auth.uid()` returns a value)
- For server-side queries, use the service role key which bypasses RLS

### Issue: Storage uploads fail

**Solution**:
- Verify buckets are created
- Check file size limits
- Ensure storage policies are applied
- Verify MIME type is allowed

### Issue: Triggers not firing

**Solution**:
- Check if triggers were created: `SELECT * FROM information_schema.triggers;`
- Verify trigger functions exist: `SELECT * FROM pg_proc WHERE proname LIKE 'update_%';`

### Issue: Connection error

**Solution**:
- Verify Supabase project is active
- Check environment variables are set correctly
- Ensure DATABASE_URL uses the correct password
- Try regenerating database password in Supabase dashboard

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Documentation](https://supabase.com/docs/guides/storage)

## 🆘 Support

If you encounter issues:

1. Check the [Supabase Discord](https://discord.supabase.com/)
2. Review [GitHub Issues](https://github.com/supabase/supabase/issues)
3. Consult the project documentation

## 📝 Schema Maintenance

### Making Changes

1. Always backup your database before making changes
2. Test changes in a development project first
3. Use migrations for production updates

### Creating Migrations

```bash
# Generate a new migration
supabase migration new add_new_feature

# Edit the migration file
# Apply migration
supabase db push
```

### Backup Database

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or from dashboard: Settings → Database → Backups
```

## ✨ Production Checklist

Before deploying to production:

- [ ] All tables created successfully
- [ ] RLS policies enabled and tested
- [ ] Storage buckets configured
- [ ] Environment variables set correctly
- [ ] Database backups configured
- [ ] Service role key kept secure (never in client code)
- [ ] SSL/TLS enabled for database connections
- [ ] Monitoring and alerts configured
- [ ] Database indices optimized
- [ ] Test user signup/login flow
- [ ] Test contribution and payout workflows
- [ ] Test penalty calculations
- [ ] Verify notification delivery

---

**Last Updated**: January 2026  
**Schema Version**: 1.0.0  
**Compatible with**: Supabase (Latest), PostgreSQL 15+
