import Joi from 'joi';
import { MODEL_TYPES, VALIDATION_METHODS, TASK_CATEGORIES } from '@/types';

// AI Model validation schemas
export const createAIModelSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid(...MODEL_TYPES).required(),
  version: Joi.string().min(1).max(100).required(),
  framework: Joi.string().max(100).optional(),
  description: Joi.string().max(2000).optional(),
  createdBy: Joi.string().max(255).optional()
});

export const updateAIModelSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  type: Joi.string().valid(...MODEL_TYPES).optional(),
  version: Joi.string().min(1).max(100).optional(),
  framework: Joi.string().max(100).optional(),
  description: Joi.string().max(2000).optional(),
  isActive: Joi.boolean().optional()
}).min(1);

// Model Metrics validation schemas
export const createModelMetricsSchema = Joi.object({
  modelId: Joi.string().uuid().required(),
  accuracy: Joi.number().min(0).max(1).precision(4).optional(),
  precisionScore: Joi.number().min(0).max(1).precision(4).optional(),
  recallScore: Joi.number().min(0).max(1).precision(4).optional(),
  f1Score: Joi.number().min(0).max(1).precision(4).optional(),
  validationMethod: Joi.string().valid(...VALIDATION_METHODS).required(),
  testDatasetName: Joi.string().max(255).optional(),
  testDatasetSize: Joi.number().integer().min(1).optional(),
  trainingDurationMinutes: Joi.number().integer().min(0).optional(),
  inferenceTimeMs: Joi.number().min(0).precision(3).optional(),
  memoryUsageMb: Joi.number().min(0).precision(2).optional(),
  validatedBy: Joi.string().max(255).optional(),
  notes: Joi.string().max(2000).optional()
});

// Performance Benchmark validation schemas
export const createPerformanceBenchmarkSchema = Joi.object({
  modelType: Joi.string().valid(...MODEL_TYPES).required(),
  taskCategory: Joi.string().valid(...TASK_CATEGORIES).required(),
  benchmarkName: Joi.string().min(1).max(255).required(),
  minAccuracy: Joi.number().min(0).max(1).precision(4).optional(),
  targetAccuracy: Joi.number().min(0).max(1).precision(4).optional(),
  minPrecision: Joi.number().min(0).max(1).precision(4).optional(),
  targetPrecision: Joi.number().min(0).max(1).precision(4).optional(),
  minRecall: Joi.number().min(0).max(1).precision(4).optional(),
  targetRecall: Joi.number().min(0).max(1).precision(4).optional(),
  minF1Score: Joi.number().min(0).max(1).precision(4).optional(),
  targetF1Score: Joi.number().min(0).max(1).precision(4).optional(),
  maxInferenceTimeMs: Joi.number().min(0).precision(3).optional(),
  maxMemoryUsageMb: Joi.number().min(0).precision(2).optional(),
  createdBy: Joi.string().max(255).optional()
});

export const updatePerformanceBenchmarkSchema = Joi.object({
  benchmarkName: Joi.string().min(1).max(255).optional(),
  minAccuracy: Joi.number().min(0).max(1).precision(4).optional(),
  targetAccuracy: Joi.number().min(0).max(1).precision(4).optional(),
  minPrecision: Joi.number().min(0).max(1).precision(4).optional(),
  targetPrecision: Joi.number().min(0).max(1).precision(4).optional(),
  minRecall: Joi.number().min(0).max(1).precision(4).optional(),
  targetRecall: Joi.number().min(0).max(1).precision(4).optional(),
  minF1Score: Joi.number().min(0).max(1).precision(4).optional(),
  targetF1Score: Joi.number().min(0).max(1).precision(4).optional(),
  maxInferenceTimeMs: Joi.number().min(0).precision(3).optional(),
  maxMemoryUsageMb: Joi.number().min(0).precision(2).optional(),
  isActive: Joi.boolean().optional()
}).min(1);

// Performance Alert validation schemas
export const createPerformanceAlertSchema = Joi.object({
  modelId: Joi.string().uuid().required(),
  alertType: Joi.string().valid('Performance Degradation', 'Benchmark Failure', 'Resource Limit', 'Validation Error').required(),
  severity: Joi.string().valid('Low', 'Medium', 'High', 'Critical').required(),
  message: Joi.string().min(1).max(1000).required(),
  metricName: Joi.string().max(100).optional(),
  currentValue: Joi.number().precision(4).optional(),
  thresholdValue: Joi.number().precision(4).optional()
});

export const updatePerformanceAlertSchema = Joi.object({
  status: Joi.string().valid('Open', 'Acknowledged', 'Resolved', 'Dismissed').optional(),
  resolvedBy: Joi.string().max(255).optional(),
  resolutionNotes: Joi.string().max(2000).optional()
}).min(1);

// Query parameter validation schemas
export const modelQuerySchema = Joi.object({
  type: Joi.string().valid(...MODEL_TYPES).optional(),
  framework: Joi.string().max(100).optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('name', 'type', 'version', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const metricsQuerySchema = Joi.object({
  modelId: Joi.string().uuid().optional(),
  validationMethod: Joi.string().valid(...VALIDATION_METHODS).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('measurementDate', 'accuracy', 'f1Score').default('measurementDate'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const benchmarkQuerySchema = Joi.object({
  modelType: Joi.string().valid(...MODEL_TYPES).optional(),
  taskCategory: Joi.string().valid(...TASK_CATEGORIES).optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('modelType', 'taskCategory', 'benchmarkName', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const alertQuerySchema = Joi.object({
  modelId: Joi.string().uuid().optional(),
  alertType: Joi.string().valid('Performance Degradation', 'Benchmark Failure', 'Resource Limit', 'Validation Error').optional(),
  severity: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional(),
  status: Joi.string().valid('Open', 'Acknowledged', 'Resolved', 'Dismissed').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('triggeredAt', 'severity', 'status').default('triggeredAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const trendQuerySchema = Joi.object({
  modelId: Joi.string().uuid().required(),
  metricName: Joi.string().valid('accuracy', 'precision_score', 'recall_score', 'f1_score', 'inference_time_ms', 'memory_usage_mb').optional(),
  trendPeriod: Joi.string().valid('Daily', 'Weekly', 'Monthly').default('Weekly'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});

// Metrics calculation validation
export const metricsCalculationSchema = Joi.object({
  truePositives: Joi.number().integer().min(0).required(),
  falsePositives: Joi.number().integer().min(0).required(),
  trueNegatives: Joi.number().integer().min(0).required(),
  falseNegatives: Joi.number().integer().min(0).required()
});

export const regressionMetricsSchema = Joi.object({
  actualValues: Joi.array().items(Joi.number()).min(1).required(),
  predictedValues: Joi.array().items(Joi.number()).min(1).required()
}).custom((value, helpers) => {
  if (value.actualValues.length !== value.predictedValues.length) {
    return helpers.error('array.length.mismatch');
  }
  return value;
});