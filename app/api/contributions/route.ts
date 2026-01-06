import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { rateLimit } from '@/lib/server/rateLimit';

// GET /api/contributions - Get user's contributions
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return apiError('Too many requests. Please try again later.', 429);
    }

    const auth = await authenticateRequest();
    if (!auth.authenticated || !auth.user) {
      return apiError('Unauthorized', 401);
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryText = `
      SELECT 
        c.id,
        c.group_id,
        c.user_id,
        c.cycle_number,
        c.amount,
        c.due_date,
        c.paid_date,
        c.status,
        c.created_at,
        g.name as group_name
      FROM contributions c
      LEFT JOIN groups g ON c.group_id = g.id
      WHERE c.user_id = $1
    `;

    const queryParams: any[] = [auth.user.userId];
    let paramIndex = 2;

    if (groupId) {
      queryText += ` AND c.group_id = $${paramIndex}`;
      queryParams.push(groupId);
      paramIndex++;
    }

    queryText += ` ORDER BY c.due_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    const contributions = result.rows.map(c => ({
      id: c.id,
      groupId: c.group_id,
      groupName: c.group_name,
      userId: c.user_id,
      cycleNumber: c.cycle_number,
      amount: parseFloat(c.amount),
      dueDate: c.due_date,
      paidDate: c.paid_date,
      status: c.status,
      createdAt: c.created_at,
    }));

    return apiResponse(contributions);

  } catch (error) {
    console.error('Get contributions error:', error);
    return apiError('An error occurred while fetching contributions', 500);
  }
}
