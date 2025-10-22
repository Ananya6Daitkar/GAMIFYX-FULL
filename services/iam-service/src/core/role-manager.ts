/**
 * Role Manager - Advanced Role-Based Access Control (RBAC) for GamifyX
 * Supports hierarchical roles, dynamic permissions, and fine-grained access control
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { DatabaseClient } from '../utils/database-client';
import { CacheManager } from '../utils/cache-manager';
import { 
  Role, 
  Permission, 
  User, 
  RoleHierarchy,
  RoleAssignment,
  RoleConfig,
  PermissionSet,
  AccessContext,
  RoleTemplate
} from '../types/iam-types';

export class RoleManager extends EventEmitter {
  private logger: Logger;
  private config: RoleConfig;
  private db: DatabaseClient;
  private cache: CacheManager;
  private roleHierarchy: Map<string, string[]> = new Map();

  constructor(config: RoleConfig) {
    super();
    this.config = config;
    this.logger = new Logger('RoleManager');
    this.db = new DatabaseClient(config.database);
    this.cache = new CacheManager(config.cache);
    
    this.initializeRoleHierarchy();
  }

  /**
   * Create a new role with permissions
   */
  async createRole(roleData: Partial<Role>, createdBy: string): Promise<Role> {
    try {
      this.logger.info('Creating new role', { name: roleData.name, createdBy });

      // Validate role data
      await this.validateRoleData(roleData);

      // Check for duplicate role name
      const existingRole = await this.getRoleByName(roleData.name!);
      if (existingRole) {
        throw new Error(`Role with name '${roleData.name}' already exists`);
      }

      const role: Role = {
        id: this.generateRoleId(),
        name: roleData.name!,
        displayName: roleData.displayName || roleData.name!,
        description: roleData.description || '',
        type: roleData.type || 'custom',
        level: roleData.level || 0,
        parentRoleId: roleData.parentRoleId,
        permissions: roleData.permissions || [],
        isActive: roleData.isActive !== false,
        isSystem: roleData.isSystem || false,
        metadata: roleData.metadata || {},
        createdBy,
        createdAt: new Date(),
        updatedBy: createdBy,
        updatedAt: new Date()
      };

      // Save role to database
      await this.db.query(
        'INSERT INTO roles (id, name, display_name, description, type, level, parent_role_id, permissions, is_active, is_system, metadata, created_by, created_at, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          role.id, role.name, role.displayName, role.description, role.type,
          role.level, role.parentRoleId, JSON.stringify(role.permissions),
          role.isActive, role.isSystem, JSON.stringify(role.metadata),
          role.createdBy, role.createdAt, role.updatedBy, role.updatedAt
        ]
      );

      // Update role hierarchy
      if (role.parentRoleId) {
        await this.updateRoleHierarchy(role.id, role.parentRoleId);
      }

      // Clear cache
      await this.cache.del(`role:${role.id}`);
      await this.cache.del('roles:all');

      this.emit('role:created', { role, createdBy });

      return role;

    } catch (error) {
      this.logger.error('Role creation error', error);
      throw error;
    }
  }

  /**
   * Get role by ID with inherited permissions
   */
  async getRole(roleId: string): Promise<Role | null> {
    try {
      // Check cache first
      const cached = await this.cache.get(`role:${roleId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await this.db.query(
        'SELECT * FROM roles WHERE id = ? AND is_active = true',
        [roleId]
      );

      if (result.length === 0) {
        return null;
      }

      const role = this.mapDatabaseRowToRole(result[0]);
      
      // Get inherited permissions
      role.inheritedPermissions = await this.getInheritedPermissions(roleId);
      
      // Get effective permissions (direct + inherited)
      role.effectivePermissions = await this.getEffectivePermissions(roleId);

      // Cache the role
      await this.cache.setex(`role:${roleId}`, 300, JSON.stringify(role));

      return role;

    } catch (error) {
      this.logger.error('Get role error', error);
      throw error;
    }
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string): Promise<Role | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM roles WHERE name = ? AND is_active = true',
        [name]
      );

      if (result.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToRole(result[0]);

    } catch (error) {
      this.logger.error('Get role by name error', error);
      throw error;
    }
  }

  /**
   * Get all roles with hierarchy information
   */
  async getAllRoles(): Promise<Role[]> {
    try {
      // Check cache first
      const cached = await this.cache.get('roles:all');
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await this.db.query(
        'SELECT * FROM roles WHERE is_active = true ORDER BY level ASC, name ASC'
      );

      const roles = result.map(row => this.mapDatabaseRowToRole(row));

      // Build role hierarchy
      const roleMap = new Map<string, Role>();
      roles.forEach(role => roleMap.set(role.id, role));

      roles.forEach(role => {
        if (role.parentRoleId && roleMap.has(role.parentRoleId)) {
          const parent = roleMap.get(role.parentRoleId)!;
          if (!parent.childRoles) parent.childRoles = [];
          parent.childRoles.push(role);
          role.parentRole = parent;
        }
      });

      // Cache the roles
      await this.cache.setex('roles:all', 300, JSON.stringify(roles));

      return roles;

    } catch (error) {
      this.logger.error('Get all roles error', error);
      throw error;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string, assignedBy: string, context?: AccessContext): Promise<RoleAssignment> {
    try {
      this.logger.info('Assigning role to user', { userId, roleId, assignedBy });

      // Validate role exists
      const role = await this.getRole(roleId);
      if (!role) {
        throw new Error(`Role ${roleId} not found`);
      }

      // Check if user already has this role
      const existingAssignment = await this.getUserRoleAssignment(userId, roleId);
      if (existingAssignment) {
        throw new Error(`User ${userId} already has role ${roleId}`);
      }

      // Check role assignment constraints
      await this.validateRoleAssignment(userId, roleId, assignedBy);

      const assignment: RoleAssignment = {
        id: this.generateAssignmentId(),
        userId,
        roleId,
        assignedBy,
        assignedAt: new Date(),
        expiresAt: context?.expiresAt,
        conditions: context?.conditions || {},
        isActive: true,
        metadata: context?.metadata || {}
      };

      // Save assignment to database
      await this.db.query(
        'INSERT INTO role_assignments (id, user_id, role_id, assigned_by, assigned_at, expires_at, conditions, is_active, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          assignment.id, assignment.userId, assignment.roleId,
          assignment.assignedBy, assignment.assignedAt, assignment.expiresAt,
          JSON.stringify(assignment.conditions), assignment.isActive,
          JSON.stringify(assignment.metadata)
        ]
      );

      // Clear user role cache
      await this.cache.del(`user_roles:${userId}`);
      await this.cache.del(`user_permissions:${userId}`);

      this.emit('role:assigned', { assignment, assignedBy });

      return assignment;

    } catch (error) {
      this.logger.error('Role assignment error', error);
      throw error;
    }
  }

  /**
   * Unassign role from user
   */
  async unassignRole(userId: string, roleId: string, unassignedBy: string): Promise<void> {
    try {
      this.logger.info('Unassigning role from user', { userId, roleId, unassignedBy });

      const assignment = await this.getUserRoleAssignment(userId, roleId);
      if (!assignment) {
        throw new Error(`User ${userId} does not have role ${roleId}`);
      }

      // Deactivate assignment
      await this.db.query(
        'UPDATE role_assignments SET is_active = false, unassigned_by = ?, unassigned_at = ? WHERE id = ?',
        [unassignedBy, new Date(), assignment.id]
      );

      // Clear user role cache
      await this.cache.del(`user_roles:${userId}`);
      await this.cache.del(`user_permissions:${userId}`);

      this.emit('role:unassigned', { assignment, unassignedBy });

    } catch (error) {
      this.logger.error('Role unassignment error', error);
      throw error;
    }
  }

  /**
   * Get user's roles with hierarchy
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      // Check cache first
      const cached = await this.cache.get(`user_roles:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await this.db.query(`
        SELECT r.* FROM roles r
        JOIN role_assignments ra ON r.id = ra.role_id
        WHERE ra.user_id = ? AND ra.is_active = true AND r.is_active = true
        AND (ra.expires_at IS NULL OR ra.expires_at > NOW())
        ORDER BY r.level ASC
      `, [userId]);

      const roles = result.map(row => this.mapDatabaseRowToRole(row));

      // Add inherited roles from hierarchy
      const allRoles = new Set<Role>();
      
      for (const role of roles) {
        allRoles.add(role);
        const inheritedRoles = await this.getInheritedRoles(role.id);
        inheritedRoles.forEach(inheritedRole => allRoles.add(inheritedRole));
      }

      const userRoles = Array.from(allRoles);

      // Cache the result
      await this.cache.setex(`user_roles:${userId}`, 300, JSON.stringify(userRoles));

      return userRoles;

    } catch (error) {
      this.logger.error('Get user roles error', error);
      throw error;
    }
  }

  /**
   * Check if user has specific role
   */
  async userHasRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);
      return userRoles.some(role => role.id === roleId);
    } catch (error) {
      this.logger.error('User has role check error', error);
      return false;
    }
  }

  /**
   * Get effective permissions for a role (including inherited)
   */
  async getEffectivePermissions(roleId: string): Promise<Permission[]> {
    try {
      const role = await this.getRole(roleId);
      if (!role) {
        return [];
      }

      const permissions = new Map<string, Permission>();

      // Add direct permissions
      role.permissions?.forEach(permId => {
        // This would fetch the actual permission object
        permissions.set(permId, { id: permId, name: permId } as Permission);
      });

      // Add inherited permissions
      const inheritedPermissions = await this.getInheritedPermissions(roleId);
      inheritedPermissions.forEach(perm => {
        permissions.set(perm.id, perm);
      });

      return Array.from(permissions.values());

    } catch (error) {
      this.logger.error('Get effective permissions error', error);
      throw error;
    }
  }

  /**
   * Create role template for common role patterns
   */
  async createRoleTemplate(template: RoleTemplate, createdBy: string): Promise<RoleTemplate> {
    try {
      this.logger.info('Creating role template', { name: template.name, createdBy });

      const templateWithId: RoleTemplate = {
        ...template,
        id: this.generateTemplateId(),
        createdBy,
        createdAt: new Date()
      };

      await this.db.query(
        'INSERT INTO role_templates (id, name, description, role_data, permissions, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          templateWithId.id, templateWithId.name, templateWithId.description,
          JSON.stringify(templateWithId.roleData), JSON.stringify(templateWithId.permissions),
          templateWithId.createdBy, templateWithId.createdAt
        ]
      );

      this.emit('role_template:created', { template: templateWithId, createdBy });

      return templateWithId;

    } catch (error) {
      this.logger.error('Role template creation error', error);
      throw error;
    }
  }

  /**
   * Apply role template to create new role
   */
  async applyRoleTemplate(templateId: string, roleData: Partial<Role>, appliedBy: string): Promise<Role> {
    try {
      const template = await this.getRoleTemplate(templateId);
      if (!template) {
        throw new Error(`Role template ${templateId} not found`);
      }

      const mergedRoleData = {
        ...template.roleData,
        ...roleData,
        permissions: [...(template.permissions || []), ...(roleData.permissions || [])]
      };

      return await this.createRole(mergedRoleData, appliedBy);

    } catch (error) {
      this.logger.error('Apply role template error', error);
      throw error;
    }
  }

  // Private helper methods

  private async initializeRoleHierarchy(): Promise<void> {
    try {
      const roles = await this.getAllRoles();
      
      roles.forEach(role => {
        if (role.parentRoleId) {
          if (!this.roleHierarchy.has(role.parentRoleId)) {
            this.roleHierarchy.set(role.parentRoleId, []);
          }
          this.roleHierarchy.get(role.parentRoleId)!.push(role.id);
        }
      });

    } catch (error) {
      this.logger.error('Initialize role hierarchy error', error);
    }
  }

  private async validateRoleData(roleData: Partial<Role>): Promise<void> {
    if (!roleData.name || roleData.name.trim().length === 0) {
      throw new Error('Role name is required');
    }

    if (roleData.name.length > 100) {
      throw new Error('Role name must be 100 characters or less');
    }

    if (roleData.parentRoleId) {
      const parentRole = await this.getRole(roleData.parentRoleId);
      if (!parentRole) {
        throw new Error(`Parent role ${roleData.parentRoleId} not found`);
      }
    }
  }

  private async validateRoleAssignment(userId: string, roleId: string, assignedBy: string): Promise<void> {
    // Check maximum roles per user
    const userRoles = await this.getUserRoles(userId);
    if (userRoles.length >= this.config.maxRolesPerUser) {
      throw new Error(`User cannot have more than ${this.config.maxRolesPerUser} roles`);
    }

    // Check role conflicts
    const role = await this.getRole(roleId);
    if (role?.metadata?.conflictsWith) {
      const conflictingRoles = role.metadata.conflictsWith as string[];
      const hasConflict = userRoles.some(userRole => conflictingRoles.includes(userRole.id));
      if (hasConflict) {
        throw new Error(`Role ${roleId} conflicts with user's existing roles`);
      }
    }
  }

  private async getInheritedPermissions(roleId: string): Promise<Permission[]> {
    const permissions: Permission[] = [];
    const visited = new Set<string>();

    const collectPermissions = async (currentRoleId: string) => {
      if (visited.has(currentRoleId)) return;
      visited.add(currentRoleId);

      const role = await this.getRole(currentRoleId);
      if (!role || !role.parentRoleId) return;

      const parentRole = await this.getRole(role.parentRoleId);
      if (parentRole) {
        // Add parent's direct permissions
        if (parentRole.permissions) {
          parentRole.permissions.forEach(permId => {
            permissions.push({ id: permId, name: permId } as Permission);
          });
        }

        // Recursively collect from parent's parent
        await collectPermissions(parentRole.id);
      }
    };

    await collectPermissions(roleId);
    return permissions;
  }

  private async getInheritedRoles(roleId: string): Promise<Role[]> {
    const roles: Role[] = [];
    const visited = new Set<string>();

    const collectRoles = async (currentRoleId: string) => {
      if (visited.has(currentRoleId)) return;
      visited.add(currentRoleId);

      const role = await this.getRole(currentRoleId);
      if (!role || !role.parentRoleId) return;

      const parentRole = await this.getRole(role.parentRoleId);
      if (parentRole) {
        roles.push(parentRole);
        await collectRoles(parentRole.id);
      }
    };

    await collectRoles(roleId);
    return roles;
  }

  private async updateRoleHierarchy(roleId: string, parentRoleId: string): Promise<void> {
    if (!this.roleHierarchy.has(parentRoleId)) {
      this.roleHierarchy.set(parentRoleId, []);
    }
    this.roleHierarchy.get(parentRoleId)!.push(roleId);
  }

  private async getUserRoleAssignment(userId: string, roleId: string): Promise<RoleAssignment | null> {
    const result = await this.db.query(
      'SELECT * FROM role_assignments WHERE user_id = ? AND role_id = ? AND is_active = true',
      [userId, roleId]
    );

    if (result.length === 0) {
      return null;
    }

    return this.mapDatabaseRowToAssignment(result[0]);
  }

  private async getRoleTemplate(templateId: string): Promise<RoleTemplate | null> {
    const result = await this.db.query(
      'SELECT * FROM role_templates WHERE id = ?',
      [templateId]
    );

    if (result.length === 0) {
      return null;
    }

    return this.mapDatabaseRowToTemplate(result[0]);
  }

  private mapDatabaseRowToRole(row: any): Role {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      type: row.type,
      level: row.level,
      parentRoleId: row.parent_role_id,
      permissions: JSON.parse(row.permissions || '[]'),
      isActive: row.is_active,
      isSystem: row.is_system,
      metadata: JSON.parse(row.metadata || '{}'),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at
    };
  }

  private mapDatabaseRowToAssignment(row: any): RoleAssignment {
    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      assignedBy: row.assigned_by,
      assignedAt: row.assigned_at,
      expiresAt: row.expires_at,
      conditions: JSON.parse(row.conditions || '{}'),
      isActive: row.is_active,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private mapDatabaseRowToTemplate(row: any): RoleTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      roleData: JSON.parse(row.role_data),
      permissions: JSON.parse(row.permissions || '[]'),
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }

  private generateRoleId(): string {
    return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAssignmentId(): string {
    return `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}