import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { StudentGitHubProfile } from '../models';

/**
 * Student GitHub Mapping Service
 * Handles mapping between student IDs and GitHub usernames
 */
export class StudentMappingService {
  private static instance: StudentMappingService;

  private constructor() {}

  public static getInstance(): StudentMappingService {
    if (!StudentMappingService.instance) {
      StudentMappingService.instance = new StudentMappingService();
    }
    return StudentMappingService.instance;
  }

  /**
   * Create or update a student-to-GitHub username mapping
   */
  public async createMapping(
    studentId: string,
    teacherId: string,
    githubUsername: string,
    verificationMethod: 'manual' | 'oauth' | 'email' = 'manual'
  ): Promise<boolean> {
    try {
      const query = `
        INSERT INTO student_github_profiles (student_id, teacher_id, github_username, verification_method, is_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (student_id, teacher_id) 
        DO UPDATE SET 
          github_username = $3,
          verification_method = $4,
          is_verified = $5,
          updated_at = NOW()
      `;

      await db.query(query, [studentId, teacherId, githubUsername, verificationMethod, true]);
      
      logger.info(`Created GitHub mapping: student ${studentId} -> ${githubUsername} for teacher ${teacherId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create GitHub mapping for student ${studentId}:`, error);
      return false;
    }
  }

  /**
   * Get GitHub username for a student
   */
  public async getGitHubUsername(studentId: string, teacherId: string): Promise<string | null> {
    try {
      const query = `
        SELECT github_username 
        FROM student_github_profiles 
        WHERE student_id = $1 AND teacher_id = $2 AND is_verified = true
      `;
      
      const result = await db.query(query, [studentId, teacherId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].github_username;
    } catch (error) {
      logger.error(`Failed to get GitHub username for student ${studentId}:`, error);
      return null;
    }
  }

  /**
   * Get student ID from GitHub username
   */
  public async getStudentId(githubUsername: string, teacherId: string): Promise<string | null> {
    try {
      const query = `
        SELECT student_id 
        FROM student_github_profiles 
        WHERE github_username = $1 AND teacher_id = $2 AND is_verified = true
      `;
      
      const result = await db.query(query, [githubUsername, teacherId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].student_id;
    } catch (error) {
      logger.error(`Failed to get student ID for GitHub username ${githubUsername}:`, error);
      return null;
    }
  }

  /**
   * Get all student mappings for a teacher
   */
  public async getTeacherMappings(teacherId: string): Promise<StudentGitHubProfile[]> {
    try {
      const query = `
        SELECT id, student_id, teacher_id, github_username, github_user_id, 
               is_verified, verification_method, created_at, updated_at
        FROM student_github_profiles 
        WHERE teacher_id = $1 AND is_verified = true
        ORDER BY created_at DESC
      `;
      
      const result = await db.query(query, [teacherId]);
      
      return result.rows.map(row => ({
        id: row.id.toString(),
        studentId: row.student_id,
        teacherId: row.teacher_id,
        githubUsername: row.github_username,
        githubUserId: row.github_user_id,
        isVerified: row.is_verified,
        verificationMethod: row.verification_method,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      logger.error(`Failed to get teacher mappings for ${teacherId}:`, error);
      return [];
    }
  }

  /**
   * Get all mappings for a student across all teachers
   */
  public async getStudentMappings(studentId: string): Promise<StudentGitHubProfile[]> {
    try {
      const query = `
        SELECT id, student_id, teacher_id, github_username, github_user_id, 
               is_verified, verification_method, created_at, updated_at
        FROM student_github_profiles 
        WHERE student_id = $1 AND is_verified = true
        ORDER BY created_at DESC
      `;
      
      const result = await db.query(query, [studentId]);
      
      return result.rows.map(row => ({
        id: row.id.toString(),
        studentId: row.student_id,
        teacherId: row.teacher_id,
        githubUsername: row.github_username,
        githubUserId: row.github_user_id,
        isVerified: row.is_verified,
        verificationMethod: row.verification_method,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      logger.error(`Failed to get student mappings for ${studentId}:`, error);
      return [];
    }
  }

  /**
   * Verify a GitHub username belongs to a student
   */
  public async verifyMapping(studentId: string, teacherId: string, githubUsername: string): Promise<boolean> {
    try {
      const query = `
        UPDATE student_github_profiles 
        SET is_verified = true, verification_method = 'manual', updated_at = NOW()
        WHERE student_id = $1 AND teacher_id = $2 AND github_username = $3
      `;
      
      const result = await db.query(query, [studentId, teacherId, githubUsername]);
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info(`Verified GitHub mapping: student ${studentId} -> ${githubUsername}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to verify GitHub mapping for student ${studentId}:`, error);
      return false;
    }
  }

  /**
   * Remove a student-to-GitHub mapping
   */
  public async removeMapping(studentId: string, teacherId: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM student_github_profiles 
        WHERE student_id = $1 AND teacher_id = $2
      `;
      
      const result = await db.query(query, [studentId, teacherId]);
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info(`Removed GitHub mapping for student ${studentId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to remove GitHub mapping for student ${studentId}:`, error);
      return false;
    }
  }

  /**
   * Bulk create mappings from a list
   */
  public async bulkCreateMappings(
    teacherId: string,
    mappings: Array<{ studentId: string; githubUsername: string }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const mapping of mappings) {
      const result = await this.createMapping(
        mapping.studentId,
        teacherId,
        mapping.githubUsername,
        'manual'
      );
      
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    logger.info(`Bulk mapping results for teacher ${teacherId}: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Check if a GitHub username is already mapped to another student
   */
  public async isUsernameTaken(githubUsername: string, teacherId: string, excludeStudentId?: string): Promise<boolean> {
    try {
      let query = `
        SELECT student_id 
        FROM student_github_profiles 
        WHERE github_username = $1 AND teacher_id = $2 AND is_verified = true
      `;
      const params = [githubUsername, teacherId];

      if (excludeStudentId) {
        query += ' AND student_id != $3';
        params.push(excludeStudentId);
      }
      
      const result = await db.query(query, params);
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Failed to check if GitHub username ${githubUsername} is taken:`, error);
      return false;
    }
  }

  /**
   * Get mapping statistics for a teacher
   */
  public async getMappingStats(teacherId: string): Promise<{
    totalMappings: number;
    verifiedMappings: number;
    unverifiedMappings: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_mappings,
          COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_mappings,
          COUNT(CASE WHEN is_verified = false THEN 1 END) as unverified_mappings
        FROM student_github_profiles 
        WHERE teacher_id = $1
      `;
      
      const result = await db.query(query, [teacherId]);
      const row = result.rows[0];
      
      return {
        totalMappings: parseInt(row.total_mappings),
        verifiedMappings: parseInt(row.verified_mappings),
        unverifiedMappings: parseInt(row.unverified_mappings)
      };
    } catch (error) {
      logger.error(`Failed to get mapping stats for teacher ${teacherId}:`, error);
      return {
        totalMappings: 0,
        verifiedMappings: 0,
        unverifiedMappings: 0
      };
    }
  }
}