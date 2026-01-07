# Secured Ajo - Vite + React + TypeScript

A modern rotating savings and credit association (ROSCA) platform built with Vite, React, TypeScript, and Supabase.

## 🏗️ Architecture

This application follows a **client-server architecture** with:

- **Frontend**: Vite + React + TypeScript + shadcn/ui
- **Backend**: Express.js + TypeScript + Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

## 📁 Project Structure

```
secured-ajo/
├── src/                    # Frontend application
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Frontend services (API calls)
│   ├── lib/               # Utilities and client libraries
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
│
├── backend/               # Backend server
│   ├── src/
│   │   ├── routes/       # Express routes
│   │   ├── lib/          # Server utilities
│   │   └── server.ts     # Server entry point
│   ├── package.json
│   └── tsconfig.json
│
├── public/               # Static assets
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── package.json         # Frontend dependencies
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Git repository cloned

### 1️⃣ Setup Supabase

1. Go to https://supabase.com and sign in
2. Create a new project
3. Wait ~2 minutes for project creation
4. Run the database schema from `/supabase/schema.sql` in SQL Editor
5. Run the storage setup from `/supabase/storage.sql`

### 2️⃣ Configure Environment Variables

**Frontend (.env)**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_NAME=Ajo Secure
VITE_APP_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3001
```

**Backend (backend/.env)**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:password@db.yourproject.supabase.co:5432/postgres
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3️⃣ Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 4️⃣ Run the Application

```bash
# Start both frontend and backend servers
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 🛠️ Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start both frontend and backend servers
- `npm run dev:frontend` - Start only frontend dev server
- `npm run dev:backend` - Start only backend dev server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint frontend code

**Backend:**
- `cd backend && npm run dev` - Start backend in watch mode
- `cd backend && npm run build` - Build backend for production
- `cd backend && npm start` - Start production backend

### Dynamic Port Handling

The Vite dev server is configured with `strictPort: false`, which means:
- If port 3000 is busy, Vite will automatically find the next available port
- You'll see the actual port in the console output

## 🏗️ API Structure

The backend API is organized into routes:

- `/api/auth` - Authentication endpoints (login, signup, logout)
- `/api/users` - User management
- `/api/groups` - Group operations
- `/api/contributions` - Contribution tracking
- `/api/payments` - Payment processing
- `/api/notifications` - User notifications
- `/api/transactions` - Transaction history
- `/api/cron` - Scheduled tasks

## 🔐 Security

- **Frontend**: Only uses public Supabase anon key
- **Backend**: Uses service role key for admin operations
- **Sensitive operations**: All handled server-side
- **File uploads**: Processed through backend, frontend gets signed URLs
- **Environment variables**: Properly separated (VITE_ prefix for public vars)

## 📚 Key Technologies

- **Frontend**:
  - Vite - Build tool
  - React 18 - UI library
  - TypeScript - Type safety
  - React Router - Client-side routing
  - shadcn/ui - UI components
  - Tailwind CSS - Styling
  - React Query - Data fetching

- **Backend**:
  - Express.js - Web framework
  - TypeScript - Type safety
  - Supabase JS - Database client
  - PostgreSQL - Database
  - Zod - Schema validation

## 🎨 UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) components with Tailwind CSS. Components are located in `src/components/ui/`.

To add new components:
```bash
npx shadcn@latest add [component-name]
```

## 🧪 Testing

The application can be tested by:
1. Running the dev servers (`npm run dev`)
2. Accessing http://localhost:3000
3. Creating a test account
4. Exploring the features

## 📝 Migration from Next.js

This project was migrated from Next.js to Vite. Key changes:

- ✅ Replaced Next.js App Router with React Router
- ✅ Converted Next.js API routes to Express.js
- ✅ Separated frontend and backend into distinct services
- ✅ Updated all Next.js-specific imports (useRouter → useNavigate)
- ✅ Removed server-only code from frontend bundle
- ✅ Updated environment variable handling (NEXT_PUBLIC_ → VITE_)

## 🐛 Troubleshooting

### Frontend build errors
- Make sure all dependencies are installed: `npm install`
- Check that TypeScript is configured correctly
- Verify all imports are correct

### Backend won't start
- Ensure all backend dependencies are installed: `cd backend && npm install`
- Check `.env` file in backend directory
- Verify database connection string is correct

### Can't connect to API
- Make sure both servers are running (`npm run dev`)
- Check that backend is running on port 3001
- Verify CORS settings in backend allow frontend origin

## 📖 Additional Documentation

- [Architecture Documentation](./ARCHITECTURE.md)
- [Quick Start Guide](./QUICK_START.md)
- [Supabase Setup](./supabase/README.md)

## 🤝 Contributing

See [Contributing.md](./Contributing.md) for contribution guidelines.

## 📄 License

This project is private and proprietary.
