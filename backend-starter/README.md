# Ajo Secure Backend Starter

This is a ready-to-use backend starter template for the Ajo Secure platform.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Setup Database

#### Option A: Using Supabase (Cloud PostgreSQL - Recommended)
```bash
# 1. Go to https://supabase.com and create a free account
# 2. Create a new project
# 3. Go to Project Settings > Database
# 4. Copy the connection string (URI format)
# 5. In the SQL Editor, paste and run the contents of ../database/schema.sql
# 6. Update your .env file:
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
# Note: Replace [YOUR-PASSWORD] and [YOUR-PROJECT-REF] with your actual values
```

#### Option B: Using Local PostgreSQL
```bash
# Create PostgreSQL database
createdb ajo_secure

# Run migrations (from parent directory)
psql -U postgres -d ajo_secure -f ../database/schema.sql
```

### 4. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 📁 Project Structure

```
backend-starter/
├── src/
│   ├── config/
│   │   └── database.js          # Database connection
│   ├── controllers/
│   │   └── authController.js    # Authentication logic
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── routes/
│   │   ├── authRoutes.js        # Auth endpoints
│   │   ├── groupRoutes.js       # Group endpoints (placeholder)
│   │   └── paymentRoutes.js     # Payment endpoints (placeholder)
│   ├── utils/
│   │   ├── jwt.js               # JWT utilities
│   │   └── password.js          # Password hashing utilities
│   ├── services/                # Business logic (add your services here)
│   ├── models/                  # Database models (optional)
│   └── index.js                 # Main server file
├── .env.example                 # Environment variables template
├── package.json
└── README.md
```

## ✅ What's Implemented

- ✅ User authentication (signup, login, logout)
- ✅ JWT token management (access + refresh tokens)
- ✅ Password hashing with bcrypt
- ✅ Database connection with PostgreSQL
- ✅ CORS configuration
- ✅ Security headers with Helmet
- ✅ Request logging
- ✅ Error handling
- ✅ Account lockout after failed attempts

## 🔧 What Needs Implementation

- [ ] Group management endpoints
- [ ] Payment integration (Paystack)
- [ ] Email verification
- [ ] SMS notifications
- [ ] Scheduled jobs (cron)
- [ ] Transaction history
- [ ] Payout processing
- [ ] Webhook handlers
- [ ] Rate limiting
- [ ] Input validation middleware

## 🔌 Available Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh access token

### Groups (Placeholders)
- `POST /api/groups` - Create group
- `GET /api/groups/my-groups` - Get user's groups
- `GET /api/groups/available` - Get available groups
- `GET /api/groups/:id` - Get group details
- `POST /api/groups/:id/join` - Join group

### Payments (Placeholders)
- `POST /api/payments/initialize` - Initialize payment
- `GET /api/payments/verify/:reference` - Verify payment
- `POST /api/payments/webhooks/paystack` - Paystack webhook

### System
- `GET /health` - Health check
- `GET /` - API info

## 🧪 Testing

Test authentication with curl:

```bash
# Health check
curl http://localhost:3000/health

# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+2348012345678",
    "password": "Password123",
    "confirmPassword": "Password123"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123"
  }'
```

## 📝 Environment Variables

Required variables in `.env`:

### For Supabase (Cloud PostgreSQL)
```bash
# Database (use Supabase connection string)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres

# JWT
JWT_SECRET=your_secret_key
REFRESH_TOKEN_SECRET=your_refresh_secret

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### For Local PostgreSQL
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ajo_secure
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key
REFRESH_TOKEN_SECRET=your_refresh_secret

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## 🔐 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT access tokens (15 min expiry)
- JWT refresh tokens (7 days expiry)
- Token rotation on refresh
- Account lockout after 5 failed login attempts
- Helmet for security headers
- CORS protection

## 📚 Next Steps

1. **Implement Group Management**
   - Create `src/controllers/groupController.js`
   - Implement CRUD operations
   - Add validation middleware

2. **Integrate Paystack**
   - Install paystack SDK: `npm install paystack`
   - Create `src/services/paystackService.js`
   - Implement webhook handler

3. **Add Email Service**
   - Install nodemailer: `npm install nodemailer`
   - Create email templates
   - Implement verification emails

4. **Add SMS Service**
   - Install twilio: `npm install twilio`
   - Create SMS templates
   - Implement OTP verification

5. **Implement Scheduled Jobs**
   - Install node-cron: `npm install node-cron`
   - Create reminder jobs
   - Create penalty jobs

## 🆘 Troubleshooting

### Database Connection Error
```bash
# Make sure PostgreSQL is running
sudo service postgresql start
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=3001
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

## 📖 Documentation

- [Complete Setup Guide](../BACKEND_STEP_BY_STEP_GUIDE.md)
- [API Documentation](../API.md)
- [Database Schema](../database/schema.sql)
- [Backend Requirements](../BACKEND_REQUIREMENTS.md)

## 🎯 Support

For detailed implementation guidance, see:
- `BACKEND_STEP_BY_STEP_GUIDE.md` - Beginner-friendly guide
- `BACKEND_REQUIREMENTS.md` - Technical requirements
- `API.md` - Complete API specification

---

**Happy coding! 🚀**
