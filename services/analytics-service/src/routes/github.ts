/**
 * GitHub Integration Routes
 * Handles GitHub API endpoints for teacher dashboard
 */

import { Router, Request, Response } from 'express';
import { GitHubService } from '../services/githubService';
import { GitHubTokenManager } from '../services/githubTokenManager';
import { PRTrackingService } from '../services/prTrackingService';
import { StudentMappingService } from '../services/studentMappingService';
import { ProgressAnalysisEngine } from '../services/progressAnalysisEngine';
import { AutomatedPRCountingService } from '../services/automatedPRCountingService';
import { logger } from '../telemetry/logger';
import * as Joi from 'joi';

const router = Router();
const githubService = GitHubService.getInstance();
const tokenManager = GitHubTokenManager.getInstance();
const prTrackingService = PRTrackingService.getInstance();
const studentMappingService = StudentMappingService.getInstance();
const progressAnalysisEngine = ProgressAnalysisEngine.getInstance();
const automatedCountingService = AutomatedPRCountingService.getInstance();

// Validation schemas
const tokenSchema = Joi.object({
  token: Joi.string().required().min(1),
  teacherId: Joi.string().required().min(1)
});

const repositorySchema = Joi.object({
  teacherId: Joi.string().required().min(1),
  repositories: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      fullName: Joi.string().required(),
      url: Joi.string().uri().required(),
      owner: Joi.string().required()
    })
  ).min(1).required()
});

const studentPRSchema = Joi.object({
  teacherId: Joi.string().required().min(1),
  username: Joi.string().required().min(1),
  repositories: Joi.array().items(Joi.string()).min(1).required()
});

const studentMappingSchema = Joi.object({
  studentId: Joi.string().required().min(1),
  teacherId: Joi.string().required().min(1),
  githubUsername: Joi.string().required().min(1),
  verificationMethod: Joi.string().valid('manual', 'oauth', 'email').default('manual')
});

const bulkMappingSchema = Joi.object({
  teacherId: Joi.string().required().min(1),
  mappings: Joi.array().items(
    Joi.object({
      studentId: Joi.string().required().min(1),
      githubUsername: Joi.string().required().min(1)
    })
  ).min(1).required()
});

/**
 * POST /github/token
 * Store GitHub token for a teacher
 */
