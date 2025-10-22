import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { PullRequest } from './githubService';

export interface CachedPRData {
  studentId: string;
  teacherId: string;
  totalPRs: number;
  prsThisWeek: number;
  prsThisMonth: number;
  lastPRDate: Date | null;
  averagePRsPerWeek: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: Date;
}

export interface ClassPROverview {
  teacherId: string;
  totalStudents: number;
  totalPRs: number;
  averagePRsPerStudent: number;
  mostActiveStudent: {
    studentId: string;
    prCount: number;
  } | null;
  leastActiveStudent: {
    studentId: string;
    prCount: number;
  } | null;
  weeklyTrend: number;
  lastUpdated: Date;
}

/**
 * GitHub PR Caching Service
 * Provides high-performance caching for GitHub PR data with automatic invalidation
 */
export class GitHubPRCacheService {
  private static instance: GitHubPRCacheService;
  private readonly CACHE_TTL = {
    STUDENT_PR_DATA: 900, // 15 minutes
    CLASS_OVERVIEW: 600,  // 10 minutes
    PR_TRENDS: 1800,      // 30 minutes
    PROGRESS_ANALYSIS: 3600 // 1 hour
  };

  private constructor() {}

  public static getInstance(): GitHubPRCacheService {
    if (!GitHubPRCacheService.instance) {
      GitHubPRCacheService.instance = new GitHubPRCacheService();
    }
    return GitHubPRCacheService.instance;
  }

  /**
   * Get cached student PR data with automatic refresh
   */
  public async getStudentPRData(studentId: string, teacherId: string): Promise<CachedPRData | null> {
    try {
      const cacheKey = `student_pr_data:${studentId}:${teacherId}`;
      const cached = await db.cacheGet<CachedPRData>(cacheKey);

      if (cached && this.isCacheValid(cached.lastUpdated, this.CACHE_TTL.STUDENT_PR_DATA)) {
        logger.debug(`Cache hit for student PR data: ${studentId}`);
        return cached;
      }

      // Cache miss or expired, fetch fresh data
      logger.debug(`Cache miss for student PR data: ${studentId}, fetching fresh data`);
      const freshData = await this.fetchStudentPRData(studentId, teacherId);
      
      if (freshData) {
        await db.cacheSet(cacheKey, freshData, this.CACHE_TTL.STUDENT_PR_DATA);
      }

      return freshData;

    } catch (error) {
      logger.error(`Error getting cached student PR data for ${studentId}:`, error);
      return null;
    }
  }

  /**
   * Get cached class PR overview with automatic refresh
   */
  public async getClassPROverview(teacherId: string): Promise<ClassPROverview | null> {
    try {
      const cacheKey = `class_pr_overview:${teacherId}`;
      const cached = await db.cacheGet<ClassPROverview>(cacheKey);

      if (cached && this.isCacheValid(cached.lastUpdated, this.CACHE_TTL.CLASS_OVERVIEW)) {
        logger.debug(`Cache hit for class PR overview: ${teacherId}`);
        return cached;
      }

      // Cache miss or expired, fetch fresh data
      logger.debug(`Cache miss for class PR overview: ${teacherId}, fetching fresh data`);
      const freshData = await this.fetchClassPROverview(teacherId);
      
      if (freshData) {
        await db.cacheSet(cacheKey, freshData, this.CACHE_TTL.CLASS_OVERVIEW);
      }

      return freshData;

    } catch (error) {
      logger.error(`Error getting cached class PR overview for ${teacherId}:`, error);
      return null;
    }
  }

  /**
   * Invalidate cache for specific student
   */
  public async invalidateStudentCache(studentId: string, teacherId: string): Promise<void> {
    try {
      const keys = [
        `student_pr_data:${studentId}:${teacherId}`,
        `class_pr_overview:${teacherId}`,
        `pr_trends:${teacherId}`,
        `progress_analysis:${studentId}:${teacherId}`
      ];

      for (const key of keys) {
        await db.cacheDel(key);
      }

      logger.debug(`Invalidated cache for student ${studentId} and teacher ${teacherId}`);

    } catch (error) {
      logger.error(`Error invalidating cache for student ${studentId}:`, error);
    }
  }

