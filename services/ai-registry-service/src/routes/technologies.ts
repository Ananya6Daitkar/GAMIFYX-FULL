import { Router } from 'express';
import { AITechnologyService } from '@/services/AITechnologyService';
import { AITechnologyRepository } from '@/repositories/AITechnologyRepository';
import { validateBody, validateQuery } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { 
  createAITechnologySchema, 
  updateAITechnologySchema, 
  technologyQuerySchema 
} from '@/validation/schemas';
import { pool } from '@/database/connection';
import Joi from 'joi';

const router = Router();
const repository = new AITechnologyRepository(pool);
const service = new AITechnologyService(repository);

// Parameter validation schema
const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

// POST /api/v1/technologies - Register new AI technology
router.post('/', 
  validateBody(createAITechnologySchema),
  asyncHandler(async (req, res) => {
    const technology = await service.createTechnology(req.body);
    
    res.status(201).json({
      success: true,
      data: technology,
      message: 'AI technology registered successfully'
    });
  })
);

// GET /api/v1/technologies - Get all AI technologies with filtering
router.get('/',
  validateQuery(technologyQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await service.getAllTechnologies(req.query as any);
    
    res.json({
      success: true,
      data: result.technologies,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  })
);

// GET /api/v1/technologies/:id - Get specific AI technology
router.get('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req, res) => {
    const technology = await service.getTechnologyById(req.params.id);
    
    res.json({
      success: true,
      data: technology
    });
  })
);

// PUT /api/v1/technologies/:id - Update AI technology
router.put('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  validateBody(updateAITechnologySchema),
  asyncHandler(async (req, res) => {
    const technology = await service.updateTechnology(req.params.id, req.body);
    
    res.json({
      success: true,
      data: technology,
      message: 'AI technology updated successfully'
    });
  })
);

// DELETE /api/v1/technologies/:id - Delete AI technology
router.delete('/:id',
  validateQuery(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req, res) => {
    await service.deleteTechnology(req.params.id);
    
    res.json({
      success: true,
      message: 'AI technology deleted successfully'
    });
  })
);

// GET /api/v1/technologies/type/:type - Get technologies by type
router.get('/type/:type',
  validateQuery(Joi.object({ 
    type: Joi.string().valid('LLM', 'SLM', 'ML', 'Computer Vision', 'NLP').required() 
  })),
  asyncHandler(async (req, res) => {
    const technologies = await service.getTechnologiesByType(req.params.type);
    
    res.json({
      success: true,
      data: technologies
    });
  })
);

// GET /api/v1/technologies/provider/:provider - Get technologies by provider
router.get('/provider/:provider',
  validateQuery(Joi.object({ provider: Joi.string().required() })),
  asyncHandler(async (req, res) => {
    const technologies = await service.getTechnologiesByProvider(req.params.provider);
    
    res.json({
      success: true,
      data: technologies
    });
  })
);

// GET /api/v1/technologies/active - Get active technologies
router.get('/status/active',
  asyncHandler(async (req, res) => {
    const technologies = await service.getActiveTechnologies();
    
    res.json({
      success: true,
      data: technologies
    });
  })
);

export { router as technologiesRouter };