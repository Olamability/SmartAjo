# SQL Externalization Best Practices

This document provides detailed guidelines for externalizing SQL queries, schemas, and policies in the Secured-Ajo codebase.

## Quick Reference

### ✅ DO: Externalize to .sql files
- Schema definitions (CREATE TABLE, ALTER TABLE, DROP TABLE)
- RLS policies (CREATE POLICY, ALTER POLICY)
- Complex queries with multiple JOINs (>10 lines)
- Reusable queries used across multiple endpoints
- Migration scripts
- View definitions (CREATE VIEW)
- Function definitions (CREATE FUNCTION)
- Trigger definitions (CREATE TRIGGER)

### ✅ OK: Keep inline in TypeScript
- Simple queries (<5 lines)
- Single-table INSERT/UPDATE/DELETE
- Dynamic queries with variable structure
- Queries with many dynamic WHERE conditions

## Examples

### Example 1: Complex Query (EXTERNALIZE)

❌ **BAD - Inline in TypeScript:**
```typescript
const query = `
  SELECT 
    u.id, u.email, u.full_name,
    g.id as group_id, g.name as group_name,
    c.amount, c.status, c.due_date,
    COUNT(c.id) as total_contributions,
    SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as total_paid
  FROM users u
  LEFT JOIN group_members gm ON u.id = gm.user_id
  LEFT JOIN groups g ON gm.group_id = g.id
  LEFT JOIN contributions c ON u.id = c.user_id AND c.group_id = g.id
  WHERE u.id = $1 AND g.status = 'active'
  GROUP BY u.id, u.email, u.full_name, g.id, g.name, c.amount, c.status, c.due_date
  ORDER BY c.due_date DESC
`;
```

✅ **GOOD - External file:**
```typescript
import { loadSQL } from '@/lib/server/sql-loader';

const query = loadSQL('queries/users/get-user-contributions-summary.sql');
const result = await db.query(query, [userId]);
```

### Example 2: Simple Query (INLINE OK)

✅ **GOOD - Inline is fine for simple queries:**
```typescript
// Simple insert - inline is acceptable
const result = await query(
  'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3) RETURNING id',
  [userId, 'info', 'Welcome!']
);

// Simple select - inline is acceptable
const user = await query(
  'SELECT id, email, full_name FROM users WHERE id = $1',
  [userId]
);
```

### Example 3: Schema Definition (EXTERNALIZE)

❌ **BAD - Never inline schema DDL:**
```typescript
const createTable = `
  CREATE TABLE user_preferences (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    theme VARCHAR(20),
    notifications_enabled BOOLEAN
  )
`;
```

✅ **GOOD - Use migration file:**
```typescript
import { loadSQL } from '@/lib/server/sql-loader';

const migration = loadSQL('migrations/001-add-user-preferences.sql');
await db.query(migration);
```

### Example 4: RLS Policies (EXTERNALIZE)

❌ **BAD - Never inline RLS policies:**
```typescript
const rlsPolicy = `
  CREATE POLICY "users_select_own_data"
  ON users FOR SELECT
  USING (auth.uid() = id);
  
  CREATE POLICY "users_update_own_data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
`;
```

✅ **GOOD - Use dedicated RLS file:**
```typescript
import { loadSQL } from '@/lib/server/sql-loader';

const policies = loadSQL('migrations/rls/users-policies.sql');
await db.query(policies);
```

## File Naming Conventions

### Query Files
```
sql/queries/{domain}/{action-description}.sql
```

Examples:
- `sql/queries/users/get-user-profile.sql`
- `sql/queries/groups/list-active-groups-with-stats.sql`
- `sql/queries/contributions/get-overdue-contributions.sql`

### Migration Files
```
sql/migrations/{sequence}-{description}.sql
```

Examples:
- `sql/migrations/001-create-initial-schema.sql`
- `sql/migrations/002-add-notification-preferences.sql`
- `sql/migrations/003-update-group-indexes.sql`

