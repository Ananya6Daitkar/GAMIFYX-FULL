/**
 * Points management routes
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { GamificationEngine } from '../services/gamificationEngine';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { PointReason, AwardPointsRequest } from '../models';

const router = Router();
const gamificationEngine = GamificationEngine.getInstance();

// Validation schemas
const awardPointsSchema = Joi.object({
  userId: Joi.string().required(),
  points: Joi.number().integer().min(1).max(10000).required(),
  reason: Joi.string().valid(...Object.values(PointReason)).required(),
  source: Joi.string().required(),
  description: Joi.string().max(500).required(),
  metadata: Joi.object().optional()
});

const getTransactionsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  reason: Joi.string().valid(...Object.values(PointReason)).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
});

/**
 * Award points to a user
 * POST /points/award
 */
router.post('/award', async (req: Request, res: Response) => {
  try {
    const { error, value } = awardPointsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    const request: AwardPointsRequest = value;
    const result = await gamificationEngine.awardPoints(request);

    res.status(201).json({
      success: true,
      transaction: result.transaction,
      events: result.events,
      message: `${request.points} points awarded successfully`
    });

  } catch (error) {
    logger.error('Failed to award points:', error);
    res.status(500).json({
      error: 'Failed to award points',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user's point transactions
 * GET /points/transactions/:userId
 */
router.get('/transactions/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { error, value } = getTransactionsSchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    const { limit, offset, reason, startDate, endDate } = value;

    let query = `
      SELECT id, user_id, points, reason, source, description, metadata, created_at
      FROM point_transactions 
      WHERE user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    // Add filters
    if (reason) {
      query += ` AND reason = $${paramIndex}`;
      params.push(reason);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM point_transactions WHERE user_id = $1';
    const countParams = [userId];
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    const transactions = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      points: row.points,
      reason: row.reason,
      source: row.source,
      description: row.description,
      metadata: row.metadata,
      createdAt: row.created_at
    }));

    res.json({
      transactions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    logger.error('Failed to get point transactions:', error);
    res.status(500).json({
      error: 'Failed to get point transactions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user's point summary
 * GET /points/summary/:userId
 */
router.get('/summary/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const summaryQuery = `
      SELECT 
        SUM(points) as total_points,
        COUNT(*) as total_transactions,
        AVG(points) as average_points,
        MAX(points) as highest_transaction,
        MIN(points) as lowest_transaction,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN points ELSE 0 END) as points_last_week,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN points ELSE 0 END) as points_last_month
      FROM point_transactions 
      WHERE user_id = $1
    `;

    const reasonBreakdownQuery = `
      SELECT 
        reason,
        SUM(points) as total_points,
        COUNT(*) as transaction_count,
        AVG(points) as average_points
      FROM point_transactions 
      WHERE user_id = $1
      GROUP BY reason
      ORDER BY total_points DESC
    `;

    const [summaryResult, breakdownResult] = await Promise.all([
      db.query(summaryQuery, [userId]),
      db.query(reasonBreakdownQuery, [userId])
    ]);

    const summary = summaryResult.rows[0];
    const breakdown = breakdownResult.rows;

    res.json({
      userId,
      summary: {
        totalPoints: parseInt(summary.total_points || 0),
        totalTransactions: parseInt(summary.total_transactions || 0),
        averagePoints: parseFloat(summary.average_points || 0),
        highestTransaction: parseInt(summary.highest_transaction || 0),
        lowestTransaction: parseInt(summary.lowest_transaction || 0),
        pointsLastWeek: parseInt(summary.points_last_week || 0),
        pointsLastMonth: parseInt(summary.points_last_month || 0)
      },
      reasonBreakdown: breakdown.map(row => ({
        reason: row.reason,
        totalPoints: parseInt(row.total_points),
        transactionCount: parseInt(row.transaction_count),
        averagePoints: parseFloat(row.average_points)
      }))
    });

  } catch (error) {
    logger.error('Failed to get point summary:', error);
    res.status(500).json({
      error: 'Failed to get point summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get points leaderboard by reason
 * GET /points/leaderboard/:reason
 */
router.get('/leaderboard/:reason', async (req: Request, res: Response) => {
  try {
    const { reason } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const timeframe = req.query.timeframe as string || 'all_time';

    if (!Object.values(PointReason).includes(reason as PointReason)) {
      return res.status(400).json({
        error: 'Invalid reason',
        validReasons: Object.values(PointReason)
      });
    }

    let query = `
      SELECT 
        user_id,
        SUM(points) as total_points,
        COUNT(*) as transaction_count,
        MAX(created_at) as last_earned,
        ROW_NUMBER() OVER (ORDER BY SUM(points) DESC, MAX(created_at) DESC) as rank
      FROM point_transactions 
      WHERE reason = $1
    `;
    const params = [reason];

    // Add timeframe filter
    if (timeframe !== 'all_time') {
      let interval = '';
      switch (timeframe) {
        case 'daily':
          interval = '1 day';
          break;
        case 'weekly':
          interval = '1 week';
          break;
        case 'monthly':
          interval = '1 month';
          break;
      }

      if (interval) {
        query += ` AND created_at >= NOW() - INTERVAL '${interval}'`;
      }
    }

    query += ` GROUP BY user_id ORDER BY total_points DESC, last_earned DESC LIMIT $2`;
    params.push(limit);

    const result = await db.query(query, params);

    const leaderboard = result.rows.map(row => ({
      userId: row.user_id,
      totalPoints: parseInt(row.total_points),
      transactionCount: parseInt(row.transaction_count),
      lastEarned: row.last_earned,
      rank: parseInt(row.rank)
    }));

    res.json({
      reason,
      timeframe,
      leaderboard
    });

  } catch (error) {
    logger.error('Failed to get points leaderboard:', error);
    res.status(500).json({
      error: 'Failed to get points leaderboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get point statistics
 * GET /points/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        SUM(points) as total_points_awarded,
        AVG(points) as average_transaction,
        MAX(points) as highest_transaction,
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as transactions_last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as transactions_last_week
      FROM point_transactions
    `;

    const reasonStatsQuery = `
      SELECT 
        reason,
        COUNT(*) as transaction_count,
        SUM(points) as total_points,
        AVG(points) as average_points
      FROM point_transactions
      GROUP BY reason
      ORDER BY total_points DESC
    `;

    const [statsResult, reasonStatsResult] = await Promise.all([
      db.query(statsQuery),
      db.query(reasonStatsQuery)
    ]);

    const stats = statsResult.rows[0];
    const reasonStats = reasonStatsResult.rows;

    res.json({
      overall: {
        totalUsers: parseInt(stats.total_users || 0),
        totalPointsAwarded: parseInt(stats.total_points_awarded || 0),
        averageTransaction: parseFloat(stats.average_transaction || 0),
        highestTransaction: parseInt(stats.highest_transaction || 0),
        totalTransactions: parseInt(stats.total_transactions || 0),
        transactionsLast24h: parseInt(stats.transactions_last_24h || 0),
        transactionsLastWeek: parseInt(stats.transactions_last_week || 0)
      },
      byReason: reasonStats.map(row => ({
        reason: row.reason,
        transactionCount: parseInt(row.transaction_count),
        totalPoints: parseInt(row.total_points),
        averagePoints: parseFloat(row.average_points)
      }))
    });

  } catch (error) {
    logger.error('Failed to get point statistics:', error);
    res.status(500).json({
      error: 'Failed to get point statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;