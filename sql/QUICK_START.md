# Quick Start: SQL Externalization

This guide shows you how to quickly start using externalized SQL queries in your code.

## 5-Minute Quick Start

### Step 1: Create Your SQL File

Create a new `.sql` file in the appropriate directory:

```bash
# For user-related queries
touch sql/queries/users/my-new-query.sql

# For group-related queries  
touch sql/queries/groups/my-new-query.sql

# For migrations
touch sql/migrations/002-my-migration.sql
```

### Step 2: Write Your SQL

Edit the file with your SQL query:

```sql
-- sql/queries/users/get-active-users.sql
SELECT 
  id,
  email,
  full_name,
  created_at
FROM users
WHERE is_verified = true
  AND status = 'active'
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;
```

### Step 3: Use in Your Code

Import and use the SQL loader in your API route:

```typescript
import { loadSQL } from '@/lib/server/sql-loader';
import { query } from '@/lib/server/db';

export async function GET() {
  // Load the SQL file
  const sql = loadSQL('queries/users/get-active-users.sql');
  
  // Execute with parameters
  const result = await query(sql, [10, 0]); // limit 10, offset 0
  
  return Response.json(result.rows);
}
```

That's it! ✅

## Common Use Cases

### Use Case 1: Complex Join Query

**Create:** `sql/queries/groups/get-group-details.sql`

```sql
SELECT 
  g.*,
  u.full_name as creator_name,
  COUNT(gm.id) as member_count
FROM groups g
LEFT JOIN users u ON g.created_by = u.id
LEFT JOIN group_members gm ON g.id = gm.group_id
WHERE g.id = $1
GROUP BY g.id, u.full_name;
```

**Use:**
```typescript
const sql = loadSQL('queries/groups/get-group-details.sql');
const result = await query(sql, [groupId]);
```

### Use Case 2: Database Migration

**Create:** `sql/migrations/003-add-user-settings.sql`

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en'
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

**Use:**
```typescript
const migration = loadSQL('migrations/003-add-user-settings.sql');
await query(migration);
```

### Use Case 3: Reusable Query Across Multiple Endpoints

**Create:** `sql/queries/contributions/check-overdue.sql`

```sql
SELECT id, user_id, group_id, amount, due_date
FROM contributions
WHERE status = 'pending'
  AND due_date < CURRENT_DATE
  AND group_id = $1;
```

**Use in multiple files:**
```typescript
// In api/cron/check-penalties/route.ts
const overdueSQL = loadSQL('queries/contributions/check-overdue.sql');
const overdue = await query(overdueSQL, [groupId]);

// In api/groups/[id]/overdue/route.ts  
const overdueSQL = loadSQL('queries/contributions/check-overdue.sql');
const overdue = await query(overdueSQL, [groupId]);
```

## When to Externalize?

### ✅ Externalize (use .sql files)

```typescript
// Long query with multiple joins
const sql = loadSQL('queries/reports/monthly-summary.sql');

// Schema definitions
const schema = loadSQL('migrations/001-initial-schema.sql');

// RLS policies
const policies = loadSQL('migrations/rls/table-policies.sql');
```

### ✅ Keep Inline (in TypeScript)

```typescript
// Short, simple queries
await query('SELECT * FROM users WHERE id = $1', [id]);

// Simple inserts
await query(
  'INSERT INTO logs (message) VALUES ($1)',
  ['User logged in']
);
```

## Tips

1. **Use meaningful file names**: `get-active-users.sql` not `query1.sql`
2. **Add comments in SQL files**: Explain complex logic
3. **Use PostgreSQL parameters**: `$1, $2` not string concatenation
4. **Test your queries**: Verify in a SQL client first
5. **Keep related queries together**: Group by domain (users/, groups/, etc.)

## Troubleshooting

### Error: "Failed to load SQL file"

Make sure:
- The file exists in the `sql/` directory
- The path is relative to `sql/` (no leading slash)
- The file extension is `.sql`

```typescript
// ❌ Wrong
loadSQL('/sql/queries/users/get.sql')

// ✅ Correct  
loadSQL('queries/users/get.sql')
```

### SQL Syntax Error

Test your SQL in a SQL client first:
```bash
# Using psql
psql -f sql/queries/users/get-active-users.sql
```

## Next Steps

- Read the [full best practices guide](./BEST_PRACTICES.md)
- See [complete examples](../src/lib/server/sql-examples.ts)
- Review [Contributing guidelines](../Contributing.md)

## Need Help?

Check these resources:
- `sql/README.md` - Overview of directory structure
- `sql/BEST_PRACTICES.md` - Detailed guidelines
- `src/lib/server/sql-examples.ts` - Code examples
- `Contributing.md` - Main contribution guide
