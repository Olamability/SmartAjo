import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { rateLimit } from '@/lib/server/rateLimit';

// GET /api/groups/available - Get available groups to join (not full, user not a member)
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return apiError('Too many requests. Please try again later.', 429);
    }

    // Try to authenticate, but allow anonymous access
    const auth = await authenticateRequest();
    const userId = auth.user?.userId;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryText: string;
    let queryParams: any[];

    if (userId) {
      // If authenticated, exclude groups user is already in
      queryText = `SELECT 
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
        g.status,
        g.created_at,
        u.full_name as creator_name
      FROM groups g
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE g.status = 'forming'
        AND g.current_members < g.total_members
        AND g.id NOT IN (
          SELECT group_id FROM group_members WHERE user_id = $1
        )
      ORDER BY g.created_at DESC
      LIMIT $2 OFFSET $3`;
      queryParams = [userId, limit, offset];
    } else {
      // Anonymous access - show all forming groups
      queryText = `SELECT 
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
        g.status,
        g.created_at,
        u.full_name as creator_name
      FROM groups g
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE g.status = 'forming'
        AND g.current_members < g.total_members
      ORDER BY g.created_at DESC
      LIMIT $1 OFFSET $2`;
      queryParams = [limit, offset];
    }

    const result = await query(queryText, queryParams);

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
      status: group.status,
      createdAt: group.created_at,
    }));

    return apiResponse(groups);

  } catch (error) {
    console.error('Get available groups error:', error);
    return apiError('An error occurred while fetching available groups', 500);
  }
}
