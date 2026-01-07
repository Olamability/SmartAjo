# SQL Files Directory

This directory contains externalized SQL queries, schemas, and policies following the Contributing.md guidelines.

## Directory Structure

```
sql/
├── queries/          # Reusable SQL queries
│   ├── users/       # User-related queries
│   ├── groups/      # Group-related queries
│   └── ...
├── migrations/      # Database migration scripts
└── README.md        # This file
```

## Usage Pattern

As per Contributing.md guidelines, large SQL queries, RLS policies, and schema definitions should be externalized to separate files rather than embedded as template strings in TypeScript/JavaScript files.

### Recommended Pattern

```typescript
import fs from "fs";
import path from "path";

// Load SQL from external file
const querySQL = fs.readFileSync(
  path.join(process.cwd(), "sql/queries/users/get-user-profile.sql"),
  "utf8"
);
```

### Benefits

1. **Performance**: Avoids webpack cache serialization warnings
2. **Maintainability**: SQL is easier to read and modify in dedicated files
3. **Reusability**: Queries can be shared across multiple endpoints
4. **Version Control**: Better diff tracking for SQL changes
5. **Testing**: SQL can be tested independently

## Guidelines

### What to Externalize

- ✅ Schema definitions (CREATE TABLE, ALTER TABLE, etc.)
- ✅ RLS policies (CREATE POLICY, etc.)
- ✅ Large static queries (>10 lines)
- ✅ Complex JOIN queries
- ✅ Migration scripts

### What Can Stay Inline

- ✅ Small, dynamic queries (<5 lines)
- ✅ Parameterized queries with dynamic WHERE clauses
- ✅ Simple INSERT/UPDATE statements with few columns

## Example

See `/src/lib/server/sql-loader.ts` for a utility function that simplifies loading SQL files.

## Note

The main database schema is maintained in `/supabase/schema.sql` and storage policies in `/supabase/storage.sql`.