  /**
   * Invalidate cache for entire class
   */
  public async invalidateClassCache(teacherId: string): Promise<void> {
    try {
      // Get all students for this teacher
      const studentsQuery = `
        SELECT DISTINCT student_id 
        FROM student_github_profiles 
        WHERE teacher_id = $1 AND is_verified = true
      `;
      const studentsResult = await db.query(studentsQuery, [teacherId]);

      // Invalidate individual student caches
      for (const row of studentsResult.rows) {
        await this.invalidateStudentCache(row.student_id, teacherId);
      }

      // Invalidate class-level caches
      const classKeys = [
        `class_pr_overview:${teacherId}`,
        `pr_trends:${teacherId}`
      ];

      for (const key of classKeys) {
        await db.cacheDel(key);
      }

      logger.debug(`Invalidated all cache for teacher ${teacherId}`);

    } catch (error) {
      logger.error(`Error invalidating class cache for teacher ${teacherId}:`, error);
    }
  }

  /**
   * Preload cache for all students in a class
   */
  public async preloadClassCache(teacherId: string): Promise<void> {
    try {
      logger.info(`Preloading cache for teacher ${teacherId}`);

      // Get all students for this teacher
      const studentsQuery = `
        SELECT student_id 
        FROM student_github_profiles 
        WHERE teacher_id = $1 AND is_verified = true
      `;
      const studentsResult = await db.query(studentsQuery, [teacherId]);

      // Preload student data in parallel
      const preloadPromises = studentsResult.rows.map(row => 
        this.getStudentPRData(row.student_id, teacherId)
      );

      await Promise.all(preloadPromises);

      // Preload class overview
      await this.getClassPROverview(teacherId);

      logger.info(`Cache preloaded for teacher ${teacherId} with ${studentsResult.rows.length} students`);

    } catch (error) {
      logger.error(`Error preloading cache for teacher ${teacherId}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(teacherId: string): Promise<{
    studentCacheHits: number;
    classCacheHits: number;
    totalCacheSize: number;
    lastUpdated: Date;
  }> {
    try {
      // This would require Redis SCAN to get all keys
      // For now, return mock data
      return {
        studentCacheHits: 0,
        classCacheHits: 0,
        totalCacheSize: 0,
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.error(`Error getting cache stats for teacher ${teacherId}:`, error);
      return {
        studentCacheHits: 0,
        classCacheHits: 0,
        totalCacheSize: 0,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Fetch fresh student PR data from database
   */
  private async fetchStudentPRData(studentId: string, teacherId: string): Promise<CachedPRData | null> {
    try {
      const query = `
        WITH pr_stats AS (
          SELECT 
            COUNT(*) as total_prs,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as prs_this_month,
            MAX(created_at) as last_pr_date,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '14 days' THEN 1 END) as prs_last_2_weeks,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '21 days' AND created_at < NOW() - INTERVAL '7 days' THEN 1 END) as prs_prev_2_weeks
          FROM student_pr_submissions sps
          JOIN student_github_profiles sgp ON sps.student_id = sgp.student_id
          WHERE sps.student_id = $1 AND sgp.teacher_id = $2
        )
        SELECT 
          total_prs,
          prs_this_week,
          prs_this_month,
          last_pr_date,
          CASE 
            WHEN total_prs = 0 THEN 0
            ELSE ROUND((total_prs::float / GREATEST(EXTRACT(days FROM (NOW() - (
              SELECT MIN(created_at) FROM student_pr_submissions WHERE student_id = $1
            ))) / 7, 1))::numeric, 2)
          END as avg_prs_per_week,
          CASE 
            WHEN prs_prev_2_weeks = 0 AND prs_last_2_weeks > 0 THEN 'increasing'
            WHEN prs_prev_2_weeks > 0 AND prs_last_2_weeks = 0 THEN 'decreasing'
            WHEN prs_last_2_weeks > prs_prev_2_weeks THEN 'increasing'
            WHEN prs_last_2_weeks < prs_prev_2_weeks THEN 'decreasing'
            ELSE 'stable'
          END as trend
        FROM pr_stats
      `;

      const result = await db.query(query, [studentId, teacherId]);

      if (result.rows.length === 0) {
        return {
          studentId,
          teacherId,
          totalPRs: 0,
          prsThisWeek: 0,
          prsThisMonth: 0,
          lastPRDate: null,
          averagePRsPerWeek: 0,
          trend: 'stable',
          lastUpdated: new Date()
        };
      }

      const row = result.rows[0];
      return {
        studentId,
        teacherId,
        totalPRs: parseInt(row.total_prs) || 0,
        prsThisWeek: parseInt(row.prs_this_week) || 0,
        prsThisMonth: parseInt(row.prs_this_month) || 0,
        lastPRDate: row.last_pr_date ? new Date(row.last_pr_date) : null,
        averagePRsPerWeek: parseFloat(row.avg_prs_per_week) || 0,
        trend: row.trend || 'stable',
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.error(`Error fetching student PR data for ${studentId}:`, error);
      return null;
    }
  }

  /**
   * Fetch fresh class PR overview from database
   */
  private async fetchClassPROverview(teacherId: string): Promise<ClassPROverview | null> {
    try {
      const query = `
        WITH class_stats AS (
          SELECT 
            COUNT(DISTINCT sgp.student_id) as total_students,
            COUNT(sps.id) as total_prs,
            COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
            COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '14 days' AND sps.created_at < NOW() - INTERVAL '7 days' THEN 1 END) as prs_prev_week
          FROM student_github_profiles sgp
          LEFT JOIN student_pr_submissions sps ON sgp.student_id = sps.student_id
          WHERE sgp.teacher_id = $1 AND sgp.is_verified = true
        ),
        student_pr_counts AS (
          SELECT 
            sgp.student_id,
            COUNT(sps.id) as pr_count
          FROM student_github_profiles sgp
          LEFT JOIN student_pr_submissions sps ON sgp.student_id = sps.student_id
          WHERE sgp.teacher_id = $1 AND sgp.is_verified = true
          GROUP BY sgp.student_id
        ),
        most_active AS (
          SELECT student_id, pr_count
          FROM student_pr_counts
          WHERE pr_count > 0
          ORDER BY pr_count DESC
          LIMIT 1
        ),
        least_active AS (
          SELECT student_id, pr_count
          FROM student_pr_counts
          ORDER BY pr_count ASC
          LIMIT 1
        )
        SELECT 
          cs.total_students,
          cs.total_prs,
          CASE 
            WHEN cs.total_students > 0 THEN ROUND((cs.total_prs::float / cs.total_students)::numeric, 2)
            ELSE 0
          END as avg_prs_per_student,
          ma.student_id as most_active_student_id,
          ma.pr_count as most_active_pr_count,
          la.student_id as least_active_student_id,
          la.pr_count as least_active_pr_count,
          CASE 
            WHEN cs.prs_prev_week = 0 AND cs.prs_this_week > 0 THEN 100
            WHEN cs.prs_prev_week = 0 THEN 0
            ELSE ROUND(((cs.prs_this_week - cs.prs_prev_week)::float / cs.prs_prev_week * 100)::numeric, 1)
          END as weekly_trend
        FROM class_stats cs
        LEFT JOIN most_active ma ON true
        LEFT JOIN least_active la ON true
      `;

      const result = await db.query(query, [teacherId]);

      if (result.rows.length === 0) {
        return {
          teacherId,
          totalStudents: 0,
          totalPRs: 0,
          averagePRsPerStudent: 0,
          mostActiveStudent: null,
          leastActiveStudent: null,
          weeklyTrend: 0,
          lastUpdated: new Date()
        };
      }

      const row = result.rows[0];
      return {
        teacherId,
        totalStudents: parseInt(row.total_students) || 0,
        totalPRs: parseInt(row.total_prs) || 0,
        averagePRsPerStudent: parseFloat(row.avg_prs_per_student) || 0,
        mostActiveStudent: row.most_active_student_id ? {
          studentId: row.most_active_student_id,
          prCount: parseInt(row.most_active_pr_count) || 0
        } : null,
        leastActiveStudent: row.least_active_student_id ? {
          studentId: row.least_active_student_id,
          prCount: parseInt(row.least_active_pr_count) || 0
        } : null,
        weeklyTrend: parseFloat(row.weekly_trend) || 0,
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.error(`Error fetching class PR overview for teacher ${teacherId}:`, error);
      return null;
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(lastUpdated: Date, ttlSeconds: number): boolean {
    const now = new Date();
    const cacheAge = (now.getTime() - new Date(lastUpdated).getTime()) / 1000;
    return cacheAge < ttlSeconds;
  }
}