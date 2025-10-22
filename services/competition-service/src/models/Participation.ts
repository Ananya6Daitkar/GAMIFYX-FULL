import { Pool } from 'pg';
import { logger } from '@/telemetry/logger';
import { 
  Participation, 
  ParticipationStatus,
  ExternalProfile,
  Achievement,
  Submission,
  Milestone,
  NotFoundError,
  ValidationError
} from '@/types/competition';

export class ParticipationModel {
  constructor(private db: Pool) {}

  async create(participation: Omit<Participation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Participation> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if participation already exists
      const existingResult = await client.query(`
        SELECT id FROM participations WHERE competition_id = $1 AND user_id = $2
      `, [participation.competitionId, participation.userId]);

      if (existingResult.rows.length > 0) {
        throw new ValidationError('User is already registered for this competition');
      }

      // Insert main participation record
      const participationResult = await client.query(`
        INSERT INTO participations (
          competition_id, user_id, status, registered_at, registration_data,
          github_username, gitlab_username, total_score, completion_percentage,
          current_streak, longest_streak, notes, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        participation.competitionId,
        participation.userId,
        participation.status,
        participation.registeredAt,
        JSON.stringify(participation.registrationData),
        participation.githubUsername,
        participation.gitlabUsername,
        participation.totalScore,
        participation.progress.completionPercentage,
        participation.progress.currentStreak,
        participation.progress.longestStreak,
        participation.notes,
        participation.tags
      ]);

      const participationId = participationResult.rows[0].id;

      // Insert external profiles
      for (const profile of participation.externalProfiles) {
        await client.query(`
          INSERT INTO external_profiles (
            participation_id, platform, username, profile_url, verified, connected_at, last_sync_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          participationId,
          profile.platform,
          profile.username,
          profile.profileUrl,
          profile.verified,
          profile.connectedAt,
          profile.lastSyncAt
        ]);
      }

      await client.query('COMMIT');

      // Update competition participant count
      await this.db.query(`
        UPDATE competitions 
        SET participant_count = participant_count + 1 
        WHERE id = $1
      `, [participation.competitionId]);

      return await this.findById(participationId);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create participation', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Participation> {
    const result = await this.db.query(`
      SELECT * FROM participations WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Participation', id);
    }

    const participationRow = result.rows[0];

    // Load related data
    const [externalProfiles, achievements, submissions, milestones] = await Promise.all([
      this.loadExternalProfiles(id),
      this.loadAchievements(id),
      this.loadSubmissions(id),
      this.loadMilestones(id)
    ]);

    return this.mapRowToParticipation(participationRow, externalProfiles, achievements, submissions, milestones);
  }

  async findByUserAndCompetition(userId: string, competitionId: string): Promise<Participation | null> {
    const result = await this.db.query(`
      SELECT * FROM participations WHERE user_id = $1 AND competition_id = $2
    `, [userId, competitionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const participationRow = result.rows[0];

    // Load related data
    const [externalProfiles, achievements, submissions, milestones] = await Promise.all([
      this.loadExternalProfiles(participationRow.id),
      this.loadAchievements(participationRow.id),
      this.loadSubmissions(participationRow.id),
      this.loadMilestones(participationRow.id)
    ]);

    return this.mapRowToParticipation(participationRow, externalProfiles, achievements, submissions, milestones);
  }

  async findByUser(userId: string, filters?: {
    status?: ParticipationStatus;
    competitionType?: string;
    limit?: number;
    offset?: number;
  }): Promise<Participation[]> {
    let query = `
      SELECT p.* FROM participations p
      JOIN competitions c ON p.competition_id = c.id
      WHERE p.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.competitionType) {
      query += ` AND c.type = $${paramIndex}`;
      params.push(filters.competitionType);
      paramIndex++;
    }

    query += ' ORDER BY p.registered_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    const result = await this.db.query(query, params);

