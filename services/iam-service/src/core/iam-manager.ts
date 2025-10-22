/**
 * IAM Manager - Core Identity and Access Management system for GamifyX
 * Provides comprehensive authentication, authorization, and access control
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { AuthenticationService } from './authentication-service';
import { AuthorizationService } from './authorization-service';
import { RoleManager } from './role-manager';
import { PermissionManager } from './permission-manager';
import { SessionManager } from './session-manager';
import { AuditLogger } from './audit-logger';
import { PolicyEngine } from './policy-engine';
import { MFAService } from './mfa-service';
import { 
  User, 
  Role, 
  Permission, 
  Session, 
  AuthenticationResult, 
  AuthorizationResult,
  IAMConfig,
  AccessRequest,
  PolicyEvaluationResult
} from '../types/iam-types';

export class IAMManager extends EventEmitter {
  private logger: Logger;
  private config: IAMConfig;
  private authService: AuthenticationService;
  private authzService: AuthorizationService;
  private roleManager: RoleManager;
  private permissionManager: PermissionManager;
  private sessionManager: SessionManager;
  private auditLogger: AuditLogger;
  private policyEngine: PolicyEngine;
  private mfaService: MFAService;

  constructor(config: IAMConfig) {
    super();
    this.config = config;
    this.logger = new Logger('IAMManager');
    
    // Initialize core services
    this.authService = new AuthenticationService(config.authentication);
    this.authzService = new AuthorizationService(config.authorization);
    this.roleManager = new RoleManager(config.roles);
    this.permissionManager = new PermissionManager(config.permissions);
    this.sessionManager = new SessionManager(config.sessions);
    this.auditLogger = new AuditLogger(config.audit);
    this.policyEngine = new PolicyEngine(config.policies);
    this.mfaService = new MFAService(config.mfa);
    
    this.setupEventHandlers();
  }

  /**
   * Authenticate user with comprehensive security checks
   */
  async authenticate(credentials: any): Promise<AuthenticationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting authentication process', { 
        username: credentials.username,
        method: credentials.method 
      });

      // Primary authentication
      const authResult = await this.authService.authenticate(credentials);
      
      if (!authResult.success) {
        await this.auditLogger.logAuthenticationFailure(credentials, authResult.reason);
        return authResult;
      }

      // MFA verification if required
      if (this.requiresMFA(authResult.user)) {
        const mfaResult = await this.mfaService.verify(authResult.user, credentials.mfaToken);
        if (!mfaResult.success) {
          await this.auditLogger.logMFAFailure(authResult.user, mfaResult.reason);
          return { success: false, reason: 'MFA verification failed' };
        }
      }

      // Create session
      const session = await this.sessionManager.createSession(authResult.user);
      
      // Log successful authentication
      await this.auditLogger.logAuthenticationSuccess(authResult.user, session);
      
      const duration = Date.now() - startTime;
      this.emit('authentication:success', { user: authResult.user, session, duration });
      
      return {
        success: true,
        user: authResult.user,
        session,
        token: session.token
      };
      
    } catch (error) {
      this.logger.error('Authentication error', error);
      await this.auditLogger.logAuthenticationError(credentials, error);
      return { success: false, reason: 'Authentication system error' };
    }
  } 
 /**
   * Authorize access request with fine-grained permission checking
   */
  async authorize(accessRequest: AccessRequest): Promise<AuthorizationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Processing authorization request', accessRequest);

      // Validate session
      const session = await this.sessionManager.validateSession(accessRequest.sessionToken);
      if (!session.valid) {
        await this.auditLogger.logAuthorizationFailure(accessRequest, 'Invalid session');
        return { authorized: false, reason: 'Invalid or expired session' };
      }

      // Get user with current roles and permissions
      const user = await this.getUserWithPermissions(session.userId);
      if (!user) {
        await this.auditLogger.logAuthorizationFailure(accessRequest, 'User not found');
        return { authorized: false, reason: 'User not found' };
      }

      // Evaluate policies
      const policyResult = await this.policyEngine.evaluate({
        user,
        resource: accessRequest.resource,
        action: accessRequest.action,
        context: accessRequest.context
      });

      if (!policyResult.allowed) {
        await this.auditLogger.logAuthorizationFailure(accessRequest, policyResult.reason);
        return { 
          authorized: false, 
          reason: policyResult.reason,
          requiredPermissions: policyResult.requiredPermissions
        };
      }

      // Check fine-grained permissions
      const hasPermission = await this.authzService.hasPermission(
        user,
        accessRequest.resource,
        accessRequest.action,
        accessRequest.context
      );

      if (!hasPermission.authorized) {
        await this.auditLogger.logAuthorizationFailure(accessRequest, hasPermission.reason);
        return hasPermission;
      }

      // Log successful authorization
      await this.auditLogger.logAuthorizationSuccess(accessRequest, user);
      
      const duration = Date.now() - startTime;
      this.emit('authorization:success', { user, accessRequest, duration });
      
      return {
        authorized: true,
        user,
        permissions: hasPermission.permissions,
        context: hasPermission.context
      };
      
    } catch (error) {
      this.logger.error('Authorization error', error);
      await this.auditLogger.logAuthorizationError(accessRequest, error);
      return { authorized: false, reason: 'Authorization system error' };
    }
  }

  /**
   * Create new user with role assignment
   */
  async createUser(userData: Partial<User>, createdBy: string): Promise<User> {
    try {
      this.logger.info('Creating new user', { username: userData.username, createdBy });

      // Validate user data
      const validationResult = await this.validateUserData(userData);
      if (!validationResult.valid) {
        throw new Error(`Invalid user data: ${validationResult.errors.join(', ')}`);
      }

      // Create user
      const user = await this.authService.createUser(userData);
      
      // Assign default roles
      if (userData.roles) {
        for (const roleId of userData.roles) {
          await this.roleManager.assignRole(user.id, roleId, createdBy);
        }
      }

      // Log user creation
      await this.auditLogger.logUserCreation(user, createdBy);
      
      this.emit('user:created', { user, createdBy });
      
      return user;
      
    } catch (error) {
      this.logger.error('User creation error', error);
      throw error;
    }
  }

  /**
   * Update user roles and permissions
   */
  async updateUserRoles(userId: string, roleIds: string[], updatedBy: string): Promise<void> {
    try {
      this.logger.info('Updating user roles', { userId, roleIds, updatedBy });

      const user = await this.authService.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get current roles
      const currentRoles = await this.roleManager.getUserRoles(userId);
      const currentRoleIds = currentRoles.map(r => r.id);

      // Determine roles to add and remove
      const rolesToAdd = roleIds.filter(id => !currentRoleIds.includes(id));
      const rolesToRemove = currentRoleIds.filter(id => !roleIds.includes(id));

      // Remove roles
      for (const roleId of rolesToRemove) {
        await this.roleManager.unassignRole(userId, roleId, updatedBy);
      }

      // Add roles
      for (const roleId of rolesToAdd) {
        await this.roleManager.assignRole(userId, roleId, updatedBy);
      }

      // Invalidate user sessions to force re-authentication
      await this.sessionManager.invalidateUserSessions(userId);

      // Log role changes
      await this.auditLogger.logRoleChange(userId, currentRoleIds, roleIds, updatedBy);
      
      this.emit('user:roles:updated', { userId, oldRoles: currentRoleIds, newRoles: roleIds, updatedBy });
      
    } catch (error) {
      this.logger.error('Role update error', error);
      throw error;
    }
  }

  /**
   * Create custom role with permissions
   */
  async createRole(roleData: Partial<Role>, createdBy: string): Promise<Role> {
    try {
      this.logger.info('Creating new role', { name: roleData.name, createdBy });

      const role = await this.roleManager.createRole(roleData, createdBy);
      
      // Assign permissions if provided
      if (roleData.permissions) {
        for (const permissionId of roleData.permissions) {
          await this.permissionManager.assignPermissionToRole(role.id, permissionId, createdBy);
        }
      }

      await this.auditLogger.logRoleCreation(role, createdBy);
      
      this.emit('role:created', { role, createdBy });
      
      return role;
      
    } catch (error) {
      this.logger.error('Role creation error', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive access audit
   */
  async performAccessAudit(auditScope?: string): Promise<any> {
    try {
      this.logger.info('Starting access audit', { scope: auditScope });

      const auditResults = {
        timestamp: new Date(),
        scope: auditScope || 'full',
        users: await this.auditUsers(),
        roles: await this.auditRoles(),
        permissions: await this.auditPermissions(),
        sessions: await this.auditSessions(),
        policies: await this.auditPolicies(),
        recommendations: []
      };

      // Generate recommendations
      auditResults.recommendations = await this.generateAuditRecommendations(auditResults);

      await this.auditLogger.logAccessAudit(auditResults);
      
      this.emit('audit:completed', auditResults);
      
      return auditResults;
      
    } catch (error) {
      this.logger.error('Access audit error', error);
      throw error;
    }
  }

  // Private helper methods
  private setupEventHandlers(): void {
    this.authService.on('user:locked', (user) => {
      this.sessionManager.invalidateUserSessions(user.id);
      this.emit('user:locked', user);
    });

    this.sessionManager.on('session:expired', (session) => {
      this.emit('session:expired', session);
    });

    this.policyEngine.on('policy:violation', (violation) => {
      this.auditLogger.logPolicyViolation(violation);
      this.emit('policy:violation', violation);
    });
  }

  private requiresMFA(user: User): boolean {
    return user.mfaEnabled || 
           user.roles?.some(role => role.requiresMFA) ||
           this.config.mfa.enforceForAll;
  }

  private async getUserWithPermissions(userId: string): Promise<User | null> {
    const user = await this.authService.getUser(userId);
    if (!user) return null;

    user.roles = await this.roleManager.getUserRoles(userId);
    user.permissions = await this.permissionManager.getUserPermissions(userId);
    
    return user;
  }

  private async validateUserData(userData: Partial<User>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!userData.username || userData.username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Valid email address is required');
    }

    if (userData.roles) {
      for (const roleId of userData.roles) {
        const role = await this.roleManager.getRole(roleId);
        if (!role) {
          errors.push(`Role ${roleId} does not exist`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async auditUsers(): Promise<any> {
    // Implementation for user audit
    return {};
  }

  private async auditRoles(): Promise<any> {
    // Implementation for role audit
    return {};
  }

  private async auditPermissions(): Promise<any> {
    // Implementation for permission audit
    return {};
  }

  private async auditSessions(): Promise<any> {
    // Implementation for session audit
    return {};
  }

  private async auditPolicies(): Promise<any> {
    // Implementation for policy audit
    return {};
  }

  private async generateAuditRecommendations(auditResults: any): Promise<string[]> {
    // Implementation for generating audit recommendations
    return [];
  }
}