import { CompetitionManager } from '../CompetitionManager';
import { repository } from '@/database/repositories';
import { 
  CompetitionType, 
  CompetitionStatus, 
  ParticipationStatus,
  CreateCompetitionRequest 
} from '@/types/competition';

// Mock the repository
jest.mock('@/database/repositories');
const mockRepository = repository as jest.Mocked<typeof repository>;

describe('CompetitionManager', () => {
  let competitionManager: CompetitionManager;

  beforeEach(() => {
    competitionManager = new CompetitionManager();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockRepository.competitions.findAll.mockResolvedValue([]);
      
      await competitionManager.initialize();
      
      const health = await competitionManager.healthCheck();
      expect(health.initialized).toBe(true);
      expect(health.status).toBe('healthy');
    });

    it('should load existing competitions from database', async () => {
      const mockCompetitions = [
        {
          id: 'comp-1',
          name: 'Test Competition',
          type: CompetitionType.HACKTOBERFEST,
          status: CompetitionStatus.ACTIVE,
          // ... other required fields
        }
      ];

      mockRepository.competitions.findAll.mockResolvedValue(mockCompetitions as any);
      
      await competitionManager.initialize();
      
      const competition = await competitionManager.getCompetition('comp-1');
      expect(competition).toBeTruthy();
      expect(competition?.name).toBe('Test Competition');
    });
  });

  describe('competition creation', () => {
    beforeEach(async () => {
      mockRepository.competitions.findAll.mockResolvedValue([]);
      await competitionManager.initialize();
    });

    it('should create a new competition', async () => {
      const request: CreateCompetitionRequest = {
        name: 'Test Hacktoberfest',
        description: 'Test competition',
        type: CompetitionType.HACKTOBERFEST,
        startDate: '2024-10-01T00:00:00Z',
        endDate: '2024-10-31T23:59:59Z',
        requirements: [
          {
            type: 'pull_request',
            description: 'Submit PRs',
            criteria: { minPRs: 4 },
            points: 100,
            required: true
          }
        ],
        rewards: [
          {
            name: 'Badge',
            description: 'Test badge',
            type: 'badge',
            criteria: 'Complete requirements'
          }
        ],
        validationRules: [
          {
            name: 'PR Validation',
            description: 'Validate PRs',
            type: 'github_pr',
            script: 'validatePR',
            parameters: {},
            weight: 1
          }
        ]
      };

      const mockCreatedCompetition = {
        id: 'new-comp-id',
        ...request,
        status: CompetitionStatus.UPCOMING,
        participantCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user'
      };

      mockRepository.competitions.create.mockResolvedValue(mockCreatedCompetition as any);

      const competition = await competitionManager.createCompetition(request, 'test-user');

      expect(competition).toBeTruthy();
      expect(competition.name).toBe(request.name);
      expect(mockRepository.competitions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: request.name,
          type: request.type,
          status: CompetitionStatus.UPCOMING
        })
      );
    });

    it('should validate competition request', async () => {
      const invalidRequest: CreateCompetitionRequest = {
        name: '',
        description: 'Test',
        type: CompetitionType.HACKTOBERFEST,
        startDate: '2024-10-31T00:00:00Z', // End before start
        endDate: '2024-10-01T23:59:59Z',
        requirements: [],
        rewards: [],
        validationRules: []
      };

      await expect(
        competitionManager.createCompetition(invalidRequest, 'test-user')
      ).rejects.toThrow();
    });
  });

  describe('student registration', () => {
    const mockCompetition = {
      id: 'comp-1',
      name: 'Test Competition',
      type: CompetitionType.HACKTOBERFEST,
      status: CompetitionStatus.ACTIVE,
      participantCount: 0,
      maxParticipants: 100,
      requirements: [{ id: 'req-1' }],
      registrationDeadline: new Date(Date.now() + 86400000) // Tomorrow
    };

    beforeEach(async () => {
      mockRepository.competitions.findAll.mockResolvedValue([]);
      await competitionManager.initialize();
      
      mockRepository.competitions.findById.mockResolvedValue(mockCompetition as any);
      mockRepository.participations.findByUserAndCompetition.mockResolvedValue(null);
    });

    it('should register a student for competition', async () => {
      const mockParticipation = {
        id: 'participation-1',
        competitionId: 'comp-1',
        userId: 'user-1',
        status: ParticipationStatus.REGISTERED
      };

      mockRepository.participations.create.mockResolvedValue(mockParticipation as any);
      mockRepository.competitions.incrementParticipantCount.mockResolvedValue();
      mockRepository.competitions.findById.mockResolvedValue({
        ...mockCompetition,
        participantCount: 1
      } as any);

      await competitionManager.registerStudent('comp-1', 'user-1', {
        githubUsername: 'testuser'
      });

      expect(mockRepository.participations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          competitionId: 'comp-1',
          userId: 'user-1',
          status: ParticipationStatus.REGISTERED,
          githubUsername: 'testuser'
        })
      );
      expect(mockRepository.competitions.incrementParticipantCount).toHaveBeenCalledWith('comp-1');
    });

    it('should prevent duplicate registration', async () => {
      mockRepository.participations.findByUserAndCompetition.mockResolvedValue({
        id: 'existing-participation'
      } as any);

      await expect(
        competitionManager.registerStudent('comp-1', 'user-1')
      ).rejects.toThrow('User is already registered for this competition');
    });

    it('should prevent registration after deadline', async () => {
      mockRepository.competitions.findById.mockResolvedValue({
        ...mockCompetition,
        registrationDeadline: new Date(Date.now() - 86400000) // Yesterday
      } as any);

      await expect(
        competitionManager.registerStudent('comp-1', 'user-1')
      ).rejects.toThrow('Registration deadline has passed');
    });
  });

  describe('competition lifecycle', () => {
    beforeEach(async () => {
      mockRepository.competitions.findAll.mockResolvedValue([]);
      await competitionManager.initialize();
    });

    it('should start a competition', async () => {
      const mockCompetition = {
        id: 'comp-1',
        name: 'Test Competition',
        status: CompetitionStatus.UPCOMING,
        startDate: new Date(Date.now() - 1000) // Started 1 second ago
      };

      mockRepository.competitions.findById.mockResolvedValue(mockCompetition as any);
      mockRepository.competitions.update.mockResolvedValue({
        ...mockCompetition,
        status: CompetitionStatus.ACTIVE
      } as any);

      const updatedCompetition = await competitionManager.startCompetition('comp-1');

      expect(updatedCompetition.status).toBe(CompetitionStatus.ACTIVE);
      expect(mockRepository.competitions.update).toHaveBeenCalledWith('comp-1', {
        status: CompetitionStatus.ACTIVE
      });
    });

    it('should complete a competition', async () => {
      const mockCompetition = {
        id: 'comp-1',
        name: 'Test Competition',
        status: CompetitionStatus.ACTIVE
      };

      const mockParticipations = [
        { id: 'part-1', status: ParticipationStatus.ACTIVE },
        { id: 'part-2', status: ParticipationStatus.ACTIVE }
      ];

      mockRepository.competitions.findById.mockResolvedValue(mockCompetition as any);
      mockRepository.competitions.update.mockResolvedValue({
        ...mockCompetition,
        status: CompetitionStatus.COMPLETED
      } as any);
      mockRepository.participations.findByCompetition.mockResolvedValue(mockParticipations as any);
      mockRepository.participations.updateStatus.mockResolvedValue();

      const updatedCompetition = await competitionManager.completeCompetition('comp-1');

      expect(updatedCompetition.status).toBe(CompetitionStatus.COMPLETED);
      expect(mockRepository.participations.updateStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('competition statistics', () => {
    beforeEach(async () => {
      mockRepository.competitions.findAll.mockResolvedValue([]);
      await competitionManager.initialize();
    });

    it('should get competition statistics', async () => {
      const mockCompetition = {
        id: 'comp-1',
        name: 'Test Competition'
      };

      const mockParticipations = [
        { 
          userId: 'user-1', 
          status: ParticipationStatus.ACTIVE, 
          totalScore: 100,
          progress: { completionPercentage: 75 }
        },
        { 
          userId: 'user-2', 
          status: ParticipationStatus.COMPLETED, 
          totalScore: 90,
          progress: { completionPercentage: 100 }
        },
        { 
          userId: 'user-3', 
          status: ParticipationStatus.REGISTERED, 
          totalScore: 0,
          progress: { completionPercentage: 0 }
        }
      ];

      mockRepository.competitions.findById.mockResolvedValue(mockCompetition as any);
      mockRepository.participations.findByCompetition.mockResolvedValue(mockParticipations as any);

      const stats = await competitionManager.getCompetitionStats('comp-1');

      expect(stats.totalParticipants).toBe(3);
      expect(stats.activeParticipants).toBe(1);
      expect(stats.completedParticipants).toBe(1);
      expect(stats.averageProgress).toBe(58.33); // (75 + 100 + 0) / 3
      expect(stats.topPerformers).toHaveLength(3);
      expect(stats.topPerformers[0].userId).toBe('user-1');
      expect(stats.topPerformers[0].score).toBe(100);
    });
  });

  describe('health check and metrics', () => {
    it('should return health status', async () => {
      mockRepository.competitions.findAll.mockResolvedValue([]);
      await competitionManager.initialize();

      const health = await competitionManager.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.initialized).toBe(true);
      expect(typeof health.competitionsCount).toBe('number');
    });

    it('should return service metrics', async () => {
      mockRepository.competitions.findAll.mockResolvedValue([]);
      await competitionManager.initialize();

      const metrics = competitionManager.getMetrics();

      expect(metrics).toHaveProperty('totalCompetitions');
      expect(metrics).toHaveProperty('competitionsByStatus');
      expect(metrics).toHaveProperty('competitionsByType');
    });
  });
});