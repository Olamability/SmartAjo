import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { apiRateLimiter } from '@/lib/server/rateLimit';

// GET /api/groups/[id]/transactions - Get group transactions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitResult = await apiRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const groupId = params.id;

    const result = await query(
      `SELECT 
        t.id,
        t.user_id,
        t.group_id,
        t.type,
        t.amount,
        t.status,
        t.reference,
        t.description,
        t.created_at,
        u.full_name as user_name
      FROM transactions t
      INNER JOIN users u ON t.user_id = u.id
      WHERE t.group_id = $1
      ORDER BY t.created_at DESC`,
      [groupId]
    );

    const transactions = result.rows.map(t => ({
      id: t.id,
      userId: t.user_id,
      userName: t.user_name,
      groupId: t.group_id,
      type: t.type,
      amount: parseFloat(t.amount),
      status: t.status,
      reference: t.reference,
      description: t.description,
      date: t.created_at,
    }));

    return apiResponse(transactions);

  } catch (error) {
    console.error('Get group transactions error:', error);
    return apiError('An error occurred while fetching group transactions', 500);
  }
}
