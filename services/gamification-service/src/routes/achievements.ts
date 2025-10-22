/**
 * Achievement management routes
 */

import { Router, Request, Response } from 'express';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';

const router = Router();

/**
 * Get all available achievements
 * GET /achievements
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const isActive = req.query.isActive !== 'false';

    let query = 'SELECT * FROM achievements WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (isActive) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(true);
      paramIndex++;
    }

    query += ' ORDER BY category, points DESC, name';

    const result = await db.query(query, params);
    const achievements = result.rows;

    res.json({
      achievements,
      total: achievements.length
    });

  } catch (error) {
    logger.error('Failed to get achievements:', error);
    res.status(500).json({
      error: 'Failed to get achievements',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get achievement by ID
 * GET /achievements/:achievementId
 */
router.get('/:achievementId', async (req: Request, res: Response) => {
  try {
    const { achievementId } = req.params;

    const result = await db.query('SELECT * FROM achievements WHERE id = $1', [achievementId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Achievement not found'
      });
    }

    const achievement = result.rows[0];

    // Get users who unlocked this achievement
    const unlockersResult = await db.query(`
      SELECT user_id, earned_at, count, metadata
      FROM user_achievements
      WHERE achievement_id = $1
      ORDER BY earned_at DESC
      LIMIT 10
    `, [achievementId]);

    const recentUnlockers = unlockersResult.rows;

    // Get total count of unlockers
    const countResult = await db.query(
      'SELECT COUNT(DISTINCT user_id) FROM user_achievements WHERE achievement_id = $1',
      [achievementId]
    );
    const totalUnlockers = parseInt(countResult.rows[0].count);

    res.json({
      achievement,
      recentUnlockers,
      totalUnlockers
    });

  } catch (error) {
    logger.error('Failed to get achievement:', error);
    res.status(500).json({
      error: 'Failed to get achievement',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;