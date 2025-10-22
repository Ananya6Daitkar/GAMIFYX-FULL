import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { GitHubService } from './githubService';
import { StudentMappingService } from './studentMappingService';
import { PullRequest, StudentPRStatsResponse, ClassPROverviewResponse } from '../models';

/**
 * Pull Request Tracking Service
 * Handles fetching, storing, and analyzing student PR submissions
 */
export class PRTrackingService {
  private static instance: PRTrackingService;
  private githubService: GitHubService;
  private mappingService: StudentMappingService;

  private constructor() {
    this.githubService = GitHubService.getInstance();
    this.mappingService = StudentMappingService.getInstance();
  }

  public static getInstance(): PRTrackingService {
    if (!PRTrackingService.instance) {
      PRTrackingService.instance = new PRTrackingService();
    }
    return PRTrackingService.instance;
  }

  /**
   * Fetch and store PRs for a specific student
   */
  public async fetchStudentPRs(teacherId: string, studentId: string): Promise<PullRequest[]> {
    try {
      // Get GitHub username for student
      const githubUsername = await this.mappingService.getGitHubUsername(studentId, teacherId);
      if (!githubUsername) {
        logger.warn(`No GitHub username found for student ${studentId}`);
        return [];
      }

      // Get monitored repositories for teacher
      const repositories = await this.getMonitoredRepositories(teacherId);
      if (repositories.length === 0) {
        logger.warn(`No monitored repositories found for teacher ${teacherId}`);
        return [];
      }

      // Fetch PRs from GitHub
      const pullRequests = await this.githubService.fetchStudentPRs(
        teacherId,
        githubUsername,
        repositories
      );

      // Store PRs in database
      await this.storePullRequests(pullRequests, studentId);

      logger.info(`Fetched and stored ${pullRequests.length} PRs for student ${studentId}`);
      return pullRequests;
    } catch (error) {
      logger.error(`Failed to fetch PRs for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch PRs for all students of a teacher
   */
  public async fetchAllStudentPRs(teacherId: string): Promise<{ studentId: string; prCount: number }[]> {
    try {
      const mappings = await this.mappingService.getTeacherMappings(teacherId);
      const results: { studentId: string; prCount: number }[] = [];

      for (const mapping of mappings) {
        try {
          const prs = await this.fetchStudentPRs(teacherId, mapping.studentId);
          results.push({
            studentId: mapping.studentId,
            prCount: prs.length
          });
        } catch (error) {
          logger.error(`Failed to fetch PRs for student ${mapping.studentId}:`, error);
          results.push({
            studentId: mapping.studentId,
            prCount: 0
          });
        }
      }

      logger.info(`Fetched PRs for ${results.length} students of teacher ${teacherId}`);
      return results;
    } catch (error) {
      logger.error(`Failed to fetch PRs for all students of teacher ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Get monitored repositories for a teacher
   */
  private async getMonitoredRepositories(teacherId: string): Promise<string[]> {
    try {
      const query = `
        SELECT repository_name, repository_owner
        FROM monitored_repositories 
        WHERE teacher_id = $1 AND is_active = true
      `;
      
      const result = await db.query(query, [teacherId]);
      
      return result.rows.map(row => `${row.repository_owner}/${row.repository_name}`);
    } catch (error) {
      logger.error(`Failed to get monitored repositories for teacher ${teacherId}:`, error);
      return [];
    }
  }

  /**
   * Store pull requests in database
   */
  private async storePullRequests(pullRequests: PullRequest[], studentId: string): Promise<void> {
    try {
      for (const pr of pullRequests) {
        await this.storeSinglePR(pr, studentId);
      }
    } catch (error) {
      logger.error('Failed to store pull requests:', error);
      throw error;
    }
  }

  /**
   * Store a single pull request in database
   */
  private async storeSinglePR(pr: PullRequest, studentId: string): Promise<void> {
    try {
      const query = `
        INSERT INTO student_pr_submissions (
          student_id, github_username, repository_name, repository_url, pr_number, pr_id, pr_title, pr_url,
          created_at, updated_at, closed_at, merged_at, status, commit_count, lines_added, lines_deleted,
          files_changed, review_comments, is_draft, metadata, synced_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
        ON CONFLICT (pr_id, repository_url) 
        DO UPDATE SET 
          updated_at = $10,
          closed_at = $11,
          merged_at = $12,
          status = $13,
          commit_count = $14,
          lines_added = $15,
          lines_deleted = $16,
          files_changed = $17,
          review_comments = $18,
          is_draft = $19,
          metadata = $20,
          synced_at = NOW()
      `;

      const values = [
        studentId,
        pr.studentUsername,
        pr.repository.split('/')[1], // Extract repo name from "owner/repo"
        pr.repositoryUrl || `https://github.com/${pr.repository}`,
        pr.prNumber || 0,
        pr.id,
        pr.title,
        pr.url,
        pr.createdAt,
        pr.updatedAt,
        pr.closedAt,
        pr.mergedAt,
        pr.status,
        pr.commitCount,
        pr.linesAdded || 0,
        pr.linesDeleted || 0,
        pr.filesChanged || 0,
        pr.reviewComments || 0,
        pr.isDraft || false,
        JSON.stringify(pr.metadata || {})
      ];

      await db.query(query, values);
    } catch (error) {
      logger.error(`Failed to store PR ${pr.id}:`, error);
      throw error;
    }
  }

  /**
   * Get PR statistics for a student
   */
  public async getStudentPRStats(studentId: string, teacherId: string): Promise<StudentPRStatsResponse | null> {
    try {
      const githubUsername = await this.mappingService.getGitHubUsername(studentId, teacherId);
      if (!githubUsername) {
        return null;
      }

      const query = `
        SELECT 
          COUNT(*) as total_prs,
          COUNT(CASE WHEN status = 'merged' THEN 1 END) as merged_prs,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_prs,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as prs_this_month,
          MAX(created_at) as last_pr_date,
          AVG(lines_added + lines_deleted) as avg_pr_size
        FROM student_pr_submissions 
        WHERE student_id = $1 AND github_username = $2
      `;

      const result = await db.query(query, [studentId, githubUsername]);
      const row = result.rows[0];

      // Calculate trend (simplified)
      const trend = await this.calculateTrend(studentId, githubUsername);

      return {
        studentId,
        githubUsername,
        totalPRs: parseInt(row.total_prs),
        mergedPRs: parseInt(row.merged_prs),
        openPRs: parseInt(row.open_prs),
        prsThisWeek: parseInt(row.prs_this_week),
        prsThisMonth: parseInt(row.prs_this_month),
        lastPRDate: row.last_pr_date ? new Date(row.last_pr_date) : undefined,
        avgPRSize: parseFloat(row.avg_pr_size) || 0,
        trend,
        progressScore: this.calculateProgressScore(parseInt(row.total_prs), parseInt(row.merged_prs))
      };
    } catch (error) {
      logger.error(`Failed to get PR stats for student ${studentId}:`, error);
      return null;
    }
  }

  /**
   * Get class overview of PR activity
   */
  public async getClassPROverview(teacherId: string): Promise<ClassPROverviewResponse> {
    try {
      const mappings = await this.mappingService.getTeacherMappings(teacherId);
      const studentIds = mappings.map(m => m.studentId);

      if (studentIds.length === 0) {
        return {
          teacherId,
          totalStudents: 0,
          studentsWithPRs: 0,
          totalPRs: 0,
          prsThisWeek: 0,
          prsThisMonth: 0,
          averagePRsPerStudent: 0,
          topContributors: [],
          repositoryStats: [],
          generatedAt: new Date()
        };
      }

      // Get overall stats
      const overallQuery = `
        SELECT 
          COUNT(DISTINCT student_id) as students_with_prs,
          COUNT(*) as total_prs,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as prs_this_month
        FROM student_pr_submissions 
        WHERE student_id = ANY($1)
      `;

      const overallResult = await db.query(overallQuery, [studentIds]);
      const overallRow = overallResult.rows[0];

      // Get top contributors
      const topContributorsQuery = `
        SELECT 
          student_id,
          github_username,
          COUNT(*) as pr_count
        FROM student_pr_submissions 
        WHERE student_id = ANY($1)
        GROUP BY student_id, github_username
        ORDER BY pr_count DESC
        LIMIT 10
      `;

      const topContributorsResult = await db.query(topContributorsQuery, [studentIds]);

      // Get repository stats
      const repositoryStatsQuery = `
        SELECT 
          repository_name,
          COUNT(*) as pr_count,
          COUNT(DISTINCT student_id) as active_contributors
        FROM student_pr_submissions 
        WHERE student_id = ANY($1)
        GROUP BY repository_name
        ORDER BY pr_count DESC
      `;

      const repositoryStatsResult = await db.query(repositoryStatsQuery, [studentIds]);

      const totalPRs = parseInt(overallRow.total_prs);
      const totalStudents = mappings.length;

      return {
        teacherId,
        totalStudents,
        studentsWithPRs: parseInt(overallRow.students_with_prs),
        totalPRs,
        prsThisWeek: parseInt(overallRow.prs_this_week),
        prsThisMonth: parseInt(overallRow.prs_this_month),
        averagePRsPerStudent: totalStudents > 0 ? totalPRs / totalStudents : 0,
        topContributors: topContributorsResult.rows.map(row => ({
          studentId: row.student_id,
          githubUsername: row.github_username,
          prCount: parseInt(row.pr_count)
        })),
        repositoryStats: repositoryStatsResult.rows.map(row => ({
          repositoryName: row.repository_name,
          prCount: parseInt(row.pr_count),
          activeContributors: parseInt(row.active_contributors)
        })),
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to get class PR overview for teacher ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate progress trend for a student
   */
  private async calculateTrend(studentId: string, githubUsername: string): Promise<{
    direction: 'improving' | 'stable' | 'declining';
    percentage: number;
    timeframe: string;
  }> {
    try {
      // Compare last 2 weeks vs previous 2 weeks
      const recentQuery = `
        SELECT COUNT(*) as recent_count
        FROM student_pr_submissions 
        WHERE student_id = $1 AND github_username = $2 
        AND created_at >= NOW() - INTERVAL '14 days'
      `;

      const previousQuery = `
        SELECT COUNT(*) as previous_count
        FROM student_pr_submissions 
        WHERE student_id = $1 AND github_username = $2 
        AND created_at >= NOW() - INTERVAL '28 days'
        AND created_at < NOW() - INTERVAL '14 days'
      `;

      const [recentResult, previousResult] = await Promise.all([
        db.query(recentQuery, [studentId, githubUsername]),
        db.query(previousQuery, [studentId, githubUsername])
      ]);

      const recentCount = parseInt(recentResult.rows[0].recent_count);
      const previousCount = parseInt(previousResult.rows[0].previous_count);

      let direction: 'improving' | 'stable' | 'declining' = 'stable';
      let percentage = 0;

      if (previousCount === 0 && recentCount > 0) {
        direction = 'improving';
        percentage = 100;
      } else if (previousCount > 0) {
        const change = ((recentCount - previousCount) / previousCount) * 100;
        percentage = Math.abs(change);
        
        if (change > 10) {
          direction = 'improving';
        } else if (change < -10) {
          direction = 'declining';
        }
      }

      return {
        direction,
        percentage: Math.round(percentage),
        timeframe: '2 weeks'
      };
    } catch (error) {
      logger.error(`Failed to calculate trend for student ${studentId}:`, error);
      return {
        direction: 'stable',
        percentage: 0,
        timeframe: '2 weeks'
      };
    }
  }

  /**
   * Calculate progress score based on PR activity
   */
  private calculateProgressScore(totalPRs: number, mergedPRs: number): number {
    if (totalPRs === 0) return 0;
    
    const mergeRate = mergedPRs / totalPRs;
    const activityScore = Math.min(totalPRs / 10, 1); // Max score at 10 PRs
    const qualityScore = mergeRate;
    
    return Math.round((activityScore * 0.6 + qualityScore * 0.4) * 100);
  }

  /**
   * Get recent PR activity for a student
   */
  public async getRecentPRActivity(studentId: string, teacherId: string, days: number = 30): Promise<PullRequest[]> {
    try {
      const githubUsername = await this.mappingService.getGitHubUsername(studentId, teacherId);
      if (!githubUsername) {
        return [];
      }

      const query = `
        SELECT 
          pr_id as id, github_username as student_username, repository_name as repository,
          CONCAT('https://github.com/', repository_name) as repository_url, pr_number, pr_title as title,
          pr_url as url, created_at, updated_at, closed_at, merged_at, status, commit_count,
          lines_added, lines_deleted, (lines_added + lines_deleted) as lines_changed,
          files_changed, review_comments, is_draft, metadata
        FROM student_pr_submissions 
        WHERE student_id = $1 AND github_username = $2 
        AND created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY created_at DESC
      `;

      const result = await db.query(query, [studentId, githubUsername]);

      return result.rows.map(row => ({
        id: row.id,
        studentUsername: row.student_username,
        repository: row.repository,
        repositoryUrl: row.repository_url,
        prNumber: row.pr_number,
        title: row.title,
        url: row.url,
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
        closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
        mergedAt: row.merged_at ? new Date(row.merged_at) : undefined,
        status: row.status,
        commitCount: row.commit_count,
        linesAdded: row.lines_added,
        linesDeleted: row.lines_deleted,
        linesChanged: row.lines_changed,
        filesChanged: row.files_changed,
        reviewComments: row.review_comments,
        isDraft: row.is_draft,
        metadata: row.metadata
      }));
    } catch (error) {
      logger.error(`Failed to get recent PR activity for student ${studentId}:`, error);
      return [];
    }
  }

  /**
   * Sync all PRs for a teacher's class
   */
  public async syncClassPRs(teacherId: string): Promise<{ success: boolean; syncedStudents: number; totalPRs: number }> {
    try {
      const results = await this.fetchAllStudentPRs(teacherId);
      const syncedStudents = results.length;
      const totalPRs = results.reduce((sum, result) => sum + result.prCount, 0);

      logger.info(`Synced PRs for teacher ${teacherId}: ${syncedStudents} students, ${totalPRs} total PRs`);
      
      return {
        success: true,
        syncedStudents,
        totalPRs
      };
    } catch (error) {
      logger.error(`Failed to sync class PRs for teacher ${teacherId}:`, error);
      return {
        success: false,
        syncedStudents: 0,
        totalPRs: 0
      };
    }
  }
}