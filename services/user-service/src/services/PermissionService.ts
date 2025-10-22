import { UserRepository } from '@/database/repositories';
import { Permission, Role, UserRole, AccessAuditLog, PermissionAuditRequest } from '@/models';
import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('user-service', '1.0.0');

// Permission metrics
const permissionChecks = meter.createCounter('permission_checks_total', {
  description: 'Total permission checks performed'
});

const roleAssignments = meter.createCounter('role_assignments_total', {
  description: 'Total role assignments'
});

const accessDenials = meter.createCounter('access_denials_total', {
  description: 'Total access denials'
});

export class PermissionService {
  private userRepository: UserRepository;

  constructor(userRepository?: UserRepository) {
    this.userRepository = userRepository || new UserRepository();
  }

  // Default role definitions following least privilege principle
  private readonly defaultRoles: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'student',
      description: 'Basic student access with submission and dashboard viewing',
      permissions: [
        {
          id: 'student-dashboard-read',
          name: 'View Student Dashboard',
          resource: 'dashboard',
          action: 'read',
          conditions: { owner: true }
        },
        {
          id: 'submission-create',
          name: 'Create Submissions',
          resource: 'submission',
          action: 'create',
          conditions: { owner: true }
        },
        {
          id: 'submission-read-own',
          name: 'View Own Submissions',
          resource: 'submission',
          action: 'read',
          conditions: { owner: true }
        },
        {
          id: 'profile-read-own',
          name: 'View Own Profile',
          resource: 'profile',
          action: 'read',
          conditions: { owner: true }
        },
        {
          id: 'profile-update-own',
          name: 'Update Own Profile',
          resource: 'profile',
          action: 'update',
          conditions: { owner: true }
        }
      ]
    },
    {
      name: 'teacher',
      description: 'Teacher access with student monitoring and intervention capabilities',
      permissions: [
        {
          id: 'teacher-dashboard-read',
          name: 'View Teacher Dashboard',
          resource: 'teacher-dashboard',
          action: 'read'
        },
        {
          id: 'student-analytics-read',
          name: 'View Student Analytics',
          resource: 'analytics',
          action: 'read',
          conditions: { scope: 'assigned_students' }
        },
        {
          id: 'intervention-create',
          name: 'Create Interventions',
          resource: 'intervention',
          action: 'create'
        },
        {
          id: 'alert-manage',
          name: 'Manage Alerts',
          resource: 'alert',
          action: 'manage'
        },
        {
          id: 'report-generate',
          name: 'Generate Reports',
          resource: 'report',
          action: 'create'
        },
        {
          id: 'submission-read-students',
          name: 'View Student Submissions',
          resource: 'submission',
          action: 'read',
          conditions: { scope: 'assigned_students' }
        }
      ]
    },
    {
      name: 'admin',
      description: 'Full administrative access with user management and system configuration',
      permissions: [
        {
          id: 'user-manage',
          name: 'Manage Users',
          resource: 'user',
          action: 'manage'
        },
        {
          id: 'role-manage',
          name: 'Manage Roles',
          resource: 'role',
          action: 'manage'
        },
        {
          id: 'system-config',
          name: 'System Configuration',
          resource: 'system',
          action: 'configure'
        },
        {
          id: 'audit-read',
          name: 'View Audit Logs',
          resource: 'audit',
          action: 'read'
        },
        {
          id: 'security-manage',
          name: 'Manage Security Settings',
          resource: 'security',
          action: 'manage'
        },
        {
          id: 'analytics-read-all',
          name: 'View All Analytics',
          resource: 'analytics',
          action: 'read',
          conditions: { scope: 'all' }
        }
      ]
    }
  ];

  async initializeDefaultRoles(): Promise<void> {
    try {
      for (const roleData of this.defaultRoles) {
        await this.userRepository.createRoleIfNotExists(roleData);
      }
      logger.info('Default roles initialized');
    } catch (error) {
      logger.error('Failed to initialize default roles', { error });
      throw error;
    }
  }

  async checkPermission(
    userId: string, 
    resource: string, 
    action: string, 
    context: Record<string, any> = {}
  ): Promise<boolean> {
    permissionChecks.add(1, { resource, action });

    try {
      const userRoles = await this.userRepository.getUserRoles(userId);
      const user = await this.userRepository.findById(userId);
      
      if (!user || !user.isActive) {
        accessDenials.add(1, { reason: 'user_inactive', resource, action });
        await this.logAccess(userId, action, resource, 'denied', 'User inactive', context);
        return false;
      }

      // Check if user is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        accessDenials.add(1, { reason: 'user_locked', resource, action });
        await this.logAccess(userId, action, resource, 'denied', 'User locked', context);
        return false;
      }

      for (const userRole of userRoles) {
        if (!userRole.isActive || (userRole.expiresAt && userRole.expiresAt < new Date())) {
          continue;
        }

        const role = await this.userRepository.getRoleById(userRole.roleId);
        if (!role) continue;

        for (const permission of role.permissions) {
          if (permission.resource === resource && permission.action === action) {
            // Check conditions
            if (await this.evaluateConditions(permission.conditions, userId, context)) {
              await this.logAccess(userId, action, resource, 'granted', 'Permission granted', context);
              return true;
            }
          }
        }
      }

      accessDenials.add(1, { reason: 'insufficient_permissions', resource, action });
      await this.logAccess(userId, action, resource, 'denied', 'Insufficient permissions', context);
      return false;
    } catch (error) {
      logger.error('Permission check failed', { error, userId, resource, action });
      accessDenials.add(1, { reason: 'error', resource, action });
      await this.logAccess(userId, action, resource, 'denied', 'System error', context);
      return false;
    }
  }

  async assignRole(userId: string, roleName: string, assignedBy: string, expiresAt?: Date): Promise<void> {
    roleAssignments.add(1, { role: roleName, status: 'attempted' });

    try {
      const role = await this.userRepository.getRoleByName(roleName);
      if (!role) {
        roleAssignments.add(1, { role: roleName, status: 'failed', reason: 'role_not_found' });
        throw new Error(`Role ${roleName} not found`);
      }

      await this.userRepository.assignUserRole(userId, role.id, assignedBy, expiresAt);
      roleAssignments.add(1, { role: roleName, status: 'success' });

      logger.info('Role assigned', { userId, roleName, assignedBy, expiresAt });
    } catch (error) {
      roleAssignments.add(1, { role: roleName, status: 'failed', reason: 'unknown' });
      logger.error('Role assignment failed', { error, userId, roleName, assignedBy });
      throw error;
    }
  }

  async revokeRole(userId: string, roleName: string, revokedBy: string): Promise<void> {
    try {
      const role = await this.userRepository.getRoleByName(roleName);
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      await this.userRepository.revokeUserRole(userId, role.id, revokedBy);
      
      logger.info('Role revoked', { userId, roleName, revokedBy });
    } catch (error) {
      logger.error('Role revocation failed', { error, userId, roleName, revokedBy });
      throw error;
    }
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const userRoles = await this.userRepository.getUserRoles(userId);
      const permissions: Permission[] = [];

      for (const userRole of userRoles) {
        if (!userRole.isActive || (userRole.expiresAt && userRole.expiresAt < new Date())) {
          continue;
        }

        const role = await this.userRepository.getRoleById(userRole.roleId);
        if (role) {
          permissions.push(...role.permissions);
        }
      }

      // Remove duplicates
      const uniquePermissions = permissions.filter((permission, index, self) =>
        index === self.findIndex(p => p.id === permission.id)
      );

      return uniquePermissions;
    } catch (error) {
      logger.error('Failed to get user permissions', { error, userId });
      throw error;
    }
  }

  async auditPermissions(request: PermissionAuditRequest): Promise<AccessAuditLog[]> {
    try {
      return await this.userRepository.getAccessAuditLogs(request);
    } catch (error) {
      logger.error('Permission audit failed', { error, request });
      throw error;
    }
  }

  async scheduleQuarterlyReview(): Promise<void> {
    try {
      // Get all active user roles
      const activeRoles = await this.userRepository.getAllActiveUserRoles();
      
      // Create review tasks for roles that haven't been reviewed in 90 days
      const reviewThreshold = new Date();
      reviewThreshold.setDate(reviewThreshold.getDate() - 90);

      const rolesToReview = activeRoles.filter(role => 
        !role.lastReviewed || role.lastReviewed < reviewThreshold
      );

      for (const role of rolesToReview) {
        await this.userRepository.createPermissionReviewTask(role.userId, role.roleId);
      }

      logger.info('Quarterly permission review scheduled', { 
        totalRoles: activeRoles.length,
        rolesToReview: rolesToReview.length 
      });
    } catch (error) {
      logger.error('Failed to schedule quarterly review', { error });
      throw error;
    }
  }

  private async evaluateConditions(
    conditions: Record<string, any> | undefined,
    userId: string,
    context: Record<string, any>
  ): Promise<boolean> {
    if (!conditions) return true;

    // Owner condition - user can only access their own resources
    if (conditions.owner === true) {
      return context.resourceUserId === userId;
    }

    // Scope condition - limit access to specific scopes
    if (conditions.scope) {
      switch (conditions.scope) {
        case 'assigned_students':
          // Teachers can only access students assigned to them
          return await this.userRepository.isStudentAssignedToTeacher(context.studentId, userId);
        case 'all':
          // Admin access to all resources
          return true;
        default:
          return false;
      }
    }

    return true;
  }

  private async logAccess(
    userId: string,
    action: string,
    resource: string,
    result: 'granted' | 'denied',
    reason: string,
    context: Record<string, any>
  ): Promise<void> {
    try {
      const auditLog: Omit<AccessAuditLog, 'id' | 'timestamp'> = {
        userId,
        action,
        resource,
        result,
        reason,
        ipAddress: context.ipAddress || 'unknown',
        userAgent: context.userAgent || 'unknown'
      };

      await this.userRepository.createAccessAuditLog(auditLog);
    } catch (error) {
      logger.error('Failed to log access', { error, userId, action, resource });
    }
  }

  // AWS IAM Policy Simulator integration (mock implementation)
  async validatePolicyWithSimulator(policy: any): Promise<{ valid: boolean; issues: string[] }> {
    try {
      // This would integrate with AWS IAM Policy Simulator in a real implementation
      // For now, we'll do basic validation
      const issues: string[] = [];

      if (!policy.Version) {
        issues.push('Policy must have a Version field');
      }

      if (!policy.Statement || !Array.isArray(policy.Statement)) {
        issues.push('Policy must have a Statement array');
      }

      for (const statement of policy.Statement || []) {
        if (!statement.Effect || !['Allow', 'Deny'].includes(statement.Effect)) {
          issues.push('Each statement must have a valid Effect (Allow or Deny)');
        }

        if (!statement.Action) {
          issues.push('Each statement must have an Action');
        }

        if (!statement.Resource) {
          issues.push('Each statement must have a Resource');
        }
      }

      logger.info('Policy validation completed', { 
        valid: issues.length === 0, 
        issueCount: issues.length 
      });

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      logger.error('Policy validation failed', { error });
      throw error;
    }
  }
}