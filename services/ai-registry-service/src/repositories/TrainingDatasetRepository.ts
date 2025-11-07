import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  TrainingDataset, 
  CreateTrainingDatasetRequest, 
  UpdateTrainingDatasetRequest 
} from '@/types';
import { NotFoundError, ConflictError } from '@/middleware/errorHandler';

export class TrainingDatasetRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateTrainingDatasetRequest): Promise<TrainingDataset> {
    const id = uuidv4();
    const query = `
      INSERT INTO training_datasets (
        id, name, source, source_url, license_type, dataset_size,
        dataset_format, description, domain, language, quality_score, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      id,
      data.name,
      data.source,
      data.sourceUrl || null,
      data.licenseType,
      data.datasetSize || null,
      data.datasetFormat || null,
      data.description || null,
      data.domain || null,
      data.language || null,
      data.qualityScore || null,
      data.createdBy || null
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToTrainingDataset(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictError('Training dataset with this name already exists');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<TrainingDataset | null> {
    const query = 'SELECT * FROM training_datasets WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTrainingDataset(result.rows[0]);
  }

  async findAll(filters: {
    source?: string;
    licenseType?: string;
    domain?: string;
    language?: string;
    isVerified?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ datasets: TrainingDataset[]; total: number }> {
    const {
      source,
      licenseType,
      domain,
      language,
      isVerified,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters;

    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (source) {
      whereClause += ` AND source = $${++paramCount}`;
      values.push(source);
    }

    if (licenseType) {
      whereClause += ` AND license_type ILIKE $${++paramCount}`;
      values.push(`%${licenseType}%`);
    }

    if (domain) {
      whereClause += ` AND domain ILIKE $${++paramCount}`;
      values.push(`%${domain}%`);
    }

    if (language) {
      whereClause += ` AND language ILIKE $${++paramCount}`;
      values.push(`%${language}%`);
    }

    if (isVerified !== undefined) {
      whereClause += ` AND is_verified = $${++paramCount}`;
      values.push(isVerified);
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM training_datasets ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query with pagination
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT * FROM training_datasets 
      ${whereClause}
      ORDER BY ${this.mapSortField(sortBy)} ${sortOrder.toUpperCase()}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    values.push(limit, offset);

    const dataResult = await this.pool.query(dataQuery, values);
    const datasets = dataResult.rows.map(row => this.mapRowToTrainingDataset(row));

    return { datasets, total };
  }

  async update(id: string, data: UpdateTrainingDatasetRequest): Promise<TrainingDataset> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError('Training dataset not found');
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${this.mapFieldToColumn(key)} = $${++paramCount}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return existing;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE training_datasets 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToTrainingDataset(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictError('Training dataset with this name already exists');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM training_datasets WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async verifyDataset(id: string, verifiedBy: string): Promise<TrainingDataset> {
    const query = `
      UPDATE training_datasets 
      SET is_verified = true, verification_date = CURRENT_TIMESTAMP, verified_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [verifiedBy, id]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Training dataset not found');
    }

    return this.mapRowToTrainingDataset(result.rows[0]);
  }

  private mapRowToTrainingDataset(row: any): TrainingDataset {
    return {
      id: row.id,
      name: row.name,
      source: row.source,
      sourceUrl: row.source_url,
      licenseType: row.license_type,
      datasetSize: row.dataset_size,
      datasetFormat: row.dataset_format,
      description: row.description,
      domain: row.domain,
      language: row.language,
      qualityScore: row.quality_score ? parseFloat(row.quality_score) : null,
      isVerified: row.is_verified,
      verificationDate: row.verification_date,
      verifiedBy: row.verified_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }

  private mapFieldToColumn(field: string): string {
    const fieldMap: Record<string, string> = {
      sourceUrl: 'source_url',
      licenseType: 'license_type',
      datasetSize: 'dataset_size',
      datasetFormat: 'dataset_format',
      qualityScore: 'quality_score',
      isVerified: 'is_verified',
      verificationDate: 'verification_date',
      verifiedBy: 'verified_by',
      createdBy: 'created_by',
      updatedBy: 'updated_by'
    };

    return fieldMap[field] || field;
  }

  private mapSortField(field: string): string {
    const sortMap: Record<string, string> = {
      datasetSize: 'dataset_size',
      qualityScore: 'quality_score',
      createdAt: 'created_at'
    };

    return sortMap[field] || field;
  }
}