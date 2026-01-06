import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { rateLimit } from '@/lib/server/rateLimit';

// GET /api/groups/[id]/contributions - Get group contributions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return apiError('Too many requests. Please try again later.', 429);
    }

    const groupId = params.id;

    const result = await query(
      `SELECT 
        c.id,
        c.group_id,
        c.user_id,
        c.cycle_number,
        c.amount,
        c.due_date,
        c.paid_date,
        c.status,
        c.created_at,
        u.full_name as user_name
      FROM contributions c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.group_id = $1
      ORDER BY c.cycle_number DESC, c.due_date DESC`,
      [groupId]
    );

    const contributions = result.rows.map(c => ({
      id: c.id,
      groupId: c.group_id,
      userId: c.user_id,
      userName: c.user_name,
      cycleNumber: c.cycle_number,
      amount: parseFloat(c.amount),
      dueDate: c.due_date,
      paidDate: c.paid_date,
      status: c.status,
      createdAt: c.created_at,
    }));

    return apiResponse(contributions);

  } catch (error) {
    console.error('Get group contributions error:', error);
    return apiError('An error occurred while fetching group contributions', 500);
  }
}
