# 🚀 Ajo Secure - Quick Reference Guide

## 📌 Essential Links

| Resource | Location | Purpose |
|----------|----------|---------|
| **Beginner Guide** | `BACKEND_STEP_BY_STEP_GUIDE.md` | Complete tutorial for beginners |
| **Starter Code** | `backend-starter/` | Working Node.js template |
| **API Spec** | `API.md` | All endpoint definitions |
| **Database** | `database/schema.sql` | PostgreSQL schema |
| **Architecture** | `ARCHITECTURE.md` | System design diagrams |
| **Summary** | `BACKEND_IMPLEMENTATION_SUMMARY.md` | Complete overview |

---

## ⚡ Quick Start (5 Minutes)

### Using Supabase (Cloud PostgreSQL - Recommended)

#### 1. Setup Supabase
```bash
# Go to https://supabase.com and create a free account
# Create a new project and wait for it to initialize
```

#### 2. Run Schema
```bash
# In Supabase dashboard:
# 1. Click "SQL Editor"
# 2. Open database/schema.sql file locally
# 3. Copy all contents and paste into SQL Editor
# 4. Click "Run"
```

#### 3. Get Connection String
```bash
# In Supabase dashboard:
# Settings > Database > Connection string (URI format)
# Copy: postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
```

#### 4. Configure Backend
```bash
cd backend-starter
npm install
cp .env.example .env
# Edit .env and add your Supabase connection string:
# DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
```

#### 5. Start Server
```bash
npm run dev
```

#### 6. Test
```bash
curl http://localhost:3000/health
```

### Using Local PostgreSQL

#### 1. Clone and Setup
```bash
cd backend-starter
npm install
cp .env.example .env
```

#### 2. Configure Database
```bash
# Edit .env file with your database credentials
DB_PASSWORD=your_password
```

#### 3. Run Schema
```bash
cd ..
psql -U postgres -d ajo_secure -f database/schema.sql
```

#### 4. Start Server
```bash
cd backend-starter
npm run dev
```

#### 5. Test
```bash
curl http://localhost:3000/health
```

---

## 📋 Implementation Checklist

### Week 1: Foundation ⏱️ 5-7 days
- [ ] Install Node.js 20+, PostgreSQL, Redis
- [ ] Run database schema
- [ ] Test database connection
- [ ] Test authentication endpoints
- [ ] Test with Postman

### Week 2: Core Features ⏱️ 7-10 days
- [ ] Implement group CRUD endpoints
- [ ] Implement user profile endpoints
- [ ] Add input validation
- [ ] Add error handling
- [ ] Write unit tests

### Week 3: Payments ⏱️ 7-10 days
- [ ] Set up Paystack account
- [ ] Implement payment initialization
- [ ] Implement payment verification
- [ ] Set up webhook handler
- [ ] Test with test keys

### Week 4: Automation ⏱️ 5-7 days
- [ ] Set up SendGrid
- [ ] Create email templates
- [ ] Set up Twilio for SMS
- [ ] Implement scheduled jobs
- [ ] Test notifications

### Week 5: Testing ⏱️ 5-7 days
- [ ] Write integration tests
- [ ] Security testing
- [ ] Load testing
- [ ] Fix bugs
- [ ] Code review

### Week 6: Deployment ⏱️ 3-5 days
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Deploy to hosting platform
- [ ] Set up monitoring
- [ ] Go live! 🎉

**Total Time: 4-6 weeks**

---

## 🔑 Environment Variables

### Required for Development
```bash
# Database
DB_HOST=localhost
DB_NAME=ajo_secure
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=generate-random-string-here
REFRESH_TOKEN_SECRET=generate-another-random-string

# Server
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### Required for Production
```bash
# Add to development variables:
NODE_ENV=production
PAYSTACK_SECRET_KEY=sk_live_xxxxx
SENDGRID_API_KEY=SG.xxxxx
TWILIO_ACCOUNT_SID=ACxxxxx
SENTRY_DSN=https://xxxxx
```

---

## 🔌 API Endpoints Overview

### Authentication
| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| POST | `/api/auth/signup` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Get tokens |
| POST | `/api/auth/logout` | ✅ | Logout user |
| POST | `/api/auth/refresh-token` | ❌ | Refresh access token |

### Groups
| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| POST | `/api/groups` | ✅ | Create group |
| GET | `/api/groups/my-groups` | ✅ | User's groups |
| GET | `/api/groups/available` | ✅ | Browse groups |
| GET | `/api/groups/:id` | ✅ | Group details |
| POST | `/api/groups/:id/join` | ✅ | Join group |

### Payments
| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| POST | `/api/contributions/:id/pay` | ✅ | Initialize payment |
| GET | `/api/payments/verify/:ref` | ✅ | Verify payment |
| POST | `/api/webhooks/paystack` | ❌ | Payment webhook |

---

## 💳 Paystack Integration

### Get Test Keys
1. Go to https://paystack.com
2. Sign up for free account
3. Dashboard → Settings → API Keys
4. Copy test keys (start with `sk_test_` and `pk_test_`)

### Initialize Payment
```javascript
const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);

const response = await paystack.transaction.initialize({
  email: user.email,
  amount: amount * 100, // Convert to kobo
  reference: uniqueReference
});

// Send response.data.authorization_url to frontend
```

### Verify Payment
```javascript
const response = await paystack.transaction.verify(reference);

