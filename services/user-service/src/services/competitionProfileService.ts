/**
 * Competition Profile Service for managing user competition data
 */

import { Pool } from 'pg';
import { logger } from '../telemetry/logger';
import {
  CompetitionProfile,
  ExternalPlatformConnection,
  CompetitionPreferences,
  CompetitionStatistics,
  CompetitionAchievement,
  CompetitionBadge,
  CompetitionParticipation,
  ExternalPlatform,
  CompetitionType
} from '../models/CompetitionProfile';

export class CompetitionProfileService {
  constructor(private db: Pool) {}

  /**
   * Get user's competition profile
   */
  async getCompetitionProfile(userId: string): Promise<CompetitionProfile | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM competition_profiles WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Load related data
      const [platforms, preferences, stats, achievements, badges, history] = await Promise.all([
        this.getExternalPlatforms(userId),
        this.getCompetitionPreferences(userId),
        this.getCompetitionStatistics(userId),
        this.getCompetitionAchievements(userId),
        this.getCompetitionBadges(userId),
        this.getCompetitionHistory(userId)
      ]);

      return {
        userId: row.user_id,
        externalPlatforms: platforms,
        competitionPreferences: preferences,
        competitionStats: stats,
        competitionAchievements: achievements,
        competitionBadges: badges,
        competitionHistory: history,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

    } catch (error) {
      logger.error('Failed to get competition profile:', error);
      throw error;
    }
  }

  /**
   * Create or update competition profile
   */
  async upsertCompetitionProfile(userId: string, profile: Partial<CompetitionProfile>): Promise<CompetitionProfile> {
    try {
      // Upsert main profile record
      await this.db.query(
        `INSERT INTO competition_profiles (user_id, created_at, updated_at)
         VALUES ($1, NOW(), NOW())
         ON CONFLICT (user_id) 
         DO UPDATE SET updated_at = NOW()`,
        [userId]
      );

      // Update related data if provided
      if (profile.competitionPreferences) {
        await this.updateCompetitionPreferences(userId, profile.competitionPreferences);
      }

      if (profile.externalPlatforms) {
        await this.updateExternalPlatforms(userId, profile.externalPlatforms);
      }

      // Return updated profile
      return await this.getCompetitionProfile(userId) as CompetitionProfile;

    } catch (error) {
      logger.error('Failed to upsert competition profile:', error);
      throw error;
    }
  }

  /**
   * Add external platform connection
   */
  async addExternalPlatform(
    userId: string,
    platform: ExternalPlatform,
    connection: Omit<ExternalPlatformConnection, 'platform'>
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO external_platform_connections 
         (user_id, platform, username, profile_url, access_token, refresh_token, 
          is_verified, last_sync, sync_enabled, permissions, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         ON CONFLICT (user_id, platform)
         DO UPDATE SET 
           username = $3,
           profile_url = $4,
           access_token = $5,
           refresh_token = $6,
           is_verified = $7,
           last_sync = $8,
           sync_enabled = $9,
           permissions = $10,
           metadata = $11,
           updated_at = NOW()`,
        [
          userId,
          platform,
          connection.username,
          connection.profileUrl,
          connection.accessToken,
          connection.refreshToken,
          connection.isVerified,
          connection.lastSync,
          connection.syncEnabled,
          JSON.stringify(connection.permissions),
          JSON.stringify(connection.metadata)
        ]
      );

      logger.info('External platform connection added/updated', {
        userId,
        platform,
        username: connection.username
      });

    } catch (error) {
      logger.error('Failed to add external platform connection:', error);
      throw error;
    }
  }

  /**
   * Remove external platform connection
   */
  async removeExternalPlatform(userId: string, platform: ExternalPlatform): Promise<void> {
    try {
      await this.db.query(
        'DELETE FROM external_platform_connections WHERE user_id = $1 AND platform = $2',
        [userId, platform]
      );

      logger.info('External platform connection removed', { userId, platform });

    } catch (error) {
      logger.error('Failed to remove external platform connection:', error);
      throw error;
    }
  }

  /**
   * Add competition achievement
   */
  async addCompetitionAchievement(userId: string, achievement: CompetitionAchievement): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO competition_achievements 
         (id, user_id, competition_id, competition_name, competition_type, achievement_type,
          name, description, points, rarity, is_verified, verification_source, earned_at,
          external_url, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          achievement.id,
          userId,
          achievement.competitionId,
          achievement.competitionName,
          achievement.competitionType,
          achievement.achievementType,
          achievement.name,
          achievement.description,
          achievement.points,
          achievement.rarity,
          achievement.isVerified,
          achievement.verificationSource,
          achievement.earnedAt,
          achievement.externalUrl,
          JSON.stringify(achievement.metadata)
        ]
      );

      // Update statistics
      await this.updateCompetitionStatistics(userId);

      logger.info('Competition achievement added', {
        userId,
        achievementId: achievement.id,
        competitionId: achievement.competitionId
      });

    } catch (error) {
      logger.error('Failed to add competition achievement:', error);
      throw error;
    }
  }

  /**
   * Add competition badge
   */
  async addCompetitionBadge(userId: string, badge: CompetitionBadge): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO competition_badges 
         (id, user_id, competition_id, competition_name, competition_type, badge_type,
          name, description, image_url, rarity, is_verified, verification_source, earned_at,
          external_url, showcase_position, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          badge.id,
          userId,
          badge.competitionId,
          badge.competitionName,
          badge.competitionType,
          badge.badgeType,
          badge.name,
          badge.description,
          badge.imageUrl,
          badge.rarity,
          badge.isVerified,
          badge.verificationSource,
          badge.earnedAt,
          badge.externalUrl,
          badge.showcasePosition,
          JSON.stringify(badge.metadata)
        ]
      );

      // Update statistics
      await this.updateCompetitionStatistics(userId);

      logger.info('Competition badge added', {
        userId,
        badgeId: badge.id,
        competitionId: badge.competitionId
      });

    } catch (error) {
      logger.error('Failed to add competition badge:', error);
      throw error;
    }
  }

  /**
   * Update competition participation
   */
  async updateCompetitionParticipation(userId: string, participation: CompetitionParticipation): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO competition_participations 
         (id, user_id, competition_id, competition_name, competition_type, status,
          joined_at, completed_at, final_rank, total_participants, points_earned,
          badges_earned, achievements_earned, team_id, team_name, progress, external_data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
         ON CONFLICT (id)
         DO UPDATE SET 
           status = $6,
           completed_at = $8,
           final_rank = $9,
           total_participants = $10,
           points_earned = $11,
           badges_earned = $12,
           achievements_earned = $13,
           progress = $16,
           external_data = $17,
           updated_at = NOW()`,
        [
          participation.id,
          userId,
          participation.competitionId,
          participation.competitionName,
          participation.competitionType,
          participation.status,
          participation.joinedAt,
          participation.completedAt,
          participation.finalRank,
          participation.totalParticipants,
          participation.pointsEarned,
          participation.badgesEarned,
          participation.achievementsEarned,
          participation.teamId,
          participation.teamName,
          JSON.stringify(participation.progress),
          JSON.stringify(participation.externalData)
        ]
      );

      // Update statistics
      await this.updateCompetitionStatistics(userId);

      logger.info('Competition participation updated', {
        userId,
        participationId: participation.id,
        competitionId: participation.competitionId,
        status: participation.status
      });

    } catch (error) {
      logger.error('Failed to update competition participation:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getExternalPlatforms(userId: string): Promise<ExternalPlatformConnection[]> {
    const result = await this.db.query(
      'SELECT * FROM external_platform_connections WHERE user_id = $1',
      [userId]
    );

    return result.rows.map(row => ({
      platform: row.platform,
      username: row.username,
      profileUrl: row.profile_url,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      isVerified: row.is_verified,
      lastSync: row.last_sync,
      syncEnabled: row.sync_enabled,
      permissions: JSON.parse(row.permissions || '[]'),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  private async getCompetitionPreferences(userId: string): Promise<CompetitionPreferences> {
    const result = await this.db.query(
      'SELECT * FROM competition_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return this.getDefaultCompetitionPreferences();
    }

    const row = result.rows[0];
    return {
      autoJoinRecommended: row.auto_join_recommended,
      difficultyPreference: JSON.parse(row.difficulty_preference || '[]'),
      competitionTypes: JSON.parse(row.competition_types || '[]'),
      notificationSettings: JSON.parse(row.notification_settings || '{}'),
      privacySettings: JSON.parse(row.privacy_settings || '{}'),
      teamPreferences: JSON.parse(row.team_preferences || '{}')
    };
  }

  private async getCompetitionStatistics(userId: string): Promise<CompetitionStatistics> {
    const result = await this.db.query(
      'SELECT * FROM competition_statistics WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return this.getDefaultCompetitionStatistics();
    }

    const row = result.rows[0];
    return {
      totalCompetitions: row.total_competitions,
      activeCompetitions: row.active_competitions,
      completedCompetitions: row.completed_competitions,
      totalPoints: row.total_points,
      averageRank: row.average_rank,
      bestRank: row.best_rank,
      totalBadges: row.total_badges,
      totalAchievements: row.total_achievements,
      winRate: row.win_rate,
      participationStreak: JSON.parse(row.participation_streak || '{}'),
      competitionsByType: JSON.parse(row.competitions_by_type || '{}'),
      monthlyStats: JSON.parse(row.monthly_stats || '[]')
    };
  }

  private async getCompetitionAchievements(userId: string): Promise<CompetitionAchievement[]> {
    const result = await this.db.query(
      'SELECT * FROM competition_achievements WHERE user_id = $1 ORDER BY earned_at DESC',
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      competitionId: row.competition_id,
      competitionName: row.competition_name,
      competitionType: row.competition_type,
      achievementType: row.achievement_type,
      name: row.name,
      description: row.description,
      points: row.points,
      rarity: row.rarity,
      isVerified: row.is_verified,
      verificationSource: row.verification_source,
      earnedAt: row.earned_at,
      externalUrl: row.external_url,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  private async getCompetitionBadges(userId: string): Promise<CompetitionBadge[]> {
    const result = await this.db.query(
      'SELECT * FROM competition_badges WHERE user_id = $1 ORDER BY earned_at DESC',
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      competitionId: row.competition_id,
      competitionName: row.competition_name,
      competitionType: row.competition_type,
      badgeType: row.badge_type,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      rarity: row.rarity,
      isVerified: row.is_verified,
      verificationSource: row.verification_source,
      earnedAt: row.earned_at,
      externalUrl: row.external_url,
      showcasePosition: row.showcase_position,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  private async getCompetitionHistory(userId: string): Promise<CompetitionParticipation[]> {
    const result = await this.db.query(
      'SELECT * FROM competition_participations WHERE user_id = $1 ORDER BY joined_at DESC',
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      competitionId: row.competition_id,
      competitionName: row.competition_name,
      competitionType: row.competition_type,
      status: row.status,
      joinedAt: row.joined_at,
      completedAt: row.completed_at,
      finalRank: row.final_rank,
      totalParticipants: row.total_participants,
      pointsEarned: row.points_earned,
      badgesEarned: row.badges_earned,
      achievementsEarned: row.achievements_earned,
      teamId: row.team_id,
      teamName: row.team_name,
      progress: JSON.parse(row.progress || '{}'),
      externalData: JSON.parse(row.external_data || '{}')
    }));
  }

  private async updateCompetitionPreferences(userId: string, preferences: CompetitionPreferences): Promise<void> {
    await this.db.query(
      `INSERT INTO competition_preferences 
       (user_id, auto_join_recommended, difficulty_preference, competition_types,
        notification_settings, privacy_settings, team_preferences, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET 
         auto_join_recommended = $2,
         difficulty_preference = $3,
         competition_types = $4,
         notification_settings = $5,
         privacy_settings = $6,
         team_preferences = $7,
         updated_at = NOW()`,
      [
        userId,
        preferences.autoJoinRecommended,
        JSON.stringify(preferences.difficultyPreference),
        JSON.stringify(preferences.competitionTypes),
        JSON.stringify(preferences.notificationSettings),
        JSON.stringify(preferences.privacySettings),
        JSON.stringify(preferences.teamPreferences)
      ]
    );
  }

  private async updateExternalPlatforms(userId: string, platforms: ExternalPlatformConnection[]): Promise<void> {
    // Remove existing platforms
    await this.db.query('DELETE FROM external_platform_connections WHERE user_id = $1', [userId]);

    // Add new platforms
    for (const platform of platforms) {
      await this.addExternalPlatform(userId, platform.platform, platform);
    }
  }

  private async updateCompetitionStatistics(userId: string): Promise<void> {
    // This would typically be called after adding achievements, badges, or updating participations
    // Implementation would recalculate all statistics based on current data
    // For brevity, this is a placeholder
    logger.info('Competition statistics updated', { userId });
  }

  private getDefaultCompetitionPreferences(): CompetitionPreferences {
    return {
      autoJoinRecommended: false,
      difficultyPreference: [],
      competitionTypes: [],
      notificationSettings: {
        newCompetitions: true,
        competitionStart: true,
        competitionEnd: true,
        milestoneAchieved: true,
        badgeEarned: true,
        leaderboardUpdate: false,
        teamInvitations: true,
        reminderNotifications: true,
        weeklyDigest: true
      },
      privacySettings: {
        showCompetitionHistory: true,
        showExternalProfiles: true,
        allowTeamInvites: true,
        shareProgressWithTeam: true,
        publicLeaderboard: true,
        showRealTimeProgress: true
      },
      teamPreferences: {
        preferredTeamSize: 4,
        skillLevelPreference: 'intermediate' as any,
        communicationStyle: 'collaborative' as any,
        availableTimeZones: [],
        collaborationTools: [],
        mentorshipInterest: 'none' as any
      }
    };
  }

  private getDefaultCompetitionStatistics(): CompetitionStatistics {
    return {
      totalCompetitions: 0,
      activeCompetitions: 0,
      completedCompetitions: 0,
      totalPoints: 0,
      averageRank: 0,
      bestRank: 0,
      totalBadges: 0,
      totalAchievements: 0,
      winRate: 0,
      participationStreak: {
        current: 0,
        longest: 0,
        lastActivity: new Date(),
        multiplier: 1.0
      },
      competitionsByType: {},
      monthlyStats: []
    };
  }
}