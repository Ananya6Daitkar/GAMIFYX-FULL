/**
 * Database connection and configuration
 */

import { Pool, PoolClient } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../telemetry/logger';

class DatabaseManager {
  private static instance: DatabaseManager;
  private pgPool: Pool;
  private redisClient: RedisClientType;
  private isConnected = false;

  private constructor() {
    // PostgreSQL connection
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://aiops_user:aiops_password@localhost:5432/aiops_learning',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Redis connection
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.setupEventHandlers();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private setupEventHandlers(): void {
    // PostgreSQL event handlers
    this.pgPool.on('connect', () => {
      logger.info('New PostgreSQL client connected');
    });

    this.pgPool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });

    // Redis event handlers
    this.redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    this.redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });
  }

  public async connect(): Promise<void> {
    try {
      // Test PostgreSQL connection
      const client = await this.pgPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('PostgreSQL connection established');

      // Connect to Redis
      await this.redisClient.connect();
      logger.info('Redis connection established');

      this.isConnected = true;
      logger.info('Database connections established successfully');
    } catch (error) {
      logger.error('Failed to establish database connections:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.pgPool.end();
      await this.redisClient.quit();
      this.isConnected = false;
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections:', error);
      throw error;
    }
  }

  public getPostgresPool(): Pool {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pgPool;
  }

  public getRedisClient(): RedisClientType {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.redisClient;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pgPool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pgPool.connect();
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

  // Cache helpers
  public async cacheSet(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redisClient.setEx(key, ttlSeconds, serialized);
    } else {
      await this.redisClient.set(key, serialized);
    }
  }

  public async cacheGet<T>(key: string): Promise<T | null> {
    const cached = await this.redisClient.get(key);
    if (!cached) return null;
    
    try {
      return JSON.parse(cached) as T;
    } catch (error) {
      logger.warn(`Failed to parse cached value for key ${key}:`, error);
      return null;
    }
  }

  public async cacheDel(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  public async cacheExists(key: string): Promise<boolean> {
    const exists = await this.redisClient.exists(key);
    return exists === 1;
  }

  // Health check
  public async healthCheck(): Promise<{ postgres: boolean; redis: boolean }> {
    const health = { postgres: false, redis: false };

    try {
      await this.query('SELECT 1');
      health.postgres = true;
    } catch (error) {
      logger.error('PostgreSQL health check failed:', error);
    }

    try {
      await this.redisClient.ping();
      health.redis = true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    return health;
  }
}

export const db = DatabaseManager.getInstance();