import { Pool } from 'pg';
import { User, CreateUserRequest, UserProfile, UpdateProfileRequest } from '@/models';
import { logger } from '@/telemetry/logger';
import pool from '../connection';

export class UserRepository {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  async createUser(userData: CreateUserRequest & { passwordHash: string }): Promise<User> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, password_hash as "passwordHash", first_name as "firstName", 
                  last_name as "lastName", role, created_at as "createdAt", 
                  updated_at as "updatedAt", last_login as "lastLogin", is_active as "isActive"
      `;
      
      const values = [
        userData.email,
        userData.passwordHash,
        userData.firstName,
        userData.lastName,
        userData.role
      ];

      const result = await client.query(query, values);
      
      logger.info('User created successfully', { 
        userId: result.rows[0].id,
        email: userData.email,
        role: userData.role
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user', { error, email: userData.email });
      throw error;
    } finally {
      client.release();
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, email, password_hash as "passwordHash", first_name as "firstName",
               last_name as "lastName", role, created_at as "createdAt",
               updated_at as "updatedAt", last_login as "lastLogin", is_active as "isActive",
               mfa_enabled as "mfaEnabled", mfa_secret as "mfaSecret", backup_codes as "backupCodes",
               last_password_change as "lastPasswordChange", failed_login_attempts as "failedLoginAttempts",
               locked_until as "lockedUntil"
        FROM users 
        WHERE email = $1 AND is_active = true
      `;
      
      const result = await client.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email', { error, email });
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, email, password_hash as "passwordHash", first_name as "firstName",
               last_name as "lastName", role, created_at as "createdAt",
               updated_at as "updatedAt", last_login as "lastLogin", is_active as "isActive",
               mfa_enabled as "mfaEnabled", mfa_secret as "mfaSecret", backup_codes as "backupCodes",
               last_password_change as "lastPasswordChange", failed_login_attempts as "failedLoginAttempts",
               locked_until as "lockedUntil"
        FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID', { error, userId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      
      await client.query(query, [userId]);
      
