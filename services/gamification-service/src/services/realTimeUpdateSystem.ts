/**
 * Real-Time Update System for leaderboards, achievements, and live events
 */

import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { EnhancedWebSocketService } from './enhancedWebSocketService';
import { GameEvent, LeaderboardEntry, Badge, Achievement } from '../models';

export interface RealTimeUpdate {
  id: string;
  type: UpdateType;
  userId?: string;
  data: any;
  timestamp: Date;
  priority: UpdatePriority;
  targetAudience: TargetAudience;
}

export interface LeaderboardUpdate {
  userId: string;
  username: string;
  oldRank: number;
  newRank: number;
  rankChange: number;
  totalPoints: number;
  pointsGained: number;
  animationType: 'rise' | 'fall' | 'new_entry';
  celebrationLevel: 'minimal' | 'standard' | 'epic';
}

export interface AchievementUpdate {
  userId: string;
  username: string;
  achievement: Achievement;
  isFirstEarner: boolean;
  totalEarners: number;
  rarity: string;
  celebrationEffects: CelebrationEffects;
}

export interface BadgeUpdate {
  userId: string;
  username: string;
  badge: Badge;
  isFirstEarner: boolean;
  totalEarners: number;
  showcaseWorthy: boolean;
  celebrationEffects: CelebrationEffects;
}

export interface CelebrationEffects {
  duration: number;
  intensity: 'low' | 'medium' | 'high' | 'epic';
  animations: string[];
  sounds: string[];
  particles: boolean;
  screenEffects: string[];
}

export interface SystemHealthUpdate {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  message?: string;
}

export interface LiveActivityUpdate {
  type: 'submission' | 'completion' | 'help_request' | 'peer_interaction';
  userId: string;
  username: string;
  activity: string;
  metadata: any;
  timestamp: Date;
}

export enum UpdateType {
  LEADERBOARD_CHANGE = 'leaderboard_change',
  ACHIEVEMENT_EARNED = 'achievement_earned',
  BADGE_EARNED = 'badge_earned',
  LEVEL_UP = 'level_up',
  STREAK_MILESTONE = 'streak_milestone',
  TEAM_UPDATE = 'team_update',
  SYSTEM_HEALTH = 'system_health',
  LIVE_ACTIVITY = 'live_activity',
  NOTIFICATION = 'notification',
  CELEBRATION = 'celebration'
}

export enum UpdatePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TargetAudience {
  USER = 'user',
  TEAM = 'team',
  CLASS = 'class',
  GLOBAL = 'global',
  ADMINS = 'admins'
}

export class RealTimeUpdateSystem {
  private static instance: RealTimeUpdateSystem;
  private wsService: EnhancedWebSocketService;
  private updateQueue: RealTimeUpdate[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private leaderboardCache: Map<string, LeaderboardEntry> = new Map();

  private constructor() {
    this.wsService = EnhancedWebSocketService.getInstance();
  }

  public static getInstance(): RealTimeUpdateSystem {
    if (!RealTimeUpdateSystem.instance) {
      RealTimeUpdateSystem.instance = new RealTimeUpdateSystem();
    }
    return RealTimeUpdateSystem.instance;
  }

  /**
   * Start the real-time update system
   */
  public start(): void {
    logger.info('Starting real-time update system');

    // Process updates every 100ms for near real-time experience
    this.processingInterval = setInterval(() => {
      this.processUpdateQueue();
    }, 100);

    // Initialize leaderboard cache
    this.initializeLeaderboardCache();

    logger.info('Real-time update system started');
  }

  /**
   * Stop the real-time update system
   */
  public stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Process remaining updates
    this.processUpdateQueue();

    logger.info('Real-time update system stopped');
  }

  /**
   * Queue a real-time update
   */
  public queueUpdate(update: Omit<RealTimeUpdate, 'id' | 'timestamp'>): void {
    const realTimeUpdate: RealTimeUpdate = {
      id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...update
    };

    // Insert based on priority
    const insertIndex = this.findInsertIndex(realTimeUpdate);
    this.updateQueue.splice(insertIndex, 0, realTimeUpdate);

    // Limit queue size
    if (this.updateQueue.length > 1000) {
      this.updateQueue = this.updateQueue.slice(0, 1000);
      logger.warn('Update queue size limited to 1000 items');
    }
  }

