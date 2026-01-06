import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { rateLimit } from '@/lib/server/rateLimit';

// GET /api/groups/[id] - Get group details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return apiError('Too many requests. Please try again later.', 429);
    }

    const groupId = params.id;

    // Fetch group details
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
        g.updated_at,
        u.full_name as creator_name,
        u.email as creator_email
      FROM groups g
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE g.id = $1`,
      [groupId]
    );

    if (result.rows.length === 0) {
      return apiError('Group not found', 404);
    }

    const group = result.rows[0];

    // Get member count and list
    const membersResult = await query(
      `SELECT 
        gm.id,
        gm.user_id,
        gm.position,
        gm.has_paid_security_deposit,
        gm.status,
        gm.joined_at,
        u.full_name,
        u.email
      FROM group_members gm
      LEFT JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.position ASC`,
      [groupId]
    );

    const groupData = {
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
      updatedAt: group.updated_at,
      members: membersResult.rows.map(m => ({
        id: m.id,
        userId: m.user_id,
        fullName: m.full_name,
        position: m.position,
        hasPaidSecurityDeposit: m.has_paid_security_deposit,
        status: m.status,
        joinedAt: m.joined_at,
      })),
    };

    return apiResponse(groupData);

  } catch (error) {
    console.error('Get group error:', error);
    return apiError('An error occurred while fetching the group', 500);
  }
}
