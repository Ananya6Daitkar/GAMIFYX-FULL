import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  AIModel, 
  CreateAIModelRequest, 
  UpdateAIModelRequest 
} from '@/types';
import { NotFoundError, ConflictError } from '@/middleware/errorHandler';

export class AIModelRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateAIModelRequest): Promise<AIModel> {
    const id = uuidv4();
    const query = `
      INSERT INTO ai_models (
        id, name, type, version, framework, description, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      id,
      data.name,
      data.type,
      data.version,
      data.framework || null,
      data.description || null,
      data.createdBy || null
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToAIModel(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictError('AI Model with this name and version already exists');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<AIModel | null> {
    const query = 'SELECT * FROM ai_models WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAIModel(result.rows[0]);
  }

  async findAll(filters: {
    type?: string;
    framework?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ models: AIModel[]; total: number }> {
    const {
      type,
      framework,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters;

    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (type) {
      whereClause += ` AND type = $${++paramCount}`;
      values.push(type);
    }

    if (framework) {
      whereClause += ` AND framework ILIKE $${++paramCount}`;
      values.push(`%${framework}%`);
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${++paramCount}`;
      values.push(isActive);
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM ai_models ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query with pagination
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT * FROM ai_models 
      ${whereClause}
      ORDER BY ${this.mapSortField(sortBy)} ${sortOrder.toUpperCase()}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    values.push(limit, offset);

    const dataResult = await this.pool.query(dataQuery, values);
    const models = dataResult.rows.map(row => this.mapRowToAIModel(row));

    return { models, total };
  }

  async update(id: string, data: UpdateAIModelRequest): Promise<AIModel> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError('AI Model not found');
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
      UPDATE ai_models 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToAIModel(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictError('AI Model with this name and version already exists');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM ai_models WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async findByNameAndVersion(name: string, version: string): Promise<AIModel | null> {
    const query = 'SELECT * FROM ai_models WHERE name = $1 AND version = $2';
    const result = await this.pool.query(query, [name, version]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAIModel(result.rows[0]);
  }

  async findByType(type: string): Promise<AIModel[]> {
    const query = 'SELECT * FROM ai_models WHERE type = $1 AND is_active = true ORDER BY created_at DESC';
    const result = await this.pool.query(query, [type]);
    return result.rows.map(row => this.mapRowToAIModel(row));
  }

  async findActiveModels(): Promise<AIModel[]> {
    const query = 'SELECT * FROM ai_models WHERE is_active = true ORDER BY created_at DESC';
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToAIModel(row));
  }

  private mapRowToAIModel(row: any): AIModel {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      version: row.version,
      framework: row.framework,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      isActive: row.is_active
    };
  }

  private mapFieldToColumn(field: string): string {
    const fieldMap: Record<string, string> = {
      isActive: 'is_active',
      createdBy: 'created_by'
    };

    return fieldMap[field] || field;
  }

  private mapSortField(field: string): string {
    const sortMap: Record<string, string> = {
      createdAt: 'created_at'
    };

    return sortMap[field] || field;
  }
}