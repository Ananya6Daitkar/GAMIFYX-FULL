/**
 * Metrics collection for gamification service
 */

import { register, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../telemetry/logger';

export class MetricsCollector {
  private static instance: MetricsCollector;

  // Counters
  private pointsAwardedTotal: Counter<string>;
  private badgesEarnedTotal: Counter<string>;
  private achievementsUnlockedTotal: Counter<string>;
  private levelUpsTotal: Counter<string>;
  private leaderboardQueriesTotal: Counter<string>;
  private websocketConnectionsTotal: Counter<string>;
  private notificationsSentTotal: Counter<string>;

  // Histograms
  private pointTransactionDuration: Histogram<string>;
  private leaderboardQueryDuration: Histogram<string>;
  private badgeCheckDuration: Histogram<string>;

  // Gauges
  private activeWebsocketConnections: Gauge<string>;
  private totalUsers: Gauge<string>;
  private averageUserLevel: Gauge<string>;
  private topUserPoints: Gauge<string>;
  private leaderboardPositionChanges: Gauge<string>;

  private constructor() {
    this.initializeMetrics();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private initializeMetrics(): void {
    // Points metrics
    this.pointsAwardedTotal = new Counter({
      name: 'gamification_points_awarded_total',
      help: 'Total points awarded to users',
      labelNames: ['reason', 'user_id'],
      registers: [register]
    });

    // Badge metrics
    this.badgesEarnedTotal = new Counter({
      name: 'gamification_badges_earned_total',
      help: 'Total badges earned by users',
      labelNames: ['category', 'rarity', 'badge_id'],
      registers: [register]
    });

    // Achievement metrics
    this.achievementsUnlockedTotal = new Counter({
      name: 'gamification_achievements_unlocked_total',
      help: 'Total achievements unlocked by users',
      labelNames: ['category', 'achievement_id'],
      registers: [register]
    });

    // Level up metrics
    this.levelUpsTotal = new Counter({
      name: 'gamification_level_ups_total',
      help: 'Total level ups by users',
      labelNames: ['user_id', 'new_level'],
      registers: [register]
    });

    // Leaderboard metrics
    this.leaderboardQueriesTotal = new Counter({
      name: 'gamification_leaderboard_queries_total',
      help: 'Total leaderboard queries',
      labelNames: ['timeframe', 'type'],
      registers: [register]
    });

    // WebSocket metrics
    this.websocketConnectionsTotal = new Counter({
      name: 'gamification_websocket_connections_total',
      help: 'Total WebSocket connections',
      labelNames: ['status'],
      registers: [register]
    });

    this.activeWebsocketConnections = new Gauge({
      name: 'gamification_active_websocket_connections',
      help: 'Current active WebSocket connections',
      registers: [register]
    });

    // Notification metrics
    this.notificationsSentTotal = new Counter({
      name: 'gamification_notifications_sent_total',
      help: 'Total notifications sent',
      labelNames: ['type', 'channel'],
      registers: [register]
    });

    // Duration metrics
    this.pointTransactionDuration = new Histogram({
      name: 'gamification_point_transaction_duration_seconds',
      help: 'Duration of point transactions',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register]
    });

    this.leaderboardQueryDuration = new Histogram({
      name: 'gamification_leaderboard_query_duration_seconds',
      help: 'Duration of leaderboard queries',
      labelNames: ['timeframe', 'type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [register]
    });

    this.badgeCheckDuration = new Histogram({
      name: 'gamification_badge_check_duration_seconds',
      help: 'Duration of badge eligibility checks',
      labelNames: ['badge_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [register]
    });

    // User statistics gauges
    this.totalUsers = new Gauge({
      name: 'gamification_total_users',
      help: 'Total number of users in the system',
      registers: [register]
    });

    this.averageUserLevel = new Gauge({
      name: 'gamification_average_user_level',
      help: 'Average level of all users',
      registers: [register]
    });

    this.topUserPoints = new Gauge({
      name: 'gamification_top_user_points',
      help: 'Points of the top user',
      registers: [register]
    });

    this.leaderboardPositionChanges = new Gauge({
      name: 'gamification_leaderboard_position_changes',
      help: 'Number of leaderboard position changes in last update',
      registers: [register]
    });

    logger.info('Gamification metrics initialized');
  }

  // Recording methods
  public recordPointsAwarded(points: number, reason: string, userId?: string): void {
    this.pointsAwardedTotal.labels(reason, userId || 'unknown').inc(points);
  }

  public recordBadgeEarned(category: string, rarity: string, badgeId?: string): void {
    this.badgesEarnedTotal.labels(category, rarity, badgeId || 'unknown').inc();
  }

  public recordAchievementUnlocked(category: string, achievementId?: string): void {
    this.achievementsUnlockedTotal.labels(category, achievementId || 'unknown').inc();
  }

  public recordLevelUp(userId: string, newLevel: number): void {
    this.levelUpsTotal.labels(userId, newLevel.toString()).inc();
  }

  public recordLeaderboardQuery(timeframe: string, resultCount: number, type: string = 'global'): void {
    this.leaderboardQueriesTotal.labels(timeframe, type).inc();
  }

  public recordWebSocketConnection(status: 'connected' | 'disconnected'): void {
    this.websocketConnectionsTotal.labels(status).inc();
  }

  public recordNotificationSent(type: string, channel: string = 'websocket'): void {
    this.notificationsSentTotal.labels(type, channel).inc();
  }

  public recordRankUpdate(changedRanks: number): void {
    this.leaderboardPositionChanges.set(changedRanks);
  }

  // Duration recording methods
  public recordPointTransactionDuration(duration: number, operation: string): void {
    this.pointTransactionDuration.labels(operation).observe(duration);
  }

  public recordLeaderboardQueryDuration(duration: number, timeframe: string, type: string = 'global'): void {
    this.leaderboardQueryDuration.labels(timeframe, type).observe(duration);
  }

  public recordBadgeCheckDuration(duration: number, badgeType: string): void {
    this.badgeCheckDuration.labels(badgeType).observe(duration);
  }

  // Gauge update methods
  public updateActiveWebSocketConnections(count: number): void {
    this.activeWebsocketConnections.set(count);
  }

  public updateUserStatistics(stats: {
    totalUsers: number;
    averageLevel: number;
    topUserPoints: number;
  }): void {
    this.totalUsers.set(stats.totalUsers);
    this.averageUserLevel.set(stats.averageLevel);
    this.topUserPoints.set(stats.topUserPoints);
  }

  // Utility methods
  public startTimer(metric: Histogram<string>, labels?: Record<string, string>): () => void {
    const end = metric.startTimer(labels);
    return end;
  }

  public async measureAsync<T>(
    metric: Histogram<string>,
    labels: Record<string, string>,
    operation: () => Promise<T>
  ): Promise<T> {
    const end = this.startTimer(metric, labels);
    try {
      const result = await operation();
      return result;
    } finally {
      end();
    }
  }

  public measure<T>(
    metric: Histogram<string>,
    labels: Record<string, string>,
    operation: () => T
  ): T {
    const end = this.startTimer(metric, labels);
    try {
      const result = operation();
      return result;
    } finally {
      end();
    }
  }

  // Health check metrics
  public getMetricsSummary(): {
    pointsAwarded: number;
    badgesEarned: number;
    achievementsUnlocked: number;
    levelUps: number;
    activeConnections: number;
    totalUsers: number;
  } {
    return {
      pointsAwarded: (this.pointsAwardedTotal as any)._values?.size || 0,
      badgesEarned: (this.badgesEarnedTotal as any)._values?.size || 0,
      achievementsUnlocked: (this.achievementsUnlockedTotal as any)._values?.size || 0,
      levelUps: (this.levelUpsTotal as any)._values?.size || 0,
      activeConnections: this.activeWebsocketConnections['hashMap']?.['']?.value || 0,
      totalUsers: this.totalUsers['hashMap']?.['']?.value || 0
    };
  }

  // Cleanup
  public reset(): void {
    register.clear();
    logger.info('Metrics registry cleared');
  }
}