import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { updateProfileSchema } from '@/lib/server/validation';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse, 
  unauthorizedResponse, 
  serverErrorResponse 
} from '@/lib/server/apiResponse';

// GET /api/users/me - Get current user profile
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return unauthorizedResponse('Not authenticated');
    }

    const result = await query(
      `SELECT id, email, full_name, phone, is_verified, kyc_status, bvn, 
              profile_image, created_at, last_login_at
       FROM users WHERE id = $1`,
      [currentUser.id]
    );

    if (result.rows.length === 0) {
      return errorResponse('User not found', 404);
    }

    const user = result.rows[0];

    return successResponse({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      isVerified: user.is_verified,
      kycStatus: user.kyc_status,
      bvn: user.bvn,
      profileImage: user.profile_image,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return serverErrorResponse('Failed to get user profile');
  }
}

// PATCH /api/users/me - Update current user profile
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return unauthorizedResponse('Not authenticated');
    }

    const body = await req.json();

    // Validate input
    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.format());
    }

    const updates = validation.data;
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    updateValues.push(currentUser.id);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, email, full_name, phone, is_verified, kyc_status, 
                bvn, profile_image, updated_at
    `;

    const result = await query(updateQuery, updateValues);
    const user = result.rows[0];

    return successResponse(
      {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        isVerified: user.is_verified,
        kycStatus: user.kyc_status,
        bvn: user.bvn,
        profileImage: user.profile_image,
        updatedAt: user.updated_at,
      },
      'Profile updated successfully'
    );
  } catch (error) {
    console.error('Update user profile error:', error);
    return serverErrorResponse('Failed to update user profile');
  }
}
