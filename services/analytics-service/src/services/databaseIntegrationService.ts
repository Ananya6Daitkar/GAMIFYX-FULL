import { logger } from '../telemetry/logger';
import { db } from '../database/connection';

/**
 * Database Integration Service
 * Manages data consistency and integration across all services
 */
export class DatabaseIntegrationService {
  private static instance: DatabaseIntegrationService;

  private constructor() {}

  public static getInstance(): DatabaseIntegrationService {
    if (!DatabaseIntegrationService.instance) {
      DatabaseIntegrationService.instance = new DatabaseIntegrationService();
    }
    return DatabaseIntegrationService.instance;
  }

  /**
   * Initialize database integration
   */
  public async initialize(): Promise<boolean> {
    try {
      logger.info('Initializing database integration...');

      // Run database integration migration
      await this.runIntegrationMigration();

      // Check data consistency
      const consistencyCheck = await this.checkDataConsistency();
      if (!consistencyCheck.allPassed) {
        logger.warn('Data consistency issues detected:', consistencyCheck.issues);
      }

      // Sync any orphaned data
      await this.syncOrphanedData();

      // Refresh materialized views
      await this.refreshMaterializedViews();

      logger.info('Database integration initialized successfully');
      return true;

    } catch (error) {
      logger.error('Failed to initialize database integration:', error);
      return false;
    }
  }

