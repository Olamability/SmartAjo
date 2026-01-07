import { NextRequest } from 'next/server';

// Mark route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';
import { query } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { 
  successResponse, 
  unauthorizedResponse, 
  serverErrorResponse 
} from '@/lib/server/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return unauthorizedResponse('Not authenticated');
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get user's payment history
    const result = await query(
      `SELECT 
        t.id,
        t.type,
        t.amount,
        t.status,
        t.date,
        t.reference,
        t.payment_reference,
        t.description,
        t.metadata,
        g.name as group_name,
        g.id as group_id
       FROM transactions t
       LEFT JOIN groups g ON t.group_id = g.id
       WHERE t.user_id = $1
       ORDER BY t.date DESC
       LIMIT $2 OFFSET $3`,
      [currentUser.id, limit, offset]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM transactions WHERE user_id = $1',
      [currentUser.id]
    );

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return successResponse({
      transactions: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    return serverErrorResponse('Failed to get payment history');
  }
}
