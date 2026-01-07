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