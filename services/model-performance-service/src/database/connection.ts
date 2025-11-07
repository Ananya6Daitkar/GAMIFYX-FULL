import { Pool, PoolConfig } from 'pg';
import { logger } from '@/telemetry/logger';

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'aiops_learning',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
};

export const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err });
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error acquiring client', { error: err });
    return;
  }
  
  client?.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      logger.error('Error executing query', { error: err });
      return;
    }
    logger.info('Model Performance Database connected successfully', { 
      timestamp: result?.rows[0]?.now 
    });
  });
});

export default pool;