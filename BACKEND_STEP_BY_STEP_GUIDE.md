# 🚀 Complete Backend Setup Guide for Ajo Secure
## A Step-by-Step Guide (Beginner Friendly)

This guide will help you build the backend for Ajo Secure from scratch. We'll explain everything in simple terms!

---

## 📚 Table of Contents

1. [What You Need to Know First](#what-you-need-to-know-first)
2. [Setting Up Your Computer](#setting-up-your-computer)
3. [Creating the Backend Project](#creating-the-backend-project)
4. [Setting Up the Database](#setting-up-the-database)
5. [Building Authentication](#building-authentication)
6. [Creating API Endpoints](#creating-api-endpoints)
7. [Connecting Payment Gateway](#connecting-payment-gateway)
8. [Testing Your Backend](#testing-your-backend)
9. [Deploying to Production](#deploying-to-production)

---

## 🎯 What You Need to Know First

### What is a Backend?
Think of the backend as the **brain** of your application:
- **Frontend** = What users see and click (like a restaurant menu)
- **Backend** = Where the actual work happens (like the kitchen)
- **Database** = Where we store information (like a filing cabinet)

### What Will Our Backend Do?
1. **Manage Users** - Sign up, login, verify email
2. **Handle Groups** - Create, join, and manage ajo groups
3. **Process Payments** - Receive money via Paystack
4. **Send Notifications** - Email and SMS alerts
5. **Automate Tasks** - Reminders and penalties
6. **Keep Records** - Transaction history

---

## 🖥️ Setting Up Your Computer

### Step 1: Install Required Software

#### A. Install Node.js (The Engine)
```bash
# Go to https://nodejs.org
# Download version 20.x or higher
# Follow the installation wizard
# Verify installation:
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

#### B. Install PostgreSQL (The Database)
```bash
# Windows:
# 1. Go to https://www.postgresql.org/download/
# 2. Download PostgreSQL 14 or higher
# 3. Follow installation wizard
# 4. Remember your password!

# Mac:
brew install postgresql@14

# Linux (Ubuntu):
sudo apt update
sudo apt install postgresql postgresql-contrib
```

#### C. Install Git (Version Control)
```bash
# Windows: Download from https://git-scm.com
# Mac: brew install git
# Linux: sudo apt install git
```

#### D. Install Code Editor
- Download **VS Code**: https://code.visualstudio.com
- It's free and beginner-friendly!

---

## 🏗️ Creating the Backend Project

### Step 1: Choose Your Technology Stack

We recommend **Node.js with Express** because it's:
- ✅ Easy to learn
- ✅ Works great with JavaScript
- ✅ Has lots of tutorials
- ✅ Big community support

### Step 2: Create Project Folder

```bash
# Open your terminal/command prompt
cd Desktop  # or wherever you want to work
mkdir ajo-secure-backend
cd ajo-secure-backend
```

### Step 3: Initialize Node.js Project

```bash
# This creates package.json file
npm init -y

# Install Express framework
npm install express

# Install other essential packages
npm install dotenv cors bcrypt jsonwebtoken pg
npm install nodemon --save-dev
```

**What did we just install?**
- `express` - Web framework (the foundation)
- `dotenv` - Manages secret keys
- `cors` - Allows frontend to talk to backend
- `bcrypt` - Encrypts passwords
- `jsonwebtoken` - Creates login tokens
- `pg` - PostgreSQL database connector
- `nodemon` - Auto-restarts server during development

### Step 4: Create Folder Structure

```bash
# Create these folders
mkdir src
mkdir src/config
mkdir src/controllers
mkdir src/middleware
mkdir src/routes
mkdir src/models
mkdir src/services
mkdir src/utils
mkdir logs
```

**What each folder does:**
- `config/` - Settings and configurations
- `controllers/` - Handle requests (the logic)
- `middleware/` - Security checks
- `routes/` - URL paths (like /login, /signup)
- `models/` - Database table definitions
- `services/` - Business logic (payments, emails)
- `utils/` - Helper functions
- `logs/` - Error and activity logs

---

## 🗄️ Setting Up the Database

### Step 1: Create Database

```bash
# Open PostgreSQL command line
# Windows: Search "psql" in Start menu
# Mac/Linux: Type "psql" in terminal

# Inside psql:
CREATE DATABASE ajo_secure;
\c ajo_secure  # Connect to the database
```

### Step 2: Run the Schema

```bash
# Copy the schema.sql file from the repository
# Inside psql, connected to ajo_secure database:
\i path/to/database/schema.sql

# Or use this command from terminal:
psql -U postgres -d ajo_secure -f database/schema.sql
```

**What just happened?**
- Created 13 tables to store all our data
- Added indexes for faster searches
- Set up automatic functions (triggers)
- Created admin user

### Step 3: Verify Database Setup

```sql
-- Inside psql, run these commands:
\dt  -- List all tables
SELECT * FROM users;  -- Should show admin user
\q  -- Quit psql
```

### Step 4: Create Database Connection File

Create `src/config/database.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ajo_secure',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = pool;
```

### Step 5: Create Environment File

Create `.env` in project root:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ajo_secure
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Secrets (Generate random strings!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
REFRESH_TOKEN_SECRET=another-super-secret-key-change-this-too

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Payment Gateway - Paystack (Test Keys)
PAYSTACK_SECRET_KEY=sk_test_your_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_key_here
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# Email Service - SendGrid
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@ajosecure.com

# SMS Service - Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 🔐 Building Authentication

### Step 1: Create Password Utilities

Create `src/utils/password.js`:

```javascript
const bcrypt = require('bcrypt');

// Hash a password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Compare password with hash
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, comparePassword };
```

### Step 2: Create JWT Utilities

Create `src/utils/jwt.js`:

```javascript
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate access token (expires in 15 minutes)
function generateAccessToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

// Generate refresh token (expires in 7 days)
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify access token
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Verify refresh token
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
```

### Step 3: Create Authentication Middleware

Create `src/middleware/auth.js`:

```javascript
const { verifyAccessToken } = require('../utils/jwt');

// Middleware to protect routes
async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Add user ID to request
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

module.exports = { authenticate };
```

### Step 4: Create Auth Controller

Create `src/controllers/authController.js`:

```javascript
const pool = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');

// Sign up new user
async function signup(req, res) {
  try {
    const { fullName, email, phone, password, confirmPassword } = req.body;

    // Validate input
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
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
        error: 'Email already registered'
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

    // TODO: Send verification email

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
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account'
    });
  }
}

// Login user
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
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
        error: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is disabled'
      });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked'
      });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      // Increment failed attempts
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
        error: 'Invalid email or password'
      });
    }

    // Reset failed attempts and update last login
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
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
}

