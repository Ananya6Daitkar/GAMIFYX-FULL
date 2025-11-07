import { Router } from 'express';
import { TechnologyDatasetService } from '@/services/TechnologyDatasetService';
import { TechnologyDatasetRepository } from '@/repositories/TechnologyDatasetRepository';
import { validateBody, validateQuery } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { createTechnologyDatasetRelationSchema } from '@/validation/schemas';
import { pool } from '@/database/connection';
import Joi from 'joi';

const router = Router();
const repository = new TechnologyDatasetRepository(pool);
const service = new TechnologyDatasetService(repository);

// POST /api/v1/relations - Create technology-dataset relationship
router.post('/', 
  validateBody(createTechnologyDatasetRelationSchema),
  asyncHandler(async (req, res) => {
    const relation = await service.createRelation(req.body);
    
    res.status(201).json({
      success: true,
      data: relation,
      message: 'Technology-dataset relationship created successfully'
    });
  })
);

// GET /api/v1/relations - Get all relationships
router.get('/',
  asyncHandler(async (req, res) => {
    const relations = await service.getAllRelations();
    
    res.json({
      success: true,
      data: relations
    });
  })
);

// GET /api/v1/relations/technology/:technologyId - Get relationships by technology
router.get('/technology/:technologyId',
  validateQuery(Joi.object({ technologyId: Joi.string().uuid().required() })),
  asyncHandler(async (req, res) => {
    const relations = await service.getRelationsByTechnology(req.params.technologyId);
    
    res.json({
      success: true,
      data: relations
    });
  })
);

// GET /api/v1/relations/dataset/:datasetId - Get relationships by dataset
router.get('/dataset/:datasetId',
  validateQuery(Joi.object({ datasetId: Joi.string().uuid().required() })),
  asyncHandler(async (req, res) => {
    const relations = await service.getRelationsByDataset(req.params.datasetId);
    
    res.json({
      success: true,
      data: relations
    });
  })
);

// GET /api/v1/relations/provenance/:technologyId - Get dataset provenance for technology
router.get('/provenance/:technologyId',
  validateQuery(Joi.object({ technologyId: Joi.string().uuid().required() })),
  asyncHandler(async (req, res) => {
    const provenance = await service.getDatasetProvenanceForTechnology(req.params.technologyId);
    
    res.json({
      success: true,
      data: provenance
    });
  })
);

// GET /api/v1/relations/usage/:datasetId - Get technology usage for dataset
router.get('/usage/:datasetId',
  validateQuery(Joi.object({ datasetId: Joi.string().uuid().required() })),
  asyncHandler(async (req, res) => {
    const usage = await service.getTechnologyUsageForDataset(req.params.datasetId);
    
    res.json({
      success: true,
      data: usage
    });
  })
);

// DELETE /api/v1/relations/:id - Delete relationship by ID
router.delete('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req, res) => {
    await service.deleteRelation(req.params.id);
    
    res.json({
      success: true,
      message: 'Technology-dataset relationship deleted successfully'
    });
  })
);

// DELETE /api/v1/relations/technology/:technologyId/dataset/:datasetId - Delete specific relationship
router.delete('/technology/:technologyId/dataset/:datasetId',
  validateQuery(Joi.object({ 
    technologyId: Joi.string().uuid().required(),
    datasetId: Joi.string().uuid().required(),
    usageType: Joi.string().valid('Training', 'Validation', 'Testing', 'Fine-tuning').optional()
  })),
  asyncHandler(async (req, res) => {
    await service.deleteRelationByTechnologyAndDataset(
      req.params.technologyId, 
      req.params.datasetId,
      req.query.usageType as string
    );
    
    res.json({
      success: true,
      message: 'Technology-dataset relationship deleted successfully'
    });
  })
);

export { router as relationsRouter };