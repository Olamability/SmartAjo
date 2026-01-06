import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { authenticateRequest } from '@/lib/server/auth';
import { createGroupSchema } from '@/lib/server/validation';
import { apiResponse, apiError, apiValidationError } from '@/lib/server/apiResponse';
import { rateLimit } from '@/lib/server/rateLimit';

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return apiError('Too many requests. Please try again later.', 429);
    }

    // Authenticate user
    const auth = await authenticateRequest();
    if (!auth.authenticated || !auth.user) {
      return apiError('Unauthorized', 401);
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = createGroupSchema.safeParse(body);
    if (!validation.success) {
      return apiValidationError(validation.error);
    }

    const { 
      name, 
      description, 
      contributionAmount, 
      frequency, 
      totalMembers, 
      securityDepositPercentage, 
      serviceFeePercentage,
      startDate 
    } = validation.data;

    // Calculate security deposit
    const securityDeposit = Math.round((contributionAmount * securityDepositPercentage) / 100);

    // Calculate default start date if not provided (next week)
    const groupStartDate = startDate ? new Date(startDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create group in database
    const result = await query(
      `INSERT INTO groups (
        name, 
        description, 
        creator_id, 
        contribution_amount, 
        frequency, 
        total_members, 
        security_deposit, 
        service_fee_percentage, 
        start_date,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, 
        name, 
        description, 
        creator_id, 
        contribution_amount, 
        frequency, 
        total_members, 
        current_members, 
        security_deposit, 
        service_fee_percentage, 
        start_date, 
        status, 
        created_at`,
      [
        name,
        description || null,
        auth.user.userId,
        contributionAmount,
        frequency,
        totalMembers,
        securityDeposit,
        serviceFeePercentage || 10,
        groupStartDate,
        'forming'
      ]
    );

    const group = result.rows[0];

    // Automatically add creator as first member
    await query(
      `INSERT INTO group_members (
        group_id, 
        user_id, 
        position, 
        has_paid_security_deposit, 
        status
      ) VALUES ($1, $2, $3, $4, $5)`,
      [group.id, auth.user.userId, 1, false, 'pending']
    );

    // Update current_members count
    await query(
      `UPDATE groups SET current_members = current_members + 1 WHERE id = $1`,
      [group.id]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        auth.user.userId,
        'create',
        'group',
        group.id,
        JSON.stringify({ name, totalMembers, contributionAmount })
      ]
    );

    return apiResponse({
      ...group,
      contribution_amount: parseFloat(group.contribution_amount),
      security_deposit: parseFloat(group.security_deposit),
      service_fee_percentage: parseFloat(group.service_fee_percentage),
    }, 'Group created successfully', 201);

  } catch (error) {
    console.error('Create group error:', error);
    return apiError('An error occurred while creating the group', 500);
  }
}

// GET /api/groups - Get all available groups (public groups that aren't full)
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return apiError('Too many requests. Please try again later.', 429);
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'forming';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch available groups
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
        g.status,
        g.created_at,
        u.full_name as creator_name
      FROM groups g
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE g.status = $1 
        AND g.current_members < g.total_members
      ORDER BY g.created_at DESC
      LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const groups = result.rows.map(group => ({
      ...group,
      contribution_amount: parseFloat(group.contribution_amount),
      security_deposit: parseFloat(group.security_deposit),
      service_fee_percentage: parseFloat(group.service_fee_percentage),
    }));

    return apiResponse(groups);

  } catch (error) {
    console.error('Get groups error:', error);
    return apiError('An error occurred while fetching groups', 500);
  }
}
