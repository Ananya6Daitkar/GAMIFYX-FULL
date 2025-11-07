import { Router } from 'express';
import { ModelPerformanceService } from '@/services/ModelPerformanceService';
import { AIModelRepository } from '@/repositories/AIModelRepository';
import { ModelMetricsRepository } from '@/repositories/ModelMetricsRepository';
import { validateBody, validateQuery } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { 
  createModelMetricsSchema, 
  metricsQuerySchema,
  trendQuerySchema,
  metricsCalculationSchema,
  regressionMetricsSchema
} from '@/validation/schemas';
import { pool } from '@/database/connection';
import Joi from 'joi';

const router = Router();
const aiModelRepository = new AIModelRepository(pool);
const modelMetricsRepository = new ModelMetricsRepository(pool);
const service = new ModelPerformanceService(aiModelRepository, modelMetricsRepository);

// POST /api/v1/metrics - Record new model metrics
router.post('/', 
  validateBody(createModelMetricsSchema),
  asyncHandler(async (req: any, res: any) => {
    const metrics = await service.recordMetrics(req.body);
    
    res.status(201).json({
      success: true,
      data: metrics,
      message: 'Model metrics recorded successfully'
    });
  })
);

// GET /api/v1/metrics - Get all metrics with filtering
router.get('/',
  validateQuery(metricsQuerySchema),
  asyncHandler(async (req: any, res: any) => {
    const result = await service.getAllMetrics(req.query);
    
    res.json({
      success: true,
      data: result.metrics,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  })
);

// GET /api/v1/metrics/:id - Get specific metrics
router.get('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req: any, res: any) => {
    const metrics = await service.getMetricsById(req.params.id);
    
    res.json({
      success: true,
      data: metrics
    });
  })
);

// GET /api/v1/metrics/model/:modelId - Get metrics for specific model
router.get('/model/:modelId',
  validateQuery(Joi.object({ modelId: Joi.string().uuid().required() })),
  asyncHandler(async (req: any, res: any) => {
    const metrics = await service.getModelMetrics(req.params.modelId);
    
    res.json({
      success: true,
      data: metrics
    });
  })
);

// GET /api/v1/metrics/model/:modelId/latest - Get latest metrics for model
router.get('/model/:modelId/latest',
  validateQuery(Joi.object({ modelId: Joi.string().uuid().required() })),
  asyncHandler(async (req: any, res: any) => {
    const metrics = await service.getLatestModelMetrics(req.params.modelId);
    
    res.json({
      success: true,
      data: metrics
    });
  })
);

// GET /api/v1/metrics/model/:modelId/trend - Get metrics trend
router.get('/model/:modelId/trend',
  validateQuery(trendQuerySchema),
  asyncHandler(async (req: any, res: any) => {
    const { modelId } = req.params;
    const { metricName = 'accuracy', days = 30 } = req.query;
    
    const trend = await service.getMetricsTrend(modelId, metricName, days);
    
    res.json({
      success: true,
      data: {
        modelId,
        metricName,
        period: `${days} days`,
        trend
      }
    });
  })
);

// POST /api/v1/metrics/calculate/classification - Calculate classification metrics
router.post('/calculate/classification',
  validateBody(metricsCalculationSchema),
  asyncHandler(async (req: any, res: any) => {
    const result = await service.calculateClassificationMetrics(req.body);
    
    res.json({
      success: true,
      data: result,
      message: 'Classification metrics calculated successfully'
    });
  })
);

// POST /api/v1/metrics/calculate/regression - Calculate regression metrics
router.post('/calculate/regression',
  validateBody(regressionMetricsSchema),
  asyncHandler(async (req: any, res: any) => {
    const { actualValues, predictedValues } = req.body;
    const result = await service.calculateRegressionMetrics(actualValues, predictedValues);
    
    res.json({
      success: true,
      data: result,
      message: 'Regression metrics calculated successfully'
    });
  })
);

// GET /api/v1/metrics/validation-methods - Get supported validation methods
router.get('/validation-methods',
  asyncHandler(async (req: any, res: any) => {
    const methods = await service.getValidationMethodologies();
    
    res.json({
      success: true,
      data: methods
    });
  })
);

export { router as metricsRouter };