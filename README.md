# Ajo Secure

A secure, automated escrow-based rotating savings and credit association (ROSCA) platform built with modern web technologies.

## 🎯 Project Overview

Ajo Secure solves the traditional problems of ajo systems (lack of enforcement, transparency, and trust) by acting as an automated organizer that:
- Holds contributions securely in escrow
- Enforces mandatory security deposits
- Applies penalties for defaults
- Automatically releases payouts according to a predefined rotation

## ✨ Features

### Core Features (MVP)
- ✅ User registration & verification (phone/email, optional KYC/BVN)
- ✅ Group creation with customizable rules
- ✅ Escrow contribution management
- ✅ Automated payout distribution
- ✅ Security deposit enforcement
- ✅ Penalty system for late or missing payments
- ✅ Transaction history and dashboard for transparency

### Security Features
- ✅ Error boundary for graceful error handling
- ✅ Environment variable configuration
- ✅ Security headers (via nginx)
- ✅ Input validation with Zod
- ✅ JWT token management with refresh
- ✅ Secure token storage (sessionStorage for access, localStorage for refresh)
- ✅ Request interceptors for authentication
- ✅ Token auto-refresh on expiry
- ✅ API-based authentication (no password storage in frontend)
- ⚠️ Password hashing (requires backend implementation)
- ⚠️ httpOnly cookies (requires backend configuration)

### Production-Ready Features
- ✅ Docker containerization
- ✅ CI/CD pipeline configuration
- ✅ Comprehensive documentation
- ✅ Terms of Service and Privacy Policy pages
- ✅ Code splitting for optimized bundle size
- ✅ Responsive design
- ✅ TypeScript for type safety
- ✅ API client with JWT authentication
- ✅ Token refresh mechanism
- ✅ Complete PostgreSQL database schema
- ✅ Backend implementation guide

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn

### Installation

```sh
# Clone the repository
git clone https://github.com/Olamability/ajo-secure.git

# Navigate to the project directory
cd ajo-secure

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`

## 📦 Available Scripts

```sh
# Development server with hot-reload
npm run dev

# Build for production
npm run build

# Build for development (with source maps)
npm run build:dev

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🚀 Backend Quick Start (NEW!)

### Option 1: Use Our Starter Template (Recommended)
```bash
# Navigate to backend starter
cd backend-starter

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Set up database
cd ..
psql -U postgres -d ajo_secure -f database/schema.sql

# Start development server
cd backend-starter
npm run dev
```

### Option 2: Follow Step-by-Step Guide
See [BACKEND_STEP_BY_STEP_GUIDE.md](./BACKEND_STEP_BY_STEP_GUIDE.md) for complete tutorial.

### Option 3: Quick Reference
See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for commands and checklist.

**What you get:**
- ✅ Working authentication (signup, login, logout)
- ✅ JWT token management
- ✅ Database connection configured
- ✅ Security middleware
- ✅ API structure ready
- ✅ Code examples for all features

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable component library
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend (Required for Production)
The frontend is complete and production-ready with full API integration. A backend API is required to handle:
- Authentication and authorization (JWT-based)
- Payment processing (Paystack, Flutterwave)
- Database operations (PostgreSQL)
- Email/SMS notifications
- Webhook handling
- Scheduled jobs (payment reminders, penalties)

See backend implementation resources below for complete guidance.

## 📚 Documentation

### 🚀 Backend Implementation Resources (NEW!)
- [**Quick Reference Guide**](./QUICK_REFERENCE.md) - ⚡ Start here! Quick commands and checklists
- [**Step-by-Step Guide**](./BACKEND_STEP_BY_STEP_GUIDE.md) - 📖 Complete beginner-friendly tutorial
- [**Backend Starter Code**](./backend-starter/) - 💻 Working Node.js/Express template
- [**Implementation Summary**](./BACKEND_IMPLEMENTATION_SUMMARY.md) - 📊 Complete overview & roadmap
- [**System Architecture**](./ARCHITECTURE.md) - 🏗️ Visual diagrams & design

### 📋 Technical Documentation
- [Backend Requirements](./BACKEND_REQUIREMENTS.md) - Technical specifications
- [API Documentation](./API.md) - Complete API specification
- [Database Schema](./database/schema.sql) - PostgreSQL database schema
- [Security Guide](./SECURITY.md) - Security best practices
- [Deployment Guide](./DEPLOYMENT.md) - Deployment instructions
- [Production Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Product Requirements](./PRD/smart_ajo_core_product_documentation_schema_architecture_compliance_prd.md) - Full PRD

## 🔒 Security

This application implements multiple security measures:

- ✅ All npm dependencies audited and vulnerabilities fixed
- ✅ Environment variables for sensitive configuration
- ✅ Security headers configured in nginx
- ✅ Input validation and sanitization with Zod
- ✅ Error boundary for graceful error handling
- ✅ HTTPS enforcement in production
- ✅ JWT token management with automatic refresh
- ✅ Secure token storage strategy
- ✅ API-based authentication (passwords never stored in frontend)
- ✅ Request/response interceptors for security

**Important:** The backend must implement:
- Secure password hashing (bcrypt with 12+ rounds)
- JWT token generation and validation
- httpOnly cookies for refresh tokens
- Rate limiting per endpoint
- CSRF protection
- SQL injection prevention (parameterized queries)
- XSS protection
- Audit logging for all financial transactions

See [SECURITY.md](./SECURITY.md) for complete security documentation.

## 🐳 Docker Deployment

### Quick Start with Docker

```sh
# Build the Docker image
docker build -t ajo-secure .

