import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { getUserFromRequest } from '@/lib/server/auth';
import { createGroupSchema } from '@/lib/server/validation';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse, 
  unauthorizedResponse,
  serverErrorResponse 
} from '@/lib/server/apiResponse';
import { apiRateLimiter } from '@/lib/server/rateLimit';

// Mark route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimiter(request);
    if (rateLimitResult) {
      return errorResponse('Too many requests. Please try again later.', 429);
    }

    // Authenticate user
    const user = await getUserFromRequest();
    if (!user) {
      return unauthorizedResponse();
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = createGroupSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.format());
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
        created_by, 
        contribution_amount, 
        frequency, 
        total_members, 
        security_deposit_amount,
        security_deposit_percentage, 
        service_fee_percentage, 
        start_date,
        status,
        total_cycles
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id, 
        name, 
        description, 
        created_by, 
        contribution_amount, 
        frequency, 
        total_members, 
        current_members, 
        security_deposit_amount,
        security_deposit_percentage, 
        service_fee_percentage, 
        start_date, 
        status, 
        created_at`,
      [
        name,                             // $1
        description || null,              // $2
        user.id,                          // $3: created_by
        contributionAmount,               // $4
        frequency,                        // $5
        totalMembers,                     // $6
        securityDeposit,                  // $7: security_deposit_amount (calculated)
        securityDepositPercentage,        // $8: security_deposit_percentage
        serviceFeePercentage || 10,       // $9: service_fee_percentage
        groupStartDate,                   // $10: start_date
        'forming',                        // $11: status
        totalMembers                      // $12: total_cycles (equals total_members)
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
        security_deposit_amount, 
        status
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [group.id, user.id, 1, false, securityDeposit, 'active']
    );

    return successResponse({
      id: group.id,
      name: group.name,
      description: group.description,
      createdBy: group.created_by,
      contributionAmount: parseFloat(group.contribution_amount),
      frequency: group.frequency,
      totalMembers: group.total_members,
      currentMembers: 1,
      securityDepositAmount: parseFloat(group.security_deposit_amount),
      securityDepositPercentage: group.security_deposit_percentage,
      serviceFeePercentage: group.service_fee_percentage,
      startDate: group.start_date,
      status: group.status,
      createdAt: group.created_at,
    }, 'Group created successfully', 201);

  } catch (error) {
    console.error('Create group error:', error);
    return serverErrorResponse('Failed to create group');
  }
}

// GET /api/groups - Get all available groups (public groups that aren't full)
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimiter(request);
    if (rateLimitResult) {
      return errorResponse('Too many requests. Please try again later.', 429);
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
        g.created_by,
        g.contribution_amount,
        g.frequency,
        g.total_members,
        g.current_members,
        g.security_deposit_amount,
        g.security_deposit_percentage,
        g.service_fee_percentage,
        g.start_date,
        g.status,
        g.created_at,
        u.full_name as creator_name
      FROM groups g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.status = $1 
        AND g.current_members < g.total_members
      ORDER BY g.created_at DESC
      LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const groups = result.rows.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      createdBy: group.created_by,
      creatorName: group.creator_name,
      contributionAmount: parseFloat(group.contribution_amount),
      frequency: group.frequency,
      totalMembers: group.total_members,
      currentMembers: group.current_members,
      securityDepositAmount: parseFloat(group.security_deposit_amount),
      securityDepositPercentage: group.security_deposit_percentage,
      serviceFeePercentage: group.service_fee_percentage,
      startDate: group.start_date,
      status: group.status,
      createdAt: group.created_at,
    }));

    return successResponse(groups);

  } catch (error) {
    console.error('Get groups error:', error);
    return serverErrorResponse('Failed to fetch groups');
  }
}
