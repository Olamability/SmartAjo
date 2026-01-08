import { Router, Request, Response } from 'express';
import { query } from '../lib/db.js';
import { successResponse, serverErrorResponse, unauthorizedResponse } from '../lib/apiResponse.js';

const router = Router();

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication middleware to extract user from token
    const userId = req.headers['x-user-id']; // Placeholder

    if (!userId) {
      return res.status(401).json(unauthorizedResponse('Unauthorized'));
    }

    const result = await query(
      `SELECT id, email, full_name, phone, is_verified, kyc_status, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];

    return res.json(successResponse({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      isVerified: user.is_verified,
      kycStatus: user.kyc_status,
      createdAt: user.created_at,
    }));
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json(serverErrorResponse('Failed to get user'));
  }
});

// Update user profile
router.patch('/me', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication middleware
    const userId = req.headers['x-user-id']; // Placeholder

    if (!userId) {
      return res.status(401).json(unauthorizedResponse('Unauthorized'));
    }

    const { fullName, phone } = req.body;

    await query(
      `UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone)
       WHERE id = $3`,
      [fullName, phone, userId]
    );

    return res.json(successResponse(null, 'Profile updated successfully'));
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json(serverErrorResponse('Failed to update profile'));
  }
});

export default router;
