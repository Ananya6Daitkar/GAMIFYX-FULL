import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';
import { repository } from '@/database/repositories';
import { 
  Competition, 
  CompetitionType, 
  CompetitionStatus,
  ParticipationStatus,
  CreateCompetitionRequest,
  UpdateCompetitionRequest,
  CompetitionError,
  ValidationError,
  NotFoundError
} from '@/types/competition';

const meter = metrics.getMeter('competition-service', '1.0.0');

// Competition metrics
const competitionsTotal = meter.createUpDownCounter('competitions_total', {
  description: 'Total number of competitions'
});

const competitionOperations = meter.createCounter('competition_operations_total', {
  description: 'Total competition operations'
});

export class CompetitionManager {
  private competitions: Map<string, Competition> = new Map();
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Competition Manager...');
      
      // Load competitions from database
      await this.loadCompetitionsFromDatabase();
      
      // Initialize default competitions (Hacktoberfest, etc.)
      await this.initializeDefaultCompetitions();
      
      // Start competition lifecycle monitoring
      await this.startLifecycleMonitoring();
      
      this.initialized = true;
      logger.info('Competition Manager initialized successfully', { 
        competitionsLoaded: this.competitions.size 
      });
    } catch (error) {
      logger.error('Failed to initialize Competition Manager', { error });
      throw error;
    }
  }

  async createCompetition(request: CreateCompetitionRequest, createdBy: string): Promise<Competition> {
    competitionOperations.add(1, { operation: 'create' });
    
    try {
      logger.info('Creating new competition', { name: request.name, type: request.type });

      // Validate request
      this.validateCompetitionRequest(request);

      const competitionData = {
        name: request.name,
        description: request.description,
        type: request.type,
        status: CompetitionStatus.UPCOMING,
        organizer: 'GamifyX Platform',
        startDate: new Date(request.startDate),
        endDate: new Date(request.endDate),
        requirements: request.requirements.map(req => ({ ...req, id: this.generateId() })),
        rewards: request.rewards.map(reward => ({ ...reward, id: this.generateId() })),
        badges: [],
        validationRules: request.validationRules.map(rule => ({ ...rule, id: this.generateId() })),
        autoValidation: true,
        tags: request.tags || [],
        categories: request.categories || [],
        difficultyLevel: request.difficultyLevel || 'intermediate',
        participantCount: 0,
        maxParticipants: request.maxParticipants,
        rules: [],
        eligibilityCriteria: [],
        createdBy
      };

      // Save to database
      const competition = await repository.competitions.create(competitionData);
      
      // Cache in memory
      this.competitions.set(competition.id, competition);
      competitionsTotal.add(1);

      logger.info('Competition created successfully', { 
        competitionId: competition.id, 
        name: competition.name 
      });
      return competition;

    } catch (error) {
      logger.error('Failed to create competition', { error, request });
      throw error;
    }
  }

  async getCompetition(id: string): Promise<Competition | null> {
    competitionOperations.add(1, { operation: 'read' });
    
    try {
      // Check in-memory cache first
      let competition = this.competitions.get(id);
      
      if (!competition) {
        // Load from database
        try {
          competition = await repository.competitions.findById(id);
          if (competition) {
            this.competitions.set(id, competition);
          }
        } catch (error) {
          if (error instanceof NotFoundError) {
            return null;
          }
          throw error;
        }
      }

      return competition || null;
    } catch (error) {
      logger.error('Failed to get competition', { error, competitionId: id });
      throw error;
    }
  }

  async getAllCompetitions(filters?: {
    type?: CompetitionType;
    status?: CompetitionStatus;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Competition[]> {
    competitionOperations.add(1, { operation: 'list' });
    
    try {
      // Load from database with filters
      const competitions = await repository.competitions.findAll({
        type: filters?.type,
        status: filters?.status,
        tags: filters?.tags,
        limit: filters?.limit,
        offset: filters?.offset
      });

      // Update cache with fresh data
      competitions.forEach(competition => {
        this.competitions.set(competition.id, competition);
      });

      return competitions;
    } catch (error) {
      logger.error('Failed to get competitions', { error, filters });
      throw error;
    }
  }

  async updateCompetition(id: string, request: UpdateCompetitionRequest): Promise<Competition> {
    competitionOperations.add(1, { operation: 'update' });
    
    try {
      const existingCompetition = await this.getCompetition(id);
      if (!existingCompetition) {
        throw new NotFoundError('Competition', id);
      }

      // Validate status transitions
      if (request.status) {
        this.validateStatusTransition(existingCompetition.status, request.status);
      }

      // Update in database
      const updatedCompetition = await repository.competitions.update(id, request);
      
      // Update cache
      this.competitions.set(id, updatedCompetition);

      logger.info('Competition updated successfully', { 
        competitionId: id,
        changes: Object.keys(request)
      });
      return updatedCompetition;

    } catch (error) {
      logger.error('Failed to update competition', { error, competitionId: id });
      throw error;
    }
  }

  async deleteCompetition(id: string): Promise<void> {
    competitionOperations.add(1, { operation: 'delete' });
    
    try {
      const competition = await this.getCompetition(id);
      if (!competition) {
        throw new NotFoundError('Competition', id);
      }

      // Check if competition can be deleted (no active participations)
      await this.validateCompetitionDeletion(id);
      
      // Delete from database
      await repository.competitions.delete(id);
      
      // Remove from cache
      this.competitions.delete(id);
      competitionsTotal.add(-1);

      logger.info('Competition deleted successfully', { competitionId: id });

    } catch (error) {
      logger.error('Failed to delete competition', { error, competitionId: id });
      throw error;
    }
  }

  async getActiveCompetitions(): Promise<Competition[]> {
    return this.getAllCompetitions({ status: CompetitionStatus.ACTIVE });
  }

  async getCompetitionsByType(type: CompetitionType): Promise<Competition[]> {
    return this.getAllCompetitions({ type });
  }

  /**
   * Register a student for a competition
   */
  async registerStudent(competitionId: string, userId: string, registrationData?: {
    githubUsername?: string;
    gitlabUsername?: string;
    additionalData?: Record<string, any>;
  }): Promise<void> {
    competitionOperations.add(1, { operation: 'register' });
    
    try {
      const competition = await this.getCompetition(competitionId);
      if (!competition) {
        throw new NotFoundError('Competition', competitionId);
      }

      // Validate registration eligibility
      await this.validateRegistrationEligibility(competition, userId);

      // Create participation record
      const participation = await repository.participations.create({
        competitionId,
        userId,
        status: ParticipationStatus.REGISTERED,
        registeredAt: new Date(),
        registrationData: registrationData?.additionalData || {},
        githubUsername: registrationData?.githubUsername,
        gitlabUsername: registrationData?.gitlabUsername,
        externalProfiles: [],
        progress: {
          completedRequirements: [],
          totalRequirements: competition.requirements.length,
          completionPercentage: 0,
          currentStreak: 0,
          longestStreak: 0,
          milestones: []
        },
        achievements: [],
        submissions: [],
        validationResults: [],
        totalScore: 0,
        tags: []
      });

      // Update competition participant count
      await repository.competitions.incrementParticipantCount(competitionId);

      // Update cache
      const updatedCompetition = await repository.competitions.findById(competitionId);
      this.competitions.set(competitionId, updatedCompetition);

      logger.info('Student registered for competition', { 
        competitionId, 
        userId, 
        participationId: participation.id 
      });

    } catch (error) {
      logger.error('Failed to register student for competition', { 
        error, 
        competitionId, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Unregister a student from a competition
   */
  async unregisterStudent(competitionId: string, userId: string): Promise<void> {
    competitionOperations.add(1, { operation: 'unregister' });
    
    try {
      const participation = await repository.participations.findByUserAndCompetition(userId, competitionId);
      if (!participation) {
        throw new NotFoundError('Participation', `${userId}-${competitionId}`);
      }

      // Validate unregistration eligibility
      await this.validateUnregistrationEligibility(participation);

      // Delete participation
      await repository.participations.delete(participation.id);

      // Update competition participant count
      await repository.competitions.decrementParticipantCount(competitionId);

      // Update cache
      const updatedCompetition = await repository.competitions.findById(competitionId);
      this.competitions.set(competitionId, updatedCompetition);

      logger.info('Student unregistered from competition', { 
        competitionId, 
        userId, 
        participationId: participation.id 
      });

    } catch (error) {
      logger.error('Failed to unregister student from competition', { 
        error, 
        competitionId, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Get competition statistics
   */
  async getCompetitionStats(competitionId: string): Promise<{
    totalParticipants: number;
    activeParticipants: number;
    completedParticipants: number;
    averageProgress: number;
    topPerformers: Array<{ userId: string; score: number; rank: number }>;
  }> {
    try {
      const competition = await this.getCompetition(competitionId);
      if (!competition) {
        throw new NotFoundError('Competition', competitionId);
      }

      const participations = await repository.participations.findByCompetition(competitionId);
      
      const totalParticipants = participations.length;
      const activeParticipants = participations.filter(p => p.status === ParticipationStatus.ACTIVE).length;
      const completedParticipants = participations.filter(p => p.status === ParticipationStatus.COMPLETED).length;
      
      const averageProgress = participations.length > 0 
        ? participations.reduce((sum, p) => sum + p.progress.completionPercentage, 0) / participations.length
        : 0;

      const topPerformers = participations
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 10)
        .map((p, index) => ({
          userId: p.userId,
          score: p.totalScore,
          rank: index + 1
        }));

      return {
        totalParticipants,
        activeParticipants,
        completedParticipants,
        averageProgress,
        topPerformers
      };

    } catch (error) {
      logger.error('Failed to get competition stats', { error, competitionId });
      throw error;
    }
  }

  /**
   * Start or activate a competition
   */
  async startCompetition(competitionId: string): Promise<Competition> {
    try {
      const competition = await this.getCompetition(competitionId);
      if (!competition) {
        throw new NotFoundError('Competition', competitionId);
      }

      if (competition.status !== CompetitionStatus.UPCOMING) {
        throw new ValidationError('Competition must be in UPCOMING status to start');
      }

      const now = new Date();
      if (competition.startDate > now) {
        throw new ValidationError('Competition start date has not been reached');
      }

      const updatedCompetition = await repository.competitions.update(competitionId, {
        status: CompetitionStatus.ACTIVE
      });

      this.competitions.set(competitionId, updatedCompetition);

      logger.info('Competition started', { competitionId, name: competition.name });
      return updatedCompetition;

    } catch (error) {
      logger.error('Failed to start competition', { error, competitionId });
      throw error;
    }
  }

  /**
   * Complete a competition
   */
  async completeCompetition(competitionId: string): Promise<Competition> {
    try {
      const competition = await this.getCompetition(competitionId);
      if (!competition) {
        throw new NotFoundError('Competition', competitionId);
      }

      if (competition.status !== CompetitionStatus.ACTIVE) {
        throw new ValidationError('Competition must be ACTIVE to complete');
      }

      const updatedCompetition = await repository.competitions.update(competitionId, {
        status: CompetitionStatus.COMPLETED
      });

      // Update all active participations to completed
      const participations = await repository.participations.findByCompetition(competitionId, {
        status: ParticipationStatus.ACTIVE
      });

      for (const participation of participations) {
        await repository.participations.updateStatus(participation.id, ParticipationStatus.COMPLETED);
      }

      this.competitions.set(competitionId, updatedCompetition);

      logger.info('Competition completed', { 
        competitionId, 
        name: competition.name,
        participantsCompleted: participations.length
      });
      return updatedCompetition;

    } catch (error) {
      logger.error('Failed to complete competition', { error, competitionId });
      throw error;
    }
  }

  private validateCompetitionRequest(request: CreateCompetitionRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new CompetitionError('Competition name is required', 'VALIDATION_ERROR');
    }

    if (!request.description || request.description.trim().length === 0) {
      throw new CompetitionError('Competition description is required', 'VALIDATION_ERROR');
    }

    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);

    if (startDate >= endDate) {
      throw new CompetitionError('End date must be after start date', 'VALIDATION_ERROR');
    }

    if (startDate < new Date()) {
      throw new CompetitionError('Start date cannot be in the past', 'VALIDATION_ERROR');
    }

    if (!request.requirements || request.requirements.length === 0) {
      throw new CompetitionError('At least one requirement is needed', 'VALIDATION_ERROR');
    }
  }

  private async loadCompetitionsFromDatabase(): Promise<void> {
    try {
      logger.debug('Loading competitions from database...');
      
      const competitions = await repository.competitions.findAll({ limit: 100 });
      
      competitions.forEach(competition => {
        this.competitions.set(competition.id, competition);
      });

      logger.info('Competitions loaded from database', { count: competitions.length });
    } catch (error) {
      logger.error('Failed to load competitions from database', { error });
      throw error;
    }
  }

  private async initializeDefaultCompetitions(): Promise<void> {
    try {
      // Check if we have any competitions, if not create defaults
      const existingCompetitions = await repository.competitions.findAll({ limit: 1 });
      
      if (existingCompetitions.length === 0) {
        logger.info('No competitions found, creating default competitions...');
        
        await this.createDefaultHacktoberfest();
        await this.createDefaultGitHubGameOff();
        await this.createDefaultOpenSourceChallenge();
      }
      
    } catch (error) {
      logger.error('Failed to initialize default competitions', { error });
    }
  }

  private async createDefaultHacktoberfest(): Promise<void> {
    try {
      const hacktoberfestRequest: CreateCompetitionRequest = {
        name: 'Hacktoberfest 2024',
        description: 'Contribute to open source projects during October and earn rewards. Make 4 quality pull requests to participating repositories and earn exclusive swag!',
        type: CompetitionType.HACKTOBERFEST,
        startDate: '2024-10-01T00:00:00Z',
        endDate: '2024-10-31T23:59:59Z',
        requirements: [
          {
            type: 'pull_request',
            description: 'Submit 4 valid pull requests to participating repositories',
            criteria: { 
              minPRs: 4, 
              mustBeApproved: true,
              excludeSpam: true,
              minLinesChanged: 10
            },
            points: 100,
            required: true
          }
        ],
        rewards: [
          {
            name: 'Hacktoberfest T-Shirt',
            description: 'Official Hacktoberfest t-shirt for completing the challenge',
            type: 'swag',
            criteria: 'Complete 4 valid pull requests'
          },
          {
            name: 'Digital Badge',
            description: 'Hacktoberfest completion badge for your profile',
            type: 'badge',
            criteria: 'Complete 4 valid pull requests'
          }
        ],
        validationRules: [
          {
            name: 'Valid Pull Request',
            description: 'PR must be approved, merged, or have hacktoberfest-accepted label',
            type: 'github_pr',
            script: 'validateHacktoberfestPR',
            parameters: { 
              requireApproval: true,
              acceptedLabels: ['hacktoberfest-accepted'],
              excludeLabels: ['spam', 'invalid']
            },
            weight: 1
          }
        ],
        tags: ['open-source', 'hacktoberfest', 'github', 'community'],
        categories: ['Open Source', 'Community'],
        difficultyLevel: 'beginner'
      };

      const competition = await this.createCompetition(hacktoberfestRequest, 'system');
      
      logger.info('Default Hacktoberfest competition created', { 
        competitionId: competition.id 
      });
    } catch (error) {
      logger.error('Failed to create default Hacktoberfest competition', { error });
    }
  }

  private async createDefaultGitHubGameOff(): Promise<void> {
    try {
      const gameOffRequest: CreateCompetitionRequest = {
        name: 'GitHub Game Off 2024',
        description: 'Create a game in one month using GitHub. Theme will be announced at the start of the competition.',
        type: CompetitionType.GITHUB_GAME_OFF,
        startDate: '2024-11-01T00:00:00Z',
        endDate: '2024-11-30T23:59:59Z',
        requirements: [
          {
            type: 'repository',
            description: 'Create a public GitHub repository with your game',
            criteria: { 
              mustBePublic: true,
              mustHaveReadme: true,
              mustHaveGameplayInstructions: true
            },
            points: 50,
            required: true
          },
          {
            type: 'commit',
            description: 'Make regular commits throughout the month',
            criteria: { 
              minCommits: 10,
              spreadAcrossMonth: true
            },
            points: 30,
            required: true
          },
          {
            type: 'custom',
            description: 'Submit your game before the deadline',
            criteria: { 
              submissionRequired: true,
              includePlayableLink: true
            },
            points: 20,
            required: true
          }
        ],
        rewards: [
          {
            name: 'Game Off Winner Badge',
            description: 'Badge for completing the GitHub Game Off challenge',
            type: 'badge',
            criteria: 'Submit a complete game'
          },
          {
            name: 'Community Recognition',
            description: 'Featured on GitHub Game Off showcase',
            type: 'recognition',
            criteria: 'High-quality submission'
          }
        ],
        validationRules: [
          {
            name: 'Repository Validation',
            description: 'Validate repository meets requirements',
            type: 'custom',
            script: 'validateGameOffRepository',
            parameters: { 
              checkReadme: true,
              checkLicense: true,
              checkGameplayInstructions: true
            },
            weight: 1
          }
        ],
        tags: ['game-development', 'github', 'creative', 'monthly-challenge'],
        categories: ['Game Development', 'Creative'],
        difficultyLevel: 'intermediate'
      };

      const competition = await this.createCompetition(gameOffRequest, 'system');
      
      logger.info('Default GitHub Game Off competition created', { 
        competitionId: competition.id 
      });
    } catch (error) {
      logger.error('Failed to create default GitHub Game Off competition', { error });
    }
  }

  private async createDefaultOpenSourceChallenge(): Promise<void> {
    try {
      const challengeRequest: CreateCompetitionRequest = {
        name: 'Open Source Contribution Challenge',
        description: 'Ongoing challenge to contribute to open source projects. Perfect for students to build their portfolio and gain real-world experience.',
        type: CompetitionType.OPEN_SOURCE_CHALLENGE,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        requirements: [
          {
            type: 'pull_request',
            description: 'Submit quality pull requests to open source projects',
            criteria: { 
              minPRs: 1,
              mustBeApproved: false, // More lenient for learning
              qualityOverQuantity: true
            },
            points: 25,
            required: true
          },
          {
            type: 'issue',
            description: 'Report bugs or suggest features in open source projects',
            criteria: { 
              minIssues: 2,
              mustBeConstructive: true
            },
            points: 10,
            required: false
          },
          {
            type: 'review',
            description: 'Review other contributors\' pull requests',
            criteria: { 
              minReviews: 3,
              mustBeHelpful: true
            },
            points: 15,
            required: false
          }
        ],
        rewards: [
          {
            name: 'Open Source Contributor Badge',
            description: 'Recognition for contributing to open source',
            type: 'badge',
            criteria: 'Complete any requirement'
          },
          {
            name: 'Community Builder Badge',
            description: 'For active participation in open source communities',
            type: 'badge',
            criteria: 'Complete all requirements'
          }
        ],
        validationRules: [
          {
            name: 'Contribution Quality Check',
            description: 'Validate the quality and impact of contributions',
            type: 'custom',
            script: 'validateOpenSourceContribution',
            parameters: { 
              checkCodeQuality: true,
              checkDocumentation: true,
              checkCommunityGuidelines: true
            },
            weight: 1
          }
        ],
        tags: ['open-source', 'learning', 'portfolio', 'community'],
        categories: ['Open Source', 'Learning'],
        difficultyLevel: 'beginner'
      };

      const competition = await this.createCompetition(challengeRequest, 'system');
      
      logger.info('Default Open Source Challenge created', { 
        competitionId: competition.id 
      });
    } catch (error) {
      logger.error('Failed to create default Open Source Challenge', { error });
    }
  }

  private async startLifecycleMonitoring(): Promise<void> {
    // Start periodic check for competition status updates
    setInterval(async () => {
      try {
        await this.checkCompetitionLifecycle();
      } catch (error) {
        logger.error('Competition lifecycle check failed', { error });
      }
    }, 60000); // Check every minute

    logger.info('Competition lifecycle monitoring started');
  }

  private async checkCompetitionLifecycle(): Promise<void> {
    const now = new Date();
    
    // Check for competitions that should start
    const upcomingCompetitions = await repository.competitions.findAll({
      status: CompetitionStatus.UPCOMING
    });

    for (const competition of upcomingCompetitions) {
      if (competition.startDate <= now) {
        try {
          await this.startCompetition(competition.id);
        } catch (error) {
          logger.error('Failed to auto-start competition', { 
            error, 
            competitionId: competition.id 
          });
        }
      }
    }

    // Check for competitions that should end
    const activeCompetitions = await repository.competitions.findAll({
      status: CompetitionStatus.ACTIVE
    });

    for (const competition of activeCompetitions) {
      if (competition.endDate <= now) {
        try {
          await this.completeCompetition(competition.id);
        } catch (error) {
          logger.error('Failed to auto-complete competition', { 
            error, 
            competitionId: competition.id 
          });
        }
      }
    }
  }

  private validateStatusTransition(currentStatus: CompetitionStatus, newStatus: CompetitionStatus): void {
    const validTransitions: Record<CompetitionStatus, CompetitionStatus[]> = {
      [CompetitionStatus.UPCOMING]: [CompetitionStatus.ACTIVE, CompetitionStatus.CANCELLED],
      [CompetitionStatus.ACTIVE]: [CompetitionStatus.COMPLETED, CompetitionStatus.CANCELLED],
      [CompetitionStatus.COMPLETED]: [], // No transitions from completed
      [CompetitionStatus.CANCELLED]: [] // No transitions from cancelled
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new ValidationError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private async validateRegistrationEligibility(competition: Competition, userId: string): Promise<void> {
    // Check if competition is accepting registrations
    if (competition.status === CompetitionStatus.COMPLETED) {
      throw new ValidationError('Cannot register for completed competition');
    }

    if (competition.status === CompetitionStatus.CANCELLED) {
      throw new ValidationError('Cannot register for cancelled competition');
    }

    // Check registration deadline
    if (competition.registrationDeadline && new Date() > competition.registrationDeadline) {
      throw new ValidationError('Registration deadline has passed');
    }

    // Check participant limit
    if (competition.maxParticipants && competition.participantCount >= competition.maxParticipants) {
      throw new ValidationError('Competition has reached maximum participants');
    }

    // Check if user is already registered
    const existingParticipation = await repository.participations.findByUserAndCompetition(
      userId, 
      competition.id
    );

    if (existingParticipation) {
      throw new ValidationError('User is already registered for this competition');
    }
  }

  private async validateUnregistrationEligibility(participation: any): Promise<void> {
    // Cannot unregister if competition has started and user has made progress
    if (participation.status === ParticipationStatus.ACTIVE && 
        participation.progress.completionPercentage > 0) {
      throw new ValidationError('Cannot unregister after making progress in active competition');
    }

    if (participation.status === ParticipationStatus.COMPLETED) {
      throw new ValidationError('Cannot unregister from completed participation');
    }
  }

  private async validateCompetitionDeletion(competitionId: string): Promise<void> {
    // Check for active participations
    const participations = await repository.participations.findByCompetition(competitionId, {
      status: ParticipationStatus.ACTIVE
    });

    if (participations.length > 0) {
      throw new ValidationError(
        `Cannot delete competition with ${participations.length} active participants`
      );
    }

    // Check for completed participations (might want to preserve for historical data)
    const completedParticipations = await repository.participations.findByCompetition(competitionId, {
      status: ParticipationStatus.COMPLETED
    });

    if (completedParticipations.length > 0) {
      logger.warn('Deleting competition with completed participations', {
        competitionId,
        completedCount: completedParticipations.length
      });
    }
  }

  private generateCompetitionId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health check method
  async healthCheck(): Promise<{ 
    status: string; 
    initialized: boolean;
    competitionsCount: number;
    activeCompetitions: number;
    upcomingCompetitions: number;
  }> {
    try {
      const activeCount = Array.from(this.competitions.values())
        .filter(c => c.status === CompetitionStatus.ACTIVE).length;
      
      const upcomingCount = Array.from(this.competitions.values())
        .filter(c => c.status === CompetitionStatus.UPCOMING).length;

      return {
        status: this.initialized ? 'healthy' : 'initializing',
        initialized: this.initialized,
        competitionsCount: this.competitions.size,
        activeCompetitions: activeCount,
        upcomingCompetitions: upcomingCount
      };
    } catch (error) {
      logger.error('Health check failed', { error });
      return {
        status: 'unhealthy',
        initialized: false,
        competitionsCount: 0,
        activeCompetitions: 0,
        upcomingCompetitions: 0
      };
    }
  }

  /**
   * Get service metrics for monitoring
   */
  getMetrics(): {
    totalCompetitions: number;
    competitionsByStatus: Record<CompetitionStatus, number>;
    competitionsByType: Record<CompetitionType, number>;
  } {
    const competitions = Array.from(this.competitions.values());
    
    const competitionsByStatus = competitions.reduce((acc, comp) => {
      acc[comp.status] = (acc[comp.status] || 0) + 1;
      return acc;
    }, {} as Record<CompetitionStatus, number>);

    const competitionsByType = competitions.reduce((acc, comp) => {
      acc[comp.type] = (acc[comp.type] || 0) + 1;
      return acc;
    }, {} as Record<CompetitionType, number>);

    return {
      totalCompetitions: competitions.length,
      competitionsByStatus,
      competitionsByType
    };
  }
}