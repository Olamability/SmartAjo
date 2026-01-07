# Database Migration Guide

This guide helps you migrate from a previous database setup to the new Supabase schema.

## 🔄 Migration Scenarios

### Scenario 1: Fresh Installation (No Existing Data)

✅ **Recommended Path**: Follow the main [README.md](./README.md) setup instructions.

### Scenario 2: Existing Supabase Project (With Data)

⚠️ **Caution**: Backup your data before proceeding.

#### Step 1: Backup Existing Data

```bash
# Using Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d).sql

# Or from Supabase Dashboard
# Settings → Database → Backups → Download
```

#### Step 2: Export Existing User Data

```sql
-- Export users to CSV
COPY (
  SELECT id, email, phone, full_name, created_at
  FROM users
) TO '/tmp/users_export.csv' WITH CSV HEADER;
```

#### Step 3: Apply New Schema

Option A: Non-destructive (Add missing tables)

```sql
-- Run schema.sql but modify CREATE TABLE statements
-- Change: CREATE TABLE IF NOT EXISTS ...
-- To: CREATE TABLE IF NOT EXISTS ... 
-- (Already done in our schema)
```

Option B: Clean slate (Drop and recreate)

```sql
-- ⚠️ WARNING: This will delete all data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then run schema.sql
```

#### Step 4: Migrate Data

```sql
-- Example: Migrate user data
INSERT INTO users (id, email, phone, full_name, created_at)
SELECT id, email, phone, full_name, created_at
FROM backup_users
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  full_name = EXCLUDED.full_name;
```

### Scenario 3: Different Database (PostgreSQL, MySQL, etc.)

#### Step 1: Export Data from Source

```bash
# PostgreSQL
pg_dump -h localhost -U postgres -d old_db -F c -f old_db.dump

# MySQL
mysqldump -u root -p old_db > old_db.sql
```

#### Step 2: Transform Data Structure

Create transformation scripts to match new schema:

```sql
-- Example transformation
SELECT 
  user_id as id,
  email,
  phone_number as phone,
  name as full_name,
  false as is_verified,
  true as is_active,
  'not_started' as kyc_status,
  now() as created_at
FROM old_users;
```

#### Step 3: Import to Supabase

```sql
-- Run schema.sql first
-- Then import transformed data
\copy users FROM 'users_transformed.csv' WITH CSV HEADER;
```

## 🔧 Schema Changes from Previous Versions

### Breaking Changes

1. **User Table**: Now references `auth.users` table
   - Old: Self-contained user table
   - New: Extends Supabase Auth

2. **Group Members**: Position field is now required
   - Old: Optional rotation order
   - New: Required position for payout order

3. **Contributions**: Added cycle_number field
   - Old: Simple contribution tracking
   - New: Cycle-based tracking

4. **RLS Policies**: Now enforced on all tables
   - Old: No RLS or basic RLS
   - New: Comprehensive RLS policies

### New Features

1. **Triggers**: Automatic timestamp updates
2. **Functions**: Analytics and statistics
3. **Audit Logs**: Complete audit trail
4. **Storage**: File upload support

## 📋 Pre-Migration Checklist

- [ ] Backup current database
- [ ] Export all existing data
- [ ] Document custom modifications
- [ ] Test migration in staging environment
- [ ] Verify data integrity after migration
- [ ] Update application code if needed
- [ ] Test all critical workflows

## 🧪 Testing Migration

```sql
-- Verify table structure
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Verify row counts
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'groups', COUNT(*) FROM groups
UNION ALL
SELECT 'group_members', COUNT(*) FROM group_members
UNION ALL
SELECT 'contributions', COUNT(*) FROM contributions
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions;

-- Verify foreign keys
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 🚨 Common Migration Issues

### Issue: UUID vs Integer IDs

**Problem**: Old database uses integer IDs, new schema uses UUIDs

**Solution**: Generate UUIDs during migration

```sql
-- Create mapping table
CREATE TEMP TABLE id_mapping (
  old_id INTEGER,
  new_id UUID DEFAULT uuid_generate_v4()
);

-- Populate mapping
INSERT INTO id_mapping (old_id)
SELECT id FROM old_users;

-- Use mapping for migration
INSERT INTO users (id, email, ...)
SELECT m.new_id, u.email, ...
FROM old_users u
JOIN id_mapping m ON u.id = m.old_id;
```

### Issue: Missing Required Fields

**Problem**: New schema requires fields not in old database

**Solution**: Provide default values

```sql
INSERT INTO users (
  id, email, phone, full_name,
  is_verified, -- Missing in old schema
  kyc_status   -- Missing in old schema
)
SELECT 
  id, email, phone, full_name,
  false as is_verified,  -- Default value
  'not_started' as kyc_status  -- Default value
FROM old_users;
```

### Issue: Auth User Sync

**Problem**: Users not in Supabase Auth system

**Solution**: Create auth users first

```sql
-- This requires Supabase Admin API or manual user creation
-- Cannot be done directly via SQL
-- Use Supabase JS Admin SDK:

-- JavaScript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, serviceRoleKey)

for (const user of oldUsers) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: generateTemporaryPassword(),
    email_confirm: false,
    user_metadata: {
      full_name: user.full_name,
      phone: user.phone
    }
  })
  
  // Store UUID mapping
  await updateIdMapping(user.old_id, data.user.id)
}
```

## 💾 Rollback Plan

If migration fails, rollback procedure:

1. **Stop the application**
   ```bash
   pm2 stop all  # or your process manager
   ```

2. **Restore from backup**
   ```bash
   # Supabase CLI
   supabase db restore backup-20260107.sql
   
   # Or PostgreSQL directly
   psql -h db.project.supabase.co -U postgres -d postgres -f backup.sql
   ```

3. **Verify restoration**
   ```sql
   -- Check row counts
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM groups;
   ```

4. **Restart application with old code**
   ```bash
   git checkout previous-version
   npm install
   npm start
   ```

## �� Support

For migration assistance:

1. Review detailed error messages
2. Check Supabase logs in dashboard
3. Consult PostgreSQL documentation
4. Ask in Supabase Discord community

## 📝 Post-Migration Tasks

- [ ] Verify all data migrated successfully
- [ ] Test user authentication
- [ ] Test all critical features
- [ ] Monitor error logs
- [ ] Update documentation
- [ ] Notify users of any changes
- [ ] Archive old database backups
- [ ] Update environment variables
- [ ] Run performance tests
- [ ] Schedule follow-up checks

---

**Remember**: Always test migrations in a non-production environment first!
