# Quick Setup Guide - Secured Ajo

This guide will help you set up and run the Secured Ajo application locally with a working database in minutes.

## ⚡ Quick Start (Automated Setup)

If you're on Linux or macOS with PostgreSQL installed, use our automated setup script:

```bash
# 1. Clone the repository (if you haven't already)
git clone https://github.com/Olamability/secured-ajo.git
cd secured-ajo

# 2. Run the automated setup script
./scripts/setup-local-db.sh

# 3. Install dependencies (if not already done)
npm install

# 4. Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 📋 Manual Setup

If you prefer manual setup or the script doesn't work for your environment:

### Prerequisites

- **Node.js** v20+ installed ([download](https://nodejs.org/))
- **PostgreSQL** v14+ installed ([download](https://www.postgresql.org/download/))

### Step 1: Clone and Install

```bash
git clone https://github.com/Olamability/secured-ajo.git
cd secured-ajo
npm install
```

### Step 2: Set Up PostgreSQL Database

#### Option A: Using psql command line

```bash
# Start PostgreSQL service
sudo service postgresql start  # Linux
# OR
brew services start postgresql@14  # macOS

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE ajo_secure;"
sudo -u postgres psql -c "CREATE USER ajo_user WITH PASSWORD 'ajo_password123';"
sudo -u postgres psql ajo_secure -c "GRANT ALL ON SCHEMA public TO ajo_user;"

# Import schema
sudo -u postgres psql ajo_secure -f database/schema.sql
```

#### Option B: Using Supabase (Cloud - No local install needed)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and paste contents of `database/schema.sql`
4. Run the query
5. Copy your connection string from **Settings → Database**

### Step 3: Configure Environment Variables

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local with your favorite editor
nano .env.local  # or vim, code, etc.
```

**Required changes in `.env.local`:**

```env
# Update this with your database connection string
DATABASE_URL=postgresql://ajo_user:ajo_password123@localhost:5432/ajo_secure

# Generate a secure random string (32+ characters)
JWT_SECRET=your-super-secure-random-string-min-32-chars-change-this
```

**Generate a secure JWT secret:**
```bash
openssl rand -base64 32
# Copy the output to JWT_SECRET in .env.local
```

**📖 For complete environment variable documentation, see [ENV_SETUP.md](./ENV_SETUP.md)**

**🔍 Optional: Verify your environment setup:**
```bash
./scripts/verify-env.sh
```

### Step 4: Start the Application

```bash
npm run dev
```

Open your browser to `http://localhost:3000`

## ✅ Verify Setup

**Option 1: Use the verification script (Recommended)**
```bash
./scripts/verify-env.sh
```

**Option 2: Test the signup endpoint manually**

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "+1234567890",
    "password": "TestPassword123!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "fullName": "Test User",
      "phone": "+1234567890",
      "isVerified": false,
      "kycStatus": "not_started",
      "createdAt": "..."
    },
    "message": "User created successfully. Please verify your email with the OTP sent."
  },
  "message": "Signup successful"
}
```

Check your terminal/console for the OTP:
```
OTP for test@example.com: 123456
```

## 🚀 What's Working

After setup, you'll have a **fully functional application** with:

- ✅ **User authentication** (signup, login, logout)
- ✅ **Email verification** with OTP (logged to console in dev mode)
- ✅ **Group creation** and management
- ✅ **Real PostgreSQL database** (no mock data)
- ✅ **Payment integration** ready (Paystack)
- ✅ **Automated contributions** and payouts
- ✅ **Penalty system** for late payments
- ✅ **Transaction history**
- ✅ **Notifications system**

## 🔧 Common Issues

### Issue: "DATABASE_URL environment variable is not set"

**Solution:** Make sure `.env.local` exists and contains valid `DATABASE_URL`

```bash
# Check if file exists
ls -la .env.local

# Verify it has DATABASE_URL
cat .env.local | grep DATABASE_URL
```

### Issue: "Connection refused" or "ECONNREFUSED"

**Solution:** PostgreSQL service is not running

```bash
# Start PostgreSQL
sudo service postgresql start  # Linux
brew services start postgresql@14  # macOS
```

### Issue: "password authentication failed"

**Solution:** Database credentials don't match

1. Check your `DATABASE_URL` in `.env.local`
2. Verify user/password in PostgreSQL:
```bash
sudo -u postgres psql -c "\du"  # List users
```

### Issue: "relation 'users' does not exist"

**Solution:** Schema not imported

```bash
# Import the schema
sudo -u postgres psql ajo_secure -f database/schema.sql
```

### Issue: OTP not showing in console

**Solution:** This is normal in development. OTPs are logged to the terminal where `npm run dev` is running. Check that terminal window.

## 📚 Next Steps

- **Read the docs:** See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for API usage
- **Test the API:** Use the endpoints listed in [NEXTJS_API_DOCS.md](./NEXTJS_API_DOCS.md)
- **Deploy:** Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to deploy to production

## 💡 Tips

1. **Keep the dev server running** - It auto-reloads when you make changes
2. **Check console logs** - OTPs and useful debug info appear there
3. **Use Postman/Insomnia** - For easier API testing
4. **Database GUI** - Use pgAdmin or DBeaver to browse your data

## 🆘 Need Help?

- Check the detailed setup guide: [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- Review API documentation: [NEXTJS_API_DOCS.md](./NEXTJS_API_DOCS.md)
- Check implementation status: [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)

---

**Everything uses real data - no mocking!** 🎉
