/**
 * Competition-specific gamification engine for external competition integration
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { GamificationEngine } from './gamificationEngine';
import { EnhancedBadgeSystem } from './enhancedBadgeSystem';
import { AdvancedPointsSystem } from './advancedPointsSystem';
import {
  PointReason,
  BadgeCategory,
  BadgeRarity,
  GameEvent,
  CompetitionType,
  CompetitionAchievement,
  CompetitionParticipation
} from '../models';

export interface CompetitionPointsConfig {
  competitionType: CompetitionType;
  basePoints: {
    registration: number;
    firstSubmission: number;
    pullRequest: number;
    issueResolved: number;
    codeReview: number;
    milestone: number;
    completion: number;
  };
  multipliers: {
    difficulty: Record<string, number>;
    rarity: Record<string, number>;
    timing: Record<string, number>;
  };
  bonuses: {
    firstInCompetition: number;
    qualityThreshold: number;
    streakBonus: number;
    teamParticipation: number;
  };
}

export interface CompetitionBadgeConfig {
  competitionType: CompetitionType;
  badges: {
    participation: BadgeConfig;
    milestones: BadgeConfig[];
    achievements: BadgeConfig[];
    completion: BadgeConfig;
    excellence: BadgeConfig[];
  };
}

interface BadgeConfig {
  name: string;
  description: string;
  rarity: BadgeRarity;
  criteria: any;
  points: number;
  iconUrl?: string;
}

export class CompetitionGamificationEngine {
  private gamificationEngine: GamificationEngine;
  private badgeSystem: EnhancedBadgeSystem;
  private pointsSystem: AdvancedPointsSystem;
  private competitionConfigs: Map<CompetitionType, CompetitionPointsConfig> = new Map();
  private badgeConfigs: Map<CompetitionType, CompetitionBadgeConfig> = new Map();

  constructor() {
    this.gamificationEngine = GamificationEngine.getInstance();
    this.badgeSystem = new EnhancedBadgeSystem();
    this.pointsSystem = new AdvancedPointsSystem();
    this.initializeCompetitionConfigs();
  }

  /**
   * Initialize competition-specific configurations
   */
  private initializeCompetitionConfigs(): void {
    // Hacktoberfest configuration
    this.competitionConfigs.set(CompetitionType.HACKTOBERFEST, {
      competitionType: CompetitionType.HACKTOBERFEST,
      basePoints: {
        registration: 50,
        firstSubmission: 100,
        pullRequest: 200,
        issueResolved: 150,
        codeReview: 100,
        milestone: 500,
        completion: 1000
      },
      multipliers: {
        difficulty: { beginner: 1.0, intermediate: 1.5, advanced: 2.0, expert: 3.0 },
        rarity: { common: 1.0, uncommon: 1.2, rare: 1.5, epic: 2.0, legendary: 3.0 },
        timing: { early: 1.3, onTime: 1.0, late: 0.8 }
      },
      bonuses: {
        firstInCompetition: 200,
        qualityThreshold: 90,
        streakBonus: 50,
        teamParticipation: 100
      }
    });

    // GitHub Game Off configuration
    this.competitionConfigs.set(CompetitionType.GITHUB_GAME_OFF, {
      competitionType: CompetitionType.GITHUB_GAME_OFF,
      basePoints: {
        registration: 75,
        firstSubmission: 150,
        pullRequest: 300,
        issueResolved: 200,
        codeReview: 125,
        milestone: 750,
        completion: 1500
      },
      multipliers: {
        difficulty: { beginner: 1.0, intermediate: 1.8, advanced: 2.5, expert: 4.0 },
        rarity: { common: 1.0, uncommon: 1.3, rare: 1.8, epic: 2.5, legendary: 4.0 },
        timing: { early: 1.5, onTime: 1.0, late: 0.7 }
      },
      bonuses: {
        firstInCompetition: 300,
        qualityThreshold: 85,
        streakBonus: 75,
        teamParticipation: 150
      }
    });

    this.initializeBadgeConfigs();
  }
}  /**

   * Initialize badge configurations for different competition types
   */
  private initializeBadgeConfigs(): void {
    // Hacktoberfest badges
    this.badgeConfigs.set(CompetitionType.HACKTOBERFEST, {
      competitionType: CompetitionType.HACKTOBERFEST,
      badges: {
        participation: {
          name: 'Hacktoberfest Participant 2023',
          description: 'Registered for Hacktoberfest and made first contribution',
          rarity: BadgeRarity.COMMON,
          criteria: { type: 'registration', competitionType: CompetitionType.HACKTOBERFEST },
          points: 100,
          iconUrl: '/badges/hacktoberfest/participant.svg'
        },
        milestones: [
          {
            name: 'First Pull Request',
            description: 'Made your first pull request in Hacktoberfest',
            rarity: BadgeRarity.COMMON,
            criteria: { type: 'pullRequest', count: 1 },
            points: 150
          },
          {
            name: 'Hacktoberfest Contributor',
            description: 'Made 4 valid pull requests in Hacktoberfest',
            rarity: BadgeRarity.UNCOMMON,
            criteria: { type: 'pullRequest', count: 4 },
            points: 500
          },
          {
            name: 'Open Source Champion',
            description: 'Made 10 valid pull requests in Hacktoberfest',
            rarity: BadgeRarity.RARE,
            criteria: { type: 'pullRequest', count: 10 },
            points: 1000
          }
        ],
        achievements: [
          {
            name: 'Quality Contributor',
            description: 'All pull requests maintained 90%+ code quality',
            rarity: BadgeRarity.EPIC,
            criteria: { type: 'quality', threshold: 90, consistency: true },
            points: 750
          },
          {
            name: 'Security Guardian',
            description: 'Identified and fixed security vulnerabilities',
            rarity: BadgeRarity.EPIC,
            criteria: { type: 'security', fixes: 3 },
            points: 800
          }
        ],
        completion: {
          name: 'Hacktoberfest Finisher',
          description: 'Successfully completed Hacktoberfest challenge',
          rarity: BadgeRarity.RARE,
          criteria: { type: 'completion', competitionType: CompetitionType.HACKTOBERFEST },
          points: 1000
        },
        excellence: [
          {
            name: 'Hacktoberfest Legend',
            description: 'Top 1% performer in Hacktoberfest',
            rarity: BadgeRarity.LEGENDARY,
            criteria: { type: 'ranking', percentile: 1 },
            points: 2000
          }
        ]
      }
    });

    // GitHub Game Off badges
    this.badgeConfigs.set(CompetitionType.GITHUB_GAME_OFF, {
      competitionType: CompetitionType.GITHUB_GAME_OFF,
      badges: {
        participation: {
          name: 'Game Off Participant',
          description: 'Joined the GitHub Game Off competition',
          rarity: BadgeRarity.COMMON,
          criteria: { type: 'registration', competitionType: CompetitionType.GITHUB_GAME_OFF },
          points: 150
        },
        milestones: [
          {
            name: 'Game Developer',
            description: 'Created your first game for Game Off',
            rarity: BadgeRarity.UNCOMMON,
            criteria: { type: 'gameSubmission', count: 1 },
            points: 300
          },
          {
            name: 'Innovative Creator',
            description: 'Implemented creative game mechanics',
            rarity: BadgeRarity.RARE,
            criteria: { type: 'innovation', score: 80 },
            points: 600
          }
        ],
        achievements: [
          {
            name: 'Technical Excellence',
            description: 'Game demonstrates exceptional technical skill',
            rarity: BadgeRarity.EPIC,
            criteria: { type: 'technical', score: 90 },
            points: 1000
          }
        ],
        completion: {
          name: 'Game Off Finisher',
          description: 'Successfully completed Game Off challenge',
          rarity: BadgeRarity.RARE,
          criteria: { type: 'completion', competitionType: CompetitionType.GITHUB_GAME_OFF },
          points: 1200
        },
        excellence: [
          {
            name: 'Game Off Champion',
            description: 'Winner of GitHub Game Off',
            rarity: BadgeRarity.LEGENDARY,
            criteria: { type: 'winner', position: 1 },
            points: 3000
          }
        ]
      }
    });
  }  /*
*
   * Process competition achievement and award appropriate points and badges
   */
  public async processCompetitionAchievement(
    userId: string,
    competitionId: string,
    competitionType: CompetitionType,
    achievementType: string,
    metadata: any
  ): Promise<GameEvent[]> {
    const events: GameEvent[] = [];

    try {
      const config = this.competitionConfigs.get(competitionType);
      if (!config) {
        throw new Error(`No configuration found for competition type: ${competitionType}`);
      }

      // Calculate points based on achievement type
      const pointsAwarded = await this.calculateCompetitionPoints(
        achievementType,
        config,
        metadata
      );

      if (pointsAwarded > 0) {
        // Award points using the advanced points system
        const pointsResult = await this.gamificationEngine.awardPoints({
          userId,
          points: pointsAwarded,
          reason: this.mapAchievementToPointReason(achievementType),
          source: competitionId,
          description: `${competitionType} - ${achievementType}`,
          metadata: {
            competitionId,
            competitionType,
            achievementType,
            ...metadata
          }
        });

        events.push(...pointsResult.events);
      }

      // Check for badge eligibility
      const badgeEvents = await this.checkCompetitionBadges(
        userId,
        competitionId,
        competitionType,
        achievementType,
        metadata
      );

      events.push(...badgeEvents);

      // Update competition leaderboard
      await this.updateCompetitionLeaderboard(userId, competitionId, pointsAwarded);

      // Create competition-specific event
      const competitionEvent: GameEvent = {
        type: 'competition_achievement',
        userId,
        data: {
          competitionId,
          competitionType,
          achievementType,
          pointsAwarded,
          metadata
        },
        timestamp: new Date()
      };

      events.push(competitionEvent);

      logger.info('Competition achievement processed', {
        userId,
        competitionId,
        competitionType,
        achievementType,
        pointsAwarded,
        eventsGenerated: events.length
      });

      return events;

    } catch (error) {
      logger.error('Failed to process competition achievement:', error);
      throw error;
    }
  }

  /**
   * Calculate points for competition achievement
   */
  private async calculateCompetitionPoints(
    achievementType: string,
    config: CompetitionPointsConfig,
    metadata: any
  ): Promise<number> {
    let basePoints = 0;

    // Get base points for achievement type
    switch (achievementType) {
      case 'registration':
        basePoints = config.basePoints.registration;
        break;
      case 'firstSubmission':
        basePoints = config.basePoints.firstSubmission;
        break;
      case 'pullRequest':
        basePoints = config.basePoints.pullRequest;
        break;
      case 'issueResolved':
        basePoints = config.basePoints.issueResolved;
        break;
      case 'codeReview':
        basePoints = config.basePoints.codeReview;
        break;
      case 'milestone':
        basePoints = config.basePoints.milestone;
        break;
      case 'completion':
        basePoints = config.basePoints.completion;
        break;
      default:
        basePoints = 50; // Default points
    }

    // Apply multipliers
    let multiplier = 1.0;

    // Difficulty multiplier
    if (metadata.difficulty && config.multipliers.difficulty[metadata.difficulty]) {
      multiplier *= config.multipliers.difficulty[metadata.difficulty];
    }

    // Rarity multiplier
    if (metadata.rarity && config.multipliers.rarity[metadata.rarity]) {
      multiplier *= config.multipliers.rarity[metadata.rarity];
    }

    // Timing multiplier
    if (metadata.timing && config.multipliers.timing[metadata.timing]) {
      multiplier *= config.multipliers.timing[metadata.timing];
    }

    // Apply bonuses
    let bonus = 0;

    // First in competition bonus
    if (metadata.isFirst) {
      bonus += config.bonuses.firstInCompetition;
    }

    // Quality bonus
    if (metadata.quality && metadata.quality >= config.bonuses.qualityThreshold) {
      bonus += Math.floor((metadata.quality - config.bonuses.qualityThreshold) * 10);
    }

    // Streak bonus
    if (metadata.streak && metadata.streak > 0) {
      bonus += config.bonuses.streakBonus * metadata.streak;
    }

    // Team participation bonus
    if (metadata.teamParticipation) {
      bonus += config.bonuses.teamParticipation;
    }

    return Math.floor((basePoints * multiplier) + bonus);
  }

  /**
   * Check and award competition-specific badges
   */
  private async checkCompetitionBadges(
    userId: string,
    competitionId: string,
    competitionType: CompetitionType,
    achievementType: string,
    metadata: any
  ): Promise<GameEvent[]> {
    const events: GameEvent[] = [];
    const badgeConfig = this.badgeConfigs.get(competitionType);

    if (!badgeConfig) {
      return events;
    }

    try {
      // Check participation badge
      if (achievementType === 'registration') {
        const participationBadge = await this.createOrGetBadge(
          badgeConfig.badges.participation,
          competitionType
        );
        
        const badgeEvent = await this.badgeSystem.awardBadge(
          userId,
          participationBadge.id,
          { competitionId, achievementType }
        );
        
        events.push({
          type: 'badge_earned',
          userId,
          data: badgeEvent,
          timestamp: new Date()
        });
      }

      // Check milestone badges
      for (const milestone of badgeConfig.badges.milestones) {
        if (await this.checkBadgeCriteria(userId, competitionId, milestone.criteria, metadata)) {
          const milestoneBadge = await this.createOrGetBadge(milestone, competitionType);
          
          try {
            const badgeEvent = await this.badgeSystem.awardBadge(
              userId,
              milestoneBadge.id,
              { competitionId, achievementType, milestone: milestone.name }
            );
            
            events.push({
              type: 'badge_earned',
              userId,
              data: badgeEvent,
              timestamp: new Date()
            });
          } catch (error) {
            // Badge already earned, ignore
            if (!error.message.includes('already has this badge')) {
              throw error;
            }
          }
        }
      }

      // Check achievement badges
      for (const achievement of badgeConfig.badges.achievements) {
        if (await this.checkBadgeCriteria(userId, competitionId, achievement.criteria, metadata)) {
          const achievementBadge = await this.createOrGetBadge(achievement, competitionType);
          
          try {
            const badgeEvent = await this.badgeSystem.awardBadge(
              userId,
              achievementBadge.id,
              { competitionId, achievementType, achievement: achievement.name }
            );
            
            events.push({
              type: 'badge_earned',
              userId,
              data: badgeEvent,
              timestamp: new Date()
            });
          } catch (error) {
            // Badge already earned, ignore
            if (!error.message.includes('already has this badge')) {
              throw error;
            }
          }
        }
      }

      return events;

    } catch (error) {
      logger.error('Failed to check competition badges:', error);
      return events;
    }
  }  /**

   * Create or get existing badge for competition
   */
  private async createOrGetBadge(badgeConfig: BadgeConfig, competitionType: CompetitionType): Promise<any> {
    // Check if badge already exists
    const existingBadge = await db.query(
      'SELECT * FROM badges WHERE name = $1 AND category = $2',
      [badgeConfig.name, `competition_${competitionType}`]
    );

    if (existingBadge.rows.length > 0) {
      return existingBadge.rows[0];
    }

    // Create new badge
    const badge = await this.badgeSystem.createBadge({
      name: badgeConfig.name,
      description: badgeConfig.description,
      category: `competition_${competitionType}` as BadgeCategory,
      rarity: badgeConfig.rarity,
      criteria: badgeConfig.criteria,
      points: badgeConfig.points,
      theme: {
        primaryColor: this.getCompetitionColor(competitionType),
        secondaryColor: this.getCompetitionSecondaryColor(competitionType),
        glowColor: this.getCompetitionColor(competitionType),
        backgroundPattern: 'competition',
        cyberpunkStyle: 'neon'
      }
    });

    return badge;
  }

  /**
   * Check if badge criteria is met
   */
  private async checkBadgeCriteria(
    userId: string,
    competitionId: string,
    criteria: any,
    metadata: any
  ): Promise<boolean> {
    switch (criteria.type) {
      case 'registration':
        return true; // Already registered if we're here

      case 'pullRequest':
        const prCount = await this.getCompetitionAchievementCount(
          userId,
          competitionId,
          'pullRequest'
        );
        return prCount >= criteria.count;

      case 'gameSubmission':
        const gameCount = await this.getCompetitionAchievementCount(
          userId,
          competitionId,
          'gameSubmission'
        );
        return gameCount >= criteria.count;

      case 'quality':
        return metadata.quality >= criteria.threshold;

      case 'security':
        const securityFixes = await this.getCompetitionAchievementCount(
          userId,
          competitionId,
          'securityFix'
        );
        return securityFixes >= criteria.fixes;

      case 'completion':
        return metadata.completed === true;

      case 'ranking':
        const rank = await this.getCompetitionRank(userId, competitionId);
        const totalParticipants = await this.getCompetitionParticipantCount(competitionId);
        const percentile = (rank / totalParticipants) * 100;
        return percentile <= criteria.percentile;

      case 'winner':
        const userRank = await this.getCompetitionRank(userId, competitionId);
        return userRank <= criteria.position;

      default:
        return false;
    }
  }

  /**
   * Get competition achievement count for user
   */
  private async getCompetitionAchievementCount(
    userId: string,
    competitionId: string,
    achievementType: string
  ): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*) FROM point_transactions 
       WHERE user_id = $1 AND source = $2 AND description LIKE $3`,
      [userId, competitionId, `%${achievementType}%`]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Update competition leaderboard
   */
  private async updateCompetitionLeaderboard(
    userId: string,
    competitionId: string,
    pointsAwarded: number
  ): Promise<void> {
    try {
      // Update or create competition leaderboard entry
      await db.query(
        `INSERT INTO competition_leaderboard (user_id, competition_id, total_points, last_updated)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, competition_id)
         DO UPDATE SET 
           total_points = competition_leaderboard.total_points + $3,
           last_updated = NOW()`,
        [userId, competitionId, pointsAwarded]
      );

      // Update ranks
      await this.updateCompetitionRanks(competitionId);

    } catch (error) {
      logger.error('Failed to update competition leaderboard:', error);
    }
  }

  /**
   * Update competition ranks
   */
  private async updateCompetitionRanks(competitionId: string): Promise<void> {
    await db.query(
      `UPDATE competition_leaderboard 
       SET rank = ranked.new_rank
       FROM (
         SELECT user_id, 
                ROW_NUMBER() OVER (ORDER BY total_points DESC, last_updated ASC) as new_rank
         FROM competition_leaderboard 
         WHERE competition_id = $1
       ) ranked
       WHERE competition_leaderboard.user_id = ranked.user_id 
         AND competition_leaderboard.competition_id = $1`,
      [competitionId]
    );
  }

  /**
   * Get user's rank in competition
   */
  private async getCompetitionRank(userId: string, competitionId: string): Promise<number> {
    const result = await db.query(
      'SELECT rank FROM competition_leaderboard WHERE user_id = $1 AND competition_id = $2',
      [userId, competitionId]
    );
    return result.rows.length > 0 ? result.rows[0].rank : 999999;
  }

  /**
   * Get total participants in competition
   */
  private async getCompetitionParticipantCount(competitionId: string): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*) FROM competition_leaderboard WHERE competition_id = $1',
      [competitionId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Map achievement type to point reason
   */
  private mapAchievementToPointReason(achievementType: string): PointReason {
    switch (achievementType) {
      case 'pullRequest':
        return PointReason.SUBMISSION;
      case 'codeReview':
        return PointReason.PEER_REVIEW;
      case 'milestone':
        return PointReason.MILESTONE;
      case 'completion':
        return PointReason.ACHIEVEMENT;
      default:
        return PointReason.ACTIVITY;
    }
  }

  /**
   * Get competition primary color
   */
  private getCompetitionColor(competitionType: CompetitionType): string {
    const colors: Record<CompetitionType, string> = {
      [CompetitionType.HACKTOBERFEST]: '#FF6B35',
      [CompetitionType.GITHUB_GAME_OFF]: '#7C3AED',
      [CompetitionType.GITLAB_HACKATHON]: '#FC6D26',
      [CompetitionType.OPEN_SOURCE_CHALLENGE]: '#10B981',
      [CompetitionType.CUSTOM_COMPETITION]: '#3B82F6'
    };
    return colors[competitionType] || '#3B82F6';
  }

  /**
   * Get competition secondary color
   */
  private getCompetitionSecondaryColor(competitionType: CompetitionType): string {
    const colors: Record<CompetitionType, string> = {
      [CompetitionType.HACKTOBERFEST]: '#F7931E',
      [CompetitionType.GITHUB_GAME_OFF]: '#A855F7',
      [CompetitionType.GITLAB_HACKATHON]: '#FFA500',
      [CompetitionType.OPEN_SOURCE_CHALLENGE]: '#34D399',
      [CompetitionType.CUSTOM_COMPETITION]: '#60A5FA'
    };
    return colors[competitionType] || '#60A5FA';
  }

  /**
   * Get competition leaderboard
   */
  public async getCompetitionLeaderboard(
    competitionId: string,
    limit: number = 50
  ): Promise<any[]> {
    const result = await db.query(
      `SELECT 
         cl.user_id,
         cl.total_points,
         cl.rank,
         u.username,
         ugp.level,
         COUNT(ub.id) as badge_count
       FROM competition_leaderboard cl
       JOIN users u ON cl.user_id = u.id
       LEFT JOIN user_game_profiles ugp ON cl.user_id = ugp.user_id
       LEFT JOIN user_badges ub ON cl.user_id = ub.user_id
       WHERE cl.competition_id = $1
       GROUP BY cl.user_id, cl.total_points, cl.rank, u.username, ugp.level
       ORDER BY cl.rank ASC
       LIMIT $2`,
      [competitionId, limit]
    );

    return result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      totalPoints: row.total_points,
      rank: row.rank,
      level: row.level || 1,
      badgeCount: parseInt(row.badge_count)
    }));
  }
}