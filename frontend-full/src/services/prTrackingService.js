/**
 * PR Tracking Service
 * Manages student PR data, progress analysis, and caching
 */

import githubService from './githubService';

class PRTrackingService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.studentMappings = new Map();
    this.monitoredRepositories = [];
    this.updateCallbacks = new Set();
  }

  /**
   * Add callback for PR updates
   * @param {Function} callback - Callback function
   */
  onUpdate(callback) {
    this.updateCallbacks.add(callback);
  }

  /**
   * Remove update callback
   * @param {Function} callback - Callback function
   */
  offUpdate(callback) {
    this.updateCallbacks.delete(callback);
  }

  /**
   * Notify all callbacks of updates
   * @param {object} data - Update data
   */
  notifyUpdate(data) {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in PR tracking callback:', error);
      }
    });
  }

  /**
   * Set student to GitHub username mappings
   * @param {Array<object>} mappings - Array of {studentId, githubUsername, studentName} objects
   */
  setStudentMappings(mappings) {
    this.studentMappings.clear();
    mappings.forEach(mapping => {
      this.studentMappings.set(mapping.studentId, mapping);
    });
    
    // Clear cache when mappings change
    this.clearCache();
  }

  /**
   * Set monitored repositories
   * @param {Array<string>} repositories - Array of repository full names (owner/repo)
   */
  setMonitoredRepositories(repositories) {
    this.monitoredRepositories = repositories;
    
    // Clear cache when repositories change
    this.clearCache();
  }

  /**
   * Get cached data if valid
   * @param {string} key - Cache key
   * @returns {object|null} - Cached data or null
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {object} data - Data to cache
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Fetch PR data for all students
   * @param {boolean} useCache - Whether to use cached data
   * @returns {Promise<object>} - Student PR data
   */
  async fetchAllStudentPRs(useCache = true) {
    const cacheKey = 'all_student_prs';
    
    if (useCache) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const mappings = Array.from(this.studentMappings.values());
      const prData = await githubService.fetchStudentsPRs(mappings, this.monitoredRepositories);
      
      // Add student names to the data
      Object.keys(prData).forEach(studentId => {
        const mapping = this.studentMappings.get(studentId);
        if (mapping) {
          prData[studentId].studentName = mapping.studentName;
        }
      });

      // Cache the results
      this.setCachedData(cacheKey, prData);
      
      // Notify callbacks
      this.notifyUpdate({
        type: 'all_students_updated',
        data: prData
      });

      return prData;
    } catch (error) {
      console.error('Error fetching all student PRs:', error);
      throw error;
    }
  }

  /**
   * Fetch PR data for a specific student
   * @param {string} studentId - Student ID
   * @param {boolean} useCache - Whether to use cached data
   * @returns {Promise<object>} - Student PR data
   */
  async fetchStudentPRs(studentId, useCache = true) {
    const cacheKey = `student_prs_${studentId}`;
    
    if (useCache) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const mapping = this.studentMappings.get(studentId);
    if (!mapping) {
      throw new Error(`No GitHub mapping found for student ${studentId}`);
    }

    try {
      const prs = await githubService.fetchUserPRs(mapping.githubUsername, this.monitoredRepositories);
      
      const studentData = {
        studentId,
        studentName: mapping.studentName,
        githubUsername: mapping.githubUsername,
        prs,
        totalPRs: prs.length,
        openPRs: prs.filter(pr => pr.state === 'open').length,
        closedPRs: prs.filter(pr => pr.state === 'closed').length,
        mergedPRs: prs.filter(pr => pr.mergedAt).length,
        lastActivity: prs.length > 0 ? prs[0].createdAt : null
      };

      // Cache the results
      this.setCachedData(cacheKey, studentData);
      
      // Notify callbacks
      this.notifyUpdate({
        type: 'student_updated',
        studentId,
        data: studentData
      });

      return studentData;
    } catch (error) {
      console.error(`Error fetching PRs for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze student progress based on PR data
   * @param {object} studentPRData - Student PR data
   * @returns {object} - Progress analysis
   */
  analyzeStudentProgress(studentPRData) {
    const { prs, totalPRs } = studentPRData;
    
    if (totalPRs === 0) {
      return {
        progressScore: 0,
        trend: 'no_activity',
        recommendations: ['Start by creating your first pull request'],
        insights: ['No GitHub activity detected']
      };
    }

    // Calculate progress metrics
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentPRs = prs.filter(pr => new Date(pr.createdAt) > oneWeekAgo);
    const monthlyPRs = prs.filter(pr => new Date(pr.createdAt) > oneMonthAgo);

    // Calculate activity frequency
    const weeklyActivity = recentPRs.length;
    const monthlyActivity = monthlyPRs.length;
    const averageWeeklyActivity = monthlyActivity / 4;

    // Calculate code contribution metrics
    const totalAdditions = prs.reduce((sum, pr) => sum + (pr.additions || 0), 0);
    const totalDeletions = prs.reduce((sum, pr) => sum + (pr.deletions || 0), 0);
    const averagePRSize = totalPRs > 0 ? (totalAdditions + totalDeletions) / totalPRs : 0;

    // Calculate merge rate
    const mergeRate = totalPRs > 0 ? (studentPRData.mergedPRs / totalPRs) * 100 : 0;

    // Determine trend
    let trend = 'stable';
    if (weeklyActivity > averageWeeklyActivity * 1.5) {
      trend = 'improving';
    } else if (weeklyActivity < averageWeeklyActivity * 0.5) {
      trend = 'declining';
    }

    // Calculate overall progress score (0-100)
    let progressScore = 0;
    progressScore += Math.min(totalPRs * 5, 30); // Up to 30 points for total PRs
    progressScore += Math.min(weeklyActivity * 10, 25); // Up to 25 points for recent activity
    progressScore += Math.min(mergeRate * 0.3, 30); // Up to 30 points for merge rate
    progressScore += Math.min(averagePRSize * 0.01, 15); // Up to 15 points for code contribution

    progressScore = Math.min(Math.round(progressScore), 100);

    // Generate recommendations
    const recommendations = [];
    const insights = [];

    if (weeklyActivity === 0) {
      recommendations.push('Increase your GitHub activity with regular commits');
    }
    if (mergeRate < 50) {
      recommendations.push('Focus on creating high-quality PRs that get merged');
    }
    if (averagePRSize < 50) {
      recommendations.push('Consider making more substantial contributions');
    }
    if (studentPRData.openPRs > 5) {
      recommendations.push('Follow up on your open pull requests');
    }

    insights.push(`${totalPRs} total PRs with ${mergeRate.toFixed(1)}% merge rate`);
    insights.push(`${weeklyActivity} PRs this week, ${monthlyActivity} this month`);
    if (averagePRSize > 0) {
      insights.push(`Average PR size: ${Math.round(averagePRSize)} lines changed`);
    }

    return {
      progressScore,
      trend,
      recommendations: recommendations.length > 0 ? recommendations : ['Keep up the great work!'],
      insights,
      metrics: {
        totalPRs,
        weeklyActivity,
        monthlyActivity,
        mergeRate,
        averagePRSize,
        totalAdditions,
        totalDeletions
      }
    };
  }

  /**
   * Get progress analysis for all students
   * @returns {Promise<object>} - Progress analysis for all students
   */
  async getProgressAnalysis() {
    try {
      const allPRData = await this.fetchAllStudentPRs();
      const analysis = {};

      Object.keys(allPRData).forEach(studentId => {
        analysis[studentId] = this.analyzeStudentProgress(allPRData[studentId]);
      });

      return analysis;
    } catch (error) {
      console.error('Error getting progress analysis:', error);
      throw error;
    }
  }

  /**
   * Get class-wide statistics
   * @returns {Promise<object>} - Class statistics
   */
  async getClassStatistics() {
    try {
      const allPRData = await this.fetchAllStudentPRs();
      const students = Object.values(allPRData);

      if (students.length === 0) {
        return {
          totalStudents: 0,
          totalPRs: 0,
          averagePRsPerStudent: 0,
          activeStudents: 0,
          topContributors: [],
          recentActivity: []
        };
      }

      const totalPRs = students.reduce((sum, student) => sum + student.totalPRs, 0);
      const averagePRsPerStudent = totalPRs / students.length;
      const activeStudents = students.filter(student => student.totalPRs > 0).length;

      // Get top contributors
      const topContributors = students
        .sort((a, b) => b.totalPRs - a.totalPRs)
        .slice(0, 5)
        .map(student => ({
          studentId: student.studentId || 'unknown',
          studentName: student.studentName,
          githubUsername: student.githubUsername,
          totalPRs: student.totalPRs,
          mergedPRs: student.mergedPRs
        }));

      // Get recent activity (last 7 days)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentActivity = [];

      students.forEach(student => {
        const recentPRs = student.prs.filter(pr => new Date(pr.createdAt) > oneWeekAgo);
        recentPRs.forEach(pr => {
          recentActivity.push({
            studentName: student.studentName,
            githubUsername: student.githubUsername,
            prTitle: pr.title,
            prNumber: pr.number,
            repository: pr.repository.fullName,
            createdAt: pr.createdAt,
            state: pr.state
          });
        });
      });

      // Sort recent activity by date
      recentActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return {
        totalStudents: students.length,
        totalPRs,
        averagePRsPerStudent: Math.round(averagePRsPerStudent * 10) / 10,
        activeStudents,
        activityRate: Math.round((activeStudents / students.length) * 100),
        topContributors,
        recentActivity: recentActivity.slice(0, 20) // Last 20 activities
      };
    } catch (error) {
      console.error('Error getting class statistics:', error);
      throw error;
    }
  }

  /**
   * Start automatic PR monitoring
   * @param {number} interval - Update interval in milliseconds (default: 5 minutes)
   */
  startMonitoring(interval = 5 * 60 * 1000) {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        console.log('PR Tracking: Automatic update started');
        await this.fetchAllStudentPRs(false); // Force refresh
        console.log('PR Tracking: Automatic update completed');
      } catch (error) {
        console.error('PR Tracking: Automatic update failed:', error);
      }
    }, interval);

    console.log(`PR Tracking: Monitoring started with ${interval / 1000}s interval`);
  }

  /**
   * Stop automatic PR monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('PR Tracking: Monitoring stopped');
    }
  }
}

// Create singleton instance
const prTrackingService = new PRTrackingService();

export default prTrackingService;