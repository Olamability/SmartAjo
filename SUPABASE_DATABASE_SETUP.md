# Supabase Database Setup Guide

This guide will help you set up your Supabase database for the Ajo Secure application.

## Prerequisites

- A Supabase account (Sign up at https://supabase.com if you don't have one)

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in the project details:
   - **Name**: ajo-secure (or any name you prefer)
   - **Database Password**: Choose a strong password and save it securely
   - **Region**: Choose the region closest to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (usually takes 1-2 minutes)

## Step 2: Get Your Database Connection String

1. In your Supabase project dashboard, go to **Settings** > **Database**
2. Scroll down to the **Connection string** section
3. Select **Connection pooling** tab (recommended for better performance)
4. Copy the connection string that looks like:
   ```
   postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password from Step 1

## Step 3: Run the Database Schema

1. In your Supabase project, go to the **SQL Editor**
2. Open the schema file: `/database/schema.sql` from this repository
3. Copy the entire contents of the schema file
4. Paste it into the Supabase SQL Editor
5. Click **Run** to execute the SQL
6. You should see a success message indicating all tables were created

The schema will create the following tables:
- `users` - User accounts and authentication
- `email_verification_tokens` - Email verification OTPs
- `refresh_tokens` - JWT refresh token management
- `groups` - Savings group information
- `group_members` - Member participation tracking
- `contributions` - Payment contributions per cycle
- `transactions` - All financial transactions
- `payouts` - Payout distribution records
- `penalties` - Late payment penalties
- `notifications` - User notifications
- `audit_logs` - Security audit trail
- `system_settings` - Application configuration
- `sessions` - User session tracking

## Step 4: Configure Backend Environment

1. Open `/backend-starter/.env` file
2. Find the `DATABASE_URL` line:
   ```env
   DATABASE_URL=
   ```
3. Paste your complete connection string from Step 2:
   ```env
   DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:your_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
4. Make sure `USE_MOCK_DB` is NOT set to `true` or remove that line entirely
5. Save the file

## Step 5: Set Up Paystack (Payment Gateway)

1. Sign up or login to Paystack: https://dashboard.paystack.com
2. Go to **Settings** > **API Keys & Webhooks**
3. Copy your **Test Secret Key** (starts with `sk_test_`)
4. Copy your **Test Public Key** (starts with `pk_test_`)
5. Update your `.env` file:
   ```env
   PAYSTACK_SECRET_KEY=sk_test_your_actual_secret_key_here
   PAYSTACK_PUBLIC_KEY=pk_test_your_actual_public_key_here
   ```
6. Also update the frontend `.env` file in the root directory:
   ```env
   VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_actual_public_key_here
   ```

### Set Up Paystack Webhook (Optional but Recommended)

1. In Paystack Dashboard, go to **Settings** > **API Keys & Webhooks**
2. Click **Add Webhook**
3. Set the webhook URL to: `https://your-domain.com/api/payments/webhooks/paystack`
   (Use your deployed backend URL or ngrok URL for local testing)
4. Copy the **Webhook Secret**
5. Update your `.env` file:
   ```env
   PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here
   ```

## Step 6: Start the Backend Server

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend-starter
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. You should see:
   ```
   ✅ Connected to PostgreSQL database
   🚀 ================================
   🚀 Ajo Secure Backend API
   🚀 Server: http://localhost:3000
   🚀 Environment: development
   🚀 Health: http://localhost:3000/health
   🚀 ================================
   ```

## Step 7: Start the Frontend

1. Open another terminal and navigate to the project root:
   ```bash
   cd ..
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to http://localhost:5173

## Testing the Setup

### Test Authentication

1. Go to http://localhost:5173/signup
2. Create a new account
3. Check that you can login successfully
4. Verify the user was created in Supabase:
   - Go to Supabase Dashboard > Table Editor > users table
   - You should see your newly created user

### Test Group Creation

1. Login to the application
2. Navigate to "Create Group"
3. Fill in the group details and create a group
4. Verify in Supabase:
   - Check the `groups` table for your new group
   - Check the `group_members` table for your membership

### Test Payments (Optional)

1. Join or create a group
2. Try to make a payment (contribution or security deposit)
3. You'll be redirected to Paystack payment page
4. Use Paystack test card for testing:
   - Card Number: `4084 0840 8408 4081`
   - Expiry: Any future date
   - CVV: `408`

## Troubleshooting

### Database Connection Issues

**Error**: "Database connection error: ECONNREFUSED"
- **Solution**: Make sure your `DATABASE_URL` is correctly set in `.env`
- Verify your Supabase database password is correct
- Check if your IP is whitelisted (Supabase usually allows all by default)

**Error**: "SSL connection error"
- **Solution**: This is usually fine in development. The app is configured to handle Supabase SSL certificates.

### Payment Issues

**Error**: "Failed to initialize payment with Paystack"
- **Solution**: Verify your Paystack keys are correctly set in `.env`
- Make sure you're using Test keys (starting with `sk_test_` and `pk_test_`)
- Check Paystack dashboard for any API errors

### General Issues

**Backend won't start**
- Make sure port 3000 is not already in use
- Check all required environment variables are set
- Run `npm install` to ensure all dependencies are installed

**Frontend can't connect to backend**
- Verify backend is running on port 3000
- Check `VITE_API_URL` in frontend `.env` is set to `http://localhost:3000/api`

## Security Notes for Production

When deploying to production:

1. **Database**: Use Supabase's connection pooling URL
2. **Environment Variables**: 
   - Use production Paystack keys (starting with `sk_live_` and `pk_live_`)
   - Generate new JWT secrets
   - Set `NODE_ENV=production`
3. **SSL**: Enable strict SSL validation
4. **CORS**: Restrict `FRONTEND_URL` to your actual domain
5. **Rate Limiting**: Consider lowering `RATE_LIMIT_MAX_REQUESTS`

## Need Help?

- Supabase Documentation: https://supabase.com/docs
- Paystack Documentation: https://paystack.com/docs
- Open an issue in the repository for application-specific questions
