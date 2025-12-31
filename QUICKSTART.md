# Quick Start Guide - Ajo Secure

This guide will help you get Ajo Secure up and running quickly.

## For Developers (Local Development)

### 1. Prerequisites
- Node.js 20.x or higher
- npm or yarn
- Git

### 2. Clone and Install
```bash
git clone https://github.com/Olamability/ajo-secure.git
cd ajo-secure
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration (optional for development)
```

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:8080` to see the application.

### 5. Build for Production
```bash
npm run build
```

## For DevOps (Production Deployment)

### Quick Deploy with Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard

### Quick Deploy with Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Build and deploy:
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Quick Deploy with Docker (Local Build)

```bash
# Build the application
npm run build

# Temporarily allow dist folder in Docker
echo "!dist" >> .dockerignore

# Build Docker image
docker build -f Dockerfile.simple -t ajo-secure .

# Run container
docker run -p 80:80 ajo-secure

# Restore .dockerignore
git checkout .dockerignore
```

Visit `http://localhost` to see the application.

### Quick Deploy with Traditional Server

```bash
# On your server
git clone https://github.com/Olamability/ajo-secure.git
cd ajo-secure
npm install
npm run build

# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/ajo-secure
sudo ln -s /etc/nginx/sites-available/ajo-secure /etc/nginx/sites-enabled/

# Update nginx.conf with your domain and SSL settings
sudo nano /etc/nginx/sites-available/ajo-secure

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

# Set up SSL with Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

## Essential Configuration

### Environment Variables

For production, configure these essential variables:

```bash
# API Configuration
VITE_API_URL=https://api.yourdomain.com/api

# Payment Gateway (Paystack recommended for Nigeria)
VITE_PAYSTACK_PUBLIC_KEY=your_public_key

# Email Service
VITE_SENDGRID_API_KEY=your_api_key
VITE_EMAIL_FROM=noreply@yourdomain.com

# SMS Service
VITE_TWILIO_ACCOUNT_SID=your_account_sid
VITE_TWILIO_AUTH_TOKEN=your_auth_token

# Security
VITE_ENVIRONMENT=production
```

## Testing the Application

### Test User Registration
1. Go to `/signup`
2. Fill in the registration form
3. Check console for OTP (in development)

### Test Group Creation
1. Login to the application
2. Go to `/create-group`
3. Fill in group details
4. Submit to create a group

### Test Payment Flow (Mock)
1. Join a group
2. Pay security deposit
3. Make contributions
4. Check transaction history

## Troubleshooting

### Build Errors

**Error: "vite: not found"**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Error: Module not found**
```bash
# Verify all dependencies are installed
npm install
```

### Docker Issues

**Error: "npm ci failed"**
```bash
# Use the simple Dockerfile instead
npm run build
docker build -f Dockerfile.simple -t ajo-secure .
```

**Error: "dist not found in Docker"**
```bash
# Build locally first
npm run build
# Temporarily allow dist in .dockerignore
echo "!dist" >> .dockerignore
docker build -f Dockerfile.simple -t ajo-secure .
git checkout .dockerignore
```

### Runtime Errors

**Error: "Failed to fetch"**
- Check if API_URL is correctly configured
- Ensure backend API is running
- Check CORS configuration

**Authentication not working**
- Remember: Current implementation uses localStorage (development only)
- For production, implement backend authentication

### Port Already in Use

```bash
# Change port in vite.config.ts or use different port
npm run dev -- --port 3000
```

## Next Steps

### For Frontend Development
1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Check out the component library in `src/components`
3. Review the TypeScript types in `src/types`

### For Backend Development
1. Read [API.md](./API.md) for complete API specification
2. Implement authentication endpoints
3. Set up payment gateway integration
4. Configure database

### For Production Deployment
1. Review [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Check [SECURITY.md](./SECURITY.md) for security requirements
3. Complete [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
4. Set up monitoring and error tracking

## Getting Help

- **Documentation:** Check all .md files in the repository
- **Issues:** [GitHub Issues](https://github.com/Olamability/ajo-secure/issues)
- **Email:** support@ajosecure.com

## Important Notes

⚠️ **PRODUCTION WARNING:** The current authentication implementation is for development only. Do NOT deploy to production without implementing proper backend authentication. See [SECURITY.md](./SECURITY.md) and [API.md](./API.md) for requirements.

✅ **FRONTEND STATUS:** The frontend is production-ready and fully functional. It just needs a backend API to handle authentication, payments, and data persistence.

🚀 **QUICK WIN:** You can deploy the frontend immediately to preview the UI and UX, just remember that authentication and payments won't work without the backend.

---

**Happy coding! 🎉**
