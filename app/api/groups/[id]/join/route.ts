import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { apiResponse, apiError } from '@/lib/server/apiResponse';
import { apiRateLimiter } from '@/lib/server/rateLimit';

// POST /api/groups/[id]/join - Join a group
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const groupId = params.id;

    // Check if group exists and is accepting members
    const groupResult = await query(
      `SELECT id, name, status, total_members, current_members 
       FROM groups 
       WHERE id = $1`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return apiError('Group not found', 404);
    }

    const group = groupResult.rows[0];

    if (group.status !== 'forming') {
      return apiError('This group is not accepting new members', 400);
    }

    if (group.current_members >= group.total_members) {
      return apiError('This group is already full', 400);
    }

    // Check if user is already a member
    const memberCheckResult = await query(
      `SELECT id FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, auth.user.userId]
    );

    if (memberCheckResult.rows.length > 0) {
      return apiError('You are already a member of this group', 400);
    }

    // Get next available position
    const positionResult = await query(
      `SELECT COALESCE(MAX(position), 0) + 1 as next_position 
       FROM group_members 
       WHERE group_id = $1`,
      [groupId]
    );

    const nextPosition = positionResult.rows[0].next_position;

    // Add user as member
    await query(
      `INSERT INTO group_members (
        group_id, 
        user_id, 
        position, 
        has_paid_security_deposit, 
        status
      ) VALUES ($1, $2, $3, $4, $5)`,
      [groupId, auth.user.userId, nextPosition, false, 'pending']
    );

    // Update current_members count
    await query(
      `UPDATE groups SET current_members = current_members + 1 WHERE id = $1`,
      [groupId]
    );

    // Check if group is now full, activate if so
    const updatedGroup = await query(
      `SELECT current_members, total_members FROM groups WHERE id = $1`,
      [groupId]
    );

    if (updatedGroup.rows[0].current_members >= updatedGroup.rows[0].total_members) {
      await query(
        `UPDATE groups SET status = 'active' WHERE id = $1`,
        [groupId]
      );
    }

    // Create notification for group creator
    await query(
      `INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        related_group_id
      ) SELECT 
        creator_id,
        'member_joined',
        'New Member Joined',
        $1,
        $2
      FROM groups WHERE id = $2`,
      [`A new member has joined ${group.name}`, groupId]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        auth.user.userId,
        'join',
        'group',
        groupId,
        JSON.stringify({ groupName: group.name, position: nextPosition })
      ]
    );

    return apiResponse(
      { groupId, position: nextPosition },
      'Successfully joined the group',
      201
    );

  } catch (error) {
    console.error('Join group error:', error);
    return apiError('An error occurred while joining the group', 500);
  }
}
