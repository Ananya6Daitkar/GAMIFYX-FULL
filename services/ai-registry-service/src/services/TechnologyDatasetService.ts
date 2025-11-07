import { TechnologyDatasetRepository } from '@/repositories/TechnologyDatasetRepository';
import { 
  TechnologyDatasetRelation, 
  CreateTechnologyDatasetRelationRequest 
} from '@/types';
import { NotFoundError } from '@/middleware/errorHandler';
import { logger } from '@/telemetry/logger';

export class TechnologyDatasetService {
  constructor(private repository: TechnologyDatasetRepository) {}

  async createRelation(data: CreateTechnologyDatasetRelationRequest): Promise<TechnologyDatasetRelation> {
    logger.info('Creating technology-dataset relationship', { 
      technologyId: data.technologyId, 
      datasetId: data.datasetId, 
      usageType: data.usageType 
    });

    const relation = await this.repository.create(data);
    
    logger.info('Technology-dataset relationship created successfully', { 
      id: relation.id,
      technologyId: relation.technologyId,
      datasetId: relation.datasetId
    });

    return relation;
  }

  async getRelationsByTechnology(technologyId: string): Promise<TechnologyDatasetRelation[]> {
    const relations = await this.repository.findByTechnologyId(technologyId);
    
    logger.info('Retrieved technology-dataset relationships by technology', { 
      technologyId, 
      count: relations.length 
    });

    return relations;
  }

  async getRelationsByDataset(datasetId: string): Promise<TechnologyDatasetRelation[]> {
    const relations = await this.repository.findByDatasetId(datasetId);
    
    logger.info('Retrieved technology-dataset relationships by dataset', { 
      datasetId, 
      count: relations.length 
    });

    return relations;
  }

  async getAllRelations(): Promise<TechnologyDatasetRelation[]> {
    const relations = await this.repository.findAll();
    
    logger.info('Retrieved all technology-dataset relationships', { 
      count: relations.length 
    });

    return relations;
  }

  async deleteRelation(id: string): Promise<void> {
    logger.info('Deleting technology-dataset relationship', { id });

    const deleted = await this.repository.delete(id);
    
    if (!deleted) {
      throw new NotFoundError(`Technology-dataset relationship with id ${id} not found`);
    }

    logger.info('Technology-dataset relationship deleted successfully', { id });
  }

  async deleteRelationByTechnologyAndDataset(
    technologyId: string, 
    datasetId: string, 
    usageType?: string
  ): Promise<void> {
    logger.info('Deleting technology-dataset relationship by IDs', { 
      technologyId, 
      datasetId, 
      usageType 
    });

    const deleted = await this.repository.deleteByTechnologyAndDataset(technologyId, datasetId, usageType);
    
    if (!deleted) {
      throw new NotFoundError('Technology-dataset relationship not found');
    }

    logger.info('Technology-dataset relationship deleted successfully', { 
      technologyId, 
      datasetId, 
      usageType 
    });
  }

  async getDatasetProvenanceForTechnology(technologyId: string): Promise<{
    technologyId: string;
    datasets: {
      training: TechnologyDatasetRelation[];
      validation: TechnologyDatasetRelation[];
      testing: TechnologyDatasetRelation[];
      fineTuning: TechnologyDatasetRelation[];
    };
  }> {
    const relations = await this.repository.findByTechnologyId(technologyId);
    
    const provenance = {
      technologyId,
      datasets: {
        training: relations.filter(r => r.usageType === 'Training'),
        validation: relations.filter(r => r.usageType === 'Validation'),
        testing: relations.filter(r => r.usageType === 'Testing'),
        fineTuning: relations.filter(r => r.usageType === 'Fine-tuning')
      }
    };

    logger.info('Retrieved dataset provenance for technology', { 
      technologyId,
      trainingCount: provenance.datasets.training.length,
      validationCount: provenance.datasets.validation.length,
      testingCount: provenance.datasets.testing.length,
      fineTuningCount: provenance.datasets.fineTuning.length
    });

    return provenance;
  }

  async getTechnologyUsageForDataset(datasetId: string): Promise<{
    datasetId: string;
    usages: {
      training: TechnologyDatasetRelation[];
      validation: TechnologyDatasetRelation[];
      testing: TechnologyDatasetRelation[];
      fineTuning: TechnologyDatasetRelation[];
    };
  }> {
    const relations = await this.repository.findByDatasetId(datasetId);
    
    const usage = {
      datasetId,
      usages: {
        training: relations.filter(r => r.usageType === 'Training'),
        validation: relations.filter(r => r.usageType === 'Validation'),
        testing: relations.filter(r => r.usageType === 'Testing'),
        fineTuning: relations.filter(r => r.usageType === 'Fine-tuning')
      }
    };

    logger.info('Retrieved technology usage for dataset', { 
      datasetId,
      trainingCount: usage.usages.training.length,
      validationCount: usage.usages.validation.length,
      testingCount: usage.usages.testing.length,
      fineTuningCount: usage.usages.fineTuning.length
    });

    return usage;
  }
}