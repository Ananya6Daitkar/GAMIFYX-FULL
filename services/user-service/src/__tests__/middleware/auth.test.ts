import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, requireOwnership } from '@/middleware/auth';
import { AuthService } from '@/services/AuthService';
import { User } from '@/models';

// Mock dependencies
jest.mock('@/services/AuthService');
jest.mock('@/telemetry/logger');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

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
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      headers: {},
      correlationId: 'test-correlation-id'
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
    
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };
      
      const mockAuthServiceInstance = {
        verifyToken: jest.fn().mockResolvedValue(mockUser)
      };
      mockAuthService.mockImplementation(() => mockAuthServiceInstance as any);

      // Act
      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthServiceInstance.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      // Act
      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'InvalidFormat'
      };

      // Act
      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };
      
      const mockAuthServiceInstance = {
        verifyToken: jest.fn().mockRejectedValue(new Error('Invalid token'))
      };
      mockAuthService.mockImplementation(() => mockAuthServiceInstance as any);

      // Act
      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockRequest.user = mockUser;
    });

    it('should allow access for user with required role', () => {
      // Arrange
      const middleware = requireRole('student');

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should allow access for user with one of multiple required roles', () => {
      // Arrange
      const middleware = requireRole(['student', 'teacher']);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should deny access for user without required role', () => {
      // Arrange
      const middleware = requireRole('admin');

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource',
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated user', () => {
      // Arrange
      mockRequest.user = undefined;
      const middleware = requireRole('student');

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    beforeEach(() => {
      mockRequest.user = mockUser;
      mockRequest.params = { id: 'user-123' };
    });

    it('should allow access for user accessing their own resource', () => {
      // Act
      requireOwnership(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should allow access for admin user accessing any resource', () => {
      // Arrange
      mockRequest.user = { ...mockUser, role: 'admin' };
      mockRequest.params = { id: 'other-user-id' };

      // Act
      requireOwnership(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should allow access for teacher user accessing any resource', () => {
      // Arrange
      mockRequest.user = { ...mockUser, role: 'teacher' };
      mockRequest.params = { id: 'other-user-id' };

      // Act
      requireOwnership(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should deny access for user accessing another user resource', () => {
      // Arrange
      mockRequest.params = { id: 'other-user-id' };

      // Act
      requireOwnership(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own resources',
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated user', () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      requireOwnership(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should work with userId parameter', () => {
      // Arrange
      mockRequest.params = { userId: 'user-123' };

      // Act
      requireOwnership(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });
});