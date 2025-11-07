import { AIModelRepository } from '@/repositories/AIModelRepository';
import { ModelMetricsRepository } from '@/repositories/ModelMetricsRepository';
import { MetricsCalculator } from '@/utils/metricsCalculator';
import { 
  AIModel, 
  CreateAIModelRequest, 
  UpdateAIModelRequest,
  ModelMetrics,
  CreateModelMetricsRequest,
  ModelPerformanceReport,
  ConfusionMatrix,
  MetricsCalculationResult
} from '@/types';
import { NotFoundError } from '@/middleware/errorHandler';
import { logger } from '@/telemetry/logger';

export class ModelPerformanceService {
  constructor(
    private aiModelRepository: AIModelRepository,
    private modelMetricsRepository: ModelMetricsRepository
  ) {}

  // AI Model Management
  async createModel(data: CreateAIModelRequest): Promise<AIModel> {
    logger.info('Creating new AI model', { 
      name: data.name, 
      type: data.type, 
      version: data.version 
    });

    const model = await this.aiModelRepository.create(data);
    
    logger.info('AI model created successfully', { 
      id: model.id, 
      name: model.name 
    });

    return model;
  }

  async getModelById(id: string): Promise<AIModel> {
    const model = await this.aiModelRepository.findById(id);
    
    if (!model) {
      throw new NotFoundError(`AI Model with id ${id} not found`);
    }

    return model;
  }