### RLS Policy Files
```
sql/migrations/rls/{table-name}-policies.sql
```

Examples:
- `sql/migrations/rls/users-policies.sql`
- `sql/migrations/rls/groups-policies.sql`

## Using the SQL Loader

### Basic Usage
```typescript
import { loadSQL } from '@/lib/server/sql-loader';

const query = loadSQL('queries/users/get-profile.sql');
const result = await db.query(query, [userId]);
```

### With Parameter Substitution
For rare cases where you need template variable replacement:

```typescript
import { loadSQLWithParams } from '@/lib/server/sql-loader';

// SQL file: SELECT * FROM {{tableName}} WHERE status = '{{status}}'
const query = loadSQLWithParams('queries/dynamic.sql', {
  tableName: 'users',
  status: 'active'
});
```

**Note:** Prefer PostgreSQL parameters ($1, $2) over template substitution for security.

### Caching
SQL files are automatically cached in production for performance:

```typescript
// Automatically cached in production, not in development
const query = loadSQL('queries/users/get-profile.sql');

// Force cache off (useful for testing)
const query = loadSQL('queries/users/get-profile.sql', false);
```

## Performance Benefits

### Webpack Build Time
Externalizing large SQL strings prevents webpack cache serialization warnings:

Before (inline SQL):
```
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (130kiB) 
    impacts deserialization performance
```

After (externalized):
```
✓ Compiled successfully
```

### Development Experience
- **Faster rebuilds**: No need to re-serialize large strings
- **Better IDE support**: SQL syntax highlighting in .sql files
- **Easier debugging**: Separate files for each query

### Production Benefits
- **Smaller bundle size**: SQL not embedded in JavaScript bundles
- **Better caching**: SQL files can be cached separately
- **Easier updates**: Change SQL without rebuilding application

## Testing SQL Files

### Unit Testing
```typescript
import { loadSQL, sqlFileExists } from '@/lib/server/sql-loader';

describe('SQL Queries', () => {
  it('should load user profile query', () => {
    expect(sqlFileExists('queries/users/get-profile.sql')).toBe(true);
    const sql = loadSQL('queries/users/get-profile.sql');
    expect(sql).toContain('SELECT');
    expect(sql).toContain('FROM users');
  });
});
```

### SQL Linting
Consider using SQL linters like:
- sqlfluff
- pgFormatter
- sql-lint

## Migration Strategy

If you find existing inline SQL that should be externalized:

1. Create a new .sql file in appropriate directory
2. Copy the SQL content to the file
3. Replace inline SQL with `loadSQL()` call
4. Test thoroughly
5. Commit both files together

Example PR:
```
feat: externalize user statistics query

- Create sql/queries/users/get-user-stats.sql
- Update api/users/stats route to use loadSQL
- Improves build performance and maintainability
```

## Common Pitfalls

### ❌ Don't Use Template Substitution for User Input
```typescript
// DANGEROUS - SQL injection risk
const query = loadSQLWithParams('queries/users/search.sql', {
  searchTerm: userInput  // ❌ Never do this!
});
```

### ✅ Always Use Parameter Binding
```typescript
// SAFE - Use PostgreSQL parameters
const query = loadSQL('queries/users/search.sql');
const result = await db.query(query, [userInput]);  // ✅ Safe
```

### ❌ Don't Over-Externalize
```typescript
// Too simple to externalize
const query = loadSQL('queries/users/get-by-id.sql');
// File contents: SELECT * FROM users WHERE id = $1

// Just keep it inline:
const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
```

## Questions?

If you're unsure whether to externalize a particular SQL query:

**Ask yourself:**
1. Is it longer than 10 lines?
2. Does it have multiple JOINs?
3. Will it be reused in multiple places?
4. Is it a schema definition or RLS policy?

If you answered "yes" to any of these, externalize it.

For more help, see:
- `/src/lib/server/sql-examples.ts` - Complete examples
- `/sql/README.md` - Directory overview
- `Contributing.md` - Main contribution guidelines
