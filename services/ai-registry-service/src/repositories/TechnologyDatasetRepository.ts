import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  TechnologyDatasetRelation, 
  CreateTechnologyDatasetRelationRequest 
} from '@/types';
import { NotFoundError, ConflictError } from '@/middleware/errorHandler';

export class TechnologyDatasetRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateTechnologyDatasetRelationRequest): Promise<TechnologyDatasetRelation> {
    const id = uuidv4();
    
    // First verify that both technology and dataset exist
    const techCheck = await this.pool.query('SELECT id FROM ai_technologies WHERE id = $1', [data.technologyId]);
    if (techCheck.rows.length === 0) {
      throw new NotFoundError('AI Technology not found');
    }

    const datasetCheck = await this.pool.query('SELECT id FROM training_datasets WHERE id = $1', [data.datasetId]);
    if (datasetCheck.rows.length === 0) {
      throw new NotFoundError('Training dataset not found');
    }

    const query = `
      INSERT INTO technology_datasets (id, technology_id, dataset_id, usage_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [id, data.technologyId, data.datasetId, data.usageType];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToRelation(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictError('This technology-dataset relationship already exists');
      }
      throw error;
    }
  }

  async findByTechnologyId(technologyId: string): Promise<TechnologyDatasetRelation[]> {
    const query = `
      SELECT td.*, t.name as technology_name, d.name as dataset_name
      FROM technology_datasets td
      JOIN ai_technologies t ON td.technology_id = t.id
      JOIN training_datasets d ON td.dataset_id = d.id
      WHERE td.technology_id = $1
      ORDER BY td.created_at DESC
    `;

    const result = await this.pool.query(query, [technologyId]);
    return result.rows.map(row => this.mapRowToRelation(row));
  }

  async findByDatasetId(datasetId: string): Promise<TechnologyDatasetRelation[]> {
    const query = `
      SELECT td.*, t.name as technology_name, d.name as dataset_name
      FROM technology_datasets td
      JOIN ai_technologies t ON td.technology_id = t.id
      JOIN training_datasets d ON td.dataset_id = d.id
      WHERE td.dataset_id = $1
      ORDER BY td.created_at DESC
    `;

    const result = await this.pool.query(query, [datasetId]);
    return result.rows.map(row => this.mapRowToRelation(row));
  }

  async findAll(): Promise<TechnologyDatasetRelation[]> {
    const query = `
      SELECT td.*, t.name as technology_name, d.name as dataset_name
      FROM technology_datasets td
      JOIN ai_technologies t ON td.technology_id = t.id
      JOIN training_datasets d ON td.dataset_id = d.id
      ORDER BY td.created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToRelation(row));
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM technology_datasets WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteByTechnologyAndDataset(technologyId: string, datasetId: string, usageType?: string): Promise<boolean> {
    let query = 'DELETE FROM technology_datasets WHERE technology_id = $1 AND dataset_id = $2';
    const values = [technologyId, datasetId];

    if (usageType) {
      query += ' AND usage_type = $3';
      values.push(usageType);
    }

    const result = await this.pool.query(query, values);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRowToRelation(row: any): TechnologyDatasetRelation {
    return {
      id: row.id,
      technologyId: row.technology_id,
      datasetId: row.dataset_id,
      usageType: row.usage_type,
      createdAt: row.created_at
    };
  }
}