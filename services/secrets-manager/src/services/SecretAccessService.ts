import { Pool } from 'pg';
import { SecretAccessLog, SecretAction, SecretUsage } from '@/models/Secret';
import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';
import pool from '@/database/connection';

const meter = metrics.getMeter('secrets-manager', '1.0.0');

// Access metrics
const secretAccess = meter.createCounter('secret_access_total', {
  description: 'Total secret access attempts'
});

const secretAccessDenied = meter.createCounter('secret_access_denied_total', {
  description: 'Total denied secret access attempts'
});

const activeSecretConnections = meter.createUpDownCounter('active_secret_connections', {
  description: 'Number of active connections using secrets'
});

export class SecretAccessService {
  private pool: Pool;
  private usageCache: Map<string, SecretUsage> = new Map();

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
    
    // Update usage cache every 5 minutes
    setInterval(() => this.updateUsageCache(), 5 * 60 * 1000);
  }

  async logSecretAccess(accessLog: Omit<SecretAccessLog, 'id'>): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO secret_access_logs (
          secret_id, secret_path, user_id, action, result, reason, 
          ip_address, user_agent, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      const values = [
        accessLog.secretId,
        accessLog.secretPath,
        accessLog.userId,
        accessLog.action,
        accessLog.result,
        accessLog.reason || null,
        accessLog.ipAddress,
        accessLog.userAgent,
        accessLog.timestamp
      ];

      await client.query(query, values);

      // Update metrics
      secretAccess.add(1, { 
        action: accessLog.action,
        result: accessLog.result
      });

      if (accessLog.result === 'failure') {
        secretAccessDenied.add(1, { 
          action: accessLog.action,
          reason: accessLog.reason || 'unknown'
        });
      }

      // Update usage tracking
      await this.updateSecretUsage(accessLog.secretPath, accessLog.action);

      logger.info('Secret access logged', {
        secretPath: accessLog.secretPath,
        userId: accessLog.userId,
        action: accessLog.action,
        result: accessLog.result
      });

    } catch (error) {
      logger.error('Failed to log secret access', { error, accessLog });
      throw error;
    } finally {
      client.release();
    }
  }

  async getSecretAccessLogs(
    secretPath?: string,
    userId?: string,
    action?: SecretAction,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<SecretAccessLog[]> {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT id, secret_id as "secretId", secret_path as "secretPath", 
               user_id as "userId", action, result, reason,
               ip_address as "ipAddress", user_agent as "userAgent", timestamp
        FROM secret_access_logs
        WHERE 1=1
      `;
      
      const values: any[] = [];
      let paramCount = 1;

      if (secretPath) {
        query += ` AND secret_path = $${paramCount++}`;
        values.push(secretPath);
      }

      if (userId) {
        query += ` AND user_id = $${paramCount++}`;
        values.push(userId);
      }

      if (action) {
        query += ` AND action = $${paramCount++}`;
        values.push(action);
      }

      if (startDate) {
        query += ` AND timestamp >= $${paramCount++}`;
        values.push(startDate);
      }

      if (endDate) {
        query += ` AND timestamp <= $${paramCount++}`;
        values.push(endDate);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramCount}`;
      values.push(limit);

      const result = await client.query(query, values);
      return result.rows;

    } catch (error) {
      logger.error('Failed to get secret access logs', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getSecretUsage(secretPath: string): Promise<SecretUsage> {
    // Check cache first
    const cached = this.usageCache.get(secretPath);
    if (cached) {
      return cached;
    }

    const client = await this.pool.connect();
    
    try {
      // Get usage statistics from access logs
      const query = `
        SELECT 
          COUNT(*) as access_count,
          MAX(timestamp) as last_accessed,
          COUNT(DISTINCT user_id) as unique_users
        FROM secret_access_logs
        WHERE secret_path = $1 
          AND action = 'read'
          AND result = 'success'
          AND timestamp >= NOW() - INTERVAL '30 days'
      `;

      const result = await client.query(query, [secretPath]);
      const stats = result.rows[0];

      // Get active connections (simplified - in real implementation, 
      // this would track actual active database connections or API sessions)
      const activeConnections = await this.getActiveConnections(secretPath);

      const usage: SecretUsage = {
        secretId: secretPath,
        secretPath,
        service: 'unknown', // Would be determined from secret metadata
        environment: 'unknown', // Would be determined from secret metadata
        lastAccessed: stats.last_accessed ? new Date(stats.last_accessed) : new Date(),
        accessCount: parseInt(stats.access_count) || 0,
        activeConnections
      };

      // Cache the result
      this.usageCache.set(secretPath, usage);

      return usage;

    } catch (error) {
      logger.error('Failed to get secret usage', { error, secretPath });
      throw error;
    } finally {
      client.release();
    }
  }

  private async getActiveConnections(secretPath: string): Promise<number> {
    // In a real implementation, this would check:
    // - Active database connections using this credential
    // - Active API sessions using this token
    // - Running processes that have accessed this secret recently
    
    // For now, return a simulated count based on recent access
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT COUNT(DISTINCT user_id) as active_count
        FROM secret_access_logs
        WHERE secret_path = $1 
          AND action = 'read'
          AND result = 'success'
          AND timestamp >= NOW() - INTERVAL '1 hour'
      `;

      const result = await client.query(query, [secretPath]);
      return parseInt(result.rows[0].active_count) || 0;

    } catch (error) {
      logger.error('Failed to get active connections', { error, secretPath });
      return 0;
    } finally {
      client.release();
    }
  }

  private async updateSecretUsage(secretPath: string, action: SecretAction): Promise<void> {
    try {
      const usage = this.usageCache.get(secretPath);
      
      if (usage) {
        if (action === SecretAction.READ) {
          usage.accessCount++;
          usage.lastAccessed = new Date();
        }
        
        this.usageCache.set(secretPath, usage);
      }

      // Update active connections metric
      if (action === SecretAction.READ) {
        activeSecretConnections.add(1);
      }

    } catch (error) {
      logger.error('Failed to update secret usage', { error, secretPath, action });
    }
  }

  private async updateUsageCache(): Promise<void> {
    try {
      logger.debug('Updating secret usage cache');
      
      // Clear old cache entries
      this.usageCache.clear();
      
      // The cache will be repopulated on next access
      
    } catch (error) {
      logger.error('Failed to update usage cache', { error });
    }
  }

  async getSecretAccessStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalAccess: number;
    successfulAccess: number;
    failedAccess: number;
    uniqueUsers: number;
    topSecrets: Array<{ secretPath: string; accessCount: number }>;
    accessByAction: Record<string, number>;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Get overall stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total_access,
          COUNT(CASE WHEN result = 'success' THEN 1 END) as successful_access,
          COUNT(CASE WHEN result = 'failure' THEN 1 END) as failed_access,
          COUNT(DISTINCT user_id) as unique_users
        FROM secret_access_logs
        WHERE timestamp BETWEEN $1 AND $2
      `;

      const statsResult = await client.query(statsQuery, [startDate, endDate]);
      const stats = statsResult.rows[0];

      // Get top accessed secrets
      const topSecretsQuery = `
        SELECT secret_path, COUNT(*) as access_count
        FROM secret_access_logs
        WHERE timestamp BETWEEN $1 AND $2 AND result = 'success'
        GROUP BY secret_path
        ORDER BY access_count DESC
        LIMIT 10
      `;

      const topSecretsResult = await client.query(topSecretsQuery, [startDate, endDate]);

      // Get access by action
      const actionQuery = `
        SELECT action, COUNT(*) as count
        FROM secret_access_logs
        WHERE timestamp BETWEEN $1 AND $2 AND result = 'success'
        GROUP BY action
      `;

      const actionResult = await client.query(actionQuery, [startDate, endDate]);
      const accessByAction: Record<string, number> = {};
      actionResult.rows.forEach(row => {
        accessByAction[row.action] = parseInt(row.count);
      });

      return {
        totalAccess: parseInt(stats.total_access) || 0,
        successfulAccess: parseInt(stats.successful_access) || 0,
        failedAccess: parseInt(stats.failed_access) || 0,
        uniqueUsers: parseInt(stats.unique_users) || 0,
        topSecrets: topSecretsResult.rows.map(row => ({
          secretPath: row.secret_path,
          accessCount: parseInt(row.access_count)
        })),
        accessByAction
      };

    } catch (error) {
      logger.error('Failed to get secret access stats', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async detectAnomalousAccess(): Promise<Array<{
    secretPath: string;
    anomalyType: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
  }>> {
    const client = await this.pool.connect();
    const anomalies: Array<{
      secretPath: string;
      anomalyType: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: Date;
    }> = [];
    
    try {
      // Detect unusual access patterns
      
      // 1. High failure rate
      const failureRateQuery = `
        SELECT 
          secret_path,
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN result = 'failure' THEN 1 END) as failed_attempts,
          (COUNT(CASE WHEN result = 'failure' THEN 1 END)::float / COUNT(*)::float) as failure_rate
        FROM secret_access_logs
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        GROUP BY secret_path
        HAVING COUNT(*) >= 10 AND (COUNT(CASE WHEN result = 'failure' THEN 1 END)::float / COUNT(*)::float) > 0.5
      `;

      const failureResult = await client.query(failureRateQuery);
      failureResult.rows.forEach(row => {
        anomalies.push({
          secretPath: row.secret_path,
          anomalyType: 'high_failure_rate',
          description: `High failure rate: ${Math.round(row.failure_rate * 100)}% of ${row.total_attempts} attempts failed`,
          severity: 'high',
          timestamp: new Date()
        });
      });

      // 2. Unusual access times
      const offHoursQuery = `
        SELECT secret_path, COUNT(*) as off_hours_access
        FROM secret_access_logs
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
          AND (EXTRACT(hour FROM timestamp) < 6 OR EXTRACT(hour FROM timestamp) > 22)
          AND result = 'success'
        GROUP BY secret_path
        HAVING COUNT(*) > 5
      `;

      const offHoursResult = await client.query(offHoursQuery);
      offHoursResult.rows.forEach(row => {
        anomalies.push({
          secretPath: row.secret_path,
          anomalyType: 'off_hours_access',
          description: `${row.off_hours_access} accesses during off-hours (10 PM - 6 AM)`,
          severity: 'medium',
          timestamp: new Date()
        });
      });

      // 3. New user accessing sensitive secrets
      const newUserQuery = `
        SELECT DISTINCT sal.secret_path, sal.user_id
        FROM secret_access_logs sal
        WHERE sal.timestamp >= NOW() - INTERVAL '24 hours'
          AND sal.result = 'success'
          AND NOT EXISTS (
            SELECT 1 FROM secret_access_logs sal2
            WHERE sal2.user_id = sal.user_id
              AND sal2.secret_path = sal.secret_path
              AND sal2.timestamp < NOW() - INTERVAL '24 hours'
          )
      `;

      const newUserResult = await client.query(newUserQuery);
      newUserResult.rows.forEach(row => {
        anomalies.push({
          secretPath: row.secret_path,
          anomalyType: 'new_user_access',
          description: `New user ${row.user_id} accessed secret for the first time`,
          severity: 'low',
          timestamp: new Date()
        });
      });

      logger.info('Anomalous access detection completed', { 
        anomaliesFound: anomalies.length 
      });

      return anomalies;

    } catch (error) {
      logger.error('Failed to detect anomalous access', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const query = `
        DELETE FROM secret_access_logs
        WHERE timestamp < $1
      `;

      const result = await client.query(query, [cutoffDate]);
      const deletedCount = result.rowCount || 0;

      logger.info('Old access logs cleaned up', { 
        deletedCount,
        retentionDays,
        cutoffDate
      });

      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup old logs', { error });
      throw error;
    } finally {
      client.release();
    }
  }
}