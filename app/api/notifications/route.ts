import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { apiRateLimiter } from '@/lib/server/rateLimit';

// GET /api/notifications - Get user's notifications
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    let queryText = `
      SELECT 
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.related_group_id,
        n.related_transaction_id,
        n.created_at,
        g.name as group_name
      FROM notifications n
      LEFT JOIN groups g ON n.related_group_id = g.id
      WHERE n.user_id = $1
    `;

    const queryParams: any[] = [auth.user.userId];
    let paramIndex = 2;

    if (unreadOnly) {
      queryText += ` AND n.is_read = false`;
    }

    queryText += ` ORDER BY n.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    const notifications = result.rows.map(n => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.is_read,
      relatedGroupId: n.related_group_id,
      groupName: n.group_name,
      relatedTransactionId: n.related_transaction_id,
      createdAt: n.created_at,
    }));

    return apiResponse(notifications);

  } catch (error) {
    console.error('Get notifications error:', error);
    return apiError('An error occurred while fetching notifications', 500);
  }
}
