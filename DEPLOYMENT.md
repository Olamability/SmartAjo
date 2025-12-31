# Deployment Guide - Ajo Secure

This guide covers deployment options for the Ajo Secure application.

## Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Docker (for containerized deployment)
- Access to a hosting platform (Vercel, Netlify, AWS, etc.)

## Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your production values:
   - API URLs
   - Payment gateway credentials (Paystack, Flutterwave, etc.)
   - Email service credentials (SendGrid, Mailgun, etc.)
   - SMS service credentials (Twilio, Africa's Talking, etc.)
   - Database connection strings
   - JWT secrets
   - Monitoring service credentials (Sentry, LogRocket, etc.)

## Deployment Options

### Option 1: Docker Deployment

The easiest way to deploy is using Docker. 

**Note:** If you encounter npm install issues in Docker, you can pre-build the application locally and use a simpler Dockerfile:

```bash
# Option A: Full build in Docker (recommended)
docker build -t ajo-secure .
docker run -p 80:80 ajo-secure

# Option B: Pre-build locally if Option A has issues
npm run build
# Then use Dockerfile.simple (see repository)
docker build -f Dockerfile.simple -t ajo-secure .
docker run -p 80:80 ajo-secure
```

Or use Docker Compose:

```bash
docker-compose up -d
```

### Option 2: Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Configure environment variables in Vercel dashboard

### Option 3: Netlify Deployment

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

### Option 4: AWS S3 + CloudFront

1. Build the application:
   ```bash
   npm run build
   ```

2. Create an S3 bucket and enable static website hosting

3. Upload the `dist` folder to S3:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name --delete
   ```

4. Create a CloudFront distribution pointing to your S3 bucket

5. Configure Route 53 for your custom domain

### Option 5: Traditional VPS (DigitalOcean, Linode, AWS EC2)

1. SSH into your server:
   ```bash
   ssh user@your-server-ip
   ```

2. Install Node.js, npm, and nginx

3. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ajo-secure.git
   cd ajo-secure
   ```

4. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

5. Configure nginx to serve the built files:
   ```nginx
   # Copy the nginx.conf file to /etc/nginx/sites-available/
   sudo cp nginx.conf /etc/nginx/sites-available/ajo-secure
   sudo ln -s /etc/nginx/sites-available/ajo-secure /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. Set up SSL with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Test user registration and login
- [ ] Verify payment gateway integration
- [ ] Test email and SMS notifications
- [ ] Check error logging and monitoring
- [ ] Verify SSL certificate is working
- [ ] Test on multiple devices and browsers
- [ ] Set up automated backups
- [ ] Configure CDN if needed
- [ ] Set up monitoring and alerting
- [ ] Review security headers
- [ ] Enable CORS for your backend API
- [ ] Set up rate limiting

## Monitoring and Maintenance

### Health Checks

The application includes a `/health` endpoint for monitoring:

```bash
curl https://yourdomain.com/health
```

### Logs

- Frontend errors: Check browser console and Sentry
- Backend errors: Check application logs and database logs
- Server errors: Check nginx logs at `/var/log/nginx/`

### Backup Strategy

1. Database: Daily automated backups
2. User uploads: Real-time replication to backup storage
3. Configuration: Version controlled in git

### Scaling Considerations

- Use a CDN (CloudFlare, AWS CloudFront) for static assets
- Implement Redis for session storage
- Use load balancers for high traffic
- Consider database read replicas
- Implement caching strategies

## Rollback Procedure

If deployment issues occur:

1. Using Docker:
   ```bash
   docker-compose down
   docker pull ajo-secure:previous-version
   docker-compose up -d
   ```

2. Using traditional deployment:
   ```bash
   git checkout previous-version-tag
   npm install
   npm run build
   sudo systemctl reload nginx
   ```

## Security Considerations

- Always use HTTPS in production
- Keep dependencies up to date
- Regularly audit npm packages: `npm audit`
- Enable rate limiting on API endpoints
- Implement CSRF protection
- Use secure session cookies
- Validate and sanitize all user inputs
- Implement proper CORS policies
- Use environment variables for secrets
- Enable security headers (already configured in nginx.conf)

## Support

For deployment issues, contact:
- Email: support@ajosecure.com
- Documentation: https://docs.ajosecure.com
