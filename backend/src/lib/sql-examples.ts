import 'server-only';

/**
 * Example: Using Externalized SQL Queries
 * 
 * This file demonstrates the recommended pattern from Contributing.md
 * for using externalized SQL queries instead of inline template strings.
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { loadSQL } from '@/lib/server/sql-loader';
import { getCurrentUser } from '@/lib/server/auth';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/server/apiResponse';

// Mark route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

/**
 * Example 1: Using loadSQL for complex queries
 * 
 * This approach is recommended for:
 * - Complex queries with multiple JOINs
 * - Queries longer than 10 lines
 * - Reusable queries used in multiple endpoints
 */
export async function GET_EXAMPLE_WITH_EXTERNALIZED_SQL() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return unauthorizedResponse('Not authenticated');
    }

    // Load SQL from external file (cached in production)
    const userProfileQuery = loadSQL('queries/users/get-user-profile-with-stats.sql');

    // Execute the query with parameters
    const result = await query(userProfileQuery, [currentUser.id]);

    if (result.rows.length === 0) {
      return serverErrorResponse('User not found');
    }

    return successResponse(result.rows[0]);
  } catch (error) {
    console.error('Get user profile error:', error);
    return serverErrorResponse('Failed to get user profile');
  }
}

/**
 * Example 2: Inline queries are acceptable for small, dynamic cases
 * 
 * Short, dynamic queries can still be inline:
 * - Less than 5 lines
 * - Highly dynamic with variable column/table names
 * - Simple single-table operations
 */
export async function POST_EXAMPLE_WITH_INLINE_SQL(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return unauthorizedResponse('Not authenticated');
    }

    const body = await req.json();

    // This is acceptable - small, dynamic query
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [currentUser.id, body.type, body.title, body.message]
    );

    return successResponse(result.rows[0]);
  } catch (error) {
    console.error('Create notification error:', error);
    return serverErrorResponse('Failed to create notification');
  }
}

/**
 * Example 3: When to externalize
 * 
 * BAD - Don't do this (large inline SQL):
 * ```typescript
 * const complexQuery = `
 *   SELECT 
 *     u.id, u.name, u.email,
 *     g.id as group_id, g.name as group_name,
 *     c.amount, c.status,
 *     ... (many more lines)
 *   FROM users u
 *   LEFT JOIN group_members gm ON ...
 *   LEFT JOIN groups g ON ...
 *   ... (many more joins and conditions)
 * `;
 * ```
 * 
 * GOOD - Do this instead:
 * ```typescript
 * const complexQuery = loadSQL('queries/users/complex-user-report.sql');
 * ```
 */

/**
 * Benefits of externalizing SQL:
 * 
 * 1. Performance:
 *    - Avoids webpack cache serialization warnings
 *    - Faster development rebuilds
 *    - Better production bundle size
 * 
 * 2. Maintainability:
 *    - SQL syntax highlighting in .sql files
 *    - Easier to read and modify
 *    - Can use SQL formatting tools
 * 
 * 3. Reusability:
 *    - Share queries across multiple endpoints
 *    - DRY principle for complex queries
 * 
 * 4. Testing:
 *    - Can test SQL independently
 *    - Better version control diffs
 */
