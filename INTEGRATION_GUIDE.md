# Frontend-Backend Integration Guide

This guide explains how the frontend and backend are now connected and how to run the full application.

## ✅ What Has Been Integrated

### Backend API (Port 3000)
- ✅ PostgreSQL database setup with complete schema
- ✅ User authentication endpoints (signup, login, logout, refresh-token)
- ✅ JWT token management
- ✅ Password hashing with bcrypt
- ✅ CORS configuration for frontend
- ✅ Database connection pool

### Frontend (Port 8080)
- ✅ Updated authentication service to use backend API
- ✅ API client with automatic token management
- ✅ Token refresh mechanism
- ✅ User session management
- ✅ Error handling and user feedback

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ installed
- PostgreSQL installed and running
- npm or yarn package manager

### 1. Start PostgreSQL
```bash
sudo service postgresql start
```

### 2. Setup Backend

```bash
# Navigate to backend directory
cd backend-starter

# Install dependencies (if not done)
npm install

# The .env file is already configured with:
# - Database: ajo_secure (local PostgreSQL)
# - Port: 3000
# - CORS: http://localhost:8080

# Start backend server
npm run dev
```

The backend will start at `http://localhost:3000`

You should see:
```
🚀 ================================
🚀 Ajo Secure Backend API
🚀 Server: http://localhost:3000
🚀 Environment: development
🚀 Health: http://localhost:3000/health
🚀 ================================
✅ Connected to PostgreSQL database
```

### 3. Setup Frontend

```bash
# Navigate to project root (from backend-starter)
cd ..

# Install dependencies (if not done)
npm install

# The .env file is already configured with:
# - API URL: http://localhost:3000/api
# - Port: 8080

# Start frontend server
npm run dev
```

The frontend will start at `http://localhost:8080`

### 4. Test the Integration

1. Open your browser and navigate to `http://localhost:8080`
2. Click "Get Started" or "Sign up"
3. Fill in the signup form:
   - Full Name: Your Name
   - Email: your.email@example.com
   - Phone: +2348012345678
   - Password: Password123
   - Confirm Password: Password123
4. Click "Create account"
5. You should be redirected to the dashboard with a success message

## 🔍 How It Works

### Authentication Flow

1. **Signup:**
   - Frontend sends user data to `POST /api/auth/signup`
   - Backend validates data, hashes password, creates user in database
   - Backend returns user data + access token + refresh token
   - Frontend stores tokens and user data locally
   - User is redirected to dashboard

2. **Login:**
   - Frontend sends credentials to `POST /api/auth/login`
   - Backend verifies credentials against database
   - Backend returns user data + tokens
   - Frontend stores tokens and user data
   - User is redirected to dashboard

3. **Token Refresh:**
   - When access token expires (15 minutes)
   - Frontend automatically calls `POST /api/auth/refresh-token`
   - Backend issues new access token
   - Request is retried with new token

4. **Logout:**
   - Frontend calls `POST /api/auth/logout`
   - Backend revokes refresh token
   - Frontend clears local storage
   - User is redirected to home page

### API Request Flow

```
Frontend (Port 8080)
    ↓ HTTP Request
    ↓ (with JWT token in Authorization header)
    ↓
Backend API (Port 3000)
    ↓
    ↓ Verify JWT
    ↓ Process Request
    ↓ Query Database
    ↓
PostgreSQL Database (ajo_secure)
    ↓
    ↓ Return Data
    ↓
Backend API
    ↓ Format Response
    ↓
Frontend
    ↓ Update UI
```

## 🔐 Security Features

- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT access tokens (15 min expiry)
- ✅ JWT refresh tokens (7 days expiry)
- ✅ Token rotation on refresh
- ✅ Account lockout after 5 failed attempts (15 min)
- ✅ CORS protection
- ✅ Security headers with Helmet
- ✅ SQL injection prevention (parameterized queries)

## 📁 Key Files

### Backend
- `backend-starter/.env` - Environment configuration
- `backend-starter/src/index.js` - Main server file
- `backend-starter/src/config/database.js` - Database connection
- `backend-starter/src/controllers/authController.js` - Auth logic
- `backend-starter/src/routes/authRoutes.js` - Auth endpoints
- `backend-starter/src/utils/jwt.js` - JWT utilities
- `backend-starter/src/utils/password.js` - Password utilities

### Frontend
- `.env` - Frontend environment configuration
- `src/services/api.ts` - API client with token management
- `src/services/auth.ts` - Authentication service
- `src/services/storage.ts` - Local storage utilities
- `src/pages/Login.tsx` - Login page
- `src/pages/SignUp.tsx` - Signup page
- `src/contexts/AuthContext.tsx` - Auth context provider

### Database
- `database/schema.sql` - Complete database schema

## 🧪 Testing Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "+2348012345678",
    "password": "Password123",
    "confirmPassword": "Password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

## 🐛 Troubleshooting

### Backend won't start
**Error:** `password authentication failed for user "postgres"`
**Solution:** The postgres password is set to `postgres` in the .env file. If your postgres has a different password, update `DB_PASSWORD` in `backend-starter/.env`

### Database connection error
**Error:** `database "ajo_secure" does not exist`
**Solution:** Create the database:
```bash
sudo -u postgres psql -c "CREATE DATABASE ajo_secure;"
sudo -u postgres psql -d ajo_secure -f database/schema.sql
```

### CORS error in browser
**Error:** `Access-Control-Allow-Origin error`
**Solution:** Make sure:
1. Backend is running on port 3000
2. Frontend is running on port 8080
3. `FRONTEND_URL=http://localhost:8080` in backend `.env`

### Port already in use
**Backend:** Change `PORT` in `backend-starter/.env`
**Frontend:** Change port in `vite.config.ts` and update backend CORS

## 🎯 Next Steps

The following features still need implementation:

### Backend
- [ ] Group management endpoints
- [ ] Payment integration (Paystack)
- [ ] Email verification
- [ ] SMS notifications
- [ ] Transaction endpoints
- [ ] Contribution endpoints
- [ ] Payout processing
- [ ] Webhook handlers

### Frontend
- [x] Authentication (Signup/Login) ✅
- [ ] Group management UI
- [ ] Payment flow integration
- [ ] Transaction history
- [ ] Profile management
- [ ] Notifications

## 📚 Additional Resources

- [API Documentation](./API.md) - Complete API specification
- [Database Schema](./database/schema.sql) - Full database structure
- [Backend Implementation Guide](./BACKEND_STEP_BY_STEP_GUIDE.md) - Detailed backend guide
- [Architecture Overview](./ARCHITECTURE.md) - System architecture

## 💡 Development Tips

1. **Backend logs:** Watch the backend terminal for request logs and errors
2. **Frontend logs:** Open browser DevTools console for errors
3. **Database queries:** Use `psql -U postgres -d ajo_secure` to inspect database
4. **API testing:** Use Postman or curl to test endpoints directly
5. **Hot reload:** Both servers support hot reload during development

## ✅ Verification Checklist

- [x] PostgreSQL is running
- [x] Database `ajo_secure` exists with schema loaded
- [x] Backend starts successfully on port 3000
- [x] Frontend starts successfully on port 8080
- [x] Signup creates user in database
- [x] Login authenticates user
- [x] Dashboard shows user information
- [x] JWT tokens are stored properly

---

**Need help?** Check the troubleshooting section or review the implementation files.
