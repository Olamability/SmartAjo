# Backend Implementation Guide for Ajo Secure

This document provides comprehensive guidance for implementing the backend API for the Ajo Secure platform.

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Environment Variables](#environment-variables)
3. [Security Requirements](#security-requirements)
4. [Payment Gateway Integration](#payment-gateway-integration)
5. [Email & SMS Services](#email--sms-services)
6. [Scheduled Jobs](#scheduled-jobs)
7. [Webhook Handlers](#webhook-handlers)
8. [API Endpoints Implementation](#api-endpoints-implementation)

## Technology Stack

### Recommended Stack
- **Runtime**: Node.js 20+ / Python 3.11+ / Go 1.21+
- **Framework**: Express.js / NestJS / FastAPI / Gin
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Queue**: Bull (Node.js) / Celery (Python) / RabbitMQ
- **File Storage**: AWS S3 / Google Cloud Storage / Azure Blob
- **Monitoring**: Sentry, DataDog, or New Relic

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Application
NODE_ENV=development
PORT=3000
APP_NAME=Ajo Secure
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ajo_secure
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-min-32-characters
REFRESH_TOKEN_EXPIRES_IN=7d

# Password Security
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:8080

# Payment Gateway - Paystack
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
PAYSTACK_CALLBACK_URL=${APP_URL}/api/payments/paystack/callback

# Payment Gateway - Flutterwave
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxx
FLUTTERWAVE_WEBHOOK_SECRET_HASH=xxxxxxxxxxxxxxxxxxxx
FLUTTERWAVE_CALLBACK_URL=${APP_URL}/api/payments/flutterwave/callback

# Email Service - SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@ajosecure.com
EMAIL_FROM_NAME=Ajo Secure

# SMS Service - Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=ajo-secure-uploads

# Monitoring
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o000000.ingest.sentry.io/0000000

# Feature Flags
ENABLE_KYC=true
ENABLE_BVN_VERIFICATION=false
ENABLE_EMAIL_VERIFICATION=true
ENABLE_PHONE_VERIFICATION=true

# Security
SESSION_TIMEOUT=3600000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000
ENABLE_2FA=false

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Security Requirements

### Password Security
- **Hashing**: Use bcrypt with at least 12 rounds
- **Complexity**: Minimum 8 characters, including uppercase, lowercase, number
- **Password Reset**: Time-limited tokens (1 hour expiry)
- **Account Lockout**: After 5 failed attempts, lock for 15 minutes

### JWT Tokens
- **Access Token**: Short-lived (15 minutes), stored in memory/sessionStorage
- **Refresh Token**: Long-lived (7 days), stored in httpOnly cookie or localStorage
- **Token Rotation**: Issue new refresh token on each refresh
- **Revocation**: Store revoked tokens in Redis with expiry

### API Security
- **HTTPS Only**: Enforce TLS 1.2+ in production
- **CORS**: Strict origin whitelist
- **Rate Limiting**: Per IP and per user limits
- **Input Validation**: Validate all inputs with schemas (Joi, Zod, etc.)
- **SQL Injection**: Use parameterized queries only
- **XSS Prevention**: Sanitize all user inputs
- **CSRF**: Use CSRF tokens for state-changing operations

### Data Protection
- **PII Encryption**: Encrypt sensitive data at rest (BVN, etc.)
- **Audit Logging**: Log all financial transactions and user actions
- **Data Retention**: Define retention policies for logs and data
- **Backup**: Daily automated backups with 30-day retention

## Payment Gateway Integration

### Paystack Integration

#### Initialize Payment
```javascript
const paystackInstance = require('paystack')(process.env.PAYSTACK_SECRET_KEY);

async function initializePayment(email, amount, reference) {
  const response = await paystackInstance.transaction.initialize({
    email,
    amount: amount * 100, // Convert to kobo
    reference,
    callback_url: process.env.PAYSTACK_CALLBACK_URL,
    metadata: {
      custom_fields: [
        {
          display_name: "Group ID",
          variable_name: "group_id",
          value: groupId
        }
      ]
    }
  });
  
  return response.data;
}
```

#### Verify Payment
```javascript
async function verifyPayment(reference) {
  const response = await paystackInstance.transaction.verify(reference);
  return response.data;
}
```

#### Webhook Handler
```javascript
const crypto = require('crypto');

function verifyPaystackWebhook(payload, signature) {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
}

app.post('/api/webhooks/paystack', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  
  if (!verifyPaystackWebhook(req.body, signature)) {
    return res.status(400).send('Invalid signature');
  }
  
  const event = req.body;
  
  switch (event.event) {
    case 'charge.success':
      await handleSuccessfulPayment(event.data);
      break;
    case 'charge.failed':
      await handleFailedPayment(event.data);
      break;
    case 'transfer.success':
      await handleSuccessfulPayout(event.data);
      break;
    case 'transfer.failed':
      await handleFailedPayout(event.data);
      break;
  }
  
  res.sendStatus(200);
});
```

### Flutterwave Integration

#### Initialize Payment
```javascript
const Flutterwave = require('flutterwave-node-v3');
const flw = new Flutterwave(
  process.env.FLUTTERWAVE_PUBLIC_KEY,
  process.env.FLUTTERWAVE_SECRET_KEY
);

async function initializePayment(email, amount, reference) {
  const payload = {
    tx_ref: reference,
    amount: amount,
    currency: "NGN",
    redirect_url: process.env.FLUTTERWAVE_CALLBACK_URL,
    customer: {
      email: email,
      name: fullName,
    },
    customizations: {
      title: "Ajo Secure",
      description: "Group Contribution Payment",
    },
    meta: {
      group_id: groupId,
    }
  };

  const response = await flw.Charge.card(payload);
  return response;
}
```

## Email & SMS Services

### Email Templates Required
1. **Welcome Email** - After signup
2. **Email Verification** - OTP for email verification
3. **Password Reset** - Password reset link
4. **Payment Confirmation** - After successful contribution
5. **Payment Due Reminder** - 2 days before due date
6. **Payout Notification** - When payout is processed
7. **Penalty Notice** - When penalty is applied
8. **Group Completion** - When all cycles complete

### SMS Templates Required
1. **OTP Verification** - Phone verification code
2. **Payment Reminder** - Contribution due notification
3. **Payment Confirmation** - Payment received
4. **Payout Alert** - Payout processed

## Scheduled Jobs

Implement the following cron jobs:

### Daily Jobs
- **Payment Reminders**: Send reminders for payments due in 2 days
- **Late Payment Penalties**: Apply penalties for overdue payments
- **Payout Processing**: Process scheduled payouts when cycle completes

### Hourly Jobs
- **Payment Status Check**: Check payment gateway for pending transactions
- **Contribution Status Update**: Update contribution statuses based on due dates

### Weekly Jobs
- **Inactive User Cleanup**: Archive users inactive for 90+ days
- **Group Status Update**: Move inactive groups to cancelled

## Webhook Handlers

### Payment Gateway Webhooks
- `/api/webhooks/paystack` - Paystack events
- `/api/webhooks/flutterwave` - Flutterwave events

### Required Event Handlers
1. **charge.success / successful** - Mark contribution as paid
2. **charge.failed / failed** - Update contribution status to failed
3. **transfer.success / successful** - Mark payout as processed
4. **transfer.failed / failed** - Mark payout as failed, notify admin

## API Endpoints Implementation

### Critical Endpoints Priority

#### High Priority (MVP Required)
1. **Authentication**
   - POST /api/auth/signup
   - POST /api/auth/login
   - POST /api/auth/logout
   - POST /api/auth/refresh-token
   - POST /api/auth/verify-email
   - POST /api/auth/resend-otp

2. **Groups**
   - POST /api/groups (Create group)
   - GET /api/groups/my-groups (User's groups)
   - GET /api/groups/available (Available to join)
   - GET /api/groups/:id (Group details)
   - POST /api/groups/:id/join (Join group)
   - POST /api/groups/:id/security-deposit (Pay deposit)

3. **Contributions**
   - POST /api/contributions/:id/pay (Make payment)
   - GET /api/contributions (User contributions)
   - GET /api/groups/:id/contributions (Group contributions)

4. **Transactions**
   - GET /api/transactions (User transaction history)
   - GET /api/groups/:id/transactions (Group transactions)

5. **Payment Gateway**
   - POST /api/payments/initialize (Initialize payment)
   - GET /api/payments/verify/:reference (Verify payment)
   - POST /api/webhooks/paystack (Payment webhook)

#### Medium Priority
- User profile management
- Notifications API
- KYC document upload and verification
- Group member management

#### Low Priority
- Admin panel APIs
- Analytics and reporting
- Export functionality

## Implementation Checklist

- [ ] Setup project with chosen framework
- [ ] Configure database connection pool
- [ ] Setup Redis for caching and sessions
- [ ] Implement JWT authentication middleware
- [ ] Setup rate limiting
- [ ] Implement input validation
- [ ] Setup error handling and logging
- [ ] Configure CORS properly
- [ ] Integrate payment gateway (Paystack/Flutterwave)
- [ ] Implement email service (SendGrid)
- [ ] Implement SMS service (Twilio)
- [ ] Setup file upload to S3
- [ ] Create scheduled jobs
- [ ] Setup webhook handlers
- [ ] Implement audit logging
- [ ] Setup monitoring (Sentry)
- [ ] Write API tests
- [ ] Setup CI/CD pipeline
- [ ] Create API documentation (Swagger/OpenAPI)

## Testing Requirements

### Unit Tests
- Test all business logic functions
- Test utility functions
- Test validation schemas

### Integration Tests
- Test API endpoints
- Test database operations
- Test payment gateway integration
- Test email/SMS sending

### Security Tests
- Test authentication flows
- Test authorization rules
- Test rate limiting
- Test input validation
- Test CSRF protection

### Load Tests
- Test concurrent user scenarios
- Test payment processing under load
- Test database query performance

## Deployment Considerations

### Infrastructure
- **Load Balancer**: For high availability
- **Auto-scaling**: Based on CPU/memory usage
- **CDN**: For static assets
- **Database**: Read replicas for scaling reads
- **Redis**: Cluster mode for high availability

### Monitoring & Alerts
- **Application Metrics**: Response time, error rate
- **Database Metrics**: Connection pool, query performance
- **Business Metrics**: Transaction volume, user growth
- **Alerts**: Failed payments, API errors, high latency

### Compliance
- **PCI DSS**: If storing card data (not recommended)
- **GDPR**: If serving EU users
- **Data Residency**: Store data in user's country if required
- **Financial Regulations**: Comply with local financial regulations

## Next Steps

1. Choose your technology stack
2. Setup development environment
3. Implement authentication first
4. Integrate payment gateway
5. Implement core group and contribution logic
6. Add scheduled jobs for automation
7. Setup monitoring and logging
8. Perform security audit
9. Load test the application
10. Deploy to staging
11. User acceptance testing
12. Deploy to production

## Support & Resources

- **API Documentation**: See [API.md](../API.md)
- **Database Schema**: See [database/schema.sql](../database/schema.sql)
- **PRD**: See [PRD/smart_ajo_core_product_documentation_schema_architecture_compliance_prd.md](../PRD/smart_ajo_core_product_documentation_schema_architecture_compliance_prd.md)
- **Security Guide**: See [SECURITY.md](../SECURITY.md)
