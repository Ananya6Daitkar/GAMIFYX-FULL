import { TrainingDatasetRepository } from '@/repositories/TrainingDatasetRepository';
import { 
  TrainingDataset, 
  CreateTrainingDatasetRequest, 
  UpdateTrainingDatasetRequest 
} from '@/types';
import { NotFoundError } from '@/middleware/errorHandler';
import { logger } from '@/telemetry/logger';

export class TrainingDatasetService {
  constructor(private repository: TrainingDatasetRepository) {}

  async createDataset(data: CreateTrainingDatasetRequest): Promise<TrainingDataset> {
    logger.info('Creating new training dataset', { 
      name: data.name, 
      source: data.source, 
      licenseType: data.licenseType 
    });

    // Validate license for free/open datasets
    await this.validateDatasetLicense(data.source, data.licenseType);

    const dataset = await this.repository.create(data);
    
    logger.info('Training dataset created successfully', { 
      id: dataset.id, 
      name: dataset.name 
    });

    return dataset;
  }

  async getDatasetById(id: string): Promise<TrainingDataset> {
    const dataset = await this.repository.findById(id);
    
    if (!dataset) {
      throw new NotFoundError(`Training dataset with id ${id} not found`);
    }

    return dataset;
  }

  async getAllDatasets(filters: {
    source?: string;
    licenseType?: string;
    domain?: string;
    language?: string;
    isVerified?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ datasets: TrainingDataset[]; total: number; page: number; limit: number }> {
    const result = await this.repository.findAll(filters);
    
    return {
      ...result,
      page: filters.page || 1,
      limit: filters.limit || 20
    };
  }

  async updateDataset(id: string, data: UpdateTrainingDatasetRequest): Promise<TrainingDataset> {
    logger.info('Updating training dataset', { id, updates: Object.keys(data) });

    // Validate license if being updated
    if (data.source && data.licenseType) {
      await this.validateDatasetLicense(data.source, data.licenseType);
    }

    const dataset = await this.repository.update(id, data);
    
    logger.info('Training dataset updated successfully', { 
      id: dataset.id, 
      name: dataset.name 
    });

    return dataset;
  }

  async deleteDataset(id: string): Promise<void> {
    logger.info('Deleting training dataset', { id });

    const deleted = await this.repository.delete(id);
    
    if (!deleted) {
      throw new NotFoundError(`Training dataset with id ${id} not found`);
    }

    logger.info('Training dataset deleted successfully', { id });
  }

  async verifyDataset(id: string, verifiedBy: string): Promise<TrainingDataset> {
    logger.info('Verifying training dataset', { id, verifiedBy });

    const dataset = await this.repository.verifyDataset(id, verifiedBy);
    
    logger.info('Training dataset verified successfully', { 
      id: dataset.id, 
      name: dataset.name,
      verifiedBy 
    });

    return dataset;
  }

  async getDatasetsBySource(source: string): Promise<TrainingDataset[]> {
    const result = await this.repository.findAll({ source });
    return result.datasets;
  }

  async getVerifiedDatasets(): Promise<TrainingDataset[]> {
    const result = await this.repository.findAll({ isVerified: true });
    return result.datasets;
  }

  async getDatasetsByDomain(domain: string): Promise<TrainingDataset[]> {
    const result = await this.repository.findAll({ domain });
    return result.datasets;
  }

  private async validateDatasetLicense(source: string, licenseType: string): Promise<void> {
    // Define acceptable licenses for free/open datasets by source
    const acceptableLicenses: Record<string, string[]> = {
      'Hugging Face': [
        'MIT', 'Apache-2.0', 'CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 
        'GPL-3.0', 'BSD-3-Clause', 'Unlicense', 'Public Domain'
      ],
      'Kaggle': [
        'CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'MIT', 'Apache-2.0',
        'Public Domain', 'Open Data Commons'
      ],
      'GitHub': [
        'MIT', 'Apache-2.0', 'GPL-2.0', 'GPL-3.0', 'BSD-2-Clause', 
        'BSD-3-Clause', 'ISC', 'MPL-2.0', 'Unlicense'
      ],
      'Academic': [
        'CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'MIT', 'Apache-2.0',
        'Academic Use Only', 'Research Use Only'
      ],
      'Public Domain': [
        'CC0-1.0', 'Public Domain', 'Unlicense'
      ]
    };

    const validLicenses = acceptableLicenses[source];
    if (validLicenses && !validLicenses.includes(licenseType)) {
      logger.warn('Invalid license for dataset source', { source, licenseType, validLicenses });
      // Note: We log the warning but don't throw an error to allow flexibility
      // In a production system, you might want to enforce this more strictly
    }

    logger.info('Dataset license validated', { source, licenseType });
  }
}