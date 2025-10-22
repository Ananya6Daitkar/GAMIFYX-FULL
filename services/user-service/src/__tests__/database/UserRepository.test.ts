import { UserRepository } from '@/database/repositories/UserRepository';
import { Pool, PoolClient } from 'pg';
import { User, CreateUserRequest, UpdateProfileRequest } from '@/models';

// Mock pg module
jest.mock('pg');
jest.mock('@/telemetry/logger');

const mockPool = Pool as jest.MockedClass<typeof Pool>;
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
} as unknown as jest.Mocked<PoolClient>;

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockPoolInstance: jest.Mocked<Pool>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    role: 'student',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolInstance = new mockPool() as jest.Mocked<Pool>;
    mockPoolInstance.connect.mockResolvedValue(mockClient);
    userRepository = new UserRepository(mockPoolInstance);
  });

  describe('createUser', () => {
    const createUserData: CreateUserRequest & { passwordHash: string } = {
      email: 'test@example.com',
      password: 'Password123!',
      passwordHash: 'hashedpassword',
      firstName: 'John',
      lastName: 'Doe',
      role: 'student'
    };

    it('should successfully create a user', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [mockUser]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await userRepository.createUser(createUserData);

      // Assert
      expect(mockPoolInstance.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [
          createUserData.email,
          createUserData.passwordHash,
          createUserData.firstName,
          createUserData.lastName,
          createUserData.role
        ]
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      (mockClient.query as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(userRepository.createUser(createUserData)).rejects.toThrow(dbError);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [mockUser]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await userRepository.findByEmail('test@example.com');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email'),
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      // Arrange
      const mockQueryResult = {
        rows: []
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await userRepository.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      // Arrange
      const mockQueryResult = {
        rows: [mockUser]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await userRepository.findById('user-123');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email'),
        ['user-123']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      // Arrange
      const mockQueryResult = {
        rows: []
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await userRepository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('should update user last login timestamp', async () => {
      // Arrange
      (mockClient.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act
      await userRepository.updateLastLogin('user-123');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['user-123']
      );
    });
  });

  describe('createProfile', () => {
    const profileData: Partial<UpdateProfileRequest> = {
      bio: 'Test bio',
      githubUsername: 'testuser'
    };

    it('should create user profile', async () => {
      // Arrange
      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        bio: 'Test bio',
        githubUsername: 'testuser',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const mockQueryResult = {
        rows: [mockProfile]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await userRepository.createProfile('user-123', profileData);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_profiles'),
        expect.arrayContaining(['user-123'])
      );
      expect(result).toEqual(mockProfile);
    });
  });

  describe('getProfile', () => {
    it('should get user profile', async () => {
      // Arrange
      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        bio: 'Test bio',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const mockQueryResult = {
        rows: [mockProfile]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await userRepository.getProfile('user-123');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, user_id'),
        ['user-123']
      );
      expect(result).toEqual(mockProfile);
    });

    it('should return null if profile not found', async () => {
      // Arrange
      const mockQueryResult = {
        rows: []
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await userRepository.getProfile('user-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const updateData: UpdateProfileRequest = {
      bio: 'Updated bio',
      githubUsername: 'updateduser'
    };

    it('should update user profile', async () => {
      // Arrange
      const mockUpdatedProfile = {
        id: 'profile-123',
        userId: 'user-123',
        bio: 'Updated bio',
        githubUsername: 'updateduser',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const mockQueryResult = {
        rows: [mockUpdatedProfile]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await userRepository.updateProfile('user-123', updateData);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_profiles'),
        expect.arrayContaining(['Updated bio', 'updateduser', 'user-123'])
      );
      expect(result).toEqual(mockUpdatedProfile);
    });

    it('should return existing profile if no updates provided', async () => {
      // Arrange
      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const mockQueryResult = {
        rows: [mockProfile]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockQueryResult);

      // Act
      const result = await userRepository.updateProfile('user-123', {});

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, user_id'),
        ['user-123']
      );
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      // Arrange
      (mockClient.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act
      await userRepository.updatePassword('user-123', 'new-hashed-password');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['new-hashed-password', 'user-123']
      );
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      // Arrange
      (mockClient.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act
      await userRepository.deactivateUser('user-123');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['user-123']
      );
    });
  });
});