import { AITechnologyRepository } from '@/repositories/AITechnologyRepository';
import { 
  AITechnology, 
  CreateAITechnologyRequest, 
  UpdateAITechnologyRequest 
} from '@/types';
import { NotFoundError } from '@/middleware/errorHandler';
import { logger } from '@/telemetry/logger';

export class AITechnologyService {
  constructor(private repository: AITechnologyRepository) {}

  async createTechnology(data: CreateAITechnologyRequest): Promise<AITechnology> {
    logger.info('Creating new AI technology', { 
      name: data.name, 
      type: data.type, 
      provider: data.provider 
    });

    const technology = await this.repository.create(data);
    
    logger.info('AI technology created successfully', { 
      id: technology.id, 
      name: technology.name 
    });

    return technology;
  }

  async getTechnologyById(id: string): Promise<AITechnology> {
    const technology = await this.repository.findById(id);
    
    if (!technology) {
      throw new NotFoundError(`AI Technology with id ${id} not found`);
    }

    return technology;
  }

  async getAllTechnologies(filters: {
    type?: string;
    status?: string;
    provider?: string;
    licenseTerms?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ technologies: AITechnology[]; total: number; page: number; limit: number }> {
    const result = await this.repository.findAll(filters);
    
    return {
      ...result,
      page: filters.page || 1,
      limit: filters.limit || 20
    };
  }

  async updateTechnology(id: string, data: UpdateAITechnologyRequest): Promise<AITechnology> {
    logger.info('Updating AI technology', { id, updates: Object.keys(data) });

    const technology = await this.repository.update(id, data);
    
    logger.info('AI technology updated successfully', { 
      id: technology.id, 
      name: technology.name 
    });

    return technology;
  }

  async deleteTechnology(id: string): Promise<void> {
    logger.info('Deleting AI technology', { id });

    const deleted = await this.repository.delete(id);
    
    if (!deleted) {
      throw new NotFoundError(`AI Technology with id ${id} not found`);
    }

    logger.info('AI technology deleted successfully', { id });
  }

  async getTechnologiesByType(type: string): Promise<AITechnology[]> {
    const result = await this.repository.findAll({ type });
    return result.technologies;
  }

  async getTechnologiesByProvider(provider: string): Promise<AITechnology[]> {
    const result = await this.repository.findAll({ provider });
    return result.technologies;
  }

  async getActiveTechnologies(): Promise<AITechnology[]> {
    const result = await this.repository.findAll({ status: 'Active' });
    return result.technologies;
  }
}