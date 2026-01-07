Going forward, do not inline large SQL, RLS policies, schemas, or other large static text directly inside TypeScript/JavaScript files.

Required approach:

Move all large SQL, schema definitions, RLS policies, or static text blobs into separate files (e.g. /sql, /db, or /schemas directories).

Load them at runtime using fs.readFileSync (or async equivalents) instead of embedding them as template strings.

Example (required pattern):

import fs from "fs";
import path from "path";

const schemaSQL = fs.readFileSync(
  path.join(process.cwd(), "sql/schema.sql"),
  "utf8"
);

Do NOT do this:

const schemaSQL = `
CREATE TABLE ...
-- large inline SQL or RLS text
`;

Reason:
Inlining large strings causes Webpack cache serialization warnings, slows dev rebuilds, and is not aligned with Next.js best practices. Externalizing these files improves performance, maintainability, and production stability.

This style is now the standard for the Secured-Ajo codebase and should be followed for all new work and refactors.

## Implementation

The `/sql` directory structure has been set up to support this pattern:

```
sql/
├── queries/           # Reusable SQL queries
│   ├── users/        # User-related queries
│   ├── groups/       # Group-related queries
│   └── contributions/# Contribution queries
├── migrations/       # Database migration scripts
└── README.md         # Documentation
```

### Utility Functions

Use the SQL loader utility at `/src/lib/server/sql-loader.ts`:

```typescript
import { loadSQL } from '@/lib/server/sql-loader';

// Load and execute externalized query
const query = loadSQL('queries/users/get-user-profile-with-stats.sql');
const result = await db.query(query, [userId]);
```

### Examples

- See `/src/lib/server/sql-examples.ts` for complete usage examples
- See `/sql/queries/` for example query files
- See `/sql/migrations/` for migration examples

### When to Externalize

**Externalize (use separate .sql files):**
- Schema definitions (CREATE TABLE, ALTER TABLE)
- RLS policies (CREATE POLICY)
- Large queries (>10 lines)
- Complex JOINs with multiple tables
- Migration scripts
- Reusable queries used in multiple places

**Can keep inline (in TypeScript):**
- Small, dynamic queries (<5 lines)
- Simple single-table INSERT/UPDATE/SELECT
- Highly dynamic queries with variable structure