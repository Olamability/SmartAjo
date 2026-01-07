import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { apiRateLimiter } from '@/lib/server/rateLimit';

// GET /api/groups/[id]/members - Get group members
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
        gm.id,
        gm.user_id,
        gm.position,
        gm.has_paid_security_deposit,
        gm.status,
        gm.joined_at,
        u.full_name,
        u.email,
        u.phone
      FROM group_members gm
      INNER JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.position ASC`,
      [groupId]
    );

    const members = result.rows.map(m => ({
      id: m.id,
      userId: m.user_id,
      fullName: m.full_name,
      email: m.email,
      phone: m.phone,
      position: m.position,
      hasPaidSecurityDeposit: m.has_paid_security_deposit,
      status: m.status,
      joinedAt: m.joined_at,
    }));

    return apiResponse(members);

  } catch (error) {
    console.error('Get group members error:', error);
    return apiError('An error occurred while fetching group members', 500);
  }
}
