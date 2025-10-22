import { Router } from 'express';
import { logger } from '../telemetry/logger';
import { DatabaseIntegrationService } from '../services/databaseIntegrationService';

const router = Router();
const dbIntegration = DatabaseIntegrationService.getInstance();

/**
 * GET /database-integration/status
 * Get database integration status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const stats = await dbIntegration.getIntegrationStatistics();
    const consistencyCheck = await dbIntegration.checkDataConsistency();

    res.json({
      success: true,
      data: {
        statistics: stats,
        consistency: consistencyCheck,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting database integration status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration status'
    });
  }
});

/**
 * POST /database-integration/validate
 * Validate data integrity across all tables
 */
router.post('/validate', async (req, res) => {
  try {
    const validation = await dbIntegration.validateDataIntegrity();

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    logger.error('Error validating data integrity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate data integrity'
    });
  }
});

/**
 * POST /database-integration/sync
 * Sync orphaned data and ensure consistency
 */
router.post('/sync', async (req, res) => {
  try {
    await dbIntegration.syncOrphanedData();
    await dbIntegration.refreshMaterializedViews();

    const stats = await dbIntegration.getIntegrationStatistics();

    res.json({
      success: true,
      message: 'Data synchronization completed',
      data: {
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error syncing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync data'
    });
  }
});

/**
 * POST /database-integration/cleanup
 * Clean up orphaned and old data
 */
router.post('/cleanup', async (req, res) => {
  try {
    const cleanup = await dbIntegration.cleanupOrphanedData();

    res.json({
      success: true,
      message: 'Data cleanup completed',
      data: cleanup
    });

  } catch (error) {
    logger.error('Error cleaning up data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up data'
    });
  }
});

/**
 * GET /database-integration/student/:studentId
 * Get comprehensive student data from integrated sources
 */
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { teacherId } = req.query;

    const studentData = await dbIntegration.getComprehensiveStudentData(
      studentId,
      teacherId as string
    );

    if (!studentData) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: studentData
    });

  } catch (error) {
    logger.error('Error getting comprehensive student data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student data'
    });
  }
});

/**
 * GET /database-integration/teacher/:teacherId/summary
 * Get teacher dashboard summary from integrated data
 */
router.get('/teacher/:teacherId/summary', async (req, res) => {
  try {
    const { teacherId } = req.params;

    const summary = await dbIntegration.getTeacherDashboardSummary(teacherId);

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('Error getting teacher dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get teacher summary'
    });
  }
});

/**
 * POST /database-integration/student/ensure
 * Ensure student record exists in the system
 */
router.post('/student/ensure', async (req, res) => {
  try {
    const { studentId, teacherId, studentData } = req.body;

    if (!studentId || !teacherId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID and Teacher ID are required'
      });
    }

    const success = await dbIntegration.ensureStudentRecord(
      studentId,
      teacherId,
      studentData
    );

    if (success) {
      res.json({
        success: true,
        message: 'Student record ensured'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to ensure student record'
      });
    }

  } catch (error) {
    logger.error('Error ensuring student record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ensure student record'
    });
  }
});

/**
 * POST /database-integration/performance/update-github-context
 * Update performance data with GitHub context
 */
router.post('/performance/update-github-context', async (req, res) => {
  try {
    const { userId, submissionId, githubContext } = req.body;

    if (!userId || !submissionId || !githubContext) {
      return res.status(400).json({
        success: false,
        error: 'User ID, submission ID, and GitHub context are required'
      });
    }

    const success = await dbIntegration.updatePerformanceDataWithGitHubContext(
      userId,
      submissionId,
      githubContext
    );

    if (success) {
      res.json({
        success: true,
        message: 'Performance data updated with GitHub context'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update performance data'
      });
    }

  } catch (error) {
    logger.error('Error updating performance data with GitHub context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update performance data'
    });
  }
});

/**
 * POST /database-integration/refresh-views
 * Refresh materialized views for better performance
 */
router.post('/refresh-views', async (req, res) => {
  try {
    await dbIntegration.refreshMaterializedViews();

    res.json({
      success: true,
      message: 'Materialized views refreshed successfully'
    });

  } catch (error) {
    logger.error('Error refreshing materialized views:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh materialized views'
    });
  }
});

/**
 * GET /database-integration/consistency-check
 * Run comprehensive data consistency check
 */
router.get('/consistency-check', async (req, res) => {
  try {
    const consistencyCheck = await dbIntegration.checkDataConsistency();

    res.json({
      success: true,
      data: {
        ...consistencyCheck,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error running consistency check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run consistency check'
    });
  }
});

/**
 * GET /database-integration/health
 * Get database integration health status
 */
router.get('/health', async (req, res) => {
  try {
    const stats = await dbIntegration.getIntegrationStatistics();
    const validation = await dbIntegration.validateDataIntegrity();

    const health = {
      status: validation.isValid ? 'healthy' : 'degraded',
      statistics: stats,
      issues: validation.issues,
      recommendations: validation.recommendations,
      timestamp: new Date().toISOString()
    };

    const statusCode = validation.isValid ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Error getting database integration health:', error);
    res.status(503).json({
      success: false,
      error: 'Failed to get integration health status'
    });
  }
});

export default router;