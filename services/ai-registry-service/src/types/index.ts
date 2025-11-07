export interface AITechnology {
  id: string;
  name: string;
  type: 'LLM' | 'SLM' | 'ML' | 'Computer Vision' | 'NLP';
  version: string;
  provider: string;
  resourceType: 'Open Source' | 'Free Tier' | 'Community Edition';
  licenseTerms: string;
  deploymentDate: Date;
  status: 'Active' | 'Deprecated' | 'Testing';
  costStructure: 'Free' | 'Freemium' | 'Usage-Based Free Tier';
  description?: string;
  repositoryUrl?: string;
  documentationUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateAITechnologyRequest {
  name: string;
  type: 'LLM' | 'SLM' | 'ML' | 'Computer Vision' | 'NLP';
  version: string;
  provider: string;
  resourceType: 'Open Source' | 'Free Tier' | 'Community Edition';
  licenseTerms: string;
  costStructure: 'Free' | 'Freemium' | 'Usage-Based Free Tier';
  description?: string;
  repositoryUrl?: string;
  documentationUrl?: string;
  createdBy?: string;
}

export interface UpdateAITechnologyRequest {
  name?: string;
  type?: 'LLM' | 'SLM' | 'ML' | 'Computer Vision' | 'NLP';
  version?: string;
  provider?: string;
  resourceType?: 'Open Source' | 'Free Tier' | 'Community Edition';
  licenseTerms?: string;
  status?: 'Active' | 'Deprecated' | 'Testing';
  costStructure?: 'Free' | 'Freemium' | 'Usage-Based Free Tier';
  description?: string;
  repositoryUrl?: string;
  documentationUrl?: string;
  updatedBy?: string;
}

export interface TrainingDataset {
  id: string;
  name: string;
  source: 'Hugging Face' | 'Kaggle' | 'GitHub' | 'Academic' | 'Public Domain' | 'Other';
  sourceUrl?: string;
  licenseType: string;
  datasetSize?: number;
  datasetFormat?: string;
  description?: string;
  domain?: string;
  language?: string;
  qualityScore?: number | null;
  isVerified: boolean;
  verificationDate?: Date;
  verifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateTrainingDatasetRequest {
  name: string;
  source: 'Hugging Face' | 'Kaggle' | 'GitHub' | 'Academic' | 'Public Domain' | 'Other';
  sourceUrl?: string;
  licenseType: string;
  datasetSize?: number;
  datasetFormat?: string;
  description?: string;
  domain?: string;
  language?: string;
  qualityScore?: number;
  createdBy?: string;
}

export interface UpdateTrainingDatasetRequest {
  name?: string;
  source?: 'Hugging Face' | 'Kaggle' | 'GitHub' | 'Academic' | 'Public Domain' | 'Other';
  sourceUrl?: string;
  licenseType?: string;
  datasetSize?: number;
  datasetFormat?: string;
  description?: string;
  domain?: string;
  language?: string;
  qualityScore?: number;
  isVerified?: boolean;
  verificationDate?: Date;
  verifiedBy?: string;
  updatedBy?: string;
}

export interface TechnologyDatasetRelation {
  id: string;
  technologyId: string;
  datasetId: string;
  usageType: 'Training' | 'Validation' | 'Testing' | 'Fine-tuning';
  createdAt: Date;
}

export interface CreateTechnologyDatasetRelationRequest {
  technologyId: string;
  datasetId: string;
  usageType: 'Training' | 'Validation' | 'Testing' | 'Fine-tuning';
}

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedBy?: string;
  changedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Valid open source license types
export const VALID_OPEN_SOURCE_LICENSES = [
  'MIT',
  'Apache 2.0',
  'Apache-2.0',
  'GPL-2.0',
  'GPL-3.0',
  'LGPL-2.1',
  'LGPL-3.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MPL-2.0',
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'Unlicense'
] as const;

export type ValidOpenSourceLicense = typeof VALID_OPEN_SOURCE_LICENSES[number];