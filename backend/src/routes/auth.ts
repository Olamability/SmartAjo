import { Router, Request, Response } from 'express';
import { createClient } from '../lib/supabase.js';
import { query } from '../lib/db.js';
import { loginSchema, signUpSchema } from '../lib/validation.js';
import { authRateLimiter } from '../lib/rateLimit.js';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse, 
  serverErrorResponse,
  unauthorizedResponse 
} from '../lib/apiResponse.js';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Apply rate limiting
    const rateLimitResult = authRateLimiter(req);
    if (rateLimitResult) {
      return res.status(429).json(rateLimitResult);
    }

    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(validationErrorResponse(validation.error.format()));
    }

    const { email, password } = validation.data;

    // Sign in with Supabase Auth
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      return res.status(401).json(unauthorizedResponse(authError?.message || 'Invalid email or password'));
    }

    // Get user details from database
    const result = await query(
      `SELECT id, email, full_name, phone, is_verified, is_active, kyc_status
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json(unauthorizedResponse('User not found'));
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      await supabase.auth.signOut();
      return res.status(403).json(errorResponse('Account is deactivated. Please contact support.', 403));
    }

    // Update last login timestamp
    await query(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );

    return res.json(successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          isVerified: user.is_verified,
          kycStatus: user.kyc_status,
        },
        session: data.session,
      },
      'Login successful'
    ));
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json(serverErrorResponse('Failed to login'));
  }
});

// Signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    // Apply rate limiting
    const rateLimitResult = authRateLimiter(req);
    if (rateLimitResult) {
      return res.status(429).json(rateLimitResult);
    }

    // Validate input
    const validation = signUpSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(validationErrorResponse(validation.error.format()));
    }

    const { email, password, fullName, phone } = validation.data;

    // Create user in Supabase Auth
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !data.user) {
      return res.status(400).json(errorResponse(authError?.message || 'Failed to create account'));
    }

    // Create user in database
    try {
      await query(
        `INSERT INTO users (id, email, full_name, phone, is_verified, created_at)
         VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)`,
        [data.user.id, email, fullName, phone]
      );
    } catch (dbError: any) {
      // If database insert fails, delete the auth user
      await supabase.auth.admin.deleteUser(data.user.id);
      
      if (dbError.code === '23505') { // Unique violation
        return res.status(400).json(errorResponse('Email or phone already exists'));
      }
      throw dbError;
    }

    return res.status(201).json(successResponse(
      {
        user: {
          id: data.user.id,
          email,
          fullName,
          phone,
          isVerified: false,
        },
        session: data.session,
      },
      'Account created successfully'
    ));
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json(serverErrorResponse('Failed to create account'));
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
    return res.json(successResponse(null, 'Logged out successfully'));
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json(serverErrorResponse('Failed to logout'));
  }
});

// Verify email with OTP
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json(errorResponse('Email and OTP are required'));
    }

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (verifyError) {
      return res.status(400).json(errorResponse(verifyError.message));
    }

    // Update user verification status
    await query(
      `UPDATE users SET is_verified = true WHERE email = $1`,
      [email]
    );

    return res.json(successResponse(null, 'Email verified successfully'));
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json(serverErrorResponse('Failed to verify email'));
  }
});

// Resend OTP
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(errorResponse('Email is required'));
    }

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (resendError) {
      return res.status(400).json(errorResponse(resendError.message));
    }

    return res.json(successResponse(null, 'OTP sent successfully'));
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json(serverErrorResponse('Failed to resend OTP'));
  }
});

export default router;
