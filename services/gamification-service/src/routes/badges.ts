/**
 * Badge management routes
 */

import { Router, Request, Response } from 'express';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';

const router = Router();

/**
 * Get all available badges
 * GET /badges
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const rarity = req.query.rarity as string;
    const isActive = req.query.isActive !== 'false';

    let query = 'SELECT * FROM badges WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (rarity) {
      query += ` AND rarity = $${paramIndex}`;
      params.push(rarity);
      paramIndex++;
    }

    if (isActive) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(true);
      paramIndex++;
    }

    query += ' ORDER BY category, rarity, name';

    const result = await db.query(query, params);
    const badges = result.rows;

    res.json({
      badges,
      total: badges.length
    });

  } catch (error) {
    logger.error('Failed to get badges:', error);
    res.status(500).json({
      error: 'Failed to get badges',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get badge by ID
 * GET /badges/:badgeId
 */
router.get('/:badgeId', async (req: Request, res: Response) => {
  try {
    const { badgeId } = req.params;

    const result = await db.query('SELECT * FROM badges WHERE id = $1', [badgeId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Badge not found'
      });
    }

    const badge = result.rows[0];

    // Get users who earned this badge
    const earnersResult = await db.query(`
      SELECT user_id, earned_at, progress, metadata
      FROM user_badges
      WHERE badge_id = $1
      ORDER BY earned_at DESC
      LIMIT 10
    `, [badgeId]);

    const recentEarners = earnersResult.rows;

    // Get total count of earners
    const countResult = await db.query(
      'SELECT COUNT(*) FROM user_badges WHERE badge_id = $1',
      [badgeId]
    );
    const totalEarners = parseInt(countResult.rows[0].count);

    res.json({
      badge,
      recentEarners,
      totalEarners
    });

  } catch (error) {
    logger.error('Failed to get badge:', error);
    res.status(500).json({
      error: 'Failed to get badge',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;