/**
 * Leaderboard routes
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { LeaderboardService } from '../services/leaderboardService';
import { logger } from '../telemetry/logger';
import { LeaderboardQuery } from '../models';

const router = Router();
const leaderboardService = LeaderboardService.getInstance();

// Validation schemas
const leaderboardQuerySchema = Joi.object({
  timeframe: Joi.string().valid('daily', 'weekly', 'monthly', 'all_time').default('all_time'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  category: Joi.string().optional()
});

/**
 * Get global leaderboard
 * GET /leaderboard/global
 */
router.get('/global', async (req: Request, res: Response) => {
  try {
    const { error, value } = leaderboardQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    const query: LeaderboardQuery = value;
    const leaderboard = await leaderboardService.getGlobalLeaderboard(query);

    res.json({
      leaderboard,
      query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get global leaderboard:', error);
    res.status(500).json({
      error: 'Failed to get global leaderboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user's rank and position
 * GET /leaderboard/rank/:userId
 */
router.get('/rank/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const timeframe = req.query.timeframe as string || 'all_time';

    if (!['daily', 'weekly', 'monthly', 'all_time'].includes(timeframe)) {
      return res.status(400).json({
        error: 'Invalid timeframe',
        validTimeframes: ['daily', 'weekly', 'monthly', 'all_time']
      });
    }

    const rankInfo = await leaderboardService.getUserRank(userId, timeframe);

    res.json({
      userId,
      timeframe,
      ...rankInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get user rank:', error);
    res.status(500).json({
      error: 'Failed to get user rank',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get leaderboard around a specific user
 * GET /leaderboard/around/:userId
 */
router.get('/around/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const range = Math.min(parseInt(req.query.range as string) || 5, 20);
    const timeframe = req.query.timeframe as string || 'all_time';

    if (!['daily', 'weekly', 'monthly', 'all_time'].includes(timeframe)) {
      return res.status(400).json({
        error: 'Invalid timeframe',
        validTimeframes: ['daily', 'weekly', 'monthly', 'all_time']
      });
    }

    const leaderboard = await leaderboardService.getLeaderboardAroundUser(userId, range, timeframe);

    res.json({
      userId,
      range,
      timeframe,
      leaderboard,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get leaderboard around user:', error);
    res.status(500).json({
      error: 'Failed to get leaderboard around user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get category-specific leaderboard
 * GET /leaderboard/category/:category
 */
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { error, value } = leaderboardQuerySchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    const query: LeaderboardQuery = { ...value, category };
    const leaderboard = await leaderboardService.getCategoryLeaderboard(category, query);

    res.json({
      category,
      leaderboard,
      query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get category leaderboard:', error);
    res.status(500).json({
      error: 'Failed to get category leaderboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get trending users (most active recently)
 * GET /leaderboard/trending
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const trending = await leaderboardService.getTrendingUsers(limit);

    res.json({
      trending,
      limit,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get trending users:', error);
    res.status(500).json({
      error: 'Failed to get trending users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get leaderboard statistics
 * GET /leaderboard/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await leaderboardService.getLeaderboardStats();

    res.json({
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get leaderboard stats:', error);
    res.status(500).json({
      error: 'Failed to get leaderboard stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get multiple leaderboards at once
 * GET /leaderboard/multi
 */
router.get('/multi', async (req: Request, res: Response) => {
  try {
    const timeframes = (req.query.timeframes as string)?.split(',') || ['all_time'];
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const validTimeframes = ['daily', 'weekly', 'monthly', 'all_time'];
    const filteredTimeframes = timeframes.filter(tf => validTimeframes.includes(tf));

    if (filteredTimeframes.length === 0) {
      return res.status(400).json({
        error: 'No valid timeframes provided',
        validTimeframes
      });
    }

    const results = await Promise.all(
      filteredTimeframes.map(async (timeframe) => {
        const leaderboard = await leaderboardService.getGlobalLeaderboard({
          timeframe,
          limit
        });
        return { timeframe, leaderboard };
      })
    );

    const leaderboards = results.reduce((acc, result) => {
      acc[result.timeframe] = result.leaderboard;
      return acc;
    }, {} as Record<string, any>);

    res.json({
      leaderboards,
      limit,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get multiple leaderboards:', error);
    res.status(500).json({
      error: 'Failed to get multiple leaderboards',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Compare users on leaderboard
 * GET /leaderboard/compare
 */
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const userIds = (req.query.userIds as string)?.split(',');
    const timeframe = req.query.timeframe as string || 'all_time';

    if (!userIds || userIds.length < 2 || userIds.length > 10) {
      return res.status(400).json({
        error: 'Please provide 2-10 user IDs to compare',
        example: '?userIds=user1,user2,user3&timeframe=weekly'
      });
    }

    if (!['daily', 'weekly', 'monthly', 'all_time'].includes(timeframe)) {
      return res.status(400).json({
        error: 'Invalid timeframe',
        validTimeframes: ['daily', 'weekly', 'monthly', 'all_time']
      });
    }

    const comparisons = await Promise.all(
      userIds.map(async (userId) => {
        const rankInfo = await leaderboardService.getUserRank(userId.trim(), timeframe);
        return {
          userId: userId.trim(),
          ...rankInfo
        };
      })
    );

    // Sort by rank
    comparisons.sort((a, b) => {
      if (a.rank === 0) return 1;
      if (b.rank === 0) return -1;
      return a.rank - b.rank;
    });

    res.json({
      timeframe,
      comparisons,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to compare users:', error);
    res.status(500).json({
      error: 'Failed to compare users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;