if (response.data.status === 'success') {
  // Payment successful
  // Update database
}
```

---

## 📧 Email Setup (SendGrid)

### Get API Key
1. Go to https://sendgrid.com
2. Create free account (100 emails/day)
3. Settings → API Keys → Create API Key
4. Copy key to `.env`

### Send Email
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: user.email,
  from: process.env.EMAIL_FROM,
  subject: 'Welcome to Ajo Secure',
  html: '<h1>Welcome!</h1>'
});
```

---

## 📱 SMS Setup (Twilio)

### Get Credentials
1. Go to https://twilio.com
2. Create account (free trial)
3. Get phone number
4. Copy Account SID and Auth Token

### Send SMS
```javascript
const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

await client.messages.create({
  body: 'Your payment is due tomorrow!',
  from: process.env.TWILIO_PHONE_NUMBER,
  to: user.phone
});
```

---

## ⏰ Scheduled Jobs

### Setup node-cron
```bash
npm install node-cron
```

### Daily Payment Reminders (9 AM)
```javascript
const cron = require('node-cron');

cron.schedule('0 9 * * *', async () => {
  // Find contributions due in 2 days
  // Send email/SMS reminders
});
```

### Late Penalties (1 AM)
```javascript
cron.schedule('0 1 * * *', async () => {
  // Find overdue contributions
  // Apply penalties
  // Send notifications
});
```

---

## 🧪 Testing Commands

### Test with curl
```bash
# Health check
curl http://localhost:3000/health

# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@test.com","phone":"+1234567890","password":"Test1234","confirmPassword":"Test1234"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234"}'
```

### Run Unit Tests
```bash
npm test
```

### Run with Coverage
```bash
npm test -- --coverage
```

---

## 🚀 Deployment Options

### Railway (Recommended)
```bash
# 1. Go to https://railway.app
# 2. Sign in with GitHub
# 3. New Project → Deploy from GitHub
# 4. Select repository
# 5. Add PostgreSQL database
# 6. Set environment variables
# 7. Deploy!
```

### Render
```bash
# 1. Go to https://render.com
# 2. New → Web Service
# 3. Connect GitHub repo
# 4. Set build command: npm install
# 5. Set start command: npm start
# 6. Add PostgreSQL database
# 7. Deploy!
```

### Heroku
```bash
heroku login
heroku create ajo-backend
heroku addons:create heroku-postgresql:mini
git push heroku main
```

---

## 🔐 Security Checklist

- [ ] Use HTTPS in production
- [ ] Set strong JWT secrets (64+ characters)
- [ ] Enable rate limiting
- [ ] Validate all inputs
- [ ] Use parameterized SQL queries
- [ ] Hash passwords with bcrypt (12 rounds)
- [ ] Verify webhook signatures
- [ ] Set up CORS properly
- [ ] Use environment variables
- [ ] Enable audit logging
- [ ] Set up error monitoring
- [ ] Regular security updates

---

## 🐛 Common Issues

### "Database connection failed"
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start
```

### "Port 3000 already in use"
```bash
# Change port in .env
PORT=3001
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### "JWT token invalid"
```bash
# Make sure JWT_SECRET is set in .env
# Clear browser storage and login again
```

---

## 📊 Monitoring Setup

### Error Tracking (Sentry)
```bash
npm install @sentry/node

# In your app
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### Logging
```bash
npm install winston

# Create logger
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## 💰 Cost Estimate

### Development (Testing)
- Hosting: $0 (Railway free tier)
- Database: $0 (included)
- Services: $0 (test mode)
- **Total: $0/month**

### Small Production (100 users)
- Hosting: $15/month
- Database: $10/month
- Email: $15/month
- SMS: $20/month
- **Total: ~$60/month**

### Medium Scale (1000 users)
- Hosting: $50/month
- Database: $25/month
- Email: $50/month
- SMS: $100/month
- Monitoring: $26/month
- **Total: ~$251/month**

---

## 📞 Get Help

### Documentation
- Full Guide: `BACKEND_STEP_BY_STEP_GUIDE.md`
- Architecture: `ARCHITECTURE.md`
- API Spec: `API.md`

### Community
- Stack Overflow: [node.js] tag
- Reddit: r/node, r/webdev
- Discord: Node.js community

### Official Docs
- Node.js: https://nodejs.org/docs
- Express: https://expressjs.com
- PostgreSQL: https://postgresql.org/docs
- Paystack: https://paystack.com/docs

---

## ✅ Success Criteria

Your backend is ready when:
- [ ] All authentication endpoints work
- [ ] Users can create and join groups
- [ ] Payments can be processed
- [ ] Emails and SMS are sent
- [ ] Scheduled jobs run correctly
- [ ] All tests pass
- [ ] Security checklist completed
- [ ] Deployed to production
- [ ] Monitoring is active

---

## 🎯 Final Tips

1. **Start Small**: Get authentication working first
2. **Test Often**: Test each feature as you build it
3. **Use Test Keys**: Never use live payment keys in development
4. **Read Errors**: Error messages usually tell you what's wrong
5. **Ask for Help**: Don't struggle alone, use communities
6. **Document Code**: Future you will thank you
7. **Backup Data**: Always backup your database
8. **Monitor Everything**: Set up monitoring from day 1
9. **Stay Updated**: Keep dependencies updated
10. **Have Fun**: Building software should be enjoyable! 😊

---

**You've got this! 🚀**

Start with `BACKEND_STEP_BY_STEP_GUIDE.md` and follow along.
The `backend-starter/` folder has working code ready to use.

Good luck! 🎉
