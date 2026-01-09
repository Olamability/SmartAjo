# Secured Ajo - Vite + React + TypeScript

A modern rotating savings and credit association (ROSCA) platform built with Vite, React, TypeScript, and Supabase.

## 🏗️ Architecture

This application uses a **modern serverless architecture** with a single frontend process:

- **Frontend** (Port 3000): Vite + React + TypeScript + shadcn/ui
- **Backend**: Supabase (Authentication, Database, Storage, RLS, Edge Functions)
- **Database**: PostgreSQL (via Supabase with Row Level Security)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

**Key Points:**
- Single Vite dev server - no separate backend process
- All backend logic handled by Supabase
- Row Level Security (RLS) enforces data access rules
- Frontend uses Supabase **anon key** (browser-safe)
- No Express.js or Node.js backend server required

## 📁 Project Structure

```
secured-ajo/
├── src/                    # Frontend application
│   ├── api/               # API service layer (Supabase functions)
│   │   ├── groups.ts      # Group management operations
│   │   ├── contributions.ts  # Contribution tracking
│   │   ├── transactions.ts   # Transaction history
│   │   ├── notifications.ts  # User notifications
│   │   └── index.ts       # API exports
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Authentication services
│   ├── lib/               # Utilities and client libraries
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
│
├── supabase/              # Supabase configuration
│   ├── schema.sql         # Database schema
│   └── storage.sql        # Storage setup
│
├── public/                # Static assets
├── index.html            # HTML entry point
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── package.json          # Dependencies
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
6. Enable Row Level Security (RLS) on all tables as defined in the schema

### 2️⃣ Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_NAME=Ajo Secure
VITE_APP_URL=http://localhost:3000
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here
```

**Important**: Only use the anon key (public key) in the frontend. All security is enforced via Supabase RLS policies.

### 3️⃣ Install Dependencies

```bash
npm install
```

### 4️⃣ Run the Application

```bash
npm run dev
```

This will start the Vite dev server at http://localhost:3000

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

### Dynamic Port Handling

The Vite dev server is configured with `strictPort: false`, which means:
- If port 3000 is busy, Vite will automatically find the next available port
- You'll see the actual port in the console output

## 🔐 Security

- **Authentication**: Handled entirely by Supabase Auth
- **Authorization**: Enforced via Row Level Security (RLS) policies in Supabase
- **Database Access**: Direct from frontend using Supabase client with RLS
- **File Uploads**: Managed through Supabase Storage with bucket policies
- **Sensitive Operations**: Use Supabase Edge Functions or RPC functions when needed
- **Environment Variables**: Only public keys (VITE_ prefixed) in frontend

### Row Level Security (RLS)

All database tables have RLS enabled. Access control is enforced at the database level:
- Users can only access their own data
- Group members can only see data for groups they belong to
- All policies are defined in `/supabase/schema.sql`

## 📚 Key Technologies

- **Frontend**:
  - Vite - Build tool and dev server
  - React 18 - UI library
  - TypeScript - Type safety
  - React Router - Client-side routing
  - shadcn/ui - UI components
  - Tailwind CSS - Styling
  - React Query - Data fetching and caching

- **Backend**:
  - Supabase - Complete backend platform
  - PostgreSQL - Database with RLS
  - Supabase Auth - Authentication
  - Supabase Storage - File storage
  - Supabase Edge Functions - Serverless functions (when needed)

## 🎨 UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) components with Tailwind CSS. Components are located in `src/components/ui/`.

To add new components:
```bash
npx shadcn@latest add [component-name]
```

## 🧪 Testing

The application can be tested by:
1. Running the dev server (`npm run dev`)
2. Accessing http://localhost:3000
3. Creating a test account
4. Exploring the features

## 🐛 Troubleshooting

### Build errors
- Make sure all dependencies are installed: `npm install`
- Check that TypeScript is configured correctly
- Verify all imports are correct
- Ensure Supabase environment variables are set

### Can't connect to Supabase
- Verify your `.env` file has correct Supabase URL and anon key
- Check that your Supabase project is running
- Ensure RLS policies are properly configured
- Check browser console for detailed error messages

### Authentication issues
- Verify email confirmation settings in Supabase Auth
- Check RLS policies on the users table
- Ensure the anon key has proper permissions

## 📖 Additional Documentation

- [Architecture Documentation](./ARCHITECTURE.md) - Complete architecture guide
- [Supabase Setup](./supabase/README.md) - Database and backend setup

## 🤝 Contributing

See [Contributing.md](./Contributing.md) for contribution guidelines.

## 📄 License

This project is private and proprietary.
