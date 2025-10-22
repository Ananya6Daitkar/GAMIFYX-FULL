/**
 * User Repository with advanced data models for GamifyX
 */

import { Pool, PoolClient } from 'pg';
import { User, UserProfile, UserRole } from '../models/User';
import { GamifyXTelemetry } from '../../../shared/telemetry';
import { instrumentDatabaseOperation } from '../../../shared/telemetry/middleware';
import { GamifyXMetrics } from '../../../shared/telemetry/metrics';

export interface UserSearchFilters {
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  skills?: string[];
  interests?: string[];
  minLevel?: number;
  maxLevel?: number;
  minXP?: number;
  maxXP?: number;
}

export interface UserSearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'lastLogin' | 'totalXP' | 'currentLevel' | 'rank';
  sortOrder?: 'ASC' | 'DESC';
  includeProfile?: boolean;
  includeGamification?: boolean;
}

export interface UserSearchResult {
  users: User[];
  profiles?: UserProfile[];
  total: number;
  hasMore: boolean;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  mfaEnabledUsers: number;
  usersByRole: Record<UserRole, number>;
  averageLevel: number;
  totalXP: number;
  registrationsThisMonth: number;
  activeUsersThisWeek: number;
}

export class UserRepository {
  private pool: Pool;
  private telemetry: GamifyXTelemetry;
  private metrics: GamifyXMetrics;

  constructor(pool: Pool, telemetry: GamifyXTelemetry, metrics: GamifyXMetrics) {
    this.pool = pool;
    this.telemetry = telemetry;
    this.metrics = metrics;
  }

  // Create user
  public async create(user: User): Promise<User> {
    return instrumentDatabaseOperation(
      this.telemetry,
      this.metrics,
      'INSERT',
      'users',
      async () => {
        const client = await this.pool.connect();
        try {
          const query = `
            INSERT INTO users (
              id, email, password_hash, first_name, last_name, role,
              is_active, email_verified, mfa_enabled, mfa_secret,
              login_attempts, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
          `;
          
          const values = [
            user.id,
            user.email,
            user.passwordHash,
            user.firstName,
            user.lastName,
            user.role,
            user.isActive,
            user.emailVerified,
            user.mfaEnabled,
            user.mfaSecret,
            user.loginAttempts,
            user.createdAt,
            user.updatedAt,
          ];

          const result = await client.query(query, values);
          return this.mapRowToUser(result.rows[0]);
        } finally {
          client.release();
        }
      }
    );
  }

  // Find user by ID
  public async findById(id: string): Promise<User | null> {
    return instrumentDatabaseOperation(
      this.telemetry,
      this.metrics,
      'SELECT',
      'users',
      async () => {
        const client = await this.pool.connect();
        try {
          const query = 'SELECT * FROM users WHERE id = $1';
          const result = await client.query(query, [id]);
          
          return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
        } finally {
          client.release();
        }
      }
    );
  }

  // Find user by email
  public async findByEmail(email: string): Promise<User | null> {
    return instrumentDatabaseOperation(
      this.telemetry,
      this.metrics,
      'SELECT',
      'users',
      async () => {
        const client = await this.pool.connect();
        try {
          const query = 'SELECT * FROM users WHERE email = $1';
          const result = await client.query(query, [email]);
          
          return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
        } finally {
          client.release();
        }
      }
    );
  }

