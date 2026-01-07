import { NextRequest } from 'next/server';

// Mark route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { apiRateLimiter } from '@/lib/server/rateLimit';

// PATCH /api/notifications/[id]/read - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitResult = await apiRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const auth = await authenticateRequest();
    if (!auth.authenticated || !auth.user) {
      return apiError('Unauthorized', 401);
    }

    const notificationId = params.id;

    // Verify notification belongs to user
    const checkResult = await query(
      `SELECT id FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, auth.user.id]
    );

    if (checkResult.rows.length === 0) {
      return apiError('Notification not found', 404);
    }

    // Mark as read
    await query(
      `UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = $1`,
      [notificationId]
    );

    return apiResponse({ success: true }, 'Notification marked as read');

  } catch (error) {
    console.error('Mark notification as read error:', error);
    return apiError('An error occurred while updating notification', 500);
  }
}
