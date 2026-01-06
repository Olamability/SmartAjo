import { NextRequest } from 'next/server';
import { query } from '@/lib/server/db';
import { verifyPassword, setAuthCookies } from '@/lib/server/auth';
import { loginSchema } from '@/lib/server/validation';
import { authRateLimiter } from '@/lib/server/rateLimit';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse, 
  serverErrorResponse,
  unauthorizedResponse 
} from '@/lib/server/apiResponse';

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await authRateLimiter(req);
    if (rateLimitResult) return rateLimitResult;

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.format());
    }

    const { email, password } = validation.data;

    // Find user by email
    const result = await query(
      `SELECT id, email, full_name, phone, password_hash, is_verified, is_active, 
              kyc_status, failed_login_attempts, locked_until
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return unauthorizedResponse('Invalid email or password');
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const lockTime = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return errorResponse(
        `Account is temporarily locked. Please try again in ${lockTime} minutes.`,
        423
      );
    }

    // Check if account is active
    if (!user.is_active) {
      return errorResponse('Account is deactivated. Please contact support.', 403);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = user.failed_login_attempts + 1;
      let lockedUntil = null;

      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      await query(
        `UPDATE users 
         SET failed_login_attempts = $1, locked_until = $2 
         WHERE id = $3`,
        [failedAttempts, lockedUntil, user.id]
      );

      return unauthorizedResponse('Invalid email or password');
    }

    // Reset failed login attempts on successful login
    await query(
      `UPDATE users 
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [user.id]
    );

    // Set auth cookies
    await setAuthCookies(user.id, user.email);

    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          isVerified: user.is_verified,
          kycStatus: user.kyc_status,
        },
      },
      'Login successful'
    );
  } catch (error) {
    console.error('Login error:', error);
    return serverErrorResponse('Failed to login');
  }
}