  /**
   * Handle leaderboard rank changes
   */
  public async handleLeaderboardUpdate(
    userId: string,
    oldRank: number,
    newRank: number,
    totalPoints: number,
    pointsGained: number
  ): Promise<void> {
    const username = await this.getUsernameFromCache(userId);
    const rankChange = oldRank - newRank;

    const leaderboardUpdate: LeaderboardUpdate = {
      userId,
      username,
      oldRank,
      newRank,
      rankChange: Math.abs(rankChange),
      totalPoints,
      pointsGained,
      animationType: this.getAnimationType(rankChange),
      celebrationLevel: this.getCelebrationLevel(rankChange, pointsGained)
    };

    this.queueUpdate({
      type: UpdateType.LEADERBOARD_CHANGE,
      userId,
      data: leaderboardUpdate,
      priority: this.getLeaderboardUpdatePriority(rankChange),
      targetAudience: TargetAudience.GLOBAL
    });

    // Update cache
    this.leaderboardCache.set(userId, {
      userId,
      username,
      totalPoints,
      level: 0, // Would be fetched from user profile
      rank: newRank,
      badges: 0,
      achievements: 0,
      streak: 0
    });
  }

  /**
   * Handle achievement earned
   */
  public async handleAchievementEarned(
    userId: string,
    achievement: Achievement,
    isFirstEarner: boolean,
    totalEarners: number
  ): Promise<void> {
    const username = await this.getUsernameFromCache(userId);

    const achievementUpdate: AchievementUpdate = {
      userId,
      username,
      achievement,
      isFirstEarner,
      totalEarners,
      rarity: this.calculateAchievementRarity(totalEarners),
      celebrationEffects: this.getAchievementCelebrationEffects(achievement, isFirstEarner)
    };

    this.queueUpdate({
      type: UpdateType.ACHIEVEMENT_EARNED,
      userId,
      data: achievementUpdate,
      priority: isFirstEarner ? UpdatePriority.HIGH : UpdatePriority.MEDIUM,
      targetAudience: isFirstEarner ? TargetAudience.GLOBAL : TargetAudience.USER
    });
  }

  /**
   * Handle badge earned
   */
  public async handleBadgeEarned(
    userId: string,
    badge: Badge,
    isFirstEarner: boolean,
    totalEarners: number
  ): Promise<void> {
    const username = await this.getUsernameFromCache(userId);
    const showcaseWorthy = badge.rarity === 'epic' || badge.rarity === 'legendary';

    const badgeUpdate: BadgeUpdate = {
      userId,
      username,
      badge,
      isFirstEarner,
      totalEarners,
      showcaseWorthy,
      celebrationEffects: this.getBadgeCelebrationEffects(badge, isFirstEarner)
    };

    this.queueUpdate({
      type: UpdateType.BADGE_EARNED,
      userId,
      data: badgeUpdate,
      priority: showcaseWorthy ? UpdatePriority.HIGH : UpdatePriority.MEDIUM,
      targetAudience: showcaseWorthy ? TargetAudience.GLOBAL : TargetAudience.USER
    });
  }

  /**
   * Handle live activity updates
   */
  public handleLiveActivity(
    type: 'submission' | 'completion' | 'help_request' | 'peer_interaction',
    userId: string,
    activity: string,
    metadata: any = {}
  ): void {
    this.queueUpdate({
      type: UpdateType.LIVE_ACTIVITY,
      data: {
        type,
        userId,
        username: 'Loading...', // Will be resolved during processing
        activity,
        metadata,
        timestamp: new Date()
      },
      priority: UpdatePriority.LOW,
      targetAudience: TargetAudience.GLOBAL
    });
  }

  /**
   * Handle system health updates
   */
  public handleSystemHealthUpdate(healthUpdate: SystemHealthUpdate): void {
    this.queueUpdate({
      type: UpdateType.SYSTEM_HEALTH,
      data: healthUpdate,
      priority: healthUpdate.status === 'down' ? UpdatePriority.CRITICAL : UpdatePriority.LOW,
      targetAudience: TargetAudience.ADMINS
    });
  }

  /**
   * Process the update queue
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.updateQueue.length === 0) return;

    const batchSize = 10;
    const batch = this.updateQueue.splice(0, batchSize);

    for (const update of batch) {
      try {
        await this.processUpdate(update);
      } catch (error) {
        logger.error(`Failed to process update ${update.id}:`, error);
      }
    }
  }

  /**
   * Process a single update
   */
  private async processUpdate(update: RealTimeUpdate): Promise<void> {
    switch (update.targetAudience) {
      case TargetAudience.USER:
        if (update.userId) {
          await this.wsService.sendToUser(update.userId, {
            type: 'real_time_update',
            data: {
              updateType: update.type,
              ...update.data
            }
          });
        }
        break;

      case TargetAudience.TEAM:
        if (update.userId) {
          const teamId = await this.getUserTeamId(update.userId);
          if (teamId) {
            await this.wsService.sendToTeam(teamId, {
              type: 'real_time_update',
              data: {
                updateType: update.type,
                ...update.data
              }
            });
          }
        }
        break;

      case TargetAudience.GLOBAL:
        await this.wsService.broadcastToRoom('global', {
          type: 'real_time_update',
          data: {
            updateType: update.type,
            ...update.data
          }
        });
        break;

      case TargetAudience.ADMINS:
        await this.wsService.broadcastToRoom('admin_notifications', {
          type: 'real_time_update',
          data: {
            updateType: update.type,
            ...update.data
          }
        });
        break;
    }

    // Store update for analytics
    await this.storeUpdate(update);
  }

