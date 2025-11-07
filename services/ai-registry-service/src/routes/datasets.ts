import { Router } from 'express';
import { TrainingDatasetService } from '@/services/TrainingDatasetService';
import { TrainingDatasetRepository } from '@/repositories/TrainingDatasetRepository';
import { validateBody, validateQuery } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { 
  createTrainingDatasetSchema, 
  updateTrainingDatasetSchema, 
  datasetQuerySchema 
} from '@/validation/schemas';
import { pool } from '@/database/connection';
import Joi from 'joi';

const router = Router();
const repository = new TrainingDatasetRepository(pool);
const service = new TrainingDatasetService(repository);

// POST /api/v1/datasets - Register new training dataset
router.post('/', 
  validateBody(createTrainingDatasetSchema),
  asyncHandler(async (req, res) => {
    const dataset = await service.createDataset(req.body);
    
    res.status(201).json({
      success: true,
      data: dataset,
      message: 'Training dataset registered successfully'
    });
  })
);

// GET /api/v1/datasets - Get all training datasets with filtering
router.get('/',
  validateQuery(datasetQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await service.getAllDatasets(req.query as any);
    
    res.json({
      success: true,
      data: result.datasets,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  })
);

// GET /api/v1/datasets/:id - Get specific training dataset
router.get('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req, res) => {
    const dataset = await service.getDatasetById(req.params.id);
    
    res.json({
      success: true,
      data: dataset
    });
  })
);

// PUT /api/v1/datasets/:id - Update training dataset
router.put('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  validateBody(updateTrainingDatasetSchema),
  asyncHandler(async (req, res) => {
    const dataset = await service.updateDataset(req.params.id, req.body);
    
    res.json({
      success: true,
      data: dataset,
      message: 'Training dataset updated successfully'
    });
  })
);

// DELETE /api/v1/datasets/:id - Delete training dataset
router.delete('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req, res) => {
    await service.deleteDataset(req.params.id);
    
    res.json({
      success: true,
      message: 'Training dataset deleted successfully'
    });
  })
);

// POST /api/v1/datasets/:id/verify - Verify training dataset
router.post('/:id/verify',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  validateBody(Joi.object({ verifiedBy: Joi.string().required() })),
  asyncHandler(async (req, res) => {
    const dataset = await service.verifyDataset(req.params.id, req.body.verifiedBy);
    
    res.json({
      success: true,
      data: dataset,
      message: 'Training dataset verified successfully'
    });
  })
);

// GET /api/v1/datasets/source/:source - Get datasets by source
router.get('/source/:source',
  validateQuery(Joi.object({ 
    source: Joi.string().valid('Hugging Face', 'Kaggle', 'GitHub', 'Academic', 'Public Domain', 'Other').required() 
  })),
  asyncHandler(async (req, res) => {
    const datasets = await service.getDatasetsBySource(req.params.source);
    
    res.json({
      success: true,
      data: datasets
    });
  })
);

// GET /api/v1/datasets/verified - Get verified datasets
router.get('/status/verified',
  asyncHandler(async (req, res) => {
    const datasets = await service.getVerifiedDatasets();
    
    res.json({
      success: true,
      data: datasets
    });
  })
);

// GET /api/v1/datasets/domain/:domain - Get datasets by domain
router.get('/domain/:domain',
  validateQuery(Joi.object({ domain: Joi.string().required() })),
  asyncHandler(async (req, res) => {
    const datasets = await service.getDatasetsByDomain(req.params.domain);
    
    res.json({
      success: true,
      data: datasets
    });
  })
);

export { router as datasetsRouter };