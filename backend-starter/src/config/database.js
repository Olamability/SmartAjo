const { Pool } = require('pg');
require('dotenv').config();

// Check if we should use mock database
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true' || !process.env.DATABASE_URL && !process.env.DB_PASSWORD;

if (USE_MOCK_DB) {
  console.log('⚠️  Using MOCK DATABASE for development');
  console.log('⚠️  Data will be stored in memory and lost on restart');
  console.log('⚠️  To use PostgreSQL, set DATABASE_URL or DB_PASSWORD in .env');
  module.exports = require('./mockDatabase');
} else {
  // Support both DATABASE_URL (Supabase/cloud) and individual connection params (local)
  const pool = process.env.DATABASE_URL 
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        // SSL configuration for cloud databases
        // In production: strict validation for security
        // In development: relaxed to support Supabase and other cloud providers that may use self-signed certs
        // For maximum security in production, ensure your cloud provider supports proper SSL certificates
        ssl: process.env.NODE_ENV === 'production' 
          ? { rejectUnauthorized: true }  // Strict SSL in production
          : { rejectUnauthorized: false }, // Relaxed for development
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })
    : new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'ajo_secure',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

  pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    process.exit(-1);
  });

  module.exports = pool;
}