  async getAllModels(filters: {
    type?: string;
    framework?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ models: AIModel[]; total: number; page: number; limit: number }> {
    const result = await this.aiModelRepository.findAll(filters);
    
    return {
      ...result,
      page: filters.page || 1,
      limit: filters.limit || 20
    };
  }

  async updateModel(id: string, data: UpdateAIModelRequest): Promise<AIModel> {
    logger.info('Updating AI model', { id, updates: Object.keys(data) });

    const model = await this.aiModelRepository.update(id, data);
    
    logger.info('AI model updated successfully', { 
      id: model.id, 
      name: model.name 
    });

    return model;
  }

  async deleteModel(id: string): Promise<void> {
    logger.info('Deleting AI model', { id });

    const deleted = await this.aiModelRepository.delete(id);
    
    if (!deleted) {
      throw new NotFoundError(`AI Model with id ${id} not found`);
    }

    logger.info('AI model deleted successfully', { id });
  }

  // Metrics Management
  async recordMetrics(data: CreateModelMetricsRequest): Promise<ModelMetrics> {
    logger.info('Recording model metrics', { 
      modelId: data.modelId, 
      validationMethod: data.validationMethod 
    });

    // Verify model exists
    await this.getModelById(data.modelId);

    const metrics = await this.modelMetricsRepository.create(data);
    
    logger.info('Model metrics recorded successfully', { 
      id: metrics.id, 
      modelId: metrics.modelId 
    });

    return metrics;
  }

  async getMetricsById(id: string): Promise<ModelMetrics> {
    const metrics = await this.modelMetricsRepository.findById(id);
    
    if (!metrics) {
      throw new NotFoundError(`Model metrics with id ${id} not found`);
    }

    return metrics;
  }

  async getModelMetrics(modelId: string): Promise<ModelMetrics[]> {
    // Verify model exists
    await this.getModelById(modelId);

    return await this.modelMetricsRepository.findByModelId(modelId);
  }

  async getLatestModelMetrics(modelId: string): Promise<ModelMetrics | null> {
    // Verify model exists
    await this.getModelById(modelId);

    return await this.modelMetricsRepository.findLatestByModelId(modelId);
  }

  async getAllMetrics(filters: {
    modelId?: string;
    validationMethod?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ metrics: ModelMetrics[]; total: number; page: number; limit: number }> {
    const result = await this.modelMetricsRepository.findAll(filters);
    
    return {
      ...result,
      page: filters.page || 1,
      limit: filters.limit || 20
    };
  }

  // Metrics Calculation
  async calculateClassificationMetrics(confusionMatrix: ConfusionMatrix): Promise<MetricsCalculationResult> {
    logger.info('Calculating classification metrics', { confusionMatrix });

    try {
      const result = MetricsCalculator.calculateClassificationMetrics(confusionMatrix);
      
      logger.info('Classification metrics calculated successfully', { result });
      
      return result;
    } catch (error) {
      logger.error('Error calculating classification metrics', { error, confusionMatrix });
      throw error;
    }
  }

  async calculateRegressionMetrics(actualValues: number[], predictedValues: number[]): Promise<MetricsCalculationResult> {
    logger.info('Calculating regression metrics', { 
      actualCount: actualValues.length, 
      predictedCount: predictedValues.length 
    });

    try {
      const result = MetricsCalculator.calculateRegressionMetrics(actualValues, predictedValues);
      
      logger.info('Regression metrics calculated successfully', { result });
      
      return result;
    } catch (error) {
      logger.error('Error calculating regression metrics', { error });
      throw error;
    }
  }

  // Performance Analysis
  async getModelPerformanceReport(modelId: string): Promise<ModelPerformanceReport> {
    logger.info('Generating model performance report', { modelId });

    const model = await this.getModelById(modelId);
    const latestMetrics = await this.getLatestModelMetrics(modelId);
    const summary = await this.modelMetricsRepository.getModelPerformanceSummary(modelId);

    // Generate recommendations based on performance
    const recommendations: string[] = [];
    
    if (latestMetrics) {
      if (latestMetrics.accuracy && latestMetrics.accuracy < 0.8) {
        recommendations.push('Consider improving model accuracy through feature engineering or hyperparameter tuning');
      }
      
      if (latestMetrics.f1Score && latestMetrics.f1Score < 0.75) {
        recommendations.push('F1 score indicates potential class imbalance - consider data balancing techniques');
      }
      
      if (latestMetrics.inferenceTimeMs && latestMetrics.inferenceTimeMs > 1000) {
        recommendations.push('High inference time detected - consider model optimization or quantization');
      }
      
      if (latestMetrics.memoryUsageMb && latestMetrics.memoryUsageMb > 4096) {
        recommendations.push('High memory usage - consider model compression techniques');
      }
    }

    if (summary.totalMeasurements < 5) {
      recommendations.push('Increase validation frequency to better track model performance trends');
    }

    const report: ModelPerformanceReport = {
      model,
      latestMetrics: latestMetrics || undefined,
      trends: [], // TODO: Implement trend calculation
      activeAlerts: [], // TODO: Implement alert system
      recommendations
    };

    logger.info('Model performance report generated', { 
      modelId, 
      hasLatestMetrics: !!latestMetrics,
      recommendationCount: recommendations.length 
    });

    return report;
  }

  async getMetricsTrend(
    modelId: string, 
    metricName: string, 
    days: number = 30
  ): Promise<{ date: Date; value: number }[]> {
    logger.info('Getting metrics trend', { modelId, metricName, days });

    // Verify model exists
    await this.getModelById(modelId);

    const trend = await this.modelMetricsRepository.getMetricsTrend(modelId, metricName, days);
    
    logger.info('Metrics trend retrieved', { 
      modelId, 
      metricName, 
      dataPoints: trend.length 
    });

    return trend;
  }

  async getModelsByType(type: string): Promise<AIModel[]> {
    return await this.aiModelRepository.findByType(type);
  }

  async getActiveModels(): Promise<AIModel[]> {
    return await this.aiModelRepository.findActiveModels();
  }

  async getModelPerformanceSummary(modelId: string): Promise<{
    totalMeasurements: number;
    latestAccuracy?: number;
    avgAccuracy?: number;
    latestF1Score?: number;
    avgF1Score?: number;
    lastMeasurementDate?: Date;
  }> {
    // Verify model exists
    await this.getModelById(modelId);

    return await this.modelMetricsRepository.getModelPerformanceSummary(modelId);
  }

  // Validation Methods
  async getValidationMethodologies(): Promise<string[]> {
    // Return supported validation methods
    return [
      'K-Fold Cross Validation',
      'Stratified K-Fold',
      'Hold-Out Validation',
      'Time Series Split',
      'Bootstrap Validation',
      'Leave-One-Out',
      'Monte Carlo Cross Validation'
    ];
  }

  // Utility Methods
  async validateModelExists(modelId: string): Promise<void> {
    await this.getModelById(modelId);
  }
}