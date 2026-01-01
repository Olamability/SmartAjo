const pool = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');

async function signup(req, res) {
  try {
    const { fullName, email, phone, password, confirmPassword } = req.body;

    // Validate input
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
        code: 'VAL_001'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match',
        code: 'VAL_001'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
        code: 'VAL_001'
      });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
        code: 'USER_002'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, phone, full_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, phone, is_verified, kyc_status`,
      [email, phone, fullName, passwordHash]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          isVerified: user.is_verified,
          kycStatus: user.kyc_status
        },
        accessToken,
        refreshToken
      },
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account'
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'VAL_001'
      });
    }

    // Find user
    const result = await pool.query(
      `SELECT id, email, full_name, phone, password_hash, is_verified, 
              kyc_status, is_active, failed_login_attempts, locked_until
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'AUTH_001'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is disabled',
        code: 'USER_001'
      });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked. Please try again later.',
        code: 'AUTH_001'
      });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      await pool.query(
        `UPDATE users 
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE 
               WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
               ELSE locked_until
             END
         WHERE id = $1`,
        [user.id]
      );

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'AUTH_001'
      });
    }

    // Reset failed attempts
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = 0,
           locked_until = NULL,
           last_login_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          isVerified: user.is_verified,
          kycStatus: user.kyc_status
        },
        accessToken,
        refreshToken
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
}

async function logout(req, res) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1',
        [refreshToken]
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
}

async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'VAL_001'
      });
    }

    const result = await pool.query(
      `SELECT user_id, expires_at, revoked_at 
       FROM refresh_tokens 
       WHERE token = $1`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'AUTH_003'
      });
    }

    const tokenData = result.rows[0];

    if (tokenData.revoked_at) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token has been revoked',
        code: 'AUTH_003'
      });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token has expired',
        code: 'AUTH_002'
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(tokenData.user_id);
    const newRefreshToken = generateRefreshToken(tokenData.user_id);

    // Revoke old token
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by_token = $1 WHERE token = $2',
      [newRefreshToken, refreshToken]
    );

    // Save new token
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [tokenData.user_id, newRefreshToken]
    );

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
}

module.exports = {
  signup,
  login,
  logout,
  refreshToken
};