  /**
   * Initialize leaderboard cache
   */
  private async initializeLeaderboardCache(): Promise<void> {
    try {
      const result = await db.query(`
        SELECT user_id, total_points, level, leaderboard_rank
        FROM user_game_profiles
        ORDER BY total_points DESC
        LIMIT 100
      `);

      for (const row of result.rows) {
        this.leaderboardCache.set(row.user_id, {
          userId: row.user_id,
          username: `User${row.user_id}`, // Would be fetched from user service
          totalPoints: row.total_points,
          level: row.level,
          rank: row.leaderboard_rank,
          badges: 0,
          achievements: 0,
          streak: 0
        });
      }

      logger.info(`Initialized leaderboard cache with ${result.rows.length} entries`);

    } catch (error) {
      logger.error('Failed to initialize leaderboard cache:', error);
    }
  }

  // Helper methods
  private findInsertIndex(update: RealTimeUpdate): number {
    const priorityOrder = {
      [UpdatePriority.CRITICAL]: 0,
      [UpdatePriority.HIGH]: 1,
      [UpdatePriority.MEDIUM]: 2,
      [UpdatePriority.LOW]: 3
    };

    for (let i = 0; i < this.updateQueue.length; i++) {
      if (priorityOrder[update.priority] < priorityOrder[this.updateQueue[i].priority]) {
        return i;
      }
    }

    return this.updateQueue.length;
  }

  private getAnimationType(rankChange: number): 'rise' | 'fall' | 'new_entry' {
    if (rankChange > 0) return 'rise';
    if (rankChange < 0) return 'fall';
    return 'new_entry';
  }

  private getCelebrationLevel(rankChange: number, pointsGained: number): 'minimal' | 'standard' | 'epic' {
    if (Math.abs(rankChange) >= 10 || pointsGained >= 500) return 'epic';
    if (Math.abs(rankChange) >= 5 || pointsGained >= 200) return 'standard';
    return 'minimal';
  }

  private getLeaderboardUpdatePriority(rankChange: number): UpdatePriority {
    if (Math.abs(rankChange) >= 10) return UpdatePriority.HIGH;
    if (Math.abs(rankChange) >= 5) return UpdatePriority.MEDIUM;
    return UpdatePriority.LOW;
  }

  private calculateAchievementRarity(totalEarners: number): string {
    if (totalEarners <= 5) return 'legendary';
    if (totalEarners <= 25) return 'epic';
    if (totalEarners <= 100) return 'rare';
    if (totalEarners <= 500) return 'uncommon';
    return 'common';
  }

  private getAchievementCelebrationEffects(achievement: Achievement, isFirstEarner: boolean): CelebrationEffects {
    return {
      duration: isFirstEarner ? 8000 : 5000,
      intensity: isFirstEarner ? 'epic' : 'high',
      animations: ['achievement_unlock', 'confetti'],
      sounds: ['achievement_earned.mp3'],
      particles: true,
      screenEffects: isFirstEarner ? ['screen_flash', 'border_glow'] : ['border_glow']
    };
  }

  private getBadgeCelebrationEffects(badge: Badge, isFirstEarner: boolean): CelebrationEffects {
    const intensity = badge.rarity === 'legendary' ? 'epic' : 
                     badge.rarity === 'epic' ? 'high' : 
                     badge.rarity === 'rare' ? 'medium' : 'low';

    return {
      duration: intensity === 'epic' ? 6000 : intensity === 'high' ? 4000 : 2000,
      intensity,
      animations: ['badge_earned', 'sparkle'],
      sounds: [`badge_${badge.rarity}.mp3`],
      particles: intensity !== 'low',
      screenEffects: intensity === 'epic' ? ['badge_showcase'] : []
    };
  }

  private async getUsernameFromCache(userId: string): Promise<string> {
    // In a real implementation, this would fetch from user service or cache
    return `User${userId}`;
  }

  private async getUserTeamId(userId: string): Promise<string | null> {
    try {
      const result = await db.query(
        'SELECT JSON_EXTRACT(team_affiliation, "$.teamId") as team_id FROM user_game_profiles WHERE user_id = $1',
        [userId]
      );

      return result.rows[0]?.team_id || null;
    } catch (error) {
      logger.error('Failed to get user team ID:', error);
      return null;
    }
  }

  private async storeUpdate(update: RealTimeUpdate): Promise<void> {
    try {
      await db.query(`
        INSERT INTO real_time_updates (id, type, user_id, data, priority, target_audience, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        update.id,
        update.type,
        update.userId,
        JSON.stringify(update.data),
        update.priority,
        update.targetAudience,
        update.timestamp
      ]);
    } catch (error) {
      logger.error('Failed to store update:', error);
    }
  }
}