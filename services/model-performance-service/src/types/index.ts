export interface AIModel {
  id: string;
  name: string;
  type: 'LLM' | 'SLM' | 'ML' | 'Computer Vision' | 'NLP';
  version: string;
  framework?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  isActive: boolean;
}

export interface CreateAIModelRequest {
  name: string;
  type: 'LLM' | 'SLM' | 'ML' | 'Computer Vision' | 'NLP';
  version: string;
  framework?: string;
  description?: string;
  createdBy?: string;
}

export interface UpdateAIModelRequest {
  name?: string;
  type?: 'LLM' | 'SLM' | 'ML' | 'Computer Vision' | 'NLP';
  version?: string;
  framework?: string;
  description?: string;
  isActive?: boolean;
}

export interface ModelMetrics {
  id: string;
  modelId: string;
  accuracy?: number;
  precisionScore?: number;
  recallScore?: number;
  f1Score?: number;
  validationMethod: string;
  testDatasetName?: string;
  testDatasetSize?: number;
  trainingDurationMinutes?: number;
  inferenceTimeMs?: number;
  memoryUsageMb?: number;
  measurementDate: Date;
  validatedBy?: string;
  notes?: string;
  createdAt: Date;
}

export interface CreateModelMetricsRequest {
  modelId: string;
  accuracy?: number;
  precisionScore?: number;
  recallScore?: number;
  f1Score?: number;
  validationMethod: string;
  testDatasetName?: string;
  testDatasetSize?: number;
  trainingDurationMinutes?: number;
  inferenceTimeMs?: number;
  memoryUsageMb?: number;
  validatedBy?: string;
  notes?: string;
}

export interface PerformanceBenchmark {
  id: string;
  modelType: string;
  taskCategory: string;
  benchmarkName: string;
  minAccuracy?: number;
  targetAccuracy?: number;
  minPrecision?: number;
  targetPrecision?: number;
  minRecall?: number;
  targetRecall?: number;
  minF1Score?: number;
  targetF1Score?: number;
  maxInferenceTimeMs?: number;
  maxMemoryUsageMb?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  isActive: boolean;
}

export interface CreatePerformanceBenchmarkRequest {
  modelType: string;
  taskCategory: string;
  benchmarkName: string;
  minAccuracy?: number;
  targetAccuracy?: number;
  minPrecision?: number;
  targetPrecision?: number;
  minRecall?: number;
  targetRecall?: number;
  minF1Score?: number;
  targetF1Score?: number;
  maxInferenceTimeMs?: number;
  maxMemoryUsageMb?: number;
  createdBy?: string;
}

export interface PerformanceAlert {
  id: string;
  modelId: string;
  alertType: 'Performance Degradation' | 'Benchmark Failure' | 'Resource Limit' | 'Validation Error';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  message: string;
  metricName?: string;
  currentValue?: number;
  thresholdValue?: number;
  triggeredAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  status: 'Open' | 'Acknowledged' | 'Resolved' | 'Dismissed';
  resolutionNotes?: string;
}

export interface CreatePerformanceAlertRequest {
  modelId: string;
  alertType: 'Performance Degradation' | 'Benchmark Failure' | 'Resource Limit' | 'Validation Error';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  message: string;
  metricName?: string;
  currentValue?: number;
  thresholdValue?: number;
}

export interface ValidationMethodology {
  id: string;
  name: string;
  description: string;
  methodologyType: 'Cross Validation' | 'Holdout' | 'Bootstrap' | 'Time Series Split';
  parameters?: Record<string, any>;
  isStandard: boolean;
  createdAt: Date;
  createdBy?: string;
  isActive: boolean;
}

export interface ModelPerformanceTrend {
  id: string;
  modelId: string;
  metricName: string;
  trendPeriod: 'Daily' | 'Weekly' | 'Monthly';
  periodStart: Date;
  periodEnd: Date;
  avgValue?: number;
  minValue?: number;
  maxValue?: number;
  measurementCount: number;
  trendDirection?: 'Improving' | 'Stable' | 'Degrading';
  calculatedAt: Date;
}

export interface MetricsCalculationResult {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  specificity?: number;
  auc?: number;
  mse?: number;
  rmse?: number;
  mae?: number;
  r2Score?: number;
}

export interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export interface ModelPerformanceReport {
  model: AIModel;
  latestMetrics?: ModelMetrics;
  benchmarkComparison?: {
    benchmark: PerformanceBenchmark;
    meetsRequirements: boolean;
    gaps: string[];
  };
  trends: ModelPerformanceTrend[];
  activeAlerts: PerformanceAlert[];
  recommendations: string[];
}

// Validation method types
export const VALIDATION_METHODS = [
  'K-Fold Cross Validation',
  'Stratified K-Fold',
  'Hold-Out Validation',
  'Time Series Split',
  'Bootstrap Validation',
  'Leave-One-Out',
  'Monte Carlo Cross Validation'
] as const;

export type ValidValidationMethod = typeof VALIDATION_METHODS[number];

// Model types
export const MODEL_TYPES = ['LLM', 'SLM', 'ML', 'Computer Vision', 'NLP'] as const;
export type ValidModelType = typeof MODEL_TYPES[number];

// Task categories
export const TASK_CATEGORIES = [
  'Binary Classification',
  'Multi-class Classification',
  'Regression',
  'Text Classification',
  'Sentiment Analysis',
  'Named Entity Recognition',
  'Text Generation',
  'Image Classification',
  'Object Detection',
  'Semantic Segmentation',
  'Time Series Forecasting',
  'Clustering',
  'Anomaly Detection'
] as const;

export type ValidTaskCategory = typeof TASK_CATEGORIES[number];