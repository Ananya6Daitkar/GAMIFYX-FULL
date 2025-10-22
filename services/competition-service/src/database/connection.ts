import { Pool } from 'pg';
import { logger } from '@/telemetry/logger';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'competition_service',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
};

// Create database connection pool
export const db = new Pool(dbConfig);

// Handle pool errors
db.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err });
  process.exit(-1);
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await db.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  try {
    await db.end();
    logger.info('Database connection pool closed');
  } catch (error) {
    logger.error('Error closing database connection pool', { error });
  }
}

// Export pool for use in models
export default db;