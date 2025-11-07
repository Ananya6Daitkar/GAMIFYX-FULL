import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  AITechnology, 
  CreateAITechnologyRequest, 
  UpdateAITechnologyRequest 
} from '@/types';
import { NotFoundError, ConflictError } from '@/middleware/errorHandler';

export class AITechnologyRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateAITechnologyRequest): Promise<AITechnology> {
    const id = uuidv4();
    const query = `
      INSERT INTO ai_technologies (
        id, name, type, version, provider, resource_type, license_terms,
        cost_structure, description, repository_url, documentation_url, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      id,
      data.name,
      data.type,
      data.version,
      data.provider,
      data.resourceType,
      data.licenseTerms,
      data.costStructure,
      data.description || null,
      data.repositoryUrl || null,
      data.documentationUrl || null,
      data.createdBy || null
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToAITechnology(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictError('AI Technology with this name and version already exists');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<AITechnology | null> {
    const query = 'SELECT * FROM ai_technologies WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAITechnology(result.rows[0]);
  }

  async findAll(filters: {
    type?: string;
    status?: string;
    provider?: string;
    licenseTerms?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ technologies: AITechnology[]; total: number }> {
    const {
      type,
      status,
      provider,
      licenseTerms,
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

    if (status) {
      whereClause += ` AND status = $${++paramCount}`;
      values.push(status);
    }

    if (provider) {
      whereClause += ` AND provider ILIKE $${++paramCount}`;
      values.push(`%${provider}%`);
    }

    if (licenseTerms) {
      whereClause += ` AND license_terms = $${++paramCount}`;
      values.push(licenseTerms);
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM ai_technologies ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query with pagination
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT * FROM ai_technologies 
      ${whereClause}
      ORDER BY ${this.mapSortField(sortBy)} ${sortOrder.toUpperCase()}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    values.push(limit, offset);

    const dataResult = await this.pool.query(dataQuery, values);
    const technologies = dataResult.rows.map(row => this.mapRowToAITechnology(row));

    return { technologies, total };
  }

  async update(id: string, data: UpdateAITechnologyRequest): Promise<AITechnology> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError('AI Technology not found');
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
      UPDATE ai_technologies 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToAITechnology(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictError('AI Technology with this name and version already exists');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM ai_technologies WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRowToAITechnology(row: any): AITechnology {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      version: row.version,
      provider: row.provider,
      resourceType: row.resource_type,
      licenseTerms: row.license_terms,
      deploymentDate: row.deployment_date,
      status: row.status,
      costStructure: row.cost_structure,
      description: row.description,
      repositoryUrl: row.repository_url,
      documentationUrl: row.documentation_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }

  private mapFieldToColumn(field: string): string {
    const fieldMap: Record<string, string> = {
      resourceType: 'resource_type',
      licenseTerms: 'license_terms',
      costStructure: 'cost_structure',
      repositoryUrl: 'repository_url',
      documentationUrl: 'documentation_url',
      createdBy: 'created_by',
      updatedBy: 'updated_by'
    };

    return fieldMap[field] || field;
  }

  private mapSortField(field: string): string {
    const sortMap: Record<string, string> = {
      deploymentDate: 'deployment_date',
      createdAt: 'created_at'
    };

    return sortMap[field] || field;
  }
}