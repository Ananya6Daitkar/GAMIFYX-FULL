import { Pool } from 'pg';
import { createClient } from 'redis';

describe('Database Integration Tests', () => {
  let pgPool: Pool;
  let redisClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    // PostgreSQL connection
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://aiops_user:aiops_password@localhost:5432/aiops_learning',
    });

    // Redis connection
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
  });

  afterAll(async () => {
    await pgPool.end();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  describe('PostgreSQL Connection', () => {
    it('should connect to PostgreSQL database', async () => {
      const client = await pgPool.connect();
      expect(client).toBeDefined();
      
      const result = await client.query('SELECT NOW()');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.now).toBeDefined();
      
      client.release();
    });

    it('should have required tables', async () => {
      const client = await pgPool.connect();
      
      const tableQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'user_profiles', 'submissions', 'badges', 'user_badges')
      `;
      
      const result = await client.query(tableQuery);
      const tableNames = result.rows.map(row => row.table_name);
      
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('user_profiles');
      expect(tableNames).toContain('submissions');
      expect(tableNames).toContain('badges');
      expect(tableNames).toContain('user_badges');
      
      client.release();
    });

    it('should have proper indexes', async () => {
      const client = await pgPool.connect();
      
      const indexQuery = `
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
      `;
      
      const result = await client.query(indexQuery);
      const indexNames = result.rows.map(row => row.indexname);
      
      expect(indexNames).toContain('idx_users_email');
      expect(indexNames).toContain('idx_submissions_user_id');
      
      client.release();
    });
  });

  describe('Redis Connection', () => {
    it('should connect to Redis', async () => {
      await redisClient.connect();
      expect(redisClient.isOpen).toBe(true);
      
      const pong = await redisClient.ping();
      expect(pong).toBe('PONG');
    });

    it('should set and get values', async () => {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      
      const testKey = 'test:integration';
      const testValue = 'integration-test-value';
      
      await redisClient.set(testKey, testValue);
      const retrievedValue = await redisClient.get(testKey);
      
      expect(retrievedValue).toBe(testValue);
      
      // Cleanup
      await redisClient.del(testKey);
    });

    it('should handle expiration', async () => {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      
      const testKey = 'test:expiration';
      const testValue = 'expiring-value';
      
      await redisClient.setEx(testKey, 1, testValue); // 1 second expiration
      
      const immediateValue = await redisClient.get(testKey);
      expect(immediateValue).toBe(testValue);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const expiredValue = await redisClient.get(testKey);
      expect(expiredValue).toBeNull();
    });
  });
});