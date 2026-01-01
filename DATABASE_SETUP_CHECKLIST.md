# Database Setup Checklist

Use this checklist to verify your database setup is complete and working correctly.

## ✅ Setup Verification Checklist

### For Supabase (Cloud PostgreSQL)

- [ ] Created Supabase account at https://supabase.com
- [ ] Created a new project
- [ ] Saved database password securely
- [ ] Ran schema.sql in SQL Editor successfully
- [ ] Verified all tables exist in Table Editor (13 tables)
- [ ] Copied connection string from Settings > Database
- [ ] Replaced [YOUR-PASSWORD] with actual password in connection string
- [ ] Added DATABASE_URL to .env file in backend-starter
- [ ] Ran `npm install` in backend-starter directory
- [ ] Started backend with `npm run dev`
- [ ] Saw "✅ Connected to PostgreSQL database" message
- [ ] Tested health endpoint: `curl http://localhost:3000/health`
- [ ] Health endpoint returned `"database": "connected"`

### For Local PostgreSQL

- [ ] Installed PostgreSQL on local machine
- [ ] Created ajo_secure database
- [ ] Ran schema.sql using psql command
- [ ] Verified tables with `\dt` command
- [ ] Updated .env with local database credentials
- [ ] Ran `npm install` in backend-starter directory
- [ ] Started backend with `npm run dev`
- [ ] Saw "✅ Connected to PostgreSQL database" message
- [ ] Tested health endpoint: `curl http://localhost:3000/health`
- [ ] Health endpoint returned `"database": "connected"`

## 📋 Tables to Verify

After running schema.sql, these tables should exist:

1. ✅ users
2. ✅ email_verification_tokens
3. ✅ refresh_tokens
4. ✅ groups
5. ✅ group_members
6. ✅ contributions
7. ✅ payouts
8. ✅ transactions
9. ✅ penalties
10. ✅ notifications
11. ✅ audit_logs
12. ✅ kyc_documents
13. ✅ payment_webhooks

## 🧪 Connection Test Commands

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```
**Expected**: `{"status":"healthy","database":"connected"}`

### Test 2: Create Test User
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "+2348012345678",
    "password": "Test123!",
    "confirmPassword": "Test123!"
  }'
```
**Expected**: Success response with userId

### Test 3: Verify in Database

**For Supabase:**
- Go to Table Editor > users table
- Look for test@example.com

**For Local:**
```bash
psql -U postgres -d ajo_secure -c "SELECT email, full_name FROM users WHERE email='test@example.com';"
```

## ❌ Common Issues and Solutions

### Issue: "Connection timeout"
**Solution**: Check internet connection (Supabase) or PostgreSQL service (Local)

### Issue: "password authentication failed"
**Solution**: Verify password in .env file matches actual password

### Issue: "database does not exist"
**Solution for Supabase**: Connection string should end with `/postgres` not `/ajo_secure`
**Solution for Local**: Run `createdb ajo_secure` first

### Issue: Tables not showing
**Solution**: Re-run schema.sql in SQL Editor or psql

### Issue: "SSL connection required"
**Solution**: Update to latest database.js file that includes SSL configuration

## 📚 Next Steps After Successful Setup

Once all checkboxes above are complete:

1. ✅ Review [BACKEND_STEP_BY_STEP_GUIDE.md](./BACKEND_STEP_BY_STEP_GUIDE.md) for next features
2. ✅ Implement payment integration (Paystack)
3. ✅ Set up email service (SendGrid)
4. ✅ Set up SMS service (Twilio)
5. ✅ Implement remaining API endpoints

## 🆘 Getting Help

If you're stuck:
- See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed Supabase guide
- See [Troubleshooting section](./SUPABASE_SETUP.md#troubleshooting) in Supabase guide
- Open an issue on [GitHub](https://github.com/Olamability/secured-ajo/issues)

---

**Remember**: Never commit your `.env` file or share your database credentials publicly!
