# Database Schema & Deployment for Secured Ajo

This directory contains the complete database schema, migrations, and deployment guides for the Secured Ajo platform.

## 📁 Directory Structure

```
database/
├── supabase_schema.sql          # 🆕 Complete Supabase deployment schema (RECOMMENDED)
├── supabase_storage.sql         # 🆕 Storage buckets and policies for Supabase
├── SUPABASE_DEPLOYMENT.md       # 🆕 Complete Supabase deployment guide
├── SUPABASE_QUICK_REFERENCE.md  # 🆕 Quick reference for schema components
├── schema.sql                   # Original PostgreSQL schema
├── SCHEMA_ANALYSIS.md           # Schema analysis and production readiness report
├── migrations/                  # Incremental schema changes
│   └── 001_fix_column_naming.sql
└── README.md                    # This file
```

## 🚀 Quick Setup (Recommended Path)

### Option 1: Supabase (Recommended - Easiest & Free)

**Best for**: Quick setup, free hosting, no local installation required

1. **Go to** [SUPABASE_DEPLOYMENT.md](./SUPABASE_DEPLOYMENT.md) for complete step-by-step guide
2. **Quick version** (5 minutes):
   ```bash
   # 1. Create project at https://supabase.com
   # 2. Open SQL Editor in Supabase dashboard
   # 3. Copy & run: supabase_schema.sql
   # 4. Copy & run: supabase_storage.sql
   # 5. Get connection string from Project Settings
   # 6. Add to your .env.local:
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```

**Features**:
- ✅ Complete schema with RLS (Row Level Security)
- ✅ Storage buckets for images and documents
- ✅ Realtime subscriptions for live updates
- ✅ Automatic backups
- ✅ Built-in authentication support
- ✅ Free tier: 500MB database, 1GB file storage

**Quick Reference**: See [SUPABASE_QUICK_REFERENCE.md](./SUPABASE_QUICK_REFERENCE.md)

### Option 2: Using Supabase (Alternative - Original Method)

For backwards compatibility, you can still use the original schema.sql file:

```bash
# 1. Sign up at https://supabase.com (free tier available)
# 2. Create a new project
# 3. Once your project is ready:
#    - Go to the SQL Editor in your Supabase dashboard
#    - Open the schema.sql file from this directory
#    - Copy and paste the entire contents into the SQL Editor
#    - Click "Run" to execute the schema
# 4. Go to Project Settings > Database to get your connection string
# 5. Use the connection string in your backend .env file:
#    DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### Option 3: Local PostgreSQL

**Best for**: Full control, offline development, testing

If you prefer to run PostgreSQL locally:
```bash
# Apply the initial schema (use supabase_schema.sql for full features)
psql -U postgres -d ajo_secure < supabase_schema.sql

# Or use the original schema
psql -U postgres -d ajo_secure < schema.sql
```

## 📚 Documentation Files

| File | Description |
|------|-------------|
| **SUPABASE_DEPLOYMENT.md** | Complete step-by-step Supabase deployment guide with troubleshooting |
| **SUPABASE_QUICK_REFERENCE.md** | Quick reference for schema components, queries, and common tasks |
| **SCHEMA_ANALYSIS.md** | Production readiness analysis and recommendations |
| **supabase_schema.sql** | Complete deployment-ready schema with RLS, functions, and triggers |
| **supabase_storage.sql** | Storage buckets, policies, and realtime configuration |
| **schema.sql** | Original PostgreSQL schema (for reference) |

## 🎯 What's Included in Supabase Schema

### Database Components
- ✅ **13 Tables**: Complete data structure for users, groups, contributions, etc.
- ✅ **42+ Indexes**: Optimized for query performance
- ✅ **7 Triggers**: Automated timestamp updates and member counting
- ✅ **6 Functions**: Helper functions for calculations and cleanup
- ✅ **2 Views**: Pre-built analytics (group_statistics, user_group_participation)
- ✅ **Row Level Security**: Comprehensive RLS policies for data isolation
- ✅ **Storage Buckets**: Profile images and KYC documents
- ✅ **Realtime Subscriptions**: Live updates for notifications, contributions, etc.

### Security Features
- ✅ Password hashing with bcrypt
- ✅ JWT token management
- ✅ Account lockout after failed attempts
- ✅ Email verification with OTP
- ✅ KYC document verification
- ✅ Comprehensive audit logging
- ✅ Webhook signature verification

### Business Logic
- ✅ Group formation and management
- ✅ Contribution tracking per cycle
- ✅ Automated payout calculations
- ✅ Penalty system for late payments
- ✅ Security deposit enforcement
- ✅ Transaction history and reconciliation

## 🔄 Migration Management

For managing future database changes, we recommend using one of the following migration tools:
- **node-pg-migrate** (for Node.js backends)
- **Flyway** (Java-based, language-agnostic)
- **Liquibase** (XML/YAML-based, language-agnostic)
- **TypeORM** (for TypeScript/Node.js backends)

### Using node-pg-migrate

```bash
# Install
npm install -g node-pg-migrate

# Create a new migration
npx node-pg-migrate create add-new-feature

# Run migrations
npx node-pg-migrate up

# Rollback
npx node-pg-migrate down
```

## Migration Best Practices

1. **Never modify existing migrations** - Always create new migrations for changes
2. **Always test migrations** on a development database first
3. **Make migrations reversible** - Include both `up` and `down` scripts
4. **Keep migrations small and focused** - One logical change per migration
5. **Document complex migrations** with comments
6. **Backup database** before running migrations in production

## Migration Naming Convention

Migrations should be named with a timestamp and descriptive name:
- `001_initial_schema.sql`
- `002_add_payment_methods.sql`
- `003_add_user_preferences.sql`

## Security Notes

- **Never commit sensitive data** (passwords, API keys) in migrations
- **Use environment variables** for configuration values
- **Test migrations with realistic data volumes** to ensure performance
- **Review generated SQL** before running in production
