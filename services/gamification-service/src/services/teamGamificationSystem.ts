/**
 * Team-based Gamification System with collaborative achievements
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { TeamAffiliation, GameEvent } from '../models';
import { WebSocketManager } from './websocketManager';
import { MetricsCollector } from './metricsCollector';

export interface Team {
  teamId: string;
  teamName: string;
  description: string;
  createdBy: string;
  maxMembers: number;
  currentMembers: number;
  totalPoints: number;
  averageLevel: number;
  teamRank: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  userId: string;
  username: string;
  role: 'member' | 'leader' | 'captain';
  joinedAt: Date;
  contributionPoints: number;
  teamRank: number;
}

export interface CollaborativeAchievement {
  id: string;
  name: string;
  description: string;
  requiredMembers: number;
  criteria: any;
  rewards: TeamReward[];
  isActive: boolean;
}

export interface TeamReward {
  type: 'points' | 'badge' | 'title' | 'privilege';
  value: any;
  description: string;
  individual: boolean; // If true, each member gets the reward
}

export class TeamGamificationSystem {
  private static instance: TeamGamificationSystem;
  private wsManager: WebSocketManager;
  private metrics: MetricsCollector;

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.metrics = MetricsCollector.getInstance();
  }

  public static getInstance(): TeamGamificationSystem {
    if (!TeamGamificationSystem.instance) {
      TeamGamificationSystem.instance = new TeamGamificationSystem();
    }
    return TeamGamificationSystem.instance;
  }

  /**
   * Create a new team
   */
  public async createTeam(
    createdBy: string,
    teamName: string,
    description: string,
    maxMembers: number = 10
  ): Promise<Team> {
    const teamId = uuidv4();

    try {
      const team: Team = {
        teamId,
        teamName,
        description,
        createdBy,
        maxMembers,
        currentMembers: 1,
        totalPoints: 0,
        averageLevel: 1,
        teamRank: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.query(
        `INSERT INTO teams (team_id, team_name, description, created_by, max_members, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [teamId, teamName, description, createdBy, maxMembers, true, team.createdAt, team.updatedAt]
      );

      // Add creator as team captain
      await this.addMemberToTeam(teamId, createdBy, 'captain');

      logger.info('Team created successfully', {
        teamId,
        teamName,
        createdBy,
        maxMembers
      });

      return team;

    } catch (error) {
      logger.error('Failed to create team:', error);
      throw error;
    }
  }

  /**
   * Add member to team
   */
  public async addMemberToTeam(
    teamId: string,
    userId: string,
    role: 'member' | 'leader' | 'captain' = 'member'
  ): Promise<void> {
    try {
      // Check if team exists and has space
      const teamResult = await db.query(
        'SELECT * FROM teams WHERE team_id = $1 AND is_active = true',
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        throw new Error('Team not found or inactive');
      }

      const team = teamResult.rows[0];

      // Check current member count
      const memberCountResult = await db.query(
        `SELECT COUNT(*) FROM user_game_profiles 
         WHERE JSON_EXTRACT(team_affiliation, '$.teamId') = $1`,
        [teamId]
      );

      const currentMembers = parseInt(memberCountResult.rows[0].count);

      if (currentMembers >= team.max_members) {
        throw new Error('Team is full');
      }

      // Check if user is already in a team
      const userTeamResult = await db.query(
        `SELECT team_affiliation FROM user_game_profiles 
         WHERE user_id = $1 AND team_affiliation IS NOT NULL`,
        [userId]
      );

      if (userTeamResult.rows.length > 0) {
        throw new Error('User is already in a team');
      }

      // Create team affiliation
      const teamAffiliation: TeamAffiliation = {
        teamId,
        teamName: team.team_name,
        role,
        joinedAt: new Date(),
        teamPoints: 0,
        teamRank: currentMembers + 1
      };

      // Update user profile with team affiliation
      await db.query(
        `UPDATE user_game_profiles 
         SET team_affiliation = $2, updated_at = NOW()
         WHERE user_id = $1`,
        [userId, JSON.stringify(teamAffiliation)]
      );

      // Send team notification
      await this.wsManager.sendToTeam(teamId, {
        type: 'team_member_joined',
        userId,
        data: {
          teamId,
          teamName: team.team_name,
          newMember: userId,
          role
        },
        timestamp: new Date()
      });

      logger.info('Member added to team', {
        teamId,
        userId,
        role
      });

    } catch (error) {
      logger.error('Failed to add member to team:', error);
      throw error;
    }
  }

  /**
   * Award points to team and distribute to members
   */
  public async awardTeamPoints(
    teamId: string,
    points: number,
    reason: string,
    contributingUserId?: string
  ): Promise<void> {
    try {
      // Get team members
      const membersResult = await db.query(
        `SELECT user_id, team_affiliation FROM user_game_profiles 
         WHERE JSON_EXTRACT(team_affiliation, '$.teamId') = $1`,
        [teamId]
      );

      const members = membersResult.rows;

      if (members.length === 0) {
        throw new Error('No team members found');
      }

      // Calculate point distribution
      const pointsPerMember = Math.floor(points / members.length);
      const bonusForContributor = contributingUserId ? Math.floor(points * 0.2) : 0;

      // Distribute points to members
      for (const member of members) {
        const memberPoints = pointsPerMember + (member.user_id === contributingUserId ? bonusForContributor : 0);
        
        // Award individual points
        await db.query(
          `INSERT INTO point_transactions (id, user_id, points, reason, source, description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            member.user_id,
            memberPoints,
            'team_collaboration',
            teamId,
            `Team achievement: ${reason}`,
            new Date()
          ]
        );

        // Update team affiliation points
        const affiliation = JSON.parse(member.team_affiliation);
        affiliation.teamPoints += memberPoints;

        await db.query(
          `UPDATE user_game_profiles 
           SET team_affiliation = $2, updated_at = NOW()
           WHERE user_id = $1`,
          [member.user_id, JSON.stringify(affiliation)]
        );
      }

      // Update team total points
      await db.query(
        `UPDATE teams 
         SET updated_at = NOW()
         WHERE team_id = $1`,
        [teamId]
      );

      // Send team achievement notification
      await this.wsManager.sendToTeam(teamId, {
        type: 'team_points_awarded',
        data: {
          teamId,
          points,
          reason,
          contributingUser: contributingUserId,
          pointsPerMember,
          bonusForContributor
        },
        timestamp: new Date(),
        celebrationLevel: 'standard'
      });

      logger.info('Team points awarded', {
        teamId,
        points,
        reason,
        memberCount: members.length,
        contributingUserId
      });

    } catch (error) {
      logger.error('Failed to award team points:', error);
      throw error;
    }
  }

  /**
   * Check and award collaborative achievements
   */
  public async checkCollaborativeAchievements(teamId: string): Promise<GameEvent[]> {
    const events: GameEvent[] = [];

    try {
      // Get active collaborative achievements
      const achievementsResult = await db.query(
        'SELECT * FROM collaborative_achievements WHERE is_active = true'
      );

      const achievements = achievementsResult.rows;

      for (const achievement of achievements) {
        const criteria = JSON.parse(achievement.criteria);
        const earned = await this.evaluateTeamCriteria(teamId, criteria);

        if (earned) {
          // Check if team already has this achievement
          const existingResult = await db.query(
            'SELECT id FROM team_achievements WHERE team_id = $1 AND achievement_id = $2',
            [teamId, achievement.id]
          );

          if (existingResult.rows.length === 0) {
            // Award achievement to team
            await db.query(
              `INSERT INTO team_achievements (id, team_id, achievement_id, earned_at)
               VALUES ($1, $2, $3, $4)`,
              [uuidv4(), teamId, achievement.id, new Date()]
            );

            // Create achievement event
            const achievementEvent: GameEvent = {
              type: 'team_milestone',
              userId: teamId, // Using teamId as userId for team events
              data: {
                achievementId: achievement.id,
                name: achievement.name,
                description: achievement.description,
                teamId
              },
              timestamp: new Date(),
              celebrationLevel: 'epic',
              teamNotification: true
            };

            events.push(achievementEvent);

            // Award rewards
            const rewards = JSON.parse(achievement.rewards);
            await this.awardTeamRewards(teamId, rewards);

            // Send team notification
            await this.wsManager.sendToTeam(teamId, achievementEvent);
          }
        }
      }

      return events;

    } catch (error) {
      logger.error('Failed to check collaborative achievements:', error);
      throw error;
    }
  }

  /**
   * Get team leaderboard with detailed stats
   */
  public async getTeamLeaderboard(limit: number = 50): Promise<any[]> {
    try {
      const query = `
        SELECT 
          t.team_id,
          t.team_name,
          t.description,
          COUNT(ugp.user_id) as member_count,
          SUM(ugp.total_points) as total_points,
          AVG(ugp.level) as average_level,
          COUNT(DISTINCT ub.id) as total_badges,
          COUNT(DISTINCT ua.id) as total_achievements,
          COUNT(DISTINCT ta.id) as team_achievements,
          ROW_NUMBER() OVER (ORDER BY SUM(ugp.total_points) DESC) as rank
        FROM teams t
        JOIN user_game_profiles ugp ON JSON_EXTRACT(ugp.team_affiliation, '$.teamId') = t.team_id
        LEFT JOIN user_badges ub ON ugp.user_id = ub.user_id
        LEFT JOIN user_achievements ua ON ugp.user_id = ua.user_id
        LEFT JOIN team_achievements ta ON t.team_id = ta.team_id
        WHERE t.is_active = true
        GROUP BY t.team_id, t.team_name, t.description
        ORDER BY total_points DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);

      return result.rows.map(row => ({
        rank: parseInt(row.rank),
        teamId: row.team_id,
        teamName: row.team_name,
        description: row.description,
        memberCount: parseInt(row.member_count),
        totalPoints: parseInt(row.total_points),
        averageLevel: parseFloat(row.average_level),
        totalBadges: parseInt(row.total_badges),
        totalAchievements: parseInt(row.total_achievements),
        teamAchievements: parseInt(row.team_achievements)
      }));

    } catch (error) {
      logger.error('Failed to get team leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get team details with member information
   */
  public async getTeamDetails(teamId: string): Promise<any> {
    try {
      // Get team info
      const teamResult = await db.query(
        'SELECT * FROM teams WHERE team_id = $1',
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        throw new Error('Team not found');
      }

      const team = teamResult.rows[0];

      // Get team members
      const membersResult = await db.query(
        `SELECT 
           ugp.user_id,
           'User' || ugp.user_id as username,
           ugp.total_points,
           ugp.level,
           ugp.team_affiliation,
           COUNT(DISTINCT ub.id) as badges,
           COUNT(DISTINCT ua.id) as achievements
         FROM user_game_profiles ugp
         LEFT JOIN user_badges ub ON ugp.user_id = ub.user_id
         LEFT JOIN user_achievements ua ON ugp.user_id = ua.user_id
         WHERE JSON_EXTRACT(ugp.team_affiliation, '$.teamId') = $1
         GROUP BY ugp.user_id, ugp.total_points, ugp.level, ugp.team_affiliation
         ORDER BY ugp.total_points DESC`,
        [teamId]
      );

      const members = membersResult.rows.map(row => {
        const affiliation = JSON.parse(row.team_affiliation);
        return {
          userId: row.user_id,
          username: row.username,
          totalPoints: parseInt(row.total_points),
          level: parseInt(row.level),
          role: affiliation.role,
          joinedAt: affiliation.joinedAt,
          teamPoints: affiliation.teamPoints,
          badges: parseInt(row.badges),
          achievements: parseInt(row.achievements)
        };
      });

      // Get team achievements
      const achievementsResult = await db.query(
        `SELECT ca.name, ca.description, ta.earned_at
         FROM team_achievements ta
         JOIN collaborative_achievements ca ON ta.achievement_id = ca.id
         WHERE ta.team_id = $1
         ORDER BY ta.earned_at DESC`,
        [teamId]
      );

      return {
        teamId: team.team_id,
        teamName: team.team_name,
        description: team.description,
        createdBy: team.created_by,
        maxMembers: team.max_members,
        currentMembers: members.length,
        totalPoints: members.reduce((sum, member) => sum + member.totalPoints, 0),
        averageLevel: members.reduce((sum, member) => sum + member.level, 0) / members.length,
        isActive: team.is_active,
        createdAt: team.created_at,
        members,
        achievements: achievementsResult.rows
      };

    } catch (error) {
      logger.error('Failed to get team details:', error);
      throw error;
    }
  }

  // Private helper methods
  private async evaluateTeamCriteria(teamId: string, criteria: any): Promise<boolean> {
    switch (criteria.type) {
      case 'total_points':
        const pointsResult = await db.query(
          `SELECT SUM(total_points) as total
           FROM user_game_profiles
           WHERE JSON_EXTRACT(team_affiliation, '$.teamId') = $1`,
          [teamId]
        );
        return parseInt(pointsResult.rows[0]?.total || '0') >= criteria.threshold;

      case 'member_count':
        const memberResult = await db.query(
          `SELECT COUNT(*) as count
           FROM user_game_profiles
           WHERE JSON_EXTRACT(team_affiliation, '$.teamId') = $1`,
          [teamId]
        );
        return parseInt(memberResult.rows[0]?.count || '0') >= criteria.threshold;

      case 'collective_badges':
        const badgeResult = await db.query(
          `SELECT COUNT(DISTINCT ub.badge_id) as count
           FROM user_badges ub
           JOIN user_game_profiles ugp ON ub.user_id = ugp.user_id
           WHERE JSON_EXTRACT(ugp.team_affiliation, '$.teamId') = $1`,
          [teamId]
        );
        return parseInt(badgeResult.rows[0]?.count || '0') >= criteria.threshold;

      default:
        return false;
    }
  }

  private async awardTeamRewards(teamId: string, rewards: TeamReward[]): Promise<void> {
    for (const reward of rewards) {
      if (reward.individual) {
        // Award to each team member
        const membersResult = await db.query(
          `SELECT user_id FROM user_game_profiles 
           WHERE JSON_EXTRACT(team_affiliation, '$.teamId') = $1`,
          [teamId]
        );

        for (const member of membersResult.rows) {
          await this.awardIndividualReward(member.user_id, reward);
        }
      } else {
        // Award to team as a whole
        await this.awardTeamReward(teamId, reward);
      }
    }
  }

  private async awardIndividualReward(userId: string, reward: TeamReward): Promise<void> {
    switch (reward.type) {
      case 'points':
        await db.query(
          `INSERT INTO point_transactions (id, user_id, points, reason, source, description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            userId,
            reward.value,
            'team_achievement',
            'team_reward',
            reward.description,
            new Date()
          ]
        );
        break;

      case 'badge':
        // Implementation would depend on badge system
        break;

      // Add other reward types as needed
    }
  }

  private async awardTeamReward(teamId: string, reward: TeamReward): Promise<void> {
    // Implementation for team-wide rewards
    // This could include team titles, privileges, etc.
  }
}