      logger.info('User last login updated', { userId });
    } catch (error) {
      logger.error('Error updating last login', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async createProfile(userId: string, profileData: Partial<UpdateProfileRequest> = {}): Promise<UserProfile> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO user_profiles (user_id, avatar_url, bio, github_username, preferences)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id as "userId", avatar_url as "avatarUrl", bio, 
                  github_username as "githubUsername", preferences,
                  created_at as "createdAt", updated_at as "updatedAt"
      `;
      
      const values = [
        userId,
        profileData.avatarUrl || null,
        profileData.bio || null,
        profileData.githubUsername || null,
        JSON.stringify(profileData.preferences || {})
      ];

      const result = await client.query(query, values);
      
      logger.info('User profile created', { userId, profileId: result.rows[0].id });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user profile', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, user_id as "userId", avatar_url as "avatarUrl", bio,
               github_username as "githubUsername", preferences,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM user_profiles 
        WHERE user_id = $1
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user profile', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateProfile(userId: string, profileData: UpdateProfileRequest): Promise<UserProfile | null> {
    const client = await this.pool.connect();
    
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (profileData.avatarUrl !== undefined) {
        updateFields.push(`avatar_url = $${paramCount++}`);
        values.push(profileData.avatarUrl);
      }
      
      if (profileData.bio !== undefined) {
        updateFields.push(`bio = $${paramCount++}`);
        values.push(profileData.bio);
      }
      
      if (profileData.githubUsername !== undefined) {
        updateFields.push(`github_username = $${paramCount++}`);
        values.push(profileData.githubUsername);
      }
      
      if (profileData.preferences !== undefined) {
        updateFields.push(`preferences = $${paramCount++}`);
        values.push(JSON.stringify(profileData.preferences));
      }

      if (updateFields.length === 0) {
        return await this.getProfile(userId);
      }

      values.push(userId);

      const query = `
        UPDATE user_profiles 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${paramCount}
        RETURNING id, user_id as "userId", avatar_url as "avatarUrl", bio,
                  github_username as "githubUsername", preferences,
                  created_at as "createdAt", updated_at as "updatedAt"
      `;
      
      const result = await client.query(query, values);
      
      logger.info('User profile updated', { userId });
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating user profile', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `;
      
      await client.query(query, [passwordHash, userId]);
      
      logger.info('User password updated', { userId });
    } catch (error) {
      logger.error('Error updating user password', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async deactivateUser(userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      
      await client.query(query, [userId]);
      
      logger.info('User deactivated', { userId });
    } catch (error) {
      logger.error('Error deactivating user', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }
}

  // MFA-related methods
  async storeMFASecret(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET mfa_secret = $1, backup_codes = $2, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $3
      `;
      
      await client.query(query, [secret, JSON.stringify(backupCodes), userId]);
      
      logger.info('MFA secret stored', { userId });
    } catch (error) {
      logger.error('Error storing MFA secret', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async enableMFA(userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET mfa_enabled = true, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      
      await client.query(query, [userId]);
      
      logger.info('MFA enabled', { userId });
    } catch (error) {
      logger.error('Error enabling MFA', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async disableMFA(userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET mfa_enabled = false, mfa_secret = NULL, backup_codes = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      
      await client.query(query, [userId]);
      
      logger.info('MFA disabled', { userId });
    } catch (error) {
      logger.error('Error disabling MFA', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async removeBackupCode(userId: string, usedCode: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const user = await this.findById(userId);
      if (!user || !user.backupCodes) {
        throw new Error('User or backup codes not found');
      }

      const updatedCodes = user.backupCodes.filter(code => code !== usedCode);
      
      const query = `
        UPDATE users 
        SET backup_codes = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `;
      
      await client.query(query, [JSON.stringify(updatedCodes), userId]);
      
      logger.info('Backup code removed', { userId });
    } catch (error) {
      logger.error('Error removing backup code', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateBackupCodes(userId: string, backupCodes: string[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET backup_codes = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `;
      
      await client.query(query, [JSON.stringify(backupCodes), userId]);
      
      logger.info('Backup codes updated', { userId });
    } catch (error) {
      logger.error('Error updating backup codes', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      
      await client.query(query, [userId]);
      
      logger.info('Failed login attempts incremented', { userId });
    } catch (error) {
      logger.error('Error incrementing failed login attempts', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      
      await client.query(query, [userId]);
      
      logger.info('Failed login attempts reset', { userId });
    } catch (error) {
      logger.error('Error resetting failed login attempts', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async lockUser(userId: string, lockDuration: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + lockDuration);
      
      const query = `
        UPDATE users 
        SET locked_until = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `;
      
      await client.query(query, [lockedUntil, userId]);
      
      logger.info('User locked', { userId, lockedUntil });
    } catch (error) {
      logger.error('Error locking user', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Role and Permission methods
  async createRoleIfNotExists(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const client = await this.pool.connect();
    
    try {
      // Check if role exists
      const existingRole = await this.getRoleByName(roleData.name);
      if (existingRole) {
        return existingRole;
      }

      const query = `
        INSERT INTO roles (name, description, permissions)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, permissions, created_at as "createdAt", updated_at as "updatedAt"
      `;
      
      const values = [
        roleData.name,
        roleData.description,
        JSON.stringify(roleData.permissions)
      ];

      const result = await client.query(query, values);
      
      logger.info('Role created', { roleName: roleData.name });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating role', { error, roleName: roleData.name });
      throw error;
    } finally {
      client.release();
    }
  }

  async getRoleByName(name: string): Promise<Role | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, name, description, permissions, created_at as "createdAt", updated_at as "updatedAt"
        FROM roles 
        WHERE name = $1
      `;
      
      const result = await client.query(query, [name]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding role by name', { error, name });
      throw error;
    } finally {
      client.release();
    }
  }

  async getRoleById(id: string): Promise<Role | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, name, description, permissions, created_at as "createdAt", updated_at as "updatedAt"
        FROM roles 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding role by ID', { error, id });
      throw error;
    } finally {
      client.release();
    }
  }

  async assignUserRole(userId: string, roleId: string, assignedBy: string, expiresAt?: Date): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, role_id) 
        DO UPDATE SET 
          assigned_by = EXCLUDED.assigned_by,
          assigned_at = CURRENT_TIMESTAMP,
          expires_at = EXCLUDED.expires_at,
          is_active = true
      `;
      
      const values = [userId, roleId, assignedBy, expiresAt];
      await client.query(query, values);
      
      logger.info('User role assigned', { userId, roleId, assignedBy });
    } catch (error) {
      logger.error('Error assigning user role', { error, userId, roleId });
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeUserRole(userId: string, roleId: string, revokedBy: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE user_roles 
        SET is_active = false, revoked_by = $1, revoked_at = CURRENT_TIMESTAMP
        WHERE user_id = $2 AND role_id = $3
      `;
      
      await client.query(query, [revokedBy, userId, roleId]);
      
      logger.info('User role revoked', { userId, roleId, revokedBy });
    } catch (error) {
      logger.error('Error revoking user role', { error, userId, roleId });
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, user_id as "userId", role_id as "roleId", assigned_by as "assignedBy",
               assigned_at as "assignedAt", expires_at as "expiresAt", is_active as "isActive"
        FROM user_roles 
        WHERE user_id = $1 AND is_active = true
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting user roles', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllActiveUserRoles(): Promise<any[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT ur.user_id as "userId", ur.role_id as "roleId", ur.assigned_at as "assignedAt",
               ur.last_reviewed as "lastReviewed", u.email, r.name as "roleName"
        FROM user_roles ur
        JOIN users u ON ur.user_id = u.id
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.is_active = true AND u.is_active = true
      `;
      
      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all active user roles', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async isStudentAssignedToTeacher(studentId: string, teacherId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      // This would check teacher-student assignments in a real implementation
      // For now, we'll assume teachers can access all students
      const query = `
        SELECT 1 FROM users 
        WHERE id = $1 AND role = 'student' AND is_active = true
      `;
      
      const result = await client.query(query, [studentId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking student-teacher assignment', { error, studentId, teacherId });
      return false;
    } finally {
      client.release();
    }
  }

  async createAccessAuditLog(auditLog: Omit<AccessAuditLog, 'id' | 'timestamp'>): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO access_audit_logs (user_id, action, resource, result, reason, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const values = [
        auditLog.userId,
        auditLog.action,
        auditLog.resource,
        auditLog.result,
        auditLog.reason,
        auditLog.ipAddress,
        auditLog.userAgent
      ];

      await client.query(query, values);
    } catch (error) {
      logger.error('Error creating access audit log', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getAccessAuditLogs(request: PermissionAuditRequest): Promise<AccessAuditLog[]> {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT id, user_id as "userId", action, resource, result, reason,
               ip_address as "ipAddress", user_agent as "userAgent", timestamp
        FROM access_audit_logs
        WHERE 1=1
      `;
      
      const values: any[] = [];
      let paramCount = 1;

      if (request.userId) {
        query += ` AND user_id = $${paramCount++}`;
        values.push(request.userId);
      }

      if (request.startDate) {
        query += ` AND timestamp >= $${paramCount++}`;
        values.push(request.startDate);
      }

      if (request.endDate) {
        query += ` AND timestamp <= $${paramCount++}`;
        values.push(request.endDate);
      }

      if (request.action) {
        query += ` AND action = $${paramCount++}`;
        values.push(request.action);
      }

      if (request.resource) {
        query += ` AND resource = $${paramCount++}`;
        values.push(request.resource);
      }

      query += ` ORDER BY timestamp DESC LIMIT 1000`;

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error getting access audit logs', { error, request });
      throw error;
    } finally {
      client.release();
    }
  }

  async createPermissionReviewTask(userId: string, roleId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO permission_review_tasks (user_id, role_id, created_at, status)
        VALUES ($1, $2, CURRENT_TIMESTAMP, 'pending')
      `;
      
      await client.query(query, [userId, roleId]);
      
      logger.info('Permission review task created', { userId, roleId });
    } catch (error) {
      logger.error('Error creating permission review task', { error, userId, roleId });
      throw error;
    } finally {
      client.release();
    }
  }
}
