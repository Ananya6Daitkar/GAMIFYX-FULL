import { Router } from 'express';
import { ModelPerformanceService } from '@/services/ModelPerformanceService';
import { AIModelRepository } from '@/repositories/AIModelRepository';
import { ModelMetricsRepository } from '@/repositories/ModelMetricsRepository';
import { validateBody, validateQuery } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { 
  createAIModelSchema, 
  updateAIModelSchema, 
  modelQuerySchema 
} from '@/validation/schemas';
import { pool } from '@/database/connection';
import Joi from 'joi';

const router = Router();
const aiModelRepository = new AIModelRepository(pool);
const modelMetricsRepository = new ModelMetricsRepository(pool);
const service = new ModelPerformanceService(aiModelRepository, modelMetricsRepository);

// POST /api/v1/models - Create new AI model
router.post('/', 
  validateBody(createAIModelSchema),
  asyncHandler(async (req: any, res: any) => {
    const model = await service.createModel(req.body);
    
    res.status(201).json({
      success: true,
      data: model,
      message: 'AI model created successfully'
    });
  })
);

// GET /api/v1/models - Get all AI models with filtering
router.get('/',
  validateQuery(modelQuerySchema),
  asyncHandler(async (req: any, res: any) => {
    const result = await service.getAllModels(req.query);
    
    res.json({
      success: true,
      data: result.models,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  })
);

// GET /api/v1/models/:id - Get specific AI model
router.get('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req: any, res: any) => {
    const model = await service.getModelById(req.params.id);
    
    res.json({
      success: true,
      data: model
    });
  })
);

// PUT /api/v1/models/:id - Update AI model
router.put('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  validateBody(updateAIModelSchema),
  asyncHandler(async (req: any, res: any) => {
    const model = await service.updateModel(req.params.id, req.body);
    
    res.json({
      success: true,
      data: model,
      message: 'AI model updated successfully'
    });
  })
);

// DELETE /api/v1/models/:id - Delete AI model
router.delete('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req: any, res: any) => {
    await service.deleteModel(req.params.id);
    
    res.json({
      success: true,
      message: 'AI model deleted successfully'
    });
  })
);

// GET /api/v1/models/type/:type - Get models by type
router.get('/type/:type',
  validateQuery(Joi.object({ 
    type: Joi.string().valid('LLM', 'SLM', 'ML', 'Computer Vision', 'NLP').required() 
  })),
  asyncHandler(async (req: any, res: any) => {
    const models = await service.getModelsByType(req.params.type);
    
    res.json({
      success: true,
      data: models
    });
  })
);

// GET /api/v1/models/status/active - Get active models
router.get('/status/active',
  asyncHandler(async (req: any, res: any) => {
    const models = await service.getActiveModels();
    
    res.json({
      success: true,
      data: models
    });
  })
);

// GET /api/v1/models/:id/performance-report - Get model performance report
router.get('/:id/performance-report',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req: any, res: any) => {
    const report = await service.getModelPerformanceReport(req.params.id);
    
    res.json({
      success: true,
      data: report
    });
  })
);

// GET /api/v1/models/:id/performance-summary - Get model performance summary
router.get('/:id/performance-summary',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req: any, res: any) => {
    const summary = await service.getModelPerformanceSummary(req.params.id);
    
    res.json({
      success: true,
      data: summary
    });
  })
);

export { router as modelsRouter };