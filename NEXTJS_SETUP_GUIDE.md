# Next.js Setup Guide - Ajo Secure

This guide will help you set up and run the Ajo Secure Next.js full-stack application.

## Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager
- PostgreSQL database (Supabase recommended)
- Paystack account (for payments)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Olamability/secured-ajo.git
cd secured-ajo
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Application
NEXT_PUBLIC_APP_NAME=Ajo Secure
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-change-this
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Paystack
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key

# Email (Optional - for OTP)
EMAIL_FROM=noreply@ajosecure.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Environment
NODE_ENV=development
```

### 4. Set Up Database

#### Using Supabase

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor
4. Run the schema from `/database/schema.sql`
5. Copy your connection string from Settings > Database

#### Using Local PostgreSQL

```bash
# Create database
createdb ajo_secure

# Run schema
psql ajo_secure < database/schema.sql
```

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 6. Build for Production

```bash
npm run build
npm start
```

---

## Detailed Configuration

### Database Setup

The `/database/schema.sql` file contains all necessary tables:

- `users` - User accounts and authentication
- `email_verification_tokens` - Email verification OTPs
- `refresh_tokens` - JWT refresh tokens
- `groups` - Ajo savings groups
- `group_members` - Group membership
- `contributions` - User contributions
- `payouts` - Group payouts
- `transactions` - Financial transactions
- `penalties` - Late payment penalties
- `notifications` - User notifications
- `audit_logs` - Audit trail
- `kyc_documents` - KYC verification documents
- `payment_webhooks` - Payment gateway webhooks

### Paystack Configuration

1. Sign up at [paystack.com](https://paystack.com)
2. Get your API keys from Settings > API Keys & Webhooks
3. Set up webhook URL: `https://your-domain.com/api/payments/webhook`
4. Add webhook secret to your environment variables

### Email Configuration

For email OTP delivery, configure an SMTP provider:

#### Using Gmail

1. Enable 2-factor authentication
2. Generate an App Password
3. Use the app password in `EMAIL_PASSWORD`

#### Using SendGrid, Mailgun, etc.

Update the email configuration in `src/lib/server/email.ts` (create this file based on your provider's SDK)

---

## Project Structure

```
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── users/           # User management endpoints
│   │   └── payments/        # Payment endpoints
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage
│   └── globals.css          # Global styles
│
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   └── Providers.tsx   # App providers wrapper
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── server/         # Server-only utilities
│   │   │   ├── db.ts      # Database connection
│   │   │   ├── auth.ts    # Authentication utilities
│   │   │   ├── paystack.ts # Paystack integration
│   │   │   ├── validation.ts # Zod schemas
│   │   │   ├── rateLimit.ts # Rate limiting
│   │   │   └── apiResponse.ts # API response helpers
│   │   └── utils.ts       # Client utilities
│   ├── services/          # API client services
│   └── types/            # TypeScript type definitions
│
├── database/
│   └── schema.sql        # PostgreSQL schema
│
├── .env.local.example    # Environment variables template
├── next.config.mjs       # Next.js configuration
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

---

## Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint
```

---

## API Documentation

See [NEXTJS_API_DOCS.md](./NEXTJS_API_DOCS.md) for complete API documentation.

---

## Security Considerations

### Production Checklist

- [ ] Change all default secrets in environment variables
- [ ] Use strong JWT_SECRET (min 32 characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting
- [ ] Enable Paystack webhook signature verification
- [ ] Use httpOnly cookies in production
- [ ] Set up proper error logging (Sentry, etc.)
- [ ] Configure database connection pooling
- [ ] Set up database backups
- [ ] Enable database SSL connections
- [ ] Review and test all security headers

### Environment Variables Security

Never commit `.env.local` to version control. Only `.env.local.example` should be committed.

---

## Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Deploying to Other Platforms

The Next.js app can be deployed to any platform that supports Node.js:

- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify
- Heroku

Make sure to:
1. Set all environment variables
2. Run database migrations
3. Configure webhook URLs

---

## Troubleshooting

### Database Connection Issues

- Check DATABASE_URL format: `postgresql://user:password@host:5432/database`
- Ensure database accepts connections from your IP
- Verify SSL settings for production databases

### Authentication Issues

- Clear browser cookies
- Check JWT_SECRET is set
- Verify httpOnly cookies are being set

### Payment Issues

- Verify Paystack API keys
- Check webhook URL is publicly accessible
- Ensure webhook signature verification is enabled

---

## Support

For issues and questions:
- GitHub Issues: [github.com/Olamability/secured-ajo/issues](https://github.com/Olamability/secured-ajo/issues)
- Email: support@ajosecure.com

---

## License

MIT
