# Environment Variables Setup Guide

This guide explains all environment variables needed for the Secured Ajo application, including which ones are **REQUIRED** vs **OPTIONAL**.

## 🚨 Critical: Why You're Getting 500 Errors

If you're experiencing a **500 Internal Server Error** when trying to log in or use the application, it's almost always because required environment variables are missing or incorrectly configured.

**The two most common causes:**
1. ❌ `.env.local` file doesn't exist
2. ❌ `DATABASE_URL` or `JWT_SECRET` is not set or invalid

## 📝 Quick Setup

```bash
# 1. Copy the example file
cp .env.local.example .env.local

# 2. Edit .env.local with your values
nano .env.local  # or use your preferred editor

# 3. At minimum, update these TWO required variables:
#    - DATABASE_URL
#    - JWT_SECRET
```

## ✅ Required Environment Variables

These variables **MUST** be set for the application to work. Without them, you'll get 500 errors.

### 1. DATABASE_URL
**Status:** 🔴 **REQUIRED**  
**Purpose:** PostgreSQL database connection string  
**Used by:** Database connection pool (`src/lib/server/db.ts`)

**Format:**
```env
DATABASE_URL=postgresql://username:password@host:port/database
```

**Examples:**

**Supabase (recommended for beginners):**
```env
DATABASE_URL=postgresql://postgres:your_password@db.yourproject.supabase.co:5432/postgres
```

**Local PostgreSQL:**
```env
DATABASE_URL=postgresql://ajo_user:ajo_password123@localhost:5432/ajo_secure
```

**Where to get it:**
- **Supabase:** Settings → Database → Connection String (URI)
- **Local:** Create database with `createdb ajo_secure` and use your PostgreSQL credentials

### 2. JWT_SECRET
**Status:** 🔴 **REQUIRED**  
**Purpose:** Secret key for signing JWT authentication tokens  
**Used by:** Authentication system (`src/lib/server/auth.ts`)  
**Minimum length:** 32 characters

**SECURITY WARNING:** Never use the example value in production! Generate a secure random string.

**How to generate:**
```bash
# Option 1: Using OpenSSL (recommended)
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online generator
# Visit https://generate-secret.vercel.app/32
```

**Example:**
```env
JWT_SECRET=8f3a9b2c7d6e1f4g5h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

## 🟡 Recommended Environment Variables

These are not strictly required, but the application works better with them configured.

### 3. NODE_ENV
**Status:** 🟡 **RECOMMENDED**  
**Purpose:** Determines the application environment mode  
**Default:** `development`

**Valid values:**
```env
NODE_ENV=development   # For local development
NODE_ENV=production    # For production deployment
```

**What it affects:**
- SSL/TLS settings for database
- Cookie security flags
- Error message verbosity
- Logging levels

### 4. NEXT_PUBLIC_APP_NAME
**Status:** 🟡 **RECOMMENDED**  
**Purpose:** Application name shown in UI  
**Default:** `Ajo Secure`

```env
NEXT_PUBLIC_APP_NAME=Ajo Secure
```

### 5. NEXT_PUBLIC_APP_URL
**Status:** 🟡 **RECOMMENDED**  
**Purpose:** Base URL for the application  
**Default:** `http://localhost:3000`

```env
# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 6. JWT Token Expiry Times
**Status:** 🟡 **RECOMMENDED**  
**Purpose:** Control how long JWT tokens remain valid  
**Defaults:** 15m for access, 7d for refresh

```env
JWT_ACCESS_TOKEN_EXPIRY=15m    # Access token: 15 minutes
JWT_REFRESH_TOKEN_EXPIRY=7d    # Refresh token: 7 days
```

**Valid formats:** `15m`, `1h`, `7d`, `30d`

## 🟢 Optional Environment Variables

These are optional and the application will work without them, but they enable specific features.

### Payment Integration (Paystack)

**Status:** 🟢 **OPTIONAL** (Required for payments)  
**Purpose:** Enable payment processing with Paystack

```env
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key_here
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here
```

**Where to get them:**
1. Create account at [paystack.com](https://paystack.com)
2. Go to Settings → API Keys & Webhooks
3. Copy your test keys (start with `sk_test_` and `pk_test_`)
4. For production, use live keys (start with `sk_live_` and `pk_live_`)

**Note:** Without these, payment features won't work but signup/login will still function.

### Email Configuration (OTP Delivery)

**Status:** 🟢 **OPTIONAL** (OTPs logged to console in dev)  
**Purpose:** Send OTP emails for verification

```env
EMAIL_FROM=noreply@ajosecure.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Gmail Setup:**
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: Google Account → Security → 2-Step Verification → App passwords
3. Use the generated password (not your regular Gmail password)

**Note:** In development, OTPs are logged to the console, so email config is optional.

### SMS Configuration (Twilio)

