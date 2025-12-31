# Database Migrations for Ajo Secure

This directory contains database migration files for the Ajo Secure platform.

## Migration Tool

We recommend using one of the following migration tools:
- **node-pg-migrate** (for Node.js backends)
- **Flyway** (Java-based, language-agnostic)
- **Liquibase** (XML/YAML-based, language-agnostic)
- **TypeORM** (for TypeScript/Node.js backends)

## Running Migrations

### Initial Setup

```bash
# Apply the initial schema
psql -U postgres -d ajo_secure < schema.sql
```

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
