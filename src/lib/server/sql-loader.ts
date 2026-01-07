/**
 * SQL Loader Utility
 * 
 * Utility functions for loading externalized SQL files following Contributing.md guidelines.
 * This helps avoid webpack cache serialization warnings by loading SQL from external files
 * instead of inlining them as template strings.
 */

import fs from 'fs';
import path from 'path';

/**
 * Cache for loaded SQL files to avoid repeated file system reads
 */
const sqlCache = new Map<string, string>();

/**
 * Default caching strategy - cache in production for performance
 */
const DEFAULT_USE_CACHE = process.env.NODE_ENV === 'production';

/**
 * Load a SQL file from the sql directory
 * 
 * @param relativePath - Path relative to the sql directory (e.g., 'queries/users/get-profile.sql')
 * @param useCache - Whether to cache the loaded SQL (default: true in production, false in development)
 * @returns The SQL content as a string
 * 
 * @example
 * ```typescript
 * import { loadSQL } from '@/lib/server/sql-loader';
 * 
 * const userProfileQuery = loadSQL('queries/users/get-profile.sql');
 * const result = await query(userProfileQuery, [userId]);
 * ```
 */
export function loadSQL(relativePath: string, useCache: boolean = DEFAULT_USE_CACHE): string {
  // Check cache first if enabled
  if (useCache && sqlCache.has(relativePath)) {
    return sqlCache.get(relativePath)!;
  }

  const fullPath = path.join(process.cwd(), 'sql', relativePath);
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Cache the content if enabled
    if (useCache) {
      sqlCache.set(relativePath, content);
    }
    
    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load SQL file: ${relativePath}. Error: ${errorMessage}`);
  }
}

/**
 * Load a SQL file with parameter substitution
 * 
 * ⚠️ SECURITY WARNING: This function performs string replacement for SQL template variables.
 * It should ONLY be used for trusted, static values like table names or column names,
 * NEVER for user input. For user input, always use PostgreSQL parameter binding ($1, $2, etc.).
 * 
 * Basic validation is performed, but this does not guarantee safety with untrusted input.
 * 
 * @param relativePath - Path relative to the sql directory
 * @param params - Object with key-value pairs to substitute in the SQL (trusted values only)
 * @returns The SQL content with parameters substituted
 * 
 * @example
 * ```typescript
 * // SAFE - Using for table/column names (trusted values)
 * const sql = loadSQLWithParams('queries/dynamic-query.sql', {
 *   tableName: 'users',  // Trusted, static value
 *   status: 'active'     // Trusted, static value
 * });
 * // SQL: SELECT * FROM {{tableName}} WHERE status = '{{status}}'
 * 
 * // UNSAFE - Never do this with user input:
 * // loadSQLWithParams('query.sql', { value: userInput }) ❌
 * // Instead use: query(sql, [userInput]) ✅
 * ```
 */
export function loadSQLWithParams(relativePath: string, params: Record<string, string>): string {
  let sql = loadSQL(relativePath);
  
  // Replace {{paramName}} with actual values
  // WARNING: This bypasses SQL parameter binding. Only use with trusted, static values.
  for (const [key, value] of Object.entries(params)) {
    // Basic validation: reject values that look like SQL injection attempts
    if (containsSuspiciousPatterns(value)) {
      throw new Error(
        `Potentially unsafe value detected for parameter '${key}'. ` +
        `Use PostgreSQL parameter binding ($1, $2) for dynamic values instead of template substitution.`
      );
    }
    
    const placeholder = `{{${key}}}`;
    // Escape any regex special characters in the placeholder
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sql = sql.replace(new RegExp(escapedPlaceholder, 'g'), value);
  }
  
  return sql;
}

/**
 * Check if a value contains suspicious SQL patterns
 * This is a basic safety check, not a comprehensive solution
 * 
 * @param value - Value to check
 * @returns true if suspicious patterns are found
 */
function containsSuspiciousPatterns(value: string): boolean {
  const suspiciousPatterns = [
    /;\s*DROP\s+/i,           // DROP statements
    /;\s*DELETE\s+/i,         // DELETE statements
    /;\s*UPDATE\s+/i,         // UPDATE statements
    /;\s*INSERT\s+/i,         // INSERT statements
    /;\s*EXEC\s*\(/i,         // EXEC calls
    /;\s*EXECUTE\s*\(/i,      // EXECUTE calls
    /--/,                     // SQL comments
    /\/\*/,                   // Block comments
    /xp_/i,                   // Extended procedures
    /sp_/i,                   // System procedures
    /;\s*SELECT\s+/i,         // SELECT statements (after semicolon)
    /UNION\s+SELECT/i,        // UNION SELECT
    /'\s*OR\s+['"]?1['"]?\s*=\s*['"]?1/i, // OR 1=1 patterns
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(value));
}

/**
 * Clear the SQL cache (useful for testing or development)
 */
export function clearSQLCache(): void {
  sqlCache.clear();
}

/**
 * Check if a SQL file exists
 * 
 * @param relativePath - Path relative to the sql directory
 * @returns true if the file exists
 */
export function sqlFileExists(relativePath: string): boolean {
  const fullPath = path.join(process.cwd(), 'sql', relativePath);
  return fs.existsSync(fullPath);
}
