# Quick Start Guide - Fix Connection Issues

## Problem: "Unable to Connect to Server"

If you're getting "unable to connect to server" errors, follow these steps:

## ✅ Quick Fix (3 Steps)

### Step 1: Create Frontend .env File
```bash
# Copy the example file
cp .env.example .env
```

The `.env` file has been created with default settings:
- Frontend runs on `http://localhost:8080`
- Backend API is at `http://localhost:3000/api`

### Step 2: Create Backend .env File
```bash
cd backend-starter
cp .env.example .env
```

**Important:** Edit `backend-starter/.env` and set your database connection:
- If using Supabase, replace `DATABASE_URL` with your connection string
- If using mock database for testing, set `USE_MOCK_DB=true`

### Step 3: Start Both Servers

**Terminal 1 - Start Backend:**
```bash
cd backend-starter
npm install
npm run dev
```

You should see:
```
🚀 ================================
🚀 Ajo Secure Backend API
🚀 Server: http://localhost:3000
🚀 ================================
```

**Terminal 2 - Start Frontend:**
```bash
# From the root directory
npm install
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
```

### Step 4: Test Connection

1. Open browser to `http://localhost:8080`
2. Try to register or login
3. Connection should work now!

## 🔍 Troubleshooting

### Backend Won't Start?

**Issue:** Port 3000 already in use
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

**Issue:** Database connection error
- Check your `DATABASE_URL` in `backend-starter/.env`
- For quick testing, set `USE_MOCK_DB=true` in backend `.env`

### Frontend Won't Connect?

**Issue:** Wrong API URL
- Check `.env` file exists in root directory
- Verify `VITE_API_URL=http://localhost:3000/api`
- Restart frontend after changing `.env`: `npm run dev`

**Issue:** CORS errors in browser console
- Ensure backend is running on port 3000
- Check `FRONTEND_URL` in `backend-starter/.env` is `http://localhost:8080`

## 📝 Port Configuration

| Service  | Port | URL |
|----------|------|-----|
| Frontend | 8080 | http://localhost:8080 |
| Backend  | 3000 | http://localhost:3000 |
| Backend API | 3000 | http://localhost:3000/api |

## 🎯 What Changed?

1. ✅ Created `.env` file with correct API URL
2. ✅ Created `backend-starter/.env` with working configuration
3. ✅ Updated examples to use port 8080 for frontend (matching vite.config.ts)
4. ✅ Aligned all documentation with actual ports

## 🚀 Next Steps

Once connection is working:
1. Set up Supabase database (see `SUPABASE_SETUP.md`)
2. Configure Paystack for payments
3. Update production credentials

## ❓ Still Having Issues?

1. Ensure both frontend and backend are running
2. Check browser console for specific errors
3. Check backend terminal for error logs
4. Verify `.env` files exist and have correct values
5. Try using mock database: `USE_MOCK_DB=true` in backend `.env`
