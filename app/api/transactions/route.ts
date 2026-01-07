import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { apiRateLimiter } from '@/lib/server/rateLimit';

// GET /api/transactions - Get user's transactions
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await apiRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const auth = await authenticateRequest();
    if (!auth.authenticated || !auth.user) {
      return apiError('Unauthorized', 401);
    }

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let queryText = `
      SELECT 
        t.id,
        t.user_id,
        t.group_id,
        t.type,
        t.amount,
        t.status,
        t.reference,
        t.description,
        t.created_at,
        g.name as group_name
      FROM transactions t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE t.user_id = $1
    `;

    const queryParams: any[] = [auth.user.id];
    let paramIndex = 2;

    if (type) {
      queryText += ` AND t.type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND t.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    const transactions = result.rows.map(t => ({
      id: t.id,
      userId: t.user_id,
      groupId: t.group_id,
      groupName: t.group_name,
      type: t.type,
      amount: parseFloat(t.amount),
      status: t.status,
      reference: t.reference,
      description: t.description,
      date: t.created_at,
    }));

    return apiResponse(transactions);

  } catch (error) {
    console.error('Get transactions error:', error);
    return apiError('An error occurred while fetching transactions', 500);
  }
}