router.post('/token', async (req: Request, res: Response) => {
  try {
    const { error, value } = tokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { token, teacherId } = value;

    // Validate token first
    const validation = await tokenManager.validateToken(token);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid GitHub token',
        details: validation.error
      });
    }

    // Store token
    const success = await githubService.storeToken(teacherId, token);
    if (!success) {
      return res.status(500).json({
        error: 'Failed to store GitHub token'
      });
    }

    res.json({
      success: true,
      message: 'GitHub token stored successfully',
      user: validation.user,
      rateLimit: validation.rateLimit
    });

  } catch (error) {
    logger.error('Error storing GitHub token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/token/:teacherId/validate
 * Validate stored GitHub token for a teacher
 */
router.get('/token/:teacherId/validate', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const validation = await tokenManager.testStoredToken(teacherId);
    
    res.json({
      isValid: validation.isValid,
      user: validation.user,
      rateLimit: validation.rateLimit,
      error: validation.error
    });

  } catch (error) {
    logger.error('Error validating GitHub token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /github/token/:teacherId
 * Delete GitHub token for a teacher
 */
router.delete('/token/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const success = await tokenManager.deleteToken(teacherId);
    
    if (!success) {
      return res.status(404).json({
        error: 'No token found for teacher'
      });
    }

    res.json({
      success: true,
      message: 'GitHub token deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting GitHub token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/token/:teacherId/info
 * Get GitHub token information (metadata only)
 */
router.get('/token/:teacherId/info', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const tokenInfo = await tokenManager.getTokenInfo(teacherId);
    
    if (!tokenInfo) {
      return res.status(404).json({
        error: 'No token found for teacher'
      });
    }

    res.json(tokenInfo);

  } catch (error) {
    logger.error('Error getting GitHub token info:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /github/repositories/monitor
 * Add repositories to monitoring for a teacher
 */
router.post('/repositories/monitor', async (req: Request, res: Response) => {
  try {
    const { error, value } = repositorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { teacherId, repositories } = value;

    // Check if teacher has valid token
    const hasValidToken = await tokenManager.testStoredToken(teacherId);
    if (!hasValidToken.isValid) {
      return res.status(400).json({
        error: 'No valid GitHub token found for teacher',
        details: 'Please configure GitHub token first'
      });
    }

    await githubService.monitorRepositories(teacherId, repositories);

    res.json({
      success: true,
      message: `Added ${repositories.length} repositories to monitoring`,
      repositories: repositories.map(r => r.name)
    });

  } catch (error) {
    logger.error('Error adding repositories to monitoring:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /github/student/prs
 * Fetch pull requests for a specific student
 */
router.post('/student/prs', async (req: Request, res: Response) => {
  try {
    const { error, value } = studentPRSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { teacherId, username, repositories } = value;

    // Check if teacher has valid token
    const hasValidToken = await tokenManager.testStoredToken(teacherId);
    if (!hasValidToken.isValid) {
      return res.status(400).json({
        error: 'No valid GitHub token found for teacher',
        details: 'Please configure GitHub token first'
      });
    }

    const pullRequests = await githubService.fetchStudentPRs(teacherId, username, repositories);

    res.json({
      success: true,
      student: username,
      totalPRs: pullRequests.length,
      pullRequests: pullRequests
    });

  } catch (error) {
    logger.error('Error fetching student PRs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/rate-limit/:teacherId
 * Get current rate limit status for a teacher
 */
router.get('/rate-limit/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const rateLimit = await githubService.getRateLimitInfo(teacherId);
    
    if (!rateLimit) {
      return res.status(404).json({
        error: 'No valid GitHub token found for teacher'
      });
    }

    res.json({
      rateLimit: rateLimit
    });

  } catch (error) {
    logger.error('Error getting rate limit info:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/connection/:teacherId/test
 * Test GitHub API connectivity for a teacher
 */
router.get('/connection/:teacherId/test', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const isConnected = await githubService.testConnection(teacherId);
    
    res.json({
      connected: isConnected,
      message: isConnected ? 'GitHub API connection successful' : 'GitHub API connection failed'
    });

  } catch (error) {
    logger.error('Error testing GitHub connection:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /github/webhook
 * Handle GitHub webhook events
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const payload = req.body;

    if (!payload) {
      return res.status(400).json({
        error: 'Webhook payload is required'
      });
    }

    await githubService.webhookHandler(payload);

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    logger.error('Error processing GitHub webhook:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENHANCED TEACHER DASHBOARD ENDPOINTS
// ============================================================================

/**
 * GET /github/student-stats
 * Get PR statistics for a specific student
 */
router.get('/student-stats', async (req: Request, res: Response) => {
  try {
    const { studentId, teacherId, timeframe } = req.query;

    if (!studentId || !teacherId) {
      return res.status(400).json({
        error: 'Student ID and Teacher ID are required'
      });
    }

    const stats = await prTrackingService.getStudentPRStats(
      studentId as string, 
      teacherId as string
    );

    if (!stats) {
      return res.status(404).json({
        error: 'No PR data found for student'
      });
    }

    res.json(stats);

  } catch (error) {
    logger.error('Error getting student PR stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/class-overview
 * Get class-wide PR overview for a teacher
 */
router.get('/class-overview', async (req: Request, res: Response) => {
  try {
    const { teacherId, timeframe } = req.query;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const overview = await prTrackingService.getClassPROverview(teacherId as string);

    res.json(overview);

  } catch (error) {
    logger.error('Error getting class PR overview:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/student-prs
 * Get recent PRs for a specific student
 */
router.get('/student-prs', async (req: Request, res: Response) => {
  try {
    const { studentId, teacherId, limit = '10', days = '30' } = req.query;

    if (!studentId || !teacherId) {
      return res.status(400).json({
        error: 'Student ID and Teacher ID are required'
      });
    }

    const prs = await prTrackingService.getRecentPRActivity(
      studentId as string,
      teacherId as string,
      parseInt(days as string)
    );

    const limitedPRs = prs.slice(0, parseInt(limit as string));

    res.json(limitedPRs);

  } catch (error) {
    logger.error('Error getting student PRs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/student-insights
 * Get AI-powered insights for a student's GitHub activity
 */
router.get('/student-insights', async (req: Request, res: Response) => {
  try {
    const { studentId, teacherId } = req.query;

    if (!studentId || !teacherId) {
      return res.status(400).json({
        error: 'Student ID and Teacher ID are required'
      });
    }

    const analysis = await progressAnalysisEngine.analyzeStudentProgress(
      studentId as string,
      teacherId as string
    );

    if (!analysis) {
      return res.status(404).json({
        error: 'No analysis data found for student'
      });
    }

    res.json(analysis.insights);

  } catch (error) {
    logger.error('Error getting student insights:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/class-trends
 * Get PR trend data for a class
 */
router.get('/class-trends', async (req: Request, res: Response) => {
  try {
    const { teacherId, timeframe = '30d' } = req.query;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    // Mock trend data for now - would be replaced with actual implementation
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const trendData = Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return {
        date: date.toISOString().split('T')[0],
        prs: Math.floor(Math.random() * 10) + 2,
        merged: Math.floor(Math.random() * 6) + 1,
        open: Math.floor(Math.random() * 4) + 1
      };
    });

    res.json(trendData);

  } catch (error) {
    logger.error('Error getting class trends:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /github/student-mapping
 * Create a student-to-GitHub username mapping
 */
router.post('/student-mapping', async (req: Request, res: Response) => {
  try {
    const { error, value } = studentMappingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { studentId, teacherId, githubUsername, verificationMethod } = value;

    const success = await studentMappingService.createMapping(
      studentId,
      teacherId,
      githubUsername,
      verificationMethod
    );

    if (!success) {
      return res.status(500).json({
        error: 'Failed to create student mapping'
      });
    }

    res.json({
      success: true,
      message: 'Student mapping created successfully',
      mapping: {
        studentId,
        githubUsername,
        verificationMethod
      }
    });

  } catch (error) {
    logger.error('Error creating student mapping:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /github/student-mapping/bulk
 * Create multiple student mappings at once
 */
router.post('/student-mapping/bulk', async (req: Request, res: Response) => {
  try {
    const { error, value } = bulkMappingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { teacherId, mappings } = value;

    const result = await studentMappingService.bulkCreateMappings(teacherId, mappings);

    res.json({
      success: true,
      message: `Bulk import completed: ${result.success} successful, ${result.failed} failed`,
      result
    });

  } catch (error) {
    logger.error('Error creating bulk student mappings:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/student-mappings/:teacherId
 * Get all student mappings for a teacher
 */
router.get('/student-mappings/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const mappings = await studentMappingService.getTeacherMappings(teacherId);

    res.json({
      success: true,
      mappings,
      count: mappings.length
    });

  } catch (error) {
    logger.error('Error getting student mappings:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /github/student-mapping/:teacherId/:studentId
 * Remove a student mapping
 */
router.delete('/student-mapping/:teacherId/:studentId', async (req: Request, res: Response) => {
  try {
    const { teacherId, studentId } = req.params;

    if (!teacherId || !studentId) {
      return res.status(400).json({
        error: 'Teacher ID and Student ID are required'
      });
    }

    const success = await studentMappingService.removeMapping(studentId, teacherId);

    if (!success) {
      return res.status(404).json({
        error: 'Student mapping not found'
      });
    }

    res.json({
      success: true,
      message: 'Student mapping removed successfully'
    });

  } catch (error) {
    logger.error('Error removing student mapping:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /github/sync/:teacherId
 * Trigger manual sync of PRs for a teacher's class
 */
router.post('/sync/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const result = await prTrackingService.syncClassPRs(teacherId);

    res.json({
      success: result.success,
      message: result.success 
        ? `Synced PRs for ${result.syncedStudents} students, found ${result.totalPRs} PRs`
        : 'Failed to sync PRs',
      syncedStudents: result.syncedStudents,
      totalPRs: result.totalPRs
    });

  } catch (error) {
    logger.error('Error syncing class PRs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/progress-analysis/:teacherId/:studentId
 * Get comprehensive progress analysis for a student
 */
router.get('/progress-analysis/:teacherId/:studentId', async (req: Request, res: Response) => {
  try {
    const { teacherId, studentId } = req.params;

    if (!teacherId || !studentId) {
      return res.status(400).json({
        error: 'Teacher ID and Student ID are required'
      });
    }

    const analysis = await progressAnalysisEngine.analyzeStudentProgress(studentId, teacherId);

    if (!analysis) {
      return res.status(404).json({
        error: 'No progress analysis available for student'
      });
    }

    res.json(analysis);

  } catch (error) {
    logger.error('Error getting progress analysis:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /github/automated-counting/:teacherId/start
 * Start automated PR counting for a teacher
 */
router.post('/automated-counting/:teacherId/start', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { intervalMinutes = 60 } = req.body;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const success = await automatedCountingService.startAutomatedCounting(
      teacherId, 
      intervalMinutes
    );

    if (!success) {
      return res.status(500).json({
        error: 'Failed to start automated counting'
      });
    }

    res.json({
      success: true,
      message: `Automated PR counting started for teacher ${teacherId}`,
      intervalMinutes
    });

  } catch (error) {
    logger.error('Error starting automated counting:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /github/automated-counting/:teacherId/stop
 * Stop automated PR counting for a teacher
 */
router.post('/automated-counting/:teacherId/stop', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const success = await automatedCountingService.stopAutomatedCounting(teacherId);

    if (!success) {
      return res.status(500).json({
        error: 'Failed to stop automated counting'
      });
    }

    res.json({
      success: true,
      message: `Automated PR counting stopped for teacher ${teacherId}`
    });

  } catch (error) {
    logger.error('Error stopping automated counting:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /github/automated-counting/:teacherId/status
 * Get automated counting status for a teacher
 */
router.get('/automated-counting/:teacherId/status', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      });
    }

    const schedule = await automatedCountingService.getSchedule(teacherId);
    const jobStatus = automatedCountingService.getJobStatus(teacherId);
    const stats = await automatedCountingService.getCountingStats(teacherId);

    res.json({
      schedule,
      currentJob: jobStatus,
      stats
    });

  } catch (error) {
    logger.error('Error getting automated counting status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;