// Logout user
async function logout(req, res) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke refresh token
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

// Refresh access token
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Verify token exists and is valid
    const result = await pool.query(
      `SELECT user_id, expires_at, revoked_at 
       FROM refresh_tokens 
       WHERE token = $1`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    const tokenData = result.rows[0];

    if (tokenData.revoked_at) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token has been revoked'
      });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token has expired'
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(tokenData.user_id);
    const newRefreshToken = generateRefreshToken(tokenData.user_id);

    // Revoke old refresh token
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1',
      [refreshToken]
    );

    // Save new refresh token
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
```

### Step 5: Create Auth Routes

Create `src/routes/authRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
```

---

## 🔌 Creating API Endpoints

### Step 1: Create Main Server File

Create `src/index.js`:

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

### Step 2: Update package.json

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "echo \"No tests yet\""
  }
}
```

### Step 3: Start the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# You should see:
# 🚀 Server running on http://localhost:3000
# 📝 Environment: development
```

### Step 4: Test Authentication

Open another terminal and test with curl:

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "+2348012345678",
    "password": "Test1234",
    "confirmPassword": "Test1234"
  }'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

---

## 💳 Connecting Payment Gateway

### Step 1: Install Paystack SDK

```bash
npm install paystack
```

### Step 2: Create Payment Service

Create `src/services/paystackService.js`:

```javascript
const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const pool = require('../config/database');

// Initialize payment
async function initializePayment(userId, amount, groupId, type) {
  try {
    // Get user details
    const userResult = await pool.query(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Generate unique reference
    const reference = `AJO_${type}_${Date.now()}_${userId.substring(0, 8)}`;

    // Initialize payment with Paystack
    const response = await paystack.transaction.initialize({
      email: user.email,
      amount: amount * 100, // Convert to kobo (smallest unit)
      reference,
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        user_id: userId,
        group_id: groupId,
        type: type, // 'contribution' or 'security_deposit'
        full_name: user.full_name
      }
    });

    // Save transaction record
    await pool.query(
      `INSERT INTO transactions 
       (user_id, group_id, type, amount, status, reference, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, groupId, type, amount, 'pending', reference, 'paystack']
    );

    return {
      authorizationUrl: response.data.authorization_url,
      reference: response.data.reference,
      accessCode: response.data.access_code
    };
  } catch (error) {
    console.error('Payment initialization error:', error);
    throw error;
  }
}

// Verify payment
async function verifyPayment(reference) {
  try {
    // Verify with Paystack
    const response = await paystack.transaction.verify(reference);

    if (response.data.status === 'success') {
      // Update transaction status
      await pool.query(
        `UPDATE transactions 
         SET status = 'completed', payment_reference = $1
         WHERE reference = $2`,
        [response.data.id, reference]
      );

      return {
        success: true,
        data: response.data
      };
    }

    return {
      success: false,
      message: 'Payment not successful'
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
}

module.exports = {
  initializePayment,
  verifyPayment
};
```

### Step 3: Create Payment Controller

Create `src/controllers/paymentController.js`:

```javascript
const paystackService = require('../services/paystackService');
const pool = require('../config/database');

// Initialize contribution payment
async function initializeContribution(req, res) {
  try {
    const userId = req.userId; // From auth middleware
    const { contributionId } = req.params;

    // Get contribution details
    const result = await pool.query(
      `SELECT c.*, g.contribution_amount, g.service_fee_percentage
       FROM contributions c
       JOIN groups g ON c.group_id = g.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [contributionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contribution not found'
      });
    }

    const contribution = result.rows[0];

    // Check if already paid
    if (contribution.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Contribution already paid'
      });
    }

    // Initialize payment
    const paymentData = await paystackService.initializePayment(
      userId,
      contribution.amount,
      contribution.group_id,
      'contribution'
    );

    res.json({
      success: true,
      data: {
        paymentUrl: paymentData.authorizationUrl,
        reference: paymentData.reference
      }
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize payment'
    });
  }
}

