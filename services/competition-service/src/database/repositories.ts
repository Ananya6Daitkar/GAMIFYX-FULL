import { Pool } from 'pg';
import { CompetitionModel } from '@/models/Competition';
import { ParticipationModel } from '@/models/Participation';
import { CampaignModel } from '@/models/Campaign';
import { logger } from '@/telemetry/logger';
import db from './connection';

/**
 * Repository pattern implementation for all competition service entities
 * Provides unified CRUD operations and transaction management
 */
export class CompetitionRepository {
  private competitionModel: CompetitionModel;
  private participationModel: ParticipationModel;
  private campaignModel: CampaignModel;

  constructor(private db: Pool = db) {
    this.competitionModel = new CompetitionModel(this.db);
    this.participationModel = new ParticipationModel(this.db);
    this.campaignModel = new CampaignModel(this.db);
  }

  // Competition operations
  get competitions() {
    return this.competitionModel;
  }

  // Participation operations
  get participations() {
    return this.participationModel;
  }

  // Campaign operations
  get campaigns() {
    return this.campaignModel;
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async transaction<T>(operations: (client: any) => Promise<T>): Promise<T> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      const result = await operations(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    try {
      const result = await this.db.query('SELECT NOW() as timestamp');
      return {
        status: 'healthy',
        timestamp: result.rows[0].timestamp
      };
    } catch (error) {
      logger.error('Database health check failed', { error });
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalConnections: number;
    idleConnections: number;
    waitingCount: number;
  }> {
    return {
      totalConnections: this.db.totalCount,
      idleConnections: this.db.idleCount,
      waitingCount: this.db.waitingCount
    };
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    await this.db.end();
    logger.info('Database connections closed');
  }
}

// Export singleton instance
export const repository = new CompetitionRepository();

// Export individual models for direct access if needed
export { CompetitionModel, ParticipationModel, CampaignModel };

// Export database connection for advanced usage
export { db };