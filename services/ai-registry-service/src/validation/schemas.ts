import Joi from 'joi';
import { VALID_OPEN_SOURCE_LICENSES } from '@/types';

// AI Technology validation schemas
export const createAITechnologySchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid('LLM', 'SLM', 'ML', 'Computer Vision', 'NLP').required(),
  version: Joi.string().min(1).max(100).required(),
  provider: Joi.string().min(1).max(255).required(),
  resourceType: Joi.string().valid('Open Source', 'Free Tier', 'Community Edition').required(),
  licenseTerms: Joi.string().valid(...VALID_OPEN_SOURCE_LICENSES).required(),
  costStructure: Joi.string().valid('Free', 'Freemium', 'Usage-Based Free Tier').required(),
  description: Joi.string().max(2000).optional(),
  repositoryUrl: Joi.string().uri().max(500).optional(),
  documentationUrl: Joi.string().uri().max(500).optional(),
  createdBy: Joi.string().max(255).optional()
});

export const updateAITechnologySchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  type: Joi.string().valid('LLM', 'SLM', 'ML', 'Computer Vision', 'NLP').optional(),
  version: Joi.string().min(1).max(100).optional(),
  provider: Joi.string().min(1).max(255).optional(),
  resourceType: Joi.string().valid('Open Source', 'Free Tier', 'Community Edition').optional(),
  licenseTerms: Joi.string().valid(...VALID_OPEN_SOURCE_LICENSES).optional(),
  status: Joi.string().valid('Active', 'Deprecated', 'Testing').optional(),
  costStructure: Joi.string().valid('Free', 'Freemium', 'Usage-Based Free Tier').optional(),
  description: Joi.string().max(2000).optional(),
  repositoryUrl: Joi.string().uri().max(500).optional(),
  documentationUrl: Joi.string().uri().max(500).optional(),
  updatedBy: Joi.string().max(255).optional()
}).min(1); // At least one field must be provided

// Training Dataset validation schemas
export const createTrainingDatasetSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  source: Joi.string().valid('Hugging Face', 'Kaggle', 'GitHub', 'Academic', 'Public Domain', 'Other').required(),
  sourceUrl: Joi.string().uri().max(500).optional(),
  licenseType: Joi.string().min(1).max(100).required(),
  datasetSize: Joi.number().integer().min(0).optional(),
  datasetFormat: Joi.string().max(50).optional(),
  description: Joi.string().max(2000).optional(),
  domain: Joi.string().max(100).optional(),
  language: Joi.string().max(50).optional(),
  qualityScore: Joi.number().min(0).max(1).precision(2).optional(),
  createdBy: Joi.string().max(255).optional()
});

export const updateTrainingDatasetSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  source: Joi.string().valid('Hugging Face', 'Kaggle', 'GitHub', 'Academic', 'Public Domain', 'Other').optional(),
  sourceUrl: Joi.string().uri().max(500).optional(),
  licenseType: Joi.string().min(1).max(100).optional(),
  datasetSize: Joi.number().integer().min(0).optional(),
  datasetFormat: Joi.string().max(50).optional(),
  description: Joi.string().max(2000).optional(),
  domain: Joi.string().max(100).optional(),
  language: Joi.string().max(50).optional(),
  qualityScore: Joi.number().min(0).max(1).precision(2).optional(),
  isVerified: Joi.boolean().optional(),
  verificationDate: Joi.date().iso().optional(),
  verifiedBy: Joi.string().max(255).optional(),
  updatedBy: Joi.string().max(255).optional()
}).min(1); // At least one field must be provided

// Technology-Dataset relation validation schema
export const createTechnologyDatasetRelationSchema = Joi.object({
  technologyId: Joi.string().uuid().required(),
  datasetId: Joi.string().uuid().required(),
  usageType: Joi.string().valid('Training', 'Validation', 'Testing', 'Fine-tuning').required()
});

// Query parameter validation schemas
export const technologyQuerySchema = Joi.object({
  type: Joi.string().valid('LLM', 'SLM', 'ML', 'Computer Vision', 'NLP').optional(),
  status: Joi.string().valid('Active', 'Deprecated', 'Testing').optional(),
  provider: Joi.string().max(255).optional(),
  licenseTerms: Joi.string().valid(...VALID_OPEN_SOURCE_LICENSES).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('name', 'type', 'provider', 'deploymentDate', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const datasetQuerySchema = Joi.object({
  source: Joi.string().valid('Hugging Face', 'Kaggle', 'GitHub', 'Academic', 'Public Domain', 'Other').optional(),
  licenseType: Joi.string().max(100).optional(),
  domain: Joi.string().max(100).optional(),
  language: Joi.string().max(50).optional(),
  isVerified: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('name', 'source', 'datasetSize', 'qualityScore', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});