// Verify payment
async function verifyPayment(req, res) {
  try {
    const { reference } = req.params;

    const result = await paystackService.verifyPayment(reference);

    if (result.success) {
      // TODO: Update contribution status
      // TODO: Check if cycle is complete
      // TODO: Process payout if needed

      res.json({
        success: true,
        message: 'Payment verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment'
    });
  }
}

module.exports = {
  initializeContribution,
  verifyPayment
};
```

---

## ✅ Testing Your Backend

### Step 1: Install Testing Tools

```bash
npm install --save-dev jest supertest
```

### Step 2: Create Test File

Create `src/__tests__/auth.test.js`:

```javascript
const request = require('supertest');
// You'll need to export app from index.js

describe('Authentication API', () => {
  test('POST /api/auth/signup - should create new user', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '+2348012345678',
        password: 'Test1234',
        confirmPassword: 'Test1234'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  test('POST /api/auth/login - should login user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test1234'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
  });
});
```

### Step 3: Test with Postman

1. Download Postman: https://www.postman.com/downloads/
2. Import these requests:

**Signup:**
- Method: POST
- URL: http://localhost:3000/api/auth/signup
- Body (JSON):
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+2348012345678",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```

**Login:**
- Method: POST
- URL: http://localhost:3000/api/auth/login
- Body (JSON):
```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

---

## 🚀 Deploying to Production

### Option 1: Deploy to Railway (Easiest)

```bash
# 1. Go to https://railway.app
# 2. Sign up with GitHub
# 3. Click "New Project"
# 4. Select "Deploy from GitHub repo"
# 5. Select your backend repository
# 6. Add PostgreSQL service
# 7. Set environment variables
# 8. Deploy!
```

### Option 2: Deploy to Heroku

```bash
# 1. Install Heroku CLI
# 2. Login
heroku login

# 3. Create app
heroku create ajo-secure-backend

# 4. Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# 5. Set environment variables
heroku config:set JWT_SECRET=your_secret

# 6. Deploy
git push heroku main
```

### Option 3: Deploy to VPS (Digital Ocean, AWS)

```bash
# 1. Set up Ubuntu server
# 2. Install Node.js and PostgreSQL
# 3. Clone repository
# 4. Install PM2 for process management
npm install -g pm2

# 5. Start app
pm2 start src/index.js --name ajo-backend

# 6. Set up nginx as reverse proxy
# 7. Get SSL certificate with Let's Encrypt
```

---

## 🎯 What's Next?

### Immediate Next Steps:
1. ✅ Authentication is done!
2. 🔄 Create group management endpoints
3. 🔄 Add email verification
4. 🔄 Complete payment webhooks
5. 🔄 Add SMS notifications
6. 🔄 Create scheduled jobs

### Remaining Endpoints to Build:
- `/api/groups` - Group CRUD operations
- `/api/contributions` - Contribution management
- `/api/transactions` - Transaction history
- `/api/users/me` - User profile
- `/api/webhooks/paystack` - Payment webhooks

### Additional Features:
- Email templates
- SMS notifications
- Scheduled reminders
- Penalty calculations
- Payout automation

---

## 📚 Learning Resources

- **Node.js**: https://nodejs.org/en/docs/
- **Express**: https://expressjs.com/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Paystack API**: https://paystack.com/docs
- **JWT**: https://jwt.io/introduction

---

## 🆘 Troubleshooting

### Database Connection Error
```bash
# Make sure PostgreSQL is running
sudo service postgresql start  # Linux
brew services start postgresql  # Mac
```

### Port Already in Use
```bash
# Change PORT in .env file
PORT=3001
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## 🎉 Congratulations!

You now have a working backend with:
- ✅ User authentication
- ✅ Database connection
- ✅ Payment integration (started)
- ✅ API structure

Keep building and learning! 🚀
