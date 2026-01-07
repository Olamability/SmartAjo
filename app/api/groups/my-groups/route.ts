import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { apiRateLimiter } from '@/lib/server/rateLimit';

// GET /api/groups/my-groups - Get all groups the user is a member of
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate user
    const auth = await authenticateRequest();
    if (!auth.authenticated || !auth.user) {
      return apiError('Unauthorized', 401);
    }

    // Fetch user's groups
    const result = await query(
      `SELECT 
        g.id,
        g.name,
        g.description,
        g.creator_id,
        g.contribution_amount,
        g.frequency,
        g.total_members,
        g.current_members,
        g.security_deposit,
        g.service_fee_percentage,
        g.start_date,
        g.end_date,
        g.current_cycle,
        g.status,
        g.created_at,
        gm.position,
        gm.has_paid_security_deposit,
        gm.status as member_status,
        gm.joined_at,
        u.full_name as creator_name
      FROM group_members gm
      INNER JOIN groups g ON gm.group_id = g.id
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE gm.user_id = $1
      ORDER BY g.created_at DESC`,
      [auth.user.userId]
    );

    const groups = result.rows.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      creatorId: group.creator_id,
      creatorName: group.creator_name,
      contributionAmount: parseFloat(group.contribution_amount),
      frequency: group.frequency,
      totalMembers: group.total_members,
      currentMembers: group.current_members,
      securityDeposit: parseFloat(group.security_deposit),
      serviceFeePercentage: parseFloat(group.service_fee_percentage),
      startDate: group.start_date,
      endDate: group.end_date,
      currentCycle: group.current_cycle,
      status: group.status,
      createdAt: group.created_at,
      // Member-specific fields
      myPosition: group.position,
      hasPaidSecurityDeposit: group.has_paid_security_deposit,
      memberStatus: group.member_status,
      joinedAt: group.joined_at,
    }));

    return apiResponse(groups);

  } catch (error) {
    console.error('Get my groups error:', error);
    return apiError('An error occurred while fetching your groups', 500);
  }
}