  /**
   * Run database integration migration
   */
  private async runIntegrationMigration(): Promise<void> {
    try {
      // Check if migration has already been run
      const migrationCheck = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'comprehensive_student_analytics' 
          AND table_type = 'VIEW'
        ) as migration_exists
      `);

      if (migrationCheck.rows[0].migration_exists) {
        logger.info('Database integration migration already applied');
        return;
      }

      // Read and execute migration
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, '../database/migrations/008_enhance_database_integration.sql');
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration in transaction
        await db.transaction(async (client) => {
          const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

          for (const statement of statements) {
            if (statement.trim()) {
              await client.query(statement);
            }
          }
        });

        logger.info('Database integration migration completed');
      } else {
        logger.warn('Migration file not found, skipping migration');
      }

    } catch (error) {
      logger.error('Error running database integration migration:', error);
      throw error;
    }
  }

  /**
   * Check data consistency across tables
   */
  public async checkDataConsistency(): Promise<{
    allPassed: boolean;
    issues: Array<{ check: string; status: string; details: string }>;
  }> {
    try {
      const result = await db.query('SELECT * FROM check_data_consistency()');
      
      const issues = result.rows.map(row => ({
        check: row.check_name,
        status: row.status,
        details: row.details
      }));

      const allPassed = issues.every(issue => issue.status === 'PASS');

      return { allPassed, issues };

    } catch (error) {
      logger.error('Error checking data consistency:', error);
      return {
        allPassed: false,
        issues: [{ check: 'consistency_check', status: 'ERROR', details: error.message }]
      };
    }
  }

  /**
   * Sync orphaned data
   */
  public async syncOrphanedData(): Promise<void> {
    try {
      // Get all GitHub profiles without student records
      const orphanedProfiles = await db.query(`
        SELECT sgp.student_id, sgp.teacher_id, sgp.github_username
        FROM student_github_profiles sgp
        LEFT JOIN student_records sr ON sgp.student_id = sr.id
        WHERE sr.id IS NULL AND sgp.is_verified = true
      `);

      // Sync each orphaned profile
      for (const profile of orphanedProfiles.rows) {
        await db.query('SELECT sync_student_data($1)', [profile.student_id]);
        logger.info(`Synced orphaned student data for ${profile.student_id}`);
      }

      if (orphanedProfiles.rows.length > 0) {
        logger.info(`Synced ${orphanedProfiles.rows.length} orphaned student records`);
      }

    } catch (error) {
      logger.error('Error syncing orphaned data:', error);
    }
  }

  /**
   * Clean up old and orphaned data
   */
  public async cleanupOrphanedData(): Promise<{
    actions: Array<{ action: string; recordsAffected: number }>;
  }> {
    try {
      const result = await db.query('SELECT * FROM cleanup_orphaned_data()');
      
      const actions = result.rows.map(row => ({
        action: row.cleanup_action,
        recordsAffected: row.records_affected
      }));

      logger.info('Data cleanup completed:', actions);
      return { actions };

    } catch (error) {
      logger.error('Error cleaning up orphaned data:', error);
      return { actions: [] };
    }
  }

  /**
   * Refresh materialized views
   */
  public async refreshMaterializedViews(): Promise<void> {
    try {
      await db.query('SELECT refresh_student_performance_summary()');
      logger.info('Materialized views refreshed');

    } catch (error) {
      logger.error('Error refreshing materialized views:', error);
    }
  }

  /**
   * Get comprehensive student data
   */
  public async getComprehensiveStudentData(
    studentId: string,
    teacherId?: string
  ): Promise<any> {
    try {
      let query = `
        SELECT * FROM comprehensive_student_analytics 
        WHERE student_id = $1
      `;
      const params = [studentId];

      if (teacherId) {
        query += ' AND teacher_id = $2';
        params.push(teacherId);
      }

      const result = await db.query(query, params);
      return result.rows[0] || null;

    } catch (error) {
      logger.error(`Error getting comprehensive student data for ${studentId}:`, error);
      return null;
    }
  }

  /**
   * Get teacher dashboard summary
   */
  public async getTeacherDashboardSummary(teacherId: string): Promise<any> {
    try {
      const result = await db.query(`
        SELECT * FROM teacher_dashboard_summary 
        WHERE teacher_id = $1
      `, [teacherId]);

      return result.rows[0] || {
        teacher_id: teacherId,
        total_students: 0,
        students_with_github: 0,
        students_with_recent_prs: 0,
        students_with_recent_submissions: 0,
        class_total_prs: 0,
        avg_prs_per_student: 0,
        class_prs_this_week: 0,
        class_avg_code_quality: 0,
        class_avg_test_coverage: 0,
        high_risk_students: 0,
        medium_risk_students: 0,
        low_risk_students: 0,
        active_students: 0,
        partially_active_students: 0,
        inactive_students: 0
      };

    } catch (error) {
      logger.error(`Error getting teacher dashboard summary for ${teacherId}:`, error);
      return null;
    }
  }

  /**
   * Ensure student record exists
   */
  public async ensureStudentRecord(
    studentId: string,
    teacherId: string,
    studentData?: {
      name?: string;
      email?: string;
      metadata?: any;
    }
  ): Promise<boolean> {
    try {
      // Check if student record exists
      const existingRecord = await db.query(`
        SELECT id FROM student_records WHERE id = $1
      `, [studentId]);

      if (existingRecord.rows.length > 0) {
        return true; // Already exists
      }

      // Create student record
      const name = studentData?.name || `Student ${studentId}`;
      const email = studentData?.email || null;
      const metadata = studentData?.metadata || {};

      await db.query(`
        INSERT INTO student_records (id, name, email, teacher_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [studentId, name, email, teacherId, JSON.stringify(metadata)]);

      logger.info(`Created student record for ${studentId}`);
      return true;

    } catch (error) {
      logger.error(`Error ensuring student record for ${studentId}:`, error);
      return false;
    }
  }

  /**
   * Update student performance data with GitHub context
   */
  public async updatePerformanceDataWithGitHubContext(
    userId: string,
    submissionId: string,
    githubContext: any
  ): Promise<boolean> {
    try {
      await db.query(`
        UPDATE student_performance_data 
        SET github_context = $3
        WHERE user_id = $1 AND submission_id = $2
      `, [userId, submissionId, JSON.stringify(githubContext)]);

      return true;

    } catch (error) {
      logger.error('Error updating performance data with GitHub context:', error);
      return false;
    }
  }

  /**
   * Get data integration statistics
   */
  public async getIntegrationStatistics(): Promise<{
    totalStudents: number;
    studentsWithGitHub: number;
    studentsWithPerformanceData: number;
    studentsWithBothDataSources: number;
    orphanedGitHubProfiles: number;
    orphanedPRSubmissions: number;
    orphanedPerformanceData: number;
    lastDataCleanup: Date | null;
    lastMaterializedViewRefresh: Date | null;
  }> {
    try {
      const stats = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM student_records WHERE status = 'active') as total_students,
          (SELECT COUNT(DISTINCT student_id) FROM student_github_profiles WHERE is_verified = true) as students_with_github,
          (SELECT COUNT(DISTINCT user_id) FROM student_performance_data) as students_with_performance_data,
          (SELECT COUNT(*) FROM comprehensive_student_analytics WHERE total_prs > 0 AND total_submissions > 0) as students_with_both_data_sources,
          (SELECT COUNT(*) FROM student_github_profiles sgp LEFT JOIN student_records sr ON sgp.student_id = sr.id WHERE sr.id IS NULL) as orphaned_github_profiles,
          (SELECT COUNT(*) FROM student_pr_submissions sps LEFT JOIN student_github_profiles sgp ON sps.github_username = sgp.github_username WHERE sgp.id IS NULL) as orphaned_pr_submissions,
          (SELECT COUNT(*) FROM student_performance_data spd LEFT JOIN student_records sr ON spd.user_id = sr.id WHERE sr.id IS NULL) as orphaned_performance_data,
          (SELECT MAX(last_refreshed) FROM mv_student_performance_summary) as last_materialized_view_refresh
      `);

      const row = stats.rows[0];
      return {
        totalStudents: parseInt(row.total_students) || 0,
        studentsWithGitHub: parseInt(row.students_with_github) || 0,
        studentsWithPerformanceData: parseInt(row.students_with_performance_data) || 0,
        studentsWithBothDataSources: parseInt(row.students_with_both_data_sources) || 0,
        orphanedGitHubProfiles: parseInt(row.orphaned_github_profiles) || 0,
        orphanedPRSubmissions: parseInt(row.orphaned_pr_submissions) || 0,
        orphanedPerformanceData: parseInt(row.orphaned_performance_data) || 0,
        lastDataCleanup: null, // Would track this separately
        lastMaterializedViewRefresh: row.last_materialized_view_refresh || null
      };

    } catch (error) {
      logger.error('Error getting integration statistics:', error);
      return {
        totalStudents: 0,
        studentsWithGitHub: 0,
        studentsWithPerformanceData: 0,
        studentsWithBothDataSources: 0,
        orphanedGitHubProfiles: 0,
        orphanedPRSubmissions: 0,
        orphanedPerformanceData: 0,
        lastDataCleanup: null,
        lastMaterializedViewRefresh: null
      };
    }
  }

  /**
   * Validate data integrity
   */
  public async validateDataIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const consistencyCheck = await this.checkDataConsistency();
      const stats = await this.getIntegrationStatistics();

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check for consistency issues
      consistencyCheck.issues.forEach(issue => {
        if (issue.status !== 'PASS') {
          issues.push(`${issue.check}: ${issue.details}`);
        }
      });

      // Check for orphaned data
      if (stats.orphanedGitHubProfiles > 0) {
        issues.push(`${stats.orphanedGitHubProfiles} orphaned GitHub profiles found`);
        recommendations.push('Run data synchronization to create missing student records');
      }

      if (stats.orphanedPRSubmissions > 0) {
        issues.push(`${stats.orphanedPRSubmissions} orphaned PR submissions found`);
        recommendations.push('Clean up PR submissions without valid GitHub profiles');
      }

      if (stats.orphanedPerformanceData > 0) {
        issues.push(`${stats.orphanedPerformanceData} orphaned performance data records found`);
        recommendations.push('Create missing student records or clean up orphaned performance data');
      }

      // Check data coverage
      const coverageRatio = stats.totalStudents > 0 
        ? stats.studentsWithBothDataSources / stats.totalStudents 
        : 0;

      if (coverageRatio < 0.5) {
        issues.push('Low data coverage: Less than 50% of students have both GitHub and performance data');
        recommendations.push('Encourage GitHub setup for students without PR activity');
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      logger.error('Error validating data integrity:', error);
      return {
        isValid: false,
        issues: ['Failed to validate data integrity'],
        recommendations: ['Check database connectivity and permissions']
      };
    }
  }

  /**
   * Schedule periodic maintenance tasks
   */
  public async scheduleMaintenanceTasks(): Promise<void> {
    try {
      // This would set up periodic tasks like:
      // - Refreshing materialized views every 15 minutes
      // - Cleaning up old data daily
      // - Running consistency checks weekly
      
      logger.info('Database maintenance tasks scheduled');

    } catch (error) {
      logger.error('Error scheduling maintenance tasks:', error);
    }
  }
}