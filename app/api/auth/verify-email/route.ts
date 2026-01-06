import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { verifyEmailSchema } from '@/lib/server/validation';
import { authRateLimiter } from '@/lib/server/rateLimit';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse, 
  serverErrorResponse 
} from '@/lib/server/apiResponse';

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await authRateLimiter(req);
    if (rateLimitResult) return rateLimitResult;

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = verifyEmailSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.format());
    }

    const { email, otp } = validation.data;

    // Find user
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return errorResponse('User not found', 404);
    }

    const userId = userResult.rows[0].id;

    // Find valid OTP
    const otpResult = await query(
      `SELECT id, expires_at, used_at 
       FROM email_verification_tokens 
       WHERE user_id = $1 AND token = $2 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId, otp]
    );

    if (otpResult.rows.length === 0) {
      return errorResponse('Invalid OTP', 400);
    }

    const otpRecord = otpResult.rows[0];

    // Check if OTP is already used
    if (otpRecord.used_at) {
      return errorResponse('OTP has already been used', 400);
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return errorResponse('OTP has expired', 400);
    }

    // Mark OTP as used
    await query(
      'UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [otpRecord.id]
    );

    // Mark user as verified
    await query(
      'UPDATE users SET is_verified = TRUE, email_verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    return successResponse(null, 'Email verified successfully');
  } catch (error) {
    console.error('Verify email error:', error);
    return serverErrorResponse('Failed to verify email');
  }
}
