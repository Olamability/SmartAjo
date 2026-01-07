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
 * Load a SQL file from the sql directory
 * 
 * @param relativePath - Path relative to the sql directory (e.g., 'queries/users/get-profile.sql')
 * @param useCache - Whether to cache the loaded SQL (default: true in production)
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
export function loadSQL(relativePath: string, useCache: boolean = process.env.NODE_ENV === 'production'): string {
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
    throw new Error(`Failed to load SQL file: ${relativePath}. Error: ${error}`);
  }
}

/**
 * Load a SQL file with parameter substitution
 * 
 * @param relativePath - Path relative to the sql directory
 * @param params - Object with key-value pairs to substitute in the SQL
 * @returns The SQL content with parameters substituted
 * 
 * @example
 * ```typescript
 * // SQL file contains: SELECT * FROM {{tableName}} WHERE status = '{{status}}'
 * const sql = loadSQLWithParams('queries/dynamic-query.sql', {
 *   tableName: 'users',
 *   status: 'active'
 * });
 * ```
 */
export function loadSQLWithParams(relativePath: string, params: Record<string, string>): string {
  let sql = loadSQL(relativePath);
  
  // Replace {{paramName}} with actual values
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{{${key}}}`;
    sql = sql.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return sql;
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
