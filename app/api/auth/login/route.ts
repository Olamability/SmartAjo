import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/server/db';
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

    // Sign in with Supabase Auth
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      return unauthorizedResponse(authError?.message || 'Invalid email or password');
    }

    // Get user details from database
    const result = await query(
      `SELECT id, email, full_name, phone, is_verified, is_active, kyc_status
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return unauthorizedResponse('User not found');
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      await supabase.auth.signOut();
      return errorResponse('Account is deactivated. Please contact support.', 403);
    }

    // Update last login timestamp
    await query(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );

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
