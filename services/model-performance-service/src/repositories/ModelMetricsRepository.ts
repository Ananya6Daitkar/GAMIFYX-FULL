import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  ModelMetrics, 
  CreateModelMetricsRequest 
} from '@/types';
import { NotFoundError } from '@/middleware/errorHandler';

export class ModelMetricsRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateModelMetricsRequest): Promise<ModelMetrics> {
    const id = uuidv4();
    
    // Verify model exists
    const modelCheck = await this.pool.query('SELECT id FROM ai_models WHERE id = $1', [data.modelId]);
    if (modelCheck.rows.length === 0) {
      throw new NotFoundError('AI Model not found');
    }

    const query = `
      INSERT INTO model_metrics (
        id, model_id, accuracy, precision_score, recall_score, f1_score,
        validation_method, test_dataset_name, test_dataset_size,
        training_duration_minutes, inference_time_ms, memory_usage_mb,
        validated_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      id,
      data.modelId,
      data.accuracy || null,
      data.precisionScore || null,
      data.recallScore || null,
      data.f1Score || null,
      data.validationMethod,
      data.testDatasetName || null,
      data.testDatasetSize || null,
      data.trainingDurationMinutes || null,
      data.inferenceTimeMs || null,
      data.memoryUsageMb || null,
      data.validatedBy || null,
      data.notes || null
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToModelMetrics(result.rows[0]);
  }

  async findById(id: string): Promise<ModelMetrics | null> {
    const query = 'SELECT * FROM model_metrics WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToModelMetrics(result.rows[0]);
  }

  async findByModelId(modelId: string): Promise<ModelMetrics[]> {
    const query = `
      SELECT * FROM model_metrics 
      WHERE model_id = $1 
      ORDER BY measurement_date DESC
    `;
    const result = await this.pool.query(query, [modelId]);
    return result.rows.map(row => this.mapRowToModelMetrics(row));
  }

  async findLatestByModelId(modelId: string): Promise<ModelMetrics | null> {
    const query = `
      SELECT * FROM model_metrics 
      WHERE model_id = $1 
      ORDER BY measurement_date DESC 
      LIMIT 1
    `;
    const result = await this.pool.query(query, [modelId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToModelMetrics(result.rows[0]);
  }

  async findAll(filters: {
    modelId?: string;
    validationMethod?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ metrics: ModelMetrics[]; total: number }> {
    const {
      modelId,
      validationMethod,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'measurement_date',
      sortOrder = 'desc'
    } = filters;

    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (modelId) {
      whereClause += ` AND model_id = $${++paramCount}`;
      values.push(modelId);
    }

    if (validationMethod) {
      whereClause += ` AND validation_method = $${++paramCount}`;
      values.push(validationMethod);
    }

    if (startDate) {
      whereClause += ` AND measurement_date >= $${++paramCount}`;
      values.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND measurement_date <= $${++paramCount}`;
      values.push(endDate);
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM model_metrics ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query with pagination
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT * FROM model_metrics 
      ${whereClause}
      ORDER BY ${this.mapSortField(sortBy)} ${sortOrder.toUpperCase()}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    values.push(limit, offset);

    const dataResult = await this.pool.query(dataQuery, values);
    const metrics = dataResult.rows.map(row => this.mapRowToModelMetrics(row));

    return { metrics, total };
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM model_metrics WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getMetricsTrend(
    modelId: string, 
    metricName: string, 
    days: number = 30
  ): Promise<{ date: Date; value: number }[]> {
    const query = `
      SELECT 
        DATE(measurement_date) as date,
        AVG(${this.mapMetricNameToColumn(metricName)}) as value
      FROM model_metrics 
      WHERE model_id = $1 
        AND ${this.mapMetricNameToColumn(metricName)} IS NOT NULL
        AND measurement_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(measurement_date)
      ORDER BY date ASC
    `;

    const result = await this.pool.query(query, [modelId]);
    return result.rows.map(row => ({
      date: row.date,
      value: parseFloat(row.value)
    }));
  }

  async getModelPerformanceSummary(modelId: string): Promise<{
    totalMeasurements: number;
    latestAccuracy?: number;
    avgAccuracy?: number;
    latestF1Score?: number;
    avgF1Score?: number;
    lastMeasurementDate?: Date;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_measurements,
        AVG(accuracy) as avg_accuracy,
        AVG(f1_score) as avg_f1_score,
        MAX(measurement_date) as last_measurement_date
      FROM model_metrics 
      WHERE model_id = $1
    `;

    const result = await this.pool.query(query, [modelId]);
    const row = result.rows[0];

    // Get latest metrics
    const latestQuery = `
      SELECT accuracy, f1_score 
      FROM model_metrics 
      WHERE model_id = $1 
      ORDER BY measurement_date DESC 
      LIMIT 1
    `;
    const latestResult = await this.pool.query(latestQuery, [modelId]);
    const latest = latestResult.rows[0];

    return {
      totalMeasurements: parseInt(row.total_measurements),
      avgAccuracy: row.avg_accuracy ? parseFloat(row.avg_accuracy) : undefined,
      avgF1Score: row.avg_f1_score ? parseFloat(row.avg_f1_score) : undefined,
      lastMeasurementDate: row.last_measurement_date,
      latestAccuracy: latest?.accuracy ? parseFloat(latest.accuracy) : undefined,
      latestF1Score: latest?.f1_score ? parseFloat(latest.f1_score) : undefined
    };
  }

  private mapRowToModelMetrics(row: any): ModelMetrics {
    return {
      id: row.id,
      modelId: row.model_id,
      accuracy: row.accuracy ? parseFloat(row.accuracy) : undefined,
      precisionScore: row.precision_score ? parseFloat(row.precision_score) : undefined,
      recallScore: row.recall_score ? parseFloat(row.recall_score) : undefined,
      f1Score: row.f1_score ? parseFloat(row.f1_score) : undefined,
      validationMethod: row.validation_method,
      testDatasetName: row.test_dataset_name,
      testDatasetSize: row.test_dataset_size,
      trainingDurationMinutes: row.training_duration_minutes,
      inferenceTimeMs: row.inference_time_ms ? parseFloat(row.inference_time_ms) : undefined,
      memoryUsageMb: row.memory_usage_mb ? parseFloat(row.memory_usage_mb) : undefined,
      measurementDate: row.measurement_date,
      validatedBy: row.validated_by,
      notes: row.notes,
      createdAt: row.created_at
    };
  }

  private mapSortField(field: string): string {
    const sortMap: Record<string, string> = {
      measurementDate: 'measurement_date',
      f1Score: 'f1_score'
    };

    return sortMap[field] || field;
  }

  private mapMetricNameToColumn(metricName: string): string {
    const metricMap: Record<string, string> = {
      accuracy: 'accuracy',
      precision_score: 'precision_score',
      recall_score: 'recall_score',
      f1_score: 'f1_score',
      inference_time_ms: 'inference_time_ms',
      memory_usage_mb: 'memory_usage_mb'
    };

    return metricMap[metricName] || metricName;
  }
}