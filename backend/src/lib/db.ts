import 'server-only';

import { Pool } from 'pg';

let pool: Pool | null = null;

// Lazy initialization of the database pool
function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create a connection pool for PostgreSQL
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Handle connection errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client:', err);
      // Don't exit the process - let the request fail gracefully
      // In production with proper monitoring, this would trigger alerts
    });
  }
  
  return pool;
}

// Helper function to execute queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const poolInstance = getPool();
    const res = await poolInstance.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
}

// Helper function for transactions
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const poolInstance = getPool();
  const client = await poolInstance.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Export the pool getter for backward compatibility (though not used by any routes)
export default getPool;
