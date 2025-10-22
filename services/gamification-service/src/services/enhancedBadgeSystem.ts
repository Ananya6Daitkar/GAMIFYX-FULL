/**
 * Enhanced Badge System with rarity levels, showcase features, and cyberpunk themes
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import {
  Badge,
  UserBadge,
  BadgeCategory,
  BadgeRarity,
  BadgeTheme,
  VisualEffects,
  ShowcaseFeatures,
  GameEvent
} from '../models';
import { WebSocketManager } from './websocketManager';
import { MetricsCollector } from './metricsCollector';

export interface BadgeCreationRequest {
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  criteria: any;
  points: number;
  theme?: BadgeTheme;
  visualEffects?: VisualEffects;
  isLimited?: boolean;
  maxEarners?: number;
}

export interface BadgeEarnedEvent {
  badgeId: string;
  userId: string;
  earnedAt: Date;
  isFirstEarner: boolean;
  totalEarners: number;
  rarityBonus: number;
}

export interface BadgeShowcase {
  userId: string;
  showcasedBadges: UserBadge[];
  totalBadges: number;
  rareCount: number;
  epicCount: number;
  legendaryCount: number;
  completionPercentage: number;
}

export class EnhancedBadgeSystem {
  private wsManager: WebSocketManager;
  private metrics: MetricsCollector;

  constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.metrics = MetricsCollector.getInstance();
  }

  /**
   * Create a new badge with enhanced features
   */
  public async createBadge(request: BadgeCreationRequest): Promise<Badge> {
    const badgeId = uuidv4();
    
    const badge: Badge = {
      id: badgeId,
      name: request.name,
      description: request.description,
      iconUrl: this.generateIconUrl(request.category, request.rarity),
      category: request.category,
      criteria: request.criteria,
      rarity: request.rarity,
      points: request.points,
      isActive: true,
      theme: request.theme || this.getDefaultTheme(request.rarity),
      visualEffects: request.visualEffects || this.getDefaultVisualEffects(request.rarity),
      showcaseFeatures: {
        isShowcased: false,
        showcasePosition: 0,
        unlockDate: new Date()
      },
      rarityLevel: this.getRarityLevel(request.rarity),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await db.query(
        `INSERT INTO badges 
         (id, name, description, icon_url, category, criteria, rarity, points, theme, visual_effects, showcase_features, rarity_level, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          badge.id,
          badge.name,
          badge.description,
          badge.iconUrl,
          badge.category,
          JSON.stringify(badge.criteria),
          badge.rarity,
          badge.points,
          JSON.stringify(badge.theme),
          JSON.stringify(badge.visualEffects),
          JSON.stringify(badge.showcaseFeatures),
          badge.rarityLevel,
          badge.isActive,
          badge.createdAt,
          badge.updatedAt
        ]
      );

      logger.info('Enhanced badge created', {
        badgeId: badge.id,
        name: badge.name,
        rarity: badge.rarity,
        category: badge.category
      });

      return badge;

    } catch (error) {
      logger.error('Failed to create badge:', error);
      throw error;
    }
  }

  /**
   * Award badge to user with enhanced celebration
   */
  public async awardBadge(userId: string, badgeId: string, metadata?: any): Promise<BadgeEarnedEvent> {
    try {
      // Check if user already has this badge
      const existingBadge = await db.query(
        'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
        [userId, badgeId]
      );

      if (existingBadge.rows.length > 0) {
        throw new Error('User already has this badge');
      }

      // Get badge details
      const badgeResult = await db.query(
        'SELECT * FROM badges WHERE id = $1 AND is_active = true',
        [badgeId]
      );

      if (badgeResult.rows.length === 0) {
        throw new Error('Badge not found or inactive');
      }

      const badge = badgeResult.rows[0];

      // Check if badge has earning limits
      if (badge.max_earners) {
        const earnersCount = await this.getBadgeEarnersCount(badgeId);
        if (earnersCount >= badge.max_earners) {
          throw new Error('Badge earning limit reached');
        }
      }

      // Award the badge
      const userBadgeId = uuidv4();
      const earnedAt = new Date();

      await db.query(
        `INSERT INTO user_badges (id, user_id, badge_id, earned_at, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [userBadgeId, userId, badgeId, earnedAt, JSON.stringify(metadata)]
      );

      // Get earning statistics
      const totalEarners = await this.getBadgeEarnersCount(badgeId);
      const isFirstEarner = totalEarners === 1;

      // Calculate rarity bonus
      const rarityBonus = this.calculateRarityBonus(badge.rarity, isFirstEarner, totalEarners);

      // Create badge earned event
      const badgeEvent: BadgeEarnedEvent = {
        badgeId,
        userId,
        earnedAt,
        isFirstEarner,
        totalEarners,
        rarityBonus
      };

      // Create enhanced game event
      const gameEvent: GameEvent = {
        type: 'badge_earned',
        userId,
        data: {
          badgeId,
          name: badge.name,
          description: badge.description,
          rarity: badge.rarity,
          points: badge.points,
          isFirstEarner,
          totalEarners,
          rarityBonus,
          theme: JSON.parse(badge.theme || '{}'),
          category: badge.category
        },
        timestamp: earnedAt,
        visualEffects: JSON.parse(badge.visual_effects || '{}'),
        celebrationLevel: this.getCelebrationLevel(badge.rarity, isFirstEarner),
        teamNotification: badge.rarity === 'epic' || badge.rarity === 'legendary'
      };

      // Send real-time notification
      await this.wsManager.sendToUser(userId, gameEvent);

      // Send team notification for rare badges
      if (gameEvent.teamNotification) {
        await this.sendTeamNotification(userId, gameEvent);
      }

      // Record metrics
      this.metrics.recordBadgeEarned(badge.category, badge.rarity);

      // Update user's badge showcase if it's a high-rarity badge
      if (badge.rarity === 'epic' || badge.rarity === 'legendary') {
        await this.updateBadgeShowcase(userId, userBadgeId);
      }

      logger.info('Badge awarded with enhanced features', {
        userId,
        badgeId,
        badgeName: badge.name,
        rarity: badge.rarity,
        isFirstEarner,
        totalEarners,
        rarityBonus
      });

      return badgeEvent;

    } catch (error) {
      logger.error('Failed to award badge:', error);
      throw error;
    }
  }

  /**
   * Get user's badge showcase
   */
  public async getUserBadgeShowcase(userId: string): Promise<BadgeShowcase> {
    try {
      // Get all user badges with badge details
      const result = await db.query(
        `SELECT ub.*, b.name, b.description, b.rarity, b.category, b.theme, b.visual_effects, b.showcase_features
         FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         WHERE ub.user_id = $1
         ORDER BY b.rarity_level DESC, ub.earned_at DESC`,
        [userId]
      );

      const allBadges = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        badgeId: row.badge_id,
        earnedAt: row.earned_at,
        progress: row.progress,
        metadata: JSON.parse(row.metadata || '{}'),
        // Badge details
        name: row.name,
        description: row.description,
        rarity: row.rarity,
        category: row.category,
        theme: JSON.parse(row.theme || '{}'),
        visualEffects: JSON.parse(row.visual_effects || '{}'),
        showcaseFeatures: JSON.parse(row.showcase_features || '{}')
      }));

      // Get showcased badges (top rarity badges or manually selected)
      const showcasedBadges = allBadges
        .filter(badge => 
          badge.rarity === 'legendary' || 
          badge.rarity === 'epic' || 
          badge.showcaseFeatures.isShowcased
        )
        .slice(0, 6); // Limit to 6 showcased badges

      // Count badges by rarity
      const rareCount = allBadges.filter(b => b.rarity === 'rare').length;
      const epicCount = allBadges.filter(b => b.rarity === 'epic').length;
      const legendaryCount = allBadges.filter(b => b.rarity === 'legendary').length;

      // Calculate completion percentage
      const totalAvailableBadges = await this.getTotalAvailableBadges();
      const completionPercentage = Math.round((allBadges.length / totalAvailableBadges) * 100);

      return {
        userId,
        showcasedBadges,
        totalBadges: allBadges.length,
        rareCount,
        epicCount,
        legendaryCount,
        completionPercentage
      };

    } catch (error) {
      logger.error('Failed to get badge showcase:', error);
      throw error;
    }
  }

  /**
   * Update user's badge showcase
   */
  public async updateBadgeShowcase(userId: string, userBadgeId: string): Promise<void> {
    try {
      // Get current showcase count
      const showcaseCount = await db.query(
        `SELECT COUNT(*) FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         WHERE ub.user_id = $1 AND (
           JSON_EXTRACT(b.showcase_features, '$.isShowcased') = true OR
           b.rarity IN ('epic', 'legendary')
         )`,
        [userId]
      );

      const currentShowcaseCount = parseInt(showcaseCount.rows[0].count);

      // If showcase is full, remove oldest showcased badge
      if (currentShowcaseCount >= 6) {
        await db.query(
          `UPDATE badges SET showcase_features = JSON_SET(showcase_features, '$.isShowcased', false)
           WHERE id IN (
             SELECT b.id FROM user_badges ub
             JOIN badges b ON ub.badge_id = b.id
             WHERE ub.user_id = $1 AND JSON_EXTRACT(b.showcase_features, '$.isShowcased') = true
             ORDER BY ub.earned_at ASC
             LIMIT 1
           )`,
          [userId]
        );
      }

      // Add new badge to showcase
      await db.query(
        `UPDATE badges SET showcase_features = JSON_SET(
           showcase_features, 
           '$.isShowcased', true,
           '$.showcasePosition', $2,
           '$.unlockDate', $3
         )
         WHERE id = (SELECT badge_id FROM user_badges WHERE id = $1)`,
        [userBadgeId, currentShowcaseCount + 1, new Date()]
      );

    } catch (error) {
      logger.error('Failed to update badge showcase:', error);
    }
  }

  /**
   * Get badge leaderboard (users with most badges)
   */
  public async getBadgeLeaderboard(limit: number = 50): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT 
           u.username,
           ub.user_id,
           COUNT(*) as total_badges,
           COUNT(CASE WHEN b.rarity = 'legendary' THEN 1 END) as legendary_count,
           COUNT(CASE WHEN b.rarity = 'epic' THEN 1 END) as epic_count,
           COUNT(CASE WHEN b.rarity = 'rare' THEN 1 END) as rare_count,
           SUM(b.points) as badge_points
         FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         JOIN users u ON ub.user_id = u.id
         GROUP BY ub.user_id, u.username
         ORDER BY legendary_count DESC, epic_count DESC, rare_count DESC, total_badges DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        username: row.username,
        totalBadges: parseInt(row.total_badges),
        legendaryCount: parseInt(row.legendary_count),
        epicCount: parseInt(row.epic_count),
        rareCount: parseInt(row.rare_count),
        badgePoints: parseInt(row.badge_points)
      }));

    } catch (error) {
      logger.error('Failed to get badge leaderboard:', error);
      throw error;
    }
  }

  // Private helper methods
  private generateIconUrl(category: BadgeCategory, rarity: BadgeRarity): string {
    return `/assets/badges/${category}/${rarity}.svg`;
  }

  private getDefaultTheme(rarity: BadgeRarity): BadgeTheme {
    const themes: Record<BadgeRarity, BadgeTheme> = {
      common: {
        primaryColor: '#4A90E2',
        secondaryColor: '#7ED321',
        glowColor: '#4A90E2',
        backgroundPattern: 'dots',
        cyberpunkStyle: 'neon'
      },
      uncommon: {
        primaryColor: '#7ED321',
        secondaryColor: '#F5A623',
        glowColor: '#7ED321',
        backgroundPattern: 'lines',
        cyberpunkStyle: 'circuit'
      },
      rare: {
        primaryColor: '#F5A623',
        secondaryColor: '#D0021B',
        glowColor: '#F5A623',
        backgroundPattern: 'hexagon',
        cyberpunkStyle: 'matrix'
      },
      epic: {
        primaryColor: '#9013FE',
        secondaryColor: '#E91E63',
        glowColor: '#9013FE',
        backgroundPattern: 'circuit',
        cyberpunkStyle: 'hologram'
      },
      legendary: {
        primaryColor: '#FF6B35',
        secondaryColor: '#F7931E',
        glowColor: '#FF6B35',
        backgroundPattern: 'neural',
        cyberpunkStyle: 'glitch'
      }
    };

    return themes[rarity];
  }

  private getDefaultVisualEffects(rarity: BadgeRarity): VisualEffects {
    const effects: Record<BadgeRarity, VisualEffects> = {
      common: {
        glowIntensity: 20,
        animationType: 'pulse',
        particleEffects: false,
        celebrationDuration: 2000
      },
      uncommon: {
        glowIntensity: 40,
        animationType: 'pulse',
        particleEffects: true,
        celebrationDuration: 3000
      },
      rare: {
        glowIntensity: 60,
        animationType: 'rotate',
        particleEffects: true,
        celebrationDuration: 4000
      },
      epic: {
        glowIntensity: 80,
        animationType: 'hologram',
        particleEffects: true,
        soundEffect: 'epic_badge.mp3',
        celebrationDuration: 5000
      },
      legendary: {
        glowIntensity: 100,
        animationType: 'glitch',
        particleEffects: true,
        soundEffect: 'legendary_badge.mp3',
        celebrationDuration: 7000
      }
    };

    return effects[rarity];
  }

  private getRarityLevel(rarity: BadgeRarity): number {
    const levels: Record<BadgeRarity, number> = {
      common: 1,
      uncommon: 2,
      rare: 3,
      epic: 4,
      legendary: 5
    };

    return levels[rarity];
  }

  private async getBadgeEarnersCount(badgeId: string): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*) FROM user_badges WHERE badge_id = $1',
      [badgeId]
    );
    return parseInt(result.rows[0].count);
  }

  private calculateRarityBonus(rarity: BadgeRarity, isFirstEarner: boolean, totalEarners: number): number {
    let bonus = 0;

    // Base rarity bonus
    const rarityBonuses: Record<BadgeRarity, number> = {
      common: 0,
      uncommon: 25,
      rare: 100,
      epic: 250,
      legendary: 500
    };

    bonus += rarityBonuses[rarity];

    // First earner bonus
    if (isFirstEarner) {
      bonus += rarityBonuses[rarity] * 2;
    }

    // Scarcity bonus (fewer earners = higher bonus)
    if (totalEarners <= 10 && rarity !== 'common') {
      bonus += Math.floor((11 - totalEarners) * 10);
    }

    return bonus;
  }

  private getCelebrationLevel(rarity: BadgeRarity, isFirstEarner: boolean): 'minimal' | 'standard' | 'epic' {
    if (rarity === 'legendary' || isFirstEarner) return 'epic';
    if (rarity === 'epic' || rarity === 'rare') return 'standard';
    return 'minimal';
  }

  private async sendTeamNotification(userId: string, gameEvent: GameEvent): Promise<void> {
    // Get user's team
    const teamResult = await db.query(
      'SELECT team_id FROM user_game_profiles WHERE user_id = $1 AND team_affiliation IS NOT NULL',
      [userId]
    );

    if (teamResult.rows.length > 0) {
      const teamId = teamResult.rows[0].team_id;
      
      // Send notification to all team members
      await this.wsManager.sendToTeam(teamId, {
        ...gameEvent,
        type: 'team_milestone',
        data: {
          ...gameEvent.data,
          teamMember: userId,
          message: `Team member earned ${gameEvent.data.name} badge!`
        }
      });
    }
  }

  private async getTotalAvailableBadges(): Promise<number> {
    const result = await db.query('SELECT COUNT(*) FROM badges WHERE is_active = true');
    return parseInt(result.rows[0].count);
  }
}