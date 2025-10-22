import { MFAService } from '@/services/MFAService';
import { PermissionService } from '@/services/PermissionService';
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/database/repositories/UserRepository';

// Mock dependencies
jest.mock('@/database/repositories/UserRepository');
jest.mock('@/telemetry/logger');

describe('IAM System Tests', () => {
  let mfaService: MFAService;
  let permissionService: PermissionService;
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mfaService = new MFAService(mockUserRepository);
    permissionService = new PermissionService(mockUserRepository);
    authService = new AuthService(mockUserRepository);
  });

  describe('MFA Service', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      role: 'teacher' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      mfaEnabled: false,
      failedLoginAttempts: 0
    };

    it('should setup MFA for a user', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.storeMFASecret.mockResolvedValue();

      const result = await mfaService.setupMFA('user-123');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(mockUserRepository.storeMFASecret).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should verify MFA setup with valid token', async () => {
      const userWithSecret = {
        ...mockUser,
        mfaSecret: 'JBSWY3DPEHPK3PXP'
      };
      
      mockUserRepository.findById.mockResolvedValue(userWithSecret);
      mockUserRepository.enableMFA.mockResolvedValue();

      // Mock speakeasy verification to return true
      jest.doMock('speakeasy', () => ({
        totp: {
          verify: jest.fn().mockReturnValue(true)
        }
      }));

      const result = await mfaService.verifyMFASetup('user-123', '123456');

      expect(result).toBe(true);
      expect(mockUserRepository.enableMFA).toHaveBeenCalledWith('user-123');
    });

    it('should reject invalid MFA token', async () => {
      const userWithSecret = {
        ...mockUser,
        mfaSecret: 'JBSWY3DPEHPK3PXP'
      };
      
      mockUserRepository.findById.mockResolvedValue(userWithSecret);

      // Mock speakeasy verification to return false
      jest.doMock('speakeasy', () => ({
        totp: {
          verify: jest.fn().mockReturnValue(false)
        }
      }));

      const result = await mfaService.verifyMFASetup('user-123', 'invalid');

      expect(result).toBe(false);
      expect(mockUserRepository.enableMFA).not.toHaveBeenCalled();
    });
  });

  describe('Permission Service', () => {
    const mockStudent = {
      id: 'student-123',
      email: 'student@example.com',
      role: 'student' as const,
      isActive: true,
      lockedUntil: null
    };

    const mockTeacher = {
      id: 'teacher-123',
      email: 'teacher@example.com',
      role: 'teacher' as const,
      isActive: true,
      lockedUntil: null
    };

    const mockStudentRole = {
      id: 'role-student',
      name: 'student',
      description: 'Student role',
      permissions: [
        {
          id: 'dashboard-read',
          name: 'View Dashboard',
          resource: 'dashboard',
          action: 'read',
          conditions: { owner: true }
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockUserRole = {
      id: 'user-role-123',
      userId: 'student-123',
      roleId: 'role-student',
      assignedBy: 'admin-123',
      assignedAt: new Date(),
      isActive: true
    };

    it('should grant permission for resource owner', async () => {
      mockUserRepository.getUserRoles.mockResolvedValue([mockUserRole]);
      mockUserRepository.findById.mockResolvedValue(mockStudent);
      mockUserRepository.getRoleById.mockResolvedValue(mockStudentRole);
      mockUserRepository.createAccessAuditLog.mockResolvedValue();

      const hasPermission = await permissionService.checkPermission(
        'student-123',
        'dashboard',
        'read',
        { resourceUserId: 'student-123' }
      );

      expect(hasPermission).toBe(true);
      expect(mockUserRepository.createAccessAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'student-123',
          action: 'read',
          resource: 'dashboard',
          result: 'granted'
        })
      );
    });

    it('should deny permission for non-owner', async () => {
      mockUserRepository.getUserRoles.mockResolvedValue([mockUserRole]);
      mockUserRepository.findById.mockResolvedValue(mockStudent);
      mockUserRepository.getRoleById.mockResolvedValue(mockStudentRole);
      mockUserRepository.createAccessAuditLog.mockResolvedValue();

      const hasPermission = await permissionService.checkPermission(
        'student-123',
        'dashboard',
        'read',
        { resourceUserId: 'other-student-456' }
      );

      expect(hasPermission).toBe(false);
      expect(mockUserRepository.createAccessAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'student-123',
          action: 'read',
          resource: 'dashboard',
          result: 'denied'
        })
      );
    });

    it('should deny permission for locked user', async () => {
      const lockedUser = {
        ...mockStudent,
        lockedUntil: new Date(Date.now() + 60000) // Locked for 1 minute
      };

      mockUserRepository.findById.mockResolvedValue(lockedUser);
      mockUserRepository.createAccessAuditLog.mockResolvedValue();

      const hasPermission = await permissionService.checkPermission(
        'student-123',
        'dashboard',
        'read',
        { resourceUserId: 'student-123' }
      );

      expect(hasPermission).toBe(false);
      expect(mockUserRepository.createAccessAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'denied',
          reason: 'User locked'
        })
      );
    });

    it('should assign role successfully', async () => {
      mockUserRepository.getRoleByName.mockResolvedValue(mockStudentRole);
      mockUserRepository.assignUserRole.mockResolvedValue();

      await permissionService.assignRole('user-123', 'student', 'admin-123');

      expect(mockUserRepository.assignUserRole).toHaveBeenCalledWith(
        'user-123',
        'role-student',
        'admin-123',
        undefined
      );
    });

    it('should validate IAM policy correctly', async () => {
      const validPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: 'dashboard:read',
            Resource: 'arn:aws:dashboard:*'
          }
        ]
      };

      const result = await permissionService.validatePolicyWithSimulator(validPolicy);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect invalid IAM policy', async () => {
      const invalidPolicy = {
        Statement: [
          {
            // Missing Effect, Action, Resource
          }
        ]
      };

      const result = await permissionService.validatePolicyWithSimulator(invalidPolicy);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Authentication with MFA', () => {
    const mockUser = {
      id: 'user-123',
      email: 'teacher@example.com',
      passwordHash: '$2b$12$hashedpassword',
      firstName: 'Test',
      lastName: 'Teacher',
      role: 'teacher' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
      failedLoginAttempts: 0,
      lockedUntil: null
    };

    it('should require MFA for teacher login', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      
      // Mock bcrypt to return true for password verification
      jest.doMock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(true)
      }));

      const result = await authService.login({
        email: 'teacher@example.com',
        password: 'password123'
      });

      expect(result).toHaveProperty('requiresMFA', true);
      expect(result).toHaveProperty('tempToken');
    });

    it('should complete login with valid MFA token', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.resetFailedLoginAttempts.mockResolvedValue();
      mockUserRepository.updateLastLogin.mockResolvedValue();

      // Mock bcrypt and MFA verification
      jest.doMock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(true)
      }));

      // Mock MFA service verification
      const mockMFAService = {
        verifyMFA: jest.fn().mockResolvedValue(true)
      };
      jest.doMock('@/services/MFAService', () => ({
        MFAService: jest.fn().mockImplementation(() => mockMFAService)
      }));

      const result = await authService.login({
        email: 'teacher@example.com',
        password: 'password123',
        mfaToken: '123456'
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should lock user after failed login attempts', async () => {
      const userWithFailedAttempts = {
        ...mockUser,
        failedLoginAttempts: 4
      };

      mockUserRepository.findByEmail.mockResolvedValue(userWithFailedAttempts);
      mockUserRepository.incrementFailedLoginAttempts.mockResolvedValue();
      mockUserRepository.lockUser.mockResolvedValue();

      // Mock bcrypt to return false for password verification
      jest.doMock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(false)
      }));

      await expect(authService.login({
        email: 'teacher@example.com',
        password: 'wrongpassword'
      })).rejects.toThrow('Invalid credentials');

      expect(mockUserRepository.lockUser).toHaveBeenCalledWith('user-123', 30);
    });
  });

  describe('Quarterly Permission Review', () => {
    it('should schedule review for stale permissions', async () => {
      const staleRoles = [
        {
          userId: 'user-1',
          roleId: 'role-1',
          lastReviewed: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) // 100 days ago
        },
        {
          userId: 'user-2',
          roleId: 'role-2',
          lastReviewed: null
        }
      ];

      mockUserRepository.getAllActiveUserRoles.mockResolvedValue(staleRoles);
      mockUserRepository.createPermissionReviewTask.mockResolvedValue();

      await permissionService.scheduleQuarterlyReview();

      expect(mockUserRepository.createPermissionReviewTask).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.createPermissionReviewTask).toHaveBeenCalledWith('user-1', 'role-1');
      expect(mockUserRepository.createPermissionReviewTask).toHaveBeenCalledWith('user-2', 'role-2');
    });
  });
});