import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { generateOTP, getOTPExpiry } from '@/lib/server/auth';
import { resendOTPSchema } from '@/lib/server/validation';
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
    const validation = resendOTPSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.format());
    }

    const { email } = validation.data;

    // Find user
    const userResult = await query(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return errorResponse('User not found', 404);
    }

    const user = userResult.rows[0];

    // Check if user is already verified
    if (user.is_verified) {
      return errorResponse('Email is already verified', 400);
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Store new OTP
    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, otp, otpExpiry]
    );

    // TODO: Send OTP via email
    console.log(`New OTP for ${email}: ${otp}`);

    return successResponse(null, 'OTP sent successfully');
  } catch (error) {
    console.error('Resend OTP error:', error);
    return serverErrorResponse('Failed to resend OTP');
  }
}