  // Update user
  public async update(id: string, updates: Partial<User>): Promise<User | null> {
    return instrumentDatabaseOperation(
      this.telemetry,
      this.metrics,
      'UPDATE',
      'users',
      async () => {
        const client = await this.pool.connect();
        try {
          const setClause = [];
          const values = [];
          let paramIndex = 1;

          // Build dynamic update query
          for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
              const dbColumn = this.camelToSnake(key);
              setClause.push(`${dbColumn} = $${paramIndex}`);
              values.push(value);
              paramIndex++;
            }
          }

          if (setClause.length === 0) {
            return await this.findById(id);
          }

          // Always update the updated_at timestamp
          setClause.push(`updated_at = $${paramIndex}`);
          values.push(new Date());
          values.push(id);

          const query = `
            UPDATE users 
            SET ${setClause.join(', ')}
            WHERE id = $${paramIndex + 1}
            RETURNING *
          `;

          const result = await client.query(query, values);
          return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
        } finally {
          client.release();
        }
      }
    );
  }

  // Delete user (soft delete)
  public async delete(id: string): Promise<boolean> {
    return instrumentDatabaseOperation(
      this.telemetry,
      this.metrics,
      'UPDATE',
      'users',
      async () => {
        const client = await this.pool.connect();
        try {
          const query = `
            UPDATE users 
            SET is_active = false, updated_at = $1
            WHERE id = $2
          `;
          
          const result = await client.query(query, [new Date(), id]);
          return result.rowCount > 0;
        } finally {
          client.release();
        }
      }
    );
  }

  // Search users with advanced filtering
  public async searchUsers(filters: UserSearchFilters, options: UserSearchOptions = {}): Promise<UserSearchResult> {
    return instrumentDatabaseOperation(
      this.telemetry,
      this.metrics,
      'SELECT',
      'users',
      async () => {
        const client = await this.pool.connect();
        try {
          const {
            limit = 50,
            offset = 0,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            includeProfile = false,
            includeGamification = false,
          } = options;

          // Build WHERE clause
          const whereConditions = [];
          const values = [];
          let paramIndex = 1;

          // Add filter conditions
          if (filters.role) {
            whereConditions.push(`u.role = $${paramIndex}`);
            values.push(filters.role);
            paramIndex++;
          }

          if (filters.isActive !== undefined) {
            whereConditions.push(`u.is_active = $${paramIndex}`);
            values.push(filters.isActive);
            paramIndex++;
          }

          if (filters.emailVerified !== undefined) {
            whereConditions.push(`u.email_verified = $${paramIndex}`);
            values.push(filters.emailVerified);
            paramIndex++;
          }

          if (filters.mfaEnabled !== undefined) {
            whereConditions.push(`u.mfa_enabled = $${paramIndex}`);
            values.push(filters.mfaEnabled);
            paramIndex++;
          }

          if (filters.createdAfter) {
            whereConditions.push(`u.created_at >= $${paramIndex}`);
            values.push(filters.createdAfter);
            paramIndex++;
          }

          if (filters.createdBefore) {
            whereConditions.push(`u.created_at <= $${paramIndex}`);
            values.push(filters.createdBefore);
            paramIndex++;
          }

          if (filters.lastLoginAfter) {
            whereConditions.push(`u.last_login >= $${paramIndex}`);
            values.push(filters.lastLoginAfter);
            paramIndex++;
          }

          // Profile-based filters
          let joinProfile = includeProfile || includeGamification || 
                           filters.skills || filters.interests || 
                           filters.minLevel || filters.maxLevel || 
                           filters.minXP || filters.maxXP;

          if (joinProfile) {
            if (filters.skills && filters.skills.length > 0) {
              whereConditions.push(`up.skills && $${paramIndex}`);
              values.push(filters.skills);
              paramIndex++;
            }

            if (filters.interests && filters.interests.length > 0) {
              whereConditions.push(`up.interests && $${paramIndex}`);
              values.push(filters.interests);
              paramIndex++;
            }

            if (filters.minLevel) {
              whereConditions.push(`(up.gamification->>'currentLevel')::int >= $${paramIndex}`);
              values.push(filters.minLevel);
              paramIndex++;
            }

            if (filters.maxLevel) {
              whereConditions.push(`(up.gamification->>'currentLevel')::int <= $${paramIndex}`);
              values.push(filters.maxLevel);
              paramIndex++;
            }

            if (filters.minXP) {
              whereConditions.push(`(up.gamification->>'totalXP')::int >= $${paramIndex}`);
              values.push(filters.minXP);
              paramIndex++;
            }

            if (filters.maxXP) {
              whereConditions.push(`(up.gamification->>'totalXP')::int <= $${paramIndex}`);
              values.push(filters.maxXP);
              paramIndex++;
            }
          }

          // Build main query
          let selectClause = 'u.*';
          let fromClause = 'users u';
          
          if (includeProfile || joinProfile) {
            selectClause += ', up.*';
            fromClause += ' LEFT JOIN user_profiles up ON u.id = up.user_id';
          }

          const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
          
          // Map sort column
          const sortColumn = this.mapSortColumn(sortBy, joinProfile);
          const orderClause = `ORDER BY ${sortColumn} ${sortOrder}`;
          
          const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
          values.push(limit, offset);

          const query = `
            SELECT ${selectClause}
            FROM ${fromClause}
            ${whereClause}
            ${orderClause}
            ${limitClause}
          `;

          // Get total count
          const countQuery = `
            SELECT COUNT(DISTINCT u.id) as total
            FROM ${fromClause}
            ${whereClause}
          `;

          const [dataResult, countResult] = await Promise.all([
            client.query(query, values),
            client.query(countQuery, values.slice(0, -2)), // Remove limit and offset
          ]);

          const users = dataResult.rows.map(row => this.mapRowToUser(row));
          const profiles = includeProfile ? dataResult.rows.map(row => this.mapRowToUserProfile(row)) : undefined;
          const total = parseInt(countResult.rows[0].total);

          return {
            users,
            profiles,
            total,
            hasMore: offset + limit < total,
          };
        } finally {
          client.release();
        }
      }
    );
  }

  // Get user statistics
  public async getUserStatistics(): Promise<UserStatistics> {
    return instrumentDatabaseOperation(
      this.telemetry,
      this.metrics,
      'SELECT',
      'users',
      async () => {
        const client = await this.pool.connect();
        try {
          const queries = [
            // Total users
            'SELECT COUNT(*) as total FROM users WHERE is_active = true',
            
            // Active users (logged in within last 30 days)
            `SELECT COUNT(*) as active FROM users 
             WHERE is_active = true AND last_login >= NOW() - INTERVAL '30 days'`,
            
            // Verified users
            'SELECT COUNT(*) as verified FROM users WHERE email_verified = true',
            
            // MFA enabled users
            'SELECT COUNT(*) as mfa_enabled FROM users WHERE mfa_enabled = true',
            
            // Users by role
            'SELECT role, COUNT(*) as count FROM users WHERE is_active = true GROUP BY role',
            
            // Average level and total XP
            `SELECT 
               AVG((gamification->>'currentLevel')::int) as avg_level,
               SUM((gamification->>'totalXP')::int) as total_xp
             FROM user_profiles WHERE gamification IS NOT NULL`,
            
            // Registrations this month
            `SELECT COUNT(*) as registrations 
             FROM users 
             WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            
            // Active users this week
            `SELECT COUNT(*) as active_week 
             FROM users 
             WHERE last_login >= DATE_TRUNC('week', CURRENT_DATE)`
          ];

          const results = await Promise.all(
            queries.map(query => client.query(query))
          );

          const usersByRole: Record<UserRole, number> = {
            [UserRole.STUDENT]: 0,
            [UserRole.TEACHER]: 0,
            [UserRole.ADMIN]: 0,
            [UserRole.MENTOR]: 0,
            [UserRole.GUEST]: 0,
          };

          // Process role counts
          results[4].rows.forEach(row => {
            usersByRole[row.role as UserRole] = parseInt(row.count);
          });

          return {
            totalUsers: parseInt(results[0].rows[0].total),
            activeUsers: parseInt(results[1].rows[0].active),
            verifiedUsers: parseInt(results[2].rows[0].verified),
            mfaEnabledUsers: parseInt(results[3].rows[0].mfa_enabled),
            usersByRole,
            averageLevel: parseFloat(results[5].rows[0]?.avg_level || '1'),
            totalXP: parseInt(results[5].rows[0]?.total_xp || '0'),
            registrationsThisMonth: parseInt(results[6].rows[0].registrations),
            activeUsersThisWeek: parseInt(results[7].rows[0].active_week),
          };
        } finally {
          client.release();
        }
      }
    );
  }

  // Profile-related methods
  public async createProfile(profile: UserProfile): Promise<UserProfile> {
    return instrumentDatabaseOperation(
      this.telemetry,
      this.metrics,
      'INSERT',
      'user_profiles',
      async () => {
        const client = await this.pool.connect();
        try {
          const query = `
            INSERT INTO user_profiles (
              id, user_id, avatar_url, bio, github_username, linkedin_url,
              website_url, location, timezone, preferences, gamification,
              social_links, skills, interests, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
          `;
          
          const values = [
            profile.id,
            profile.userId,
            profile.avatarUrl,
            profile.bio,
            profile.githubUsername,
            profile.linkedinUrl,
            profile.websiteUrl,
            profile.location,
            profile.timezone,
            JSON.stringify(profile.preferences),
            JSON.stringify(profile.gamification),
            JSON.stringify(profile.socialLinks),
            profile.skills,
            profile.interests,
            profile.createdAt,
            profile.updatedAt,
          ];

          const result = await client.query(query, values);
          return this.mapRowToUserProfile(result.rows[0]);
        } finally {
          client.release();
        }
      }
    );
  }

  public async findProfileByUserId(userId: string): Promise<UserProfile | null> {
    return instrumentDatabaseOperation(
      this.telemetry,
      this.metrics,
      'SELECT',
      'user_profiles',
      async () => {
        const client = await this.pool.connect();
        try {
          const query = 'SELECT * FROM user_profiles WHERE user_id = $1';
          const result = await client.query(query, [userId]);
          
          return result.rows.length > 0 ? this.mapRowToUserProfile(result.rows[0]) : null;
        } finally {
          client.release();
        }
      }
    );
  }

  public async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    return instrumentDatabaseOperation(
      this.telemetry,
      this.metrics,
      'UPDATE',
      'user_profiles',
      async () => {
        const client = await this.pool.connect();
        try {
          const setClause = [];
          const values = [];
          let paramIndex = 1;

          // Build dynamic update query
          for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
              const dbColumn = this.camelToSnake(key);
              
              // Handle JSON fields
              if (['preferences', 'gamification', 'social_links'].includes(dbColumn)) {
                setClause.push(`${dbColumn} = $${paramIndex}`);
                values.push(JSON.stringify(value));
              } else {
                setClause.push(`${dbColumn} = $${paramIndex}`);
                values.push(value);
              }
              paramIndex++;
            }
          }

          if (setClause.length === 0) {
            return await this.findProfileByUserId(userId);
          }

          // Always update the updated_at timestamp
          setClause.push(`updated_at = $${paramIndex}`);
          values.push(new Date());
          values.push(userId);

          const query = `
            UPDATE user_profiles 
            SET ${setClause.join(', ')}
            WHERE user_id = $${paramIndex + 1}
            RETURNING *
          `;

          const result = await client.query(query, values);
          return result.rows.length > 0 ? this.mapRowToUserProfile(result.rows[0]) : null;
        } finally {
          client.release();
        }
      }
    );
  }

  // Helper methods
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      mfaEnabled: row.mfa_enabled,
      mfaSecret: row.mfa_secret,
      lastLogin: row.last_login,
      loginAttempts: row.login_attempts,
      lockedUntil: row.locked_until,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToUserProfile(row: any): UserProfile {
    return {
      id: row.id,
      userId: row.user_id,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      githubUsername: row.github_username,
      linkedinUrl: row.linkedin_url,
      websiteUrl: row.website_url,
      location: row.location,
      timezone: row.timezone,
      preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
      gamification: typeof row.gamification === 'string' ? JSON.parse(row.gamification) : row.gamification,
      socialLinks: typeof row.social_links === 'string' ? JSON.parse(row.social_links) : row.social_links,
      skills: row.skills || [],
      interests: row.interests || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private mapSortColumn(sortBy: string, includeProfile: boolean): string {
    const columnMap: Record<string, string> = {
      createdAt: 'u.created_at',
      lastLogin: 'u.last_login',
      totalXP: includeProfile ? "(up.gamification->>'totalXP')::int" : 'u.created_at',
      currentLevel: includeProfile ? "(up.gamification->>'currentLevel')::int" : 'u.created_at',
      rank: includeProfile ? "(up.gamification->>'rank')::int" : 'u.created_at',
    };

    return columnMap[sortBy] || 'u.created_at';
  }
}

export default UserRepository;