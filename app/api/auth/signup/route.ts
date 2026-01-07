import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/server/db';
import { generateOTP, getOTPExpiry } from '@/lib/server/auth';
import { signupSchema } from '@/lib/server/validation';
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
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.format());
    }

    const { fullName, email, phone, password } = validation.data;

    // Check if user already exists in our database
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      return errorResponse('User with this email or phone already exists', 409);
    }

    // Sign up with Supabase Auth
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });

    if (authError || !data.user) {
      return errorResponse(authError?.message || 'Failed to create account', 400);
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Insert user into our database
    const result = await query(
      `INSERT INTO users (id, email, phone, full_name, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, phone, is_verified, kyc_status, created_at`,
      [data.user.id, email, phone, fullName, false, true]
    );

    const user = result.rows[0];

    // Store OTP for email verification
    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, otp, otpExpiry]
    );

    // TODO: Send OTP via email
    console.log(`OTP for ${email}: ${otp}`);

    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          isVerified: user.is_verified,
          kycStatus: user.kyc_status,
          createdAt: user.created_at,
        },
        message: 'User created successfully. Please verify your email with the OTP sent.',
      },
      'Signup successful',
      201
    );
  } catch (error) {
    console.error('Signup error:', error);
    
    // Provide helpful error messages for common configuration issues
    if (error instanceof Error) {
      if (error.message.includes('DATABASE_URL')) {
        return serverErrorResponse('Database configuration error. Please contact support.');
      }
      if (error.message.includes('Supabase environment variables')) {
        return serverErrorResponse('Authentication service configuration error. Please contact support.');
      }
    }
    
    return serverErrorResponse('Failed to create user');
  }
}
