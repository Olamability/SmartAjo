# 🚀 Quick Setup Guide - Ajo Secure

This guide will get you up and running quickly with the Ajo Secure application.

## Prerequisites

- Node.js 20.x or higher
- npm or yarn
- A Supabase account (for database) - Sign up at https://supabase.com
- A Paystack account (for payments) - Sign up at https://paystack.com

## 🎯 Setup Steps

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/Olamability/secured-ajo.git
cd secured-ajo

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend-starter
npm install
cd ..
```

### 2. Set Up Supabase Database

1. **Create a Supabase Project**:
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Set a name and strong password
   - Wait for provisioning to complete

2. **Get Connection String**:
   - Go to Settings > Database
   - Copy the "Connection string" from "Connection pooling" tab
   - Replace `[YOUR-PASSWORD]` with your database password

3. **Run Database Schema**:
   - Go to SQL Editor in Supabase
   - Open `/database/schema.sql` from this repository
   - Copy all contents and paste into SQL Editor
   - Click "Run" to create all tables

### 3. Configure Backend

1. **Create `.env` file**:
   ```bash
   cd backend-starter
   cp .env.example .env
   ```

2. **Edit `.env` file** and add your credentials:
   ```env
   # Database - Paste your Supabase connection string
   DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@xxx.pooler.supabase.com:6543/postgres
   
   # Paystack - Get from https://dashboard.paystack.com/#/settings/developers
   PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
   PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
   ```

3. **Generate JWT Secrets** (optional but recommended):
   ```bash
   # Generate JWT_SECRET
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Generate REFRESH_TOKEN_SECRET
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Copy these values to your `.env` file.

### 4. Configure Frontend

1. **Create `.env` file in root**:
   ```bash
   cd ..  # Go back to project root
   cp .env.example .env
   ```

2. **Edit `.env` file**:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
   ```

### 5. Start the Application

1. **Start Backend** (in one terminal):
   ```bash
   cd backend-starter
   npm start
   ```
   
   You should see:
   ```
   ✅ Connected to PostgreSQL database
   🚀 Ajo Secure Backend API
   🚀 Server: http://localhost:3000
   ```

2. **Start Frontend** (in another terminal):
   ```bash
   npm run dev
   ```
   
   Open http://localhost:5173 in your browser.

## ✅ Test Your Setup

1. **Sign Up**: Create a new account at http://localhost:5173/signup
2. **Login**: Login with your credentials
3. **Create Group**: Try creating a savings group
4. **Check Database**: Verify data in Supabase Table Editor

## 🔑 Important Configuration

### Required Environment Variables

**Backend (`backend-starter/.env`)**:
- `DATABASE_URL` - Your Supabase connection string (REQUIRED)
- `PAYSTACK_SECRET_KEY` - Your Paystack secret key (REQUIRED for payments)
- `PAYSTACK_PUBLIC_KEY` - Your Paystack public key (REQUIRED for payments)
- `JWT_SECRET` - Random string for JWT tokens
- `REFRESH_TOKEN_SECRET` - Random string for refresh tokens

**Frontend (`.env`)**:
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000/api)
- `VITE_PAYSTACK_PUBLIC_KEY` - Your Paystack public key (same as backend)

### Optional Environment Variables

- `SENDGRID_API_KEY` - For email notifications
- `TWILIO_ACCOUNT_SID` - For SMS notifications
- `TWILIO_AUTH_TOKEN` - For SMS notifications

## 📚 Detailed Guides

- **Database Setup**: See [SUPABASE_DATABASE_SETUP.md](./SUPABASE_DATABASE_SETUP.md)
- **API Documentation**: See [API.md](./API.md)
- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🐛 Troubleshooting

### Backend won't start

- **Check Database URL**: Make sure `DATABASE_URL` is set correctly in `backend-starter/.env`
- **Test Connection**: Try connecting to Supabase using the connection string
- **Check Port**: Ensure port 3000 is not in use

### Frontend can't connect to backend

- **Verify Backend**: Check that backend is running on http://localhost:3000
- **Check .env**: Ensure `VITE_API_URL=http://localhost:3000/api` in root `.env`
- **Restart Frontend**: Stop and restart the frontend dev server

### Payment initialization fails

- **Check Keys**: Verify Paystack keys are set in both frontend and backend `.env`
- **Use Test Keys**: For development, use test keys (starting with `sk_test_` and `pk_test_`)

### Database errors

- **Check Schema**: Ensure you ran the complete schema from `/database/schema.sql`
- **Check Tables**: Verify all tables exist in Supabase Table Editor
- **Check Password**: Ensure database password in connection string is correct

## 🎓 Next Steps

1. **Read the Documentation**: Check out [API.md](./API.md) for API endpoints
2. **Explore Features**: Try creating groups, joining groups, and making payments
3. **Test Payments**: Use Paystack test cards to test payment flow
4. **Deploy**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md) when ready to deploy

## 🆘 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Paystack Docs**: https://paystack.com/docs
- **Open an Issue**: Create an issue in this repository

## 🔐 Security Notes

⚠️ **Never commit your `.env` files to version control!**

The `.env` files contain sensitive credentials. They are already in `.gitignore`, but double-check before pushing code.

For production:
- Use strong, unique passwords
- Use production Paystack keys (starting with `sk_live_`)
- Enable SSL/HTTPS
- Set `NODE_ENV=production`
- Use environment variables from your hosting provider

---

**Happy coding! 🎉**
