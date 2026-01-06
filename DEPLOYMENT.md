# Deployment Guide - Secured-Ajo

This guide explains how to deploy Secured-Ajo to production.

## Vercel Deployment (Recommended)

Vercel is the easiest way to deploy Next.js applications and supports automated cron jobs.

### Step 1: Prepare Your Repository

1. Commit all your changes to GitHub:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Create Supabase Database

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Once created, go to **SQL Editor**
4. Copy and paste the entire contents of `database/schema.sql`
5. Click "Run" to execute the schema
6. Go to **Settings** → **Database** and copy your connection string (URI format)
   - It looks like: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`

### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

### Step 4: Add Environment Variables

In Vercel project settings → Environment Variables, add:

```bash
# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# JWT Secret (generate a secure random string, min 32 characters)
# Use: https://generate-secret.vercel.app/32
JWT_SECRET=your-very-long-and-secure-random-string-here-min-32-chars

# JWT Expiry
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Paystack (get from paystack.com dashboard)
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key

# Cron Job Secret (generate a secure random string)
CRON_SECRET=your-secure-cron-secret-for-scheduled-tasks

# Application
NEXT_PUBLIC_APP_NAME=Ajo Secure
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Environment
NODE_ENV=production

# Email Configuration (optional - for OTP delivery)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key

# Feature Flags
NEXT_PUBLIC_ENABLE_KYC=true
NEXT_PUBLIC_ENABLE_BVN_VERIFICATION=true
NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION=true
NEXT_PUBLIC_ENABLE_PHONE_VERIFICATION=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 5: Configure Paystack Webhook

1. Go to your [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** → **API Keys & Webhooks**
3. Add your webhook URL: `https://your-domain.vercel.app/api/payments/webhook`
4. Make sure webhook is enabled

### Step 6: Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete (2-3 minutes)
3. Your site will be live at `https://your-project.vercel.app`

### Step 7: Verify Cron Jobs

1. In Vercel dashboard, go to **Settings** → **Cron Jobs**
2. You should see:
   - Daily task running at midnight (0 0 * * *)
   - Hourly task running every hour (0 * * * *)
3. Monitor the **Logs** tab to see cron job execution

### Step 8: Test the Deployment

1. Visit your deployed URL
2. Sign up for an account
3. Check Vercel logs for OTP (until email service is configured)
4. Verify email and log in
5. Create a test group
6. Invite other users or create test accounts

### Step 9: Custom Domain (Optional)

1. Go to Vercel project → **Settings** → **Domains**
2. Add your custom domain (e.g., ajosecure.com)
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

---

## Alternative: Railway Deployment

Railway is another excellent option that includes PostgreSQL hosting.

### Step 1: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project
3. Add PostgreSQL database
4. Add GitHub repo deployment

### Step 2: Run Database Schema

1. In Railway dashboard, open PostgreSQL service
2. Click "Connect" → "psql"
3. Copy and paste contents of `database/schema.sql`
4. Execute

### Step 3: Configure Environment Variables

Add the same environment variables as Vercel (see above).

Railway automatically provides `DATABASE_URL`.

### Step 4: Configure Cron Jobs

Railway doesn't have built-in cron. Options:

1. **External Cron Service** (recommended):
   - Use [cron-job.org](https://cron-job.org)
   - Add two jobs:
     - Daily: `https://your-app.railway.app/api/cron/daily?task=daily&secret=YOUR_SECRET`
     - Hourly: `https://your-app.railway.app/api/cron/daily?task=hourly&secret=YOUR_SECRET`

2. **GitHub Actions** (see below)

---

## GitHub Actions for Cron Jobs

If your deployment platform doesn't support cron, use GitHub Actions:

Create `.github/workflows/cron.yml`:

```yaml
name: Scheduled Tasks

on:
  schedule:
    # Daily at midnight UTC
    - cron: '0 0 * * *'
    # Hourly
    - cron: '0 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  run-daily:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 0 * * *'
    steps:
      - name: Run Daily Tasks
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/cron/daily?task=daily&secret=${{ secrets.CRON_SECRET }}"

  run-hourly:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 * * * *'
    steps:
      - name: Run Hourly Tasks
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/cron/daily?task=hourly&secret=${{ secrets.CRON_SECRET }}"
```

Add secrets in GitHub repo → Settings → Secrets:
- `APP_URL`: Your deployed app URL
- `CRON_SECRET`: Your cron secret key

---

## Post-Deployment Checklist

- [ ] Database schema imported and running
- [ ] All environment variables configured
- [ ] Paystack webhook URL configured
- [ ] Cron jobs running (check logs)
- [ ] Test user signup and OTP delivery
- [ ] Test group creation
- [ ] Test payment flow (with Paystack test keys first)
- [ ] SSL certificate active (should be automatic)
- [ ] Custom domain configured (if using)
- [ ] Error monitoring set up (optional: Sentry)
- [ ] Analytics configured (optional: Google Analytics, Vercel Analytics)

---

## Monitoring & Maintenance

### Check Cron Job Execution

**Vercel:**
- Go to project → Logs
- Filter by `/api/cron/`
- Check for errors

**Railway:**
- Check external cron service logs
- Monitor API endpoint health

### Database Maintenance

**Supabase:**
- Automatic backups included
- Monitor database size in dashboard
- Set up email alerts for issues

### Payment Monitoring

**Paystack:**
- Check webhook delivery status in dashboard
- Monitor failed transactions
- Review dispute/refund requests

---

## Troubleshooting

### Issue: Build fails on Vercel

**Solution:** Check build logs. Common issues:
- Missing environment variables
- TypeScript errors
- Dependency conflicts

### Issue: Database connection fails

**Solution:**
- Verify DATABASE_URL is correct
- Check if Supabase project is active
- Ensure IP whitelist allows Vercel's IPs (usually not needed)

### Issue: Cron jobs not running

**Solution:**
- Check cron secret is correct
- Verify cron job configuration in Vercel
- Check function logs for errors

### Issue: Paystack webhook not triggering

**Solution:**
- Verify webhook URL in Paystack dashboard
- Check webhook secret/signature verification
- Test with Paystack test mode first

---

## Security Best Practices

1. **Rotate Secrets Regularly:**
   - JWT_SECRET
   - CRON_SECRET
   - Paystack keys (if compromised)

2. **Monitor Logs:**
   - Watch for suspicious activity
   - Set up alerts for repeated failures

3. **Database Security:**
   - Enable SSL connections (Supabase default)
   - Regularly review access logs
   - Keep backups

4. **Rate Limiting:**
   - Monitor rate limit hits
   - Adjust limits if legitimate users affected
   - Block repeat offenders at IP level

---

## Scaling Considerations

### Database
- Supabase free tier: Up to 500MB
- Upgrade to Pro for more storage and connections
- Consider connection pooling for high traffic

### Compute
- Vercel scales automatically
- Monitor function execution time
- Optimize slow queries

### Caching
- Add Redis for session storage (optional)
- Cache frequently accessed data
- Use CDN for static assets (Vercel default)

---

## Support

- **Documentation:** See README.md, LOCAL_SETUP.md, IMPLEMENTATION_STATUS.md
- **Issues:** Open GitHub issue with logs and error details
- **Community:** GitHub Discussions

---

**Ready to go live? Follow these steps and your Ajo Secure platform will be production-ready! 🚀**
