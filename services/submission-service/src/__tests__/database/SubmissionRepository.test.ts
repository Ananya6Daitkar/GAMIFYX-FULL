import { SubmissionRepository } from '@/database/repositories/SubmissionRepository';
import { Pool, PoolClient } from 'pg';
import { Submission, CreateSubmissionRequest, UpdateSubmissionRequest } from '@/models';

// Mock pg module
jest.mock('pg');
jest.mock('@/telemetry/logger');

const mockPool = Pool as jest.MockedClass<typeof Pool>;
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
} as unknown as jest.Mocked<PoolClient>;

describe('SubmissionRepository', () => {
  let submissionRepository: SubmissionRepository;
  let mockPoolInstance: jest.Mocked<Pool>;

  const mockSubmission: Submission = {
    id: 'submission-123',
    userId: 'user-123',
    title: 'Test Submission',
    description: 'Test description',
    repositoryUrl: 'https://github.com/user/repo',
    commitHash: 'abc123',
    submissionType: 'assignment',
    status: 'pending',
    metrics: {
      linesOfCode: 100,
      complexity: 5,
      testCoverage: 80
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolInstance = new mockPool() as jest.Mocked<Pool>;
    mockPoolInstance.connect.mockResolvedValue(mockClient);
    submissionRepository = new SubmissionRepository(mockPoolInstance);
  });

  describe('createSubmission', () => {
    const createSubmissionData: CreateSubmissionRequest = {
      title: 'Test Submission',
      description: 'Test description',
      repositoryUrl: 'https://github.com/user/repo',
      commitHash: 'abc123',
      submissionType: 'assignment'
    };

    it('should successfully create a submission', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [mockSubmission]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await submissionRepository.createSubmission('user-123', createSubmissionData);

      // Assert
      expect(mockPoolInstance.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO submissions'),
        [
          'user-123',
          createSubmissionData.title,
          createSubmissionData.description,
          createSubmissionData.repositoryUrl,
          createSubmissionData.commitHash,
          createSubmissionData.submissionType,
          'pending',
          JSON.stringify({})
        ]
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockSubmission);
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      (mockClient.query as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        submissionRepository.createSubmission('user-123', createSubmissionData)
      ).rejects.toThrow(dbError);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find submission by id', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [mockSubmission]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await submissionRepository.findById('submission-123');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, user_id'),
        ['submission-123']
      );
      expect(result).toEqual(mockSubmission);
    });

    it('should return null if submission not found', async () => {
      // Arrange
      const mockQueryResult = {
        rows: []
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await submissionRepository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find submissions by user id', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [mockSubmission]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await submissionRepository.findByUserId('user-123', 10, 0);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, user_id'),
        ['user-123', 10, 0]
      );
      expect(result).toEqual([mockSubmission]);
    });

    it('should use default limit and offset', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [mockSubmission]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      await submissionRepository.findByUserId('user-123');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, user_id'),
        ['user-123', 50, 0]
      );
    });
  });

  describe('updateSubmission', () => {
    const updateData: UpdateSubmissionRequest = {
      title: 'Updated Title',
      status: 'completed'
    };

    it('should update submission successfully', async () => {
      // Arrange
      const updatedSubmission = { ...mockSubmission, ...updateData };
      const mockQueryResult = {
        rows: [updatedSubmission]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await submissionRepository.updateSubmission('submission-123', updateData);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE submissions'),
        expect.arrayContaining(['Updated Title', 'completed', 'submission-123'])
      );
      expect(result).toEqual(updatedSubmission);
    });

    it('should return existing submission if no updates provided', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [mockSubmission]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await submissionRepository.updateSubmission('submission-123', {});

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, user_id'),
        ['submission-123']
      );
      expect(result).toEqual(mockSubmission);
    });
  });

  describe('updateMetrics', () => {
    it('should update submission metrics', async () => {
      // Arrange
      const newMetrics = { testCoverage: 90, complexity: 3 };
      const mockFindResult = {
        rows: [mockSubmission]
      };
      const mockUpdateResult = {
        rows: []
      };
      
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(mockFindResult) // findById call
        .mockResolvedValueOnce(mockUpdateResult); // update call

      // Act
      await submissionRepository.updateMetrics('submission-123', newMetrics);

      // Assert
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE submissions'),
        [
          JSON.stringify({
            ...mockSubmission.metrics,
            ...newMetrics
          }),
          'submission-123'
        ]
      );
    });

    it('should throw error if submission not found', async () => {
      // Arrange
      const mockQueryResult = {
        rows: []
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act & Assert
      await expect(
        submissionRepository.updateMetrics('non-existent-id', { testCoverage: 90 })
      ).rejects.toThrow('Submission not found');
    });
  });

  describe('findByStatus', () => {
    it('should find submissions by status', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [mockSubmission]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await submissionRepository.findByStatus('pending', 50);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1'),
        ['pending', 50]
      );
      expect(result).toEqual([mockSubmission]);
    });
  });

  describe('getSubmissionStats', () => {
    it('should get submission statistics', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [{
          total: '10',
          pending: '2',
          processing: '1',
          completed: '6',
          failed: '1'
        }]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await submissionRepository.getSubmissionStats();

      // Assert
      expect(result).toEqual({
        total: 10,
        pending: 2,
        processing: 1,
        completed: 6,
        failed: 1
      });
    });

    it('should get submission statistics for specific user', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [{
          total: '5',
          pending: '1',
          processing: '0',
          completed: '3',
          failed: '1'
        }]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await submissionRepository.getSubmissionStats('user-123');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-123']
      );
      expect(result).toEqual({
        total: 5,
        pending: 1,
        processing: 0,
        completed: 3,
        failed: 1
      });
    });
  });

  describe('deleteSubmission', () => {
    it('should delete submission successfully', async () => {
      // Arrange
      (mockClient.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act
      await submissionRepository.deleteSubmission('submission-123');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM submissions WHERE id = $1',
        ['submission-123']
      );
    });
  });
});