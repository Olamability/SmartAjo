# Local Development Setup Guide

This guide provides step-by-step instructions to run the Secured-Ajo application locally on your machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20.x or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **PostgreSQL** (v14 or higher) - [Download here](https://www.postgresql.org/download/) OR a **Supabase** account (recommended for easier setup)
- **Git** - [Download here](https://git-scm.com/)

## Step 1: Clone the Repository

```bash
git clone https://github.com/Olamability/secured-ajo.git
cd secured-ajo
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, React, PostgreSQL client, and other dependencies.

## Step 3: Set Up Database

You have two options: use Supabase (easier) or local PostgreSQL.

### Option A: Using Supabase (Recommended)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to finish setting up (2-3 minutes)
4. Go to **Settings** → **Database**
5. Copy the **Connection String** (URI format)
6. Go to **SQL Editor** in the left sidebar
7. Create a new query and paste the entire contents of `database/schema.sql`
8. Click "Run" to execute the schema

### Option B: Using Local PostgreSQL

1. Start PostgreSQL service:
   ```bash
   # On macOS (with Homebrew)
   brew services start postgresql@14
   
   # On Ubuntu/Debian
   sudo systemctl start postgresql
   
   # On Windows
   # Start from Services or pgAdmin
   ```

2. Create a new database:
   ```bash
   createdb ajo_secure
   ```

3. Run the database schema:
   ```bash
   psql ajo_secure < database/schema.sql
   ```

4. Your connection string will be:
   ```
   postgresql://your_username:your_password@localhost:5432/ajo_secure
   ```

## Step 4: Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` in your text editor and update the values:

```env
# Application Configuration
NEXT_PUBLIC_APP_NAME=Ajo Secure
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database Configuration
# For Supabase: Use the connection string from Step 3
# For Local: Use postgresql://username:password@localhost:5432/ajo_secure
DATABASE_URL=postgresql://postgres:your_password@db.yourproject.supabase.co:5432/postgres

# JWT Configuration (IMPORTANT: Change this!)
# Generate a secure random string (minimum 32 characters)
# You can generate one at: https://generate-secret.vercel.app/32
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-please-change-this-to-something-random
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Paystack Configuration (Optional for testing, but required for payments)
# Sign up at https://paystack.com to get test keys
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key_here
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here

# Email Configuration (Optional - for OTP emails)
# Currently OTPs are logged to console, so you can skip this for local testing
EMAIL_FROM=noreply@ajosecure.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Environment
NODE_ENV=development

# Feature Flags
NEXT_PUBLIC_ENABLE_KYC=true
NEXT_PUBLIC_ENABLE_BVN_VERIFICATION=true
NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION=true
NEXT_PUBLIC_ENABLE_PHONE_VERIFICATION=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Important Notes:

- **DATABASE_URL**: This is the most important setting. Without it, the app won't work.
- **JWT_SECRET**: Must be a secure random string (at least 32 characters). DO NOT use the example value in production!
- **Paystack Keys**: Optional for local testing. You can test without payments initially.
- **Email Settings**: Optional. During development, OTPs will be logged to the console instead of being emailed.

## Step 5: Start the Development Server

```bash
npm run dev
```

You should see output like:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 2.3s
```

## Step 6: Access the Application

1. Open your browser and go to: **http://localhost:3000**
2. You should see the Ajo Secure homepage
3. Click "Sign Up" to create a new account
4. After signing up, check your terminal/console for the OTP code (since email isn't configured yet)
5. Enter the OTP to verify your email
6. Log in and start using the application!

## Common Issues & Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
- Check that your DATABASE_URL is correct
- Ensure PostgreSQL is running (local setup) or your Supabase project is active
- Test the connection: `psql "your_database_url"`

### Issue: "JWT_SECRET is not set"

**Solution:**
- Make sure `.env.local` file exists in the root directory
- Verify JWT_SECRET is set and at least 32 characters long

### Issue: "Port 3000 is already in use"

**Solution:**
- Stop any other process using port 3000
- Or run on a different port: `npm run dev -- -p 3001`

### Issue: "Module not found" errors

**Solution:**
- Delete `node_modules` and `.next` folders
- Run `npm install` again
- Restart the dev server

### Issue: "Cannot find OTP in email"

**Solution:**
- OTPs are currently logged to the terminal/console
- Check the terminal where you ran `npm run dev`
- Look for log lines containing "OTP" or "verification code"

## Testing User Accounts

The database schema includes a default admin user you can use for testing:

- **Email:** admin@ajosecure.com
- **Password:** Admin123!

Or create your own account through the signup flow.

## Next Steps

Once your local environment is running:

1. **Explore the app**: Create groups, join groups, make contributions
2. **Test payments**: Get Paystack test keys and test the payment flow
3. **Check the API**: Visit http://localhost:3000/api/health (if available) to verify backend
4. **Read the docs**: Check out `NEXTJS_API_DOCS.md` for API documentation

## Development Workflow

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Build for production (to test build)
npm run build

# Start production server (after build)
npm start
```

## Getting Help

If you encounter issues:

1. Check this guide and `NEXTJS_SETUP_GUIDE.md`
2. Review the error messages in your terminal
3. Check `README.md` for additional information
4. Open an issue on GitHub with:
   - Your operating system
   - Node.js version (`node --version`)
   - Error message and stack trace
   - Steps to reproduce

## Important Files

- `.env.local` - Your environment variables (never commit this!)
- `database/schema.sql` - Database structure
- `app/api/` - Backend API routes
- `src/pages/` - Frontend pages (currently being migrated)
- `src/components/` - Reusable React components

---

**Ready to contribute?** Check out `CONTRIBUTING.md` for guidelines!

**Need API documentation?** See `NEXTJS_API_DOCS.md`!