# Run the container
docker run -p 80:80 ajo-secure
```

### Using Docker Compose

```sh
docker-compose up -d
```

The application will be available at `http://localhost`

## ☁️ Deployment Options

### Vercel
```sh
vercel --prod
```

### Netlify
```sh
npm run build
netlify deploy --prod --dir=dist
```

### AWS S3 + CloudFront
```sh
npm run build
aws s3 sync dist/ s3://your-bucket-name --delete
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🧪 Testing

Currently, the project does not include automated tests. To make it fully production-ready, add:

- Unit tests for business logic
- Integration tests for user flows
- E2E tests for critical journeys
- Test coverage reporting

## 📋 Production Readiness Checklist

### ✅ Completed
- [x] Security vulnerabilities fixed
- [x] Environment variable configuration
- [x] Docker containerization
- [x] CI/CD pipeline configuration
- [x] Comprehensive documentation
- [x] Terms of Service and Privacy Policy
- [x] Error boundary implementation
- [x] Code splitting and optimization
- [x] Responsive design
- [x] Input validation
- [x] Mock data removed
- [x] API integration implemented
- [x] JWT authentication with token refresh
- [x] Database schema created (PostgreSQL)
- [x] Backend implementation guide
- [x] Production deployment checklist
- [x] **Backend starter code with working authentication** ✨ NEW!
- [x] **Step-by-step beginner guide** ✨ NEW!
- [x] **Complete system architecture documentation** ✨ NEW!

### ⚠️ Requires Backend Implementation

**Good News!** We now have comprehensive guides and starter code:
- 📖 [Step-by-Step Guide](./BACKEND_STEP_BY_STEP_GUIDE.md) - Complete tutorial
- 💻 [Starter Code](./backend-starter/) - Working Node.js template
- ⚡ [Quick Reference](./QUICK_REFERENCE.md) - Fast setup commands

**What to implement:**
- [ ] Backend API endpoints (use starter code in `backend-starter/`)
- [ ] Secure authentication (JWT + bcrypt examples provided)
- [ ] Payment gateway integration (Paystack code samples included)
- [ ] Database setup (schema in `database/schema.sql`)
- [ ] Email/SMS notifications (integration examples provided)
- [ ] Webhook handling (code templates included)
- [ ] Scheduled jobs (cron examples provided)

**Timeline:** 4-6 weeks following our guides 🎯

### 🔜 Recommended for Full Production
- [ ] Unit and integration tests
- [ ] E2E tests
- [ ] Error monitoring (Sentry)
- [ ] Performance monitoring
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] Multi-factor authentication
- [ ] Audit logging

## 🎯 Target Users

- Salary earners
- Traders
- Students
- Cooperatives

## 💰 Monetization

The system charges a **10% service fee** per contribution cycle.

## 🗺️ Roadmap

### Phase 1 (Current - MVP)
- ✅ Core features implementation
- ✅ Frontend development
- ✅ Documentation
- ⏳ Backend API development

### Phase 2 (Future Enhancements)
- BVN credit scoring
- Insurance-backed groups
- Business/cooperative plans
- Reduced-fee premium tiers
- Mobile applications (iOS/Android)
- Advanced analytics dashboard

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

[Add your license here]

## 📞 Support

- Email: support@ajosecure.com
- Documentation: https://docs.ajosecure.com
- Issues: [GitHub Issues](https://github.com/Olamability/ajo-secure/issues)

## 👥 Team

[Add your team information here]

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Inspired by traditional Nigerian ajo systems

---

**Note:** This application's frontend is production-ready, but requires a backend API implementation before deploying to production. See [API.md](./API.md) for the complete backend specification.