    // Load related data for all participations
    const participations = await Promise.all(
      result.rows.map(async (row) => {
        const [externalProfiles, achievements, submissions, milestones] = await Promise.all([
          this.loadExternalProfiles(row.id),
          this.loadAchievements(row.id),
          this.loadSubmissions(row.id),
          this.loadMilestones(row.id)
        ]);

        return this.mapRowToParticipation(row, externalProfiles, achievements, submissions, milestones);
      })
    );

    return participations;
  }

  async findByCompetition(competitionId: string, filters?: {
    status?: ParticipationStatus;
    limit?: number;
    offset?: number;
  }): Promise<Participation[]> {
    let query = 'SELECT * FROM participations WHERE competition_id = $1';
    const params: any[] = [competitionId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ' ORDER BY total_score DESC, registered_at ASC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    const result = await this.db.query(query, params);

    // Load related data for all participations
    const participations = await Promise.all(
      result.rows.map(async (row) => {
        const [externalProfiles, achievements, submissions, milestones] = await Promise.all([
          this.loadExternalProfiles(row.id),
          this.loadAchievements(row.id),
          this.loadSubmissions(row.id),
          this.loadMilestones(row.id)
        ]);

        return this.mapRowToParticipation(row, externalProfiles, achievements, submissions, milestones);
      })
    );

    return participations;
  }

  async updateProgress(id: string, progress: {
    completedRequirements?: string[];
    totalScore?: number;
    completionPercentage?: number;
    currentStreak?: number;
    longestStreak?: number;
    lastActivityAt?: Date;
  }): Promise<void> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (progress.totalScore !== undefined) {
      updateFields.push(`total_score = $${paramIndex}`);
      params.push(progress.totalScore);
      paramIndex++;
    }

    if (progress.completionPercentage !== undefined) {
      updateFields.push(`completion_percentage = $${paramIndex}`);
      params.push(progress.completionPercentage);
      paramIndex++;
    }

    if (progress.currentStreak !== undefined) {
      updateFields.push(`current_streak = $${paramIndex}`);
      params.push(progress.currentStreak);
      paramIndex++;
    }

    if (progress.longestStreak !== undefined) {
      updateFields.push(`longest_streak = $${paramIndex}`);
      params.push(progress.longestStreak);
      paramIndex++;
    }

    if (progress.lastActivityAt !== undefined) {
      updateFields.push(`last_activity_at = $${paramIndex}`);
      params.push(progress.lastActivityAt);
      paramIndex++;
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      params.push(id);

      const query = `
        UPDATE participations 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex}
      `;

      await this.db.query(query, params);
    }
  }

  async updateStatus(id: string, status: ParticipationStatus): Promise<void> {
    const completedAt = status === ParticipationStatus.COMPLETED ? new Date() : null;
    
    await this.db.query(`
      UPDATE participations 
      SET status = $1, completed_at = $2, updated_at = NOW()
      WHERE id = $3
    `, [status, completedAt, id]);
  }

  async delete(id: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get participation details for cleanup
      const participationResult = await client.query(`
        SELECT competition_id FROM participations WHERE id = $1
      `, [id]);

      if (participationResult.rows.length === 0) {
        throw new NotFoundError('Participation', id);
      }

      const competitionId = participationResult.rows[0].competition_id;

      // Delete participation
      await client.query(`DELETE FROM participations WHERE id = $1`, [id]);

      // Update competition participant count
      await client.query(`
        UPDATE competitions 
        SET participant_count = GREATEST(participant_count - 1, 0) 
        WHERE id = $1
      `, [competitionId]);

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete participation', { error, participationId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  private async loadExternalProfiles(participationId: string): Promise<ExternalProfile[]> {
    const result = await this.db.query(`
      SELECT * FROM external_profiles WHERE participation_id = $1 ORDER BY connected_at
    `, [participationId]);

    return result.rows.map(row => ({
      platform: row.platform,
      username: row.username,
      profileUrl: row.profile_url,
      verified: row.verified,
      connectedAt: row.connected_at,
      lastSyncAt: row.last_sync_at
    }));
  }

  private async loadAchievements(participationId: string): Promise<Achievement[]> {
    const result = await this.db.query(`
      SELECT a.*, array_agg(
        json_build_object(
          'type', e.type,
          'url', e.url,
          'title', e.title,
          'description', e.description,
          'metadata', e.metadata,
          'verifiedAt', e.verified_at,
          'verifiedBy', e.verified_by
        )
      ) FILTER (WHERE e.id IS NOT NULL) as evidence
      FROM achievements a
      LEFT JOIN evidence e ON a.id = e.achievement_id
      WHERE a.participation_id = $1
      GROUP BY a.id
      ORDER BY a.earned_at DESC
    `, [participationId]);

    return result.rows.map(row => ({
      id: row.id,
      competitionId: row.competition_id,
      requirementId: row.requirement_id,
      name: row.name,
      description: row.description,
      points: row.points,
      earnedAt: row.earned_at,
      evidence: row.evidence || [],
      verified: row.verified
    }));
  }

  private async loadSubmissions(participationId: string): Promise<Submission[]> {
    const result = await this.db.query(`
      SELECT s.*, 
        array_agg(
          json_build_object(
            'id', vr.id,
            'ruleId', vr.rule_id,
            'ruleName', vr.rule_name,
            'status', vr.status,
            'score', vr.score,
            'maxScore', vr.max_score,
            'message', vr.message,
            'details', vr.details,
            'validatedAt', vr.validated_at,
            'validatedBy', vr.validated_by
          )
        ) FILTER (WHERE vr.id IS NOT NULL) as validation_results,
        array_agg(
          json_build_object(
            'id', rc.id,
            'reviewerId', rc.reviewer_id,
            'comment', rc.comment,
            'type', rc.type,
            'createdAt', rc.created_at
          )
        ) FILTER (WHERE rc.id IS NOT NULL) as review_comments
      FROM submissions s
      LEFT JOIN validation_results vr ON s.id = vr.submission_id
      LEFT JOIN review_comments rc ON s.id = rc.submission_id
      WHERE s.participation_id = $1
      GROUP BY s.id
      ORDER BY s.submitted_at DESC
    `, [participationId]);

    return result.rows.map(row => ({
      id: row.id,
      participationId: row.participation_id,
      requirementId: row.requirement_id,
      type: row.type,
      title: row.title,
      description: row.description,
      url: row.url,
      repositoryUrl: row.repository_url,
      externalId: row.external_id,
      pullRequestNumber: row.pull_request_number,
      commitSha: row.commit_sha,
      status: row.status,
      validationResults: row.validation_results || [],
      reviewComments: row.review_comments || [],
      score: row.score,
      maxScore: row.max_score,
      tags: row.tags || [],
      metadata: row.metadata,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by
    }));
  }

  private async loadMilestones(participationId: string): Promise<Milestone[]> {
    const result = await this.db.query(`
      SELECT * FROM milestones WHERE participation_id = $1 ORDER BY created_at
    `, [participationId]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      criteria: row.criteria,
      points: row.points,
      achievedAt: row.achieved_at,
      progress: parseFloat(row.progress)
    }));
  }

  private mapRowToParticipation(
    row: any,
    externalProfiles: ExternalProfile[],
    achievements: Achievement[],
    submissions: Submission[],
    milestones: Milestone[]
  ): Participation {
    return {
      id: row.id,
      competitionId: row.competition_id,
      userId: row.user_id,
      status: row.status,
      registeredAt: row.registered_at,
      registrationData: row.registration_data,
      githubUsername: row.github_username,
      gitlabUsername: row.gitlab_username,
      externalProfiles,
      progress: {
        completedRequirements: [], // This would need to be calculated based on achievements
        totalRequirements: 0, // This would need to be fetched from competition
        completionPercentage: parseFloat(row.completion_percentage),
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        lastActivityAt: row.last_activity_at,
        milestones
      },
      achievements,
      submissions,
      validationResults: [], // Aggregated from submissions
      totalScore: row.total_score,
      rank: row.rank,
      notes: row.notes,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }
}