**Status:** 🟢 **OPTIONAL**  
**Purpose:** Send SMS notifications and OTPs

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Where to get them:**
1. Create account at [twilio.com](https://www.twilio.com)
2. Go to Console Dashboard
3. Copy Account SID and Auth Token
4. Get a phone number from Phone Numbers section

### Cron Job Security

**Status:** 🟢 **OPTIONAL**  
**Purpose:** Secure automated scheduled tasks (cron jobs)

```env
CRON_SECRET=your-secure-cron-secret-key-change-in-production
```

**How to generate:**
```bash
openssl rand -base64 32
```

### Feature Flags

**Status:** 🟢 **OPTIONAL**  
**Purpose:** Enable/disable specific features  
**Default:** All `true`

```env
NEXT_PUBLIC_ENABLE_KYC=true
NEXT_PUBLIC_ENABLE_BVN_VERIFICATION=true
NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION=true
NEXT_PUBLIC_ENABLE_PHONE_VERIFICATION=true
```

### Rate Limiting

**Status:** 🟢 **OPTIONAL**  
**Purpose:** Prevent abuse and brute force attacks  
**Defaults:** 15-minute window, 100 requests max

```env
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100      # Maximum requests per window
```

## 📋 Complete Example Configuration

### Minimum (Development)
```env
# REQUIRED - These two are absolutely necessary
DATABASE_URL=postgresql://postgres:password@localhost:5432/ajo_secure
JWT_SECRET=8f3a9b2c7d6e1f4g5h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0

# RECOMMENDED - Application will use defaults if not set
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=Ajo Secure
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Full Development Setup
```env
# Application Configuration
NEXT_PUBLIC_APP_NAME=Ajo Secure
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (REQUIRED)
DATABASE_URL=postgresql://postgres:password@localhost:5432/ajo_secure

# JWT Configuration (REQUIRED)
JWT_SECRET=8f3a9b2c7d6e1f4g5h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Environment
NODE_ENV=development

# Optional features below (can be skipped for basic testing)
# Payment integration
# PAYSTACK_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...

# Email (OTPs logged to console without this)
# EMAIL_FROM=noreply@ajosecure.com
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your-app-password
```

### Production Setup
```env
# Application Configuration
NEXT_PUBLIC_APP_NAME=Ajo Secure
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database (REQUIRED - Use production database)
DATABASE_URL=postgresql://user:password@your-db-host.com:5432/ajo_secure_prod

# JWT Configuration (REQUIRED - Generate new secret!)
JWT_SECRET=<GENERATE_NEW_SECURE_SECRET_MINIMUM_32_CHARS>
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Environment
NODE_ENV=production

# Paystack (Use LIVE keys in production)
PAYSTACK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_...

# Email Configuration
EMAIL_FROM=noreply@yourdomain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-app-password

# Cron Job Security
CRON_SECRET=<GENERATE_NEW_SECURE_SECRET>

# Feature Flags (adjust as needed)
NEXT_PUBLIC_ENABLE_KYC=true
NEXT_PUBLIC_ENABLE_BVN_VERIFICATION=true
NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION=true
NEXT_PUBLIC_ENABLE_PHONE_VERIFICATION=true

# Rate Limiting (stricter in production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🔍 Troubleshooting

### Error: "DATABASE_URL environment variable is not set"

**Cause:** `.env.local` file is missing or `DATABASE_URL` is not set  
**Solution:**
```bash
# 1. Check if .env.local exists
ls -la .env.local

# 2. If not, create it
cp .env.local.example .env.local

# 3. Edit and add DATABASE_URL
nano .env.local
```

### Error: "JWT_SECRET environment variable is required"

**Cause:** `JWT_SECRET` is not set in `.env.local`  
**Solution:**
```bash
# 1. Generate a secure secret
openssl rand -base64 32

# 2. Add to .env.local
echo "JWT_SECRET=<paste-generated-secret-here>" >> .env.local
```

### Error: "Connection refused" or "ECONNREFUSED"

**Cause:** Database is not running or connection string is wrong  
**Solution:**
```bash
# Start PostgreSQL
sudo service postgresql start  # Linux
brew services start postgresql@14  # macOS

# Test connection
psql "your_database_url"
```

### Error: 500 on login but signup works

**Cause:** Database connection works but table structure is incomplete  
**Solution:**
```bash
# Re-import the schema
psql your_database < database/schema.sql
```

### Application starts but features don't work

**Cause:** Optional variables not configured  
**Check:**
- Payments not working → Set Paystack keys
- Emails not sent → Set email configuration (or check console for OTPs in dev)
- SMS not sent → Set Twilio configuration

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - It's in `.gitignore`, keep it there
2. **Use different secrets** for development and production
3. **Rotate secrets regularly** in production
4. **Use strong random secrets** - At least 32 characters
5. **Restrict database access** - Use read-only users where possible
6. **Enable SSL** for database connections in production
7. **Keep secrets secure** - Use environment variable management tools in production (e.g., Vercel Environment Variables, AWS Secrets Manager)

## 📚 Additional Resources

- **Setup Guide:** [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- **Quick Start:** [QUICK_SETUP.md](./QUICK_SETUP.md)
- **API Documentation:** [NEXTJS_API_DOCS.md](./NEXTJS_API_DOCS.md)
- **Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🆘 Still Having Issues?

1. **Verify your configuration:**
   ```bash
   # Check which variables are set (doesn't show values)
   cat .env.local | grep -E "^[A-Z]" | cut -d'=' -f1
   ```

2. **Test database connection:**
   ```bash
   psql "your_database_url" -c "SELECT version();"
   ```

3. **Check application logs:**
   - Start app with `npm run dev`
   - Look for error messages in the console
   - Common issues will be clearly logged

4. **Open an issue:**
   - Visit [GitHub Issues](https://github.com/Olamability/secured-ajo/issues)
   - Include: OS, Node version, error message, steps to reproduce

---

**Remember:** Only `DATABASE_URL` and `JWT_SECRET` are truly required to get started! 🚀
