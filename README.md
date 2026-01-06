# Ajo Secure - Automated ROSCA Platform

> A secure, full-stack automated escrow-based rotating savings and credit association (ROSCA) platform built with Next.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Overview

Ajo Secure is a modern web application that solves traditional problems of ajo systems (lack of enforcement, transparency, and trust) by acting as an automated organizer that:

- 🔒 Holds contributions securely in escrow
- 💰 Enforces mandatory security deposits
- ⚖️ Applies penalties for defaults automatically
- 🔄 Automatically releases payouts according to predefined rotation
- 📊 Provides full transparency through transaction history

## ✨ Features

### Core Features
- ✅ User registration & email verification (OTP-based)
- ✅ JWT authentication with httpOnly cookies
- ✅ Group creation with customizable rules
- ✅ Secure contribution management
- ✅ Automated payout distribution
- ✅ Security deposit enforcement
- ✅ Penalty system for late/missed payments
- ✅ Transaction history and dashboard
- ✅ Real-time notifications

### Security & Architecture
- ✅ **Full-stack Next.js** with App Router
- ✅ **Server-side API routes** for all sensitive operations
- ✅ **PostgreSQL database** (Supabase compatible)
- ✅ **Paystack payment integration** with webhook verification
- ✅ **bcrypt password hashing**
- ✅ **JWT with httpOnly cookies**
- ✅ **Rate limiting** to prevent abuse
- ✅ **Input validation** with Zod schemas
- ✅ **Security headers** configured
- ✅ **TypeScript** for type safety

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL database (or Supabase account)
- Paystack account for payments

### Installation

```bash
# Clone the repository
git clone https://github.com/Olamability/secured-ajo.git
cd secured-ajo

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your actual values

# Run database migrations
# Import database/schema.sql into your PostgreSQL database

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 📖 Documentation

- **[Setup Guide](./NEXTJS_SETUP_GUIDE.md)** - Complete setup and configuration instructions
- **[API Documentation](./NEXTJS_API_DOCS.md)** - Detailed API endpoint documentation
- **[Architecture](./ARCHITECTURE.md)** - System architecture and design decisions
- **[Security](./SECURITY.md)** - Security features and best practices
- **[Contributing](./CONTRIBUTING.md)** - How to contribute to the project

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Beautiful UI components
- **React Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend (Next.js API Routes)
- **Next.js API Routes** - Server-side endpoints
- **PostgreSQL** - Primary database
- **Jose** - JWT handling
- **bcryptjs** - Password hashing
- **Paystack** - Payment processing
- **Node-cron** - Scheduled tasks

### DevOps
- **Vercel** - Deployment platform (recommended)
- **Supabase** - PostgreSQL hosting (recommended)
- **GitHub Actions** - CI/CD (optional)

## 📂 Project Structure

```
├── app/                      # Next.js app directory
│   ├── api/                  # Server-side API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── users/           # User management
│   │   └── payments/        # Payment processing
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage
│   └── globals.css          # Global styles
│
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   └── Providers.tsx   # App providers
│   ├── contexts/           # React contexts
│   ├── lib/
│   │   ├── server/         # Server-only utilities
│   │   │   ├── db.ts      # Database connection
│   │   │   ├── auth.ts    # Auth utilities
│   │   │   ├── paystack.ts # Payment integration
│   │   │   └── ...
│   │   └── utils.ts       # Client utilities
│   ├── services/          # API client services
│   └── types/            # TypeScript definitions
│
├── database/
│   └── schema.sql        # PostgreSQL schema
│
└── ...config files
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server (http://localhost:3000)

# Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## 🔐 Security

This application implements multiple security layers:

- **Authentication**: JWT tokens stored in httpOnly cookies
- **Authorization**: Role-based access control
- **Data Validation**: Zod schemas on all inputs
- **Rate Limiting**: Protection against brute force attacks
- **CSRF Protection**: Implemented via SameSite cookies
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: React's built-in escaping + CSP headers
- **Password Security**: bcrypt hashing with salt rounds
- **Webhook Verification**: Paystack signature verification

See [SECURITY.md](./SECURITY.md) for more details.

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Other Platforms

The app can be deployed to any Node.js hosting platform:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify

See [NEXTJS_SETUP_GUIDE.md](./NEXTJS_SETUP_GUIDE.md) for detailed deployment instructions.

## 🗄️ Database

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and authentication
- `groups` - Ajo savings groups
- `group_members` - Group membership and rotation
- `contributions` - User contributions per cycle
- `payouts` - Automated payout distribution
- `transactions` - Financial transaction log
- `penalties` - Late payment tracking
- `notifications` - User notifications

Complete schema available in `database/schema.sql`

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/resend-otp` - Resend verification OTP

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update user profile

### Payments
- `POST /api/payments/initiate` - Initiate payment
- `POST /api/payments/webhook` - Paystack webhook
- `GET /api/payments/history` - Get payment history

See [NEXTJS_API_DOCS.md](./NEXTJS_API_DOCS.md) for complete API documentation.

## 🧪 Testing

```bash
# Run tests (to be implemented)
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Olamability** - Project Lead & Developer

## 🙏 Acknowledgments

- Shadcn for the beautiful UI components
- Next.js team for the amazing framework
- Supabase for the database platform
- Paystack for payment processing
- All contributors and supporters

## 📧 Support

- 📫 Email: support@ajosecure.com
- 🐛 Issues: [GitHub Issues](https://github.com/Olamability/secured-ajo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Olamability/secured-ajo/discussions)

---

<p align="center">Made with ❤️ by the Ajo Secure Team</p>
