import { Pool } from 'pg';
import { Submission, CreateSubmissionRequest, UpdateSubmissionRequest, SubmissionMetrics } from '@/models';
import { logger } from '@/telemetry/logger';
import pool from '../connection';

export class SubmissionRepository {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  async createSubmission(userId: string, submissionData: CreateSubmissionRequest): Promise<Submission> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO submissions (user_id, title, description, repository_url, commit_hash, submission_type, status, metrics)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, user_id as "userId", title, description, repository_url as "repositoryUrl", 
                  commit_hash as "commitHash", submission_type as "submissionType", status, metrics,
                  created_at as "createdAt", updated_at as "updatedAt", completed_at as "completedAt"
      `;
      
      const values = [
        userId,
        submissionData.title,
        submissionData.description || null,
        submissionData.repositoryUrl || null,
        submissionData.commitHash || null,
        submissionData.submissionType,
        'pending',
        JSON.stringify({})
      ];

      const result = await client.query(query, values);
      
      logger.info('Submission created successfully', { 
        submissionId: result.rows[0].id,
        userId,
        type: submissionData.submissionType
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating submission', { error, userId, title: submissionData.title });
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Submission | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, user_id as "userId", title, description, repository_url as "repositoryUrl",
               commit_hash as "commitHash", submission_type as "submissionType", status, metrics,
               created_at as "createdAt", updated_at as "updatedAt", completed_at as "completedAt"
        FROM submissions 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding submission by ID', { error, submissionId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Submission[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, user_id as "userId", title, description, repository_url as "repositoryUrl",
               commit_hash as "commitHash", submission_type as "submissionType", status, metrics,
               created_at as "createdAt", updated_at as "updatedAt", completed_at as "completedAt"
        FROM submissions 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await client.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding submissions by user ID', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSubmission(id: string, updateData: UpdateSubmissionRequest): Promise<Submission | null> {
    const client = await this.pool.connect();
    
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.title !== undefined) {
        updateFields.push(`title = $${paramCount++}`);
        values.push(updateData.title);
      }
      
      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(updateData.description);
      }
      
      if (updateData.repositoryUrl !== undefined) {
        updateFields.push(`repository_url = $${paramCount++}`);
        values.push(updateData.repositoryUrl);
      }
      
      if (updateData.commitHash !== undefined) {
        updateFields.push(`commit_hash = $${paramCount++}`);
        values.push(updateData.commitHash);
      }
      
      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(updateData.status);
        
        // Set completed_at if status is completed
        if (updateData.status === 'completed') {
          updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
        }
      }
      
      if (updateData.metrics !== undefined) {
        updateFields.push(`metrics = $${paramCount++}`);
        values.push(JSON.stringify(updateData.metrics));
      }

      if (updateFields.length === 0) {
        return await this.findById(id);
      }

      values.push(id);

      const query = `
        UPDATE submissions 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING id, user_id as "userId", title, description, repository_url as "repositoryUrl",
                  commit_hash as "commitHash", submission_type as "submissionType", status, metrics,
                  created_at as "createdAt", updated_at as "updatedAt", completed_at as "completedAt"
      `;
      
      const result = await client.query(query, values);
      
      logger.info('Submission updated successfully', { submissionId: id });
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating submission', { error, submissionId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMetrics(id: string, metrics: Partial<SubmissionMetrics>): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // First get current metrics
      const currentSubmission = await this.findById(id);
      if (!currentSubmission) {
        throw new Error('Submission not found');
      }

      // Merge with existing metrics
      const updatedMetrics = {
        ...currentSubmission.metrics,
        ...metrics
      };

      const query = `
        UPDATE submissions 
        SET metrics = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await client.query(query, [JSON.stringify(updatedMetrics), id]);
      
      logger.info('Submission metrics updated', { submissionId: id });
    } catch (error) {
      logger.error('Error updating submission metrics', { error, submissionId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async findByStatus(status: string, limit: number = 100): Promise<Submission[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, user_id as "userId", title, description, repository_url as "repositoryUrl",
               commit_hash as "commitHash", submission_type as "submissionType", status, metrics,
               created_at as "createdAt", updated_at as "updatedAt", completed_at as "completedAt"
        FROM submissions 
        WHERE status = $1
        ORDER BY created_at ASC
        LIMIT $2
      `;
      
      const result = await client.query(query, [status, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding submissions by status', { error, status });
      throw error;
    } finally {
      client.release();
    }
  }

  async getSubmissionStats(userId?: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM submissions
      `;
      
      const values: any[] = [];
      
      if (userId) {
        query += ' WHERE user_id = $1';
        values.push(userId);
      }
      
      const result = await client.query(query, values);
      
      return {
        total: parseInt(result.rows[0].total),
        pending: parseInt(result.rows[0].pending),
        processing: parseInt(result.rows[0].processing),
        completed: parseInt(result.rows[0].completed),
        failed: parseInt(result.rows[0].failed)
      };
    } catch (error) {
      logger.error('Error getting submission stats', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSubmission(id: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM submissions WHERE id = $1';
      await client.query(query, [id]);
      
      logger.info('Submission deleted', { submissionId: id });
    } catch (error) {
      logger.error('Error deleting submission', { error, submissionId: id });
      throw error;
    } finally {
      client.release();
    }
  }
}