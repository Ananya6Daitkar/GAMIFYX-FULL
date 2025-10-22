import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/database/repositories';
import { User, CreateUserRequest, LoginRequest } from '@/models';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('@/database/repositories');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('@/telemetry/logger');
jest.mock('@/services/UserMetricsService');

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<UserRepository>;

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
    mockUserRepo = new mockUserRepository() as jest.Mocked<UserRepository>;
    authService = new AuthService(mockUserRepo);
  });

  describe('register', () => {
    const registerData: CreateUserRequest = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'student'
    };

    it('should successfully register a new user', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedpassword' as never);
      mockUserRepo.createUser.mockResolvedValue(mockUser);
      mockUserRepo.createProfile.mockResolvedValue({
        id: 'profile-123',
        userId: mockUser.id,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      mockJwt.sign.mockReturnValue('mock-token' as never);

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);
      expect(mockUserRepo.createUser).toHaveBeenCalledWith({
        ...registerData,
        passwordHash: 'hashedpassword'
      });
      expect(mockUserRepo.createProfile).toHaveBeenCalledWith(mockUser.id);
      expect(result.user.email).toBe(registerData.email);
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });

    it('should throw error if user already exists', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(registerData)).rejects.toThrow(
        'User with this email already exists'
      );
      expect(mockUserRepo.createUser).not.toHaveBeenCalled();
    });

    it('should handle database errors during registration', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedpassword' as never);
      mockUserRepo.createUser.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(authService.register(registerData)).rejects.toThrow('Database error');
    });
  });

  describe('login', () => {
    const loginData: LoginRequest = {
      email: 'test@example.com',
      password: 'Password123!'
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockUserRepo.updateLastLogin.mockResolvedValue();
      mockJwt.sign.mockReturnValue('mock-token' as never);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.passwordHash);
      expect(mockUserRepo.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(result.user.email).toBe(loginData.email);
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error for invalid password', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
      expect(mockUserRepo.updateLastLogin).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify valid token', async () => {
      // Arrange
      const mockDecoded = { userId: mockUser.id, email: mockUser.email, role: mockUser.role };
      mockJwt.verify.mockReturnValue(mockDecoded as never);
      mockUserRepo.findById.mockResolvedValue(mockUser);

      // Act
      const result = await authService.verifyToken('valid-token');

      // Assert
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(mockUserRepo.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw error for invalid token', async () => {
      // Arrange
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(authService.verifyToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('should throw error if user not found', async () => {
      // Arrange
      const mockDecoded = { userId: 'non-existent-user', email: 'test@example.com', role: 'student' };
      mockJwt.verify.mockReturnValue(mockDecoded as never);
      mockUserRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.verifyToken('valid-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      // Arrange
      const mockDecoded = { userId: mockUser.id };
      mockJwt.verify.mockReturnValue(mockDecoded as never);
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('new-token' as never);

      // Act
      const result = await authService.refreshToken('valid-refresh-token');

      // Assert
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-refresh-token', expect.any(String));
      expect(mockUserRepo.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result.accessToken).toBe('new-token');
      expect(result.refreshToken).toBe('new-token');
    });

    it('should throw error for invalid refresh token', async () => {
      // Arrange
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(authService.refreshToken('invalid-refresh-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      // Arrange
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue('new-hashed-password' as never);
      mockUserRepo.updatePassword.mockResolvedValue();

      // Act
      await authService.changePassword(mockUser.id, 'currentPassword', 'newPassword123!');

      // Assert
      expect(mockUserRepo.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('currentPassword', mockUser.passwordHash);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword123!', 12);
      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith(mockUser.id, 'new-hashed-password');
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      mockUserRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.changePassword('non-existent-user', 'currentPassword', 'newPassword123!')
      ).rejects.toThrow('User not found');
    });

    it('should throw error for incorrect current password', async () => {
      // Arrange
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(
        authService.changePassword(mockUser.id, 'wrongPassword', 'newPassword123!')
      ).rejects.toThrow('Current password is incorrect');
      expect(mockUserRepo.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Act
      await authService.logout(mockUser.id);

      // Assert - should not throw any errors
      expect(true).toBe(true);
    });
  });
});