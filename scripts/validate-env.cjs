#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * 
 * This script validates that all required environment variables are set
 * and provides helpful error messages if they're missing.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  error: (msg) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.warn(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`)
};

// Required environment variables
const requiredVars = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL',
    example: 'https://your-project.supabase.co',
    checkFormat: (val) => val.startsWith('https://') && val.includes('supabase')
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous/public key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    checkFormat: (val) => val.length > 100 && val.startsWith('eyJ')
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key (keep secret!)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    checkFormat: (val) => val.length > 100 && val.startsWith('eyJ')
  },
  {
    name: 'DATABASE_URL',
    description: 'PostgreSQL connection string',
    example: 'postgresql://postgres:password@db.yourproject.supabase.co:5432/postgres',
    checkFormat: (val) => val.startsWith('postgresql://') || val.startsWith('postgres://')
  }
];

// Optional but recommended variables
const recommendedVars = [
  {
    name: 'NODE_ENV',
    description: 'Environment mode',
    example: 'development'
  },
  {
    name: 'NEXT_PUBLIC_APP_NAME',
    description: 'Application name',
    example: 'Ajo Secure'
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'Application URL',
    example: 'http://localhost:3000'
  }
];

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (!line || line.trim().startsWith('#')) return;

    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });

  return envVars;
}

function validateEnvironment() {
  log.header('🔍 Secured Ajo - Environment Variables Validation');

  const envPath = path.join(process.cwd(), '.env.local');
  
  // Check if .env.local exists
  if (!fs.existsSync(envPath)) {
    log.error('.env.local file not found!');
    log.info('Create one by copying the example file:');
    console.log(`   ${colors.cyan}cp .env.local.example .env.local${colors.reset}\n`);
    process.exit(1);
  }

  log.success('.env.local file exists');

  // Load environment variables
  const envVars = loadEnvFile();
  let hasErrors = false;
  let hasWarnings = false;

  // Validate required variables
  log.header('Required Variables (🔴 Must be set):');
  
  requiredVars.forEach(({ name, description, example, checkFormat }) => {
    const value = envVars[name] || process.env[name];
    
    if (!value) {
      log.error(`${name} is not set`);
      console.log(`   ${colors.cyan}Description:${colors.reset} ${description}`);
      console.log(`   ${colors.cyan}Example:${colors.reset} ${example}\n`);
      hasErrors = true;
    } else if (value === example || value.includes('your-') || value.includes('test-')) {
      log.warning(`${name} is using a placeholder/test value`);
      console.log(`   ${colors.cyan}Current:${colors.reset} ${value.substring(0, 50)}...`);
      console.log(`   ${colors.cyan}Action:${colors.reset} Replace with your actual ${description}\n`);
      hasErrors = true;
    } else if (checkFormat && !checkFormat(value)) {
      log.warning(`${name} might be in wrong format`);
      console.log(`   ${colors.cyan}Current:${colors.reset} ${value.substring(0, 50)}...`);
      console.log(`   ${colors.cyan}Expected format:${colors.reset} ${example}\n`);
      hasWarnings = true;
    } else {
      log.success(`${name} is set`);
    }
  });

  // Validate recommended variables
  log.header('Recommended Variables (🟡 Should be set):');
  
  recommendedVars.forEach(({ name, description, example }) => {
    const value = envVars[name] || process.env[name];
    
    if (!value) {
      log.warning(`${name} is not set (optional but recommended)`);
      console.log(`   ${colors.cyan}Description:${colors.reset} ${description}`);
      console.log(`   ${colors.cyan}Example:${colors.reset} ${example}\n`);
      hasWarnings = true;
    } else {
      log.success(`${name} is set`);
    }
  });

  // Summary
  log.header('Summary:');
  
  if (hasErrors) {
    log.error('Environment validation FAILED!');
    log.info('Please fix the errors above and try again.');
    log.info('See ENV_SETUP.md for detailed setup instructions.\n');
    process.exit(1);
  } else if (hasWarnings) {
    log.warning('Environment validation passed with warnings.');
    log.info('Your app should work, but consider fixing the warnings above.\n');
    process.exit(0);
  } else {
    log.success('Environment validation PASSED! ✨');
    log.info('All required variables are properly configured.\n');
    log.info('You can now run: npm run dev\n');
    process.exit(0);
  }
}

// Run validation
validateEnvironment();
