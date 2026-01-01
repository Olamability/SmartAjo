# Database Migrations for Ajo Secure

This directory contains database migration files for the Ajo Secure platform.

## Quick Setup

### Using Supabase (Cloud PostgreSQL - Recommended)

Supabase is a hosted PostgreSQL database that's free to get started and requires no local installation.

#### Initial Setup with Supabase
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

**Advantages of Supabase:**
- ✅ No local installation required
- ✅ Free tier includes 500MB database
- ✅ Automatic backups
- ✅ Built-in dashboard for data viewing
- ✅ Row-level security features
- ✅ Real-time subscriptions support
- ✅ Automatic SSL/TLS encryption

### Using Local PostgreSQL

If you prefer to run PostgreSQL locally:

#### Initial Setup
```bash
# Apply the initial schema
psql -U postgres -d ajo_secure < schema.sql
```

## Migration Tools for Future Changes

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
