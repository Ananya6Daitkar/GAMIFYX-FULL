import { Pool } from 'pg';
import { logger } from '@/telemetry/logger';
import { 
  Competition, 
  CompetitionType, 
  CompetitionStatus,
  CompetitionRequirement,
  CompetitionReward,
  CompetitionBadge,
  ValidationRule,
  CreateCompetitionRequest,
  UpdateCompetitionRequest,
  NotFoundError,
  ValidationError
} from '@/types/competition';

export class CompetitionModel {
  constructor(private db: Pool) {}

  async create(competition: Omit<Competition, 'id' | 'createdAt' | 'updatedAt'>): Promise<Competition> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Insert main competition record
      const competitionResult = await client.query(`
        INSERT INTO competitions (
          name, description, type, status, organizer, website, logo_url, banner_url,
          start_date, end_date, registration_deadline, external_id, api_endpoint, webhook_url,
          auto_validation, difficulty_level, max_participants, participant_count,
          tags, categories, rules, eligibility_criteria, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `, [
        competition.name,
        competition.description,
        competition.type,
        competition.status,
        competition.organizer,
        competition.website,
        competition.logoUrl,
        competition.bannerUrl,
        competition.startDate,
        competition.endDate,
        competition.registrationDeadline,
        competition.externalId,
        competition.apiEndpoint,
        competition.webhookUrl,
        competition.autoValidation,
        competition.difficultyLevel,
        competition.maxParticipants,
        competition.participantCount,
        competition.tags,
        competition.categories,
        competition.rules,
        competition.eligibilityCriteria,
        competition.createdBy
      ]);

      const competitionId = competitionResult.rows[0].id;

      // Insert requirements
      for (const requirement of competition.requirements) {
        await client.query(`
          INSERT INTO competition_requirements (
            competition_id, type, description, criteria, points, required, validation_script
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          competitionId,
          requirement.type,
          requirement.description,
          JSON.stringify(requirement.criteria),
          requirement.points,
          requirement.required,
          requirement.validationScript
        ]);
      }

      // Insert rewards
      for (const reward of competition.rewards) {
        await client.query(`
          INSERT INTO competition_rewards (
            competition_id, name, description, type, criteria, value, image_url, external_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          competitionId,
          reward.name,
          reward.description,
          reward.type,
          reward.criteria,
          reward.value,
          reward.imageUrl,
          reward.externalUrl
        ]);
      }

      // Insert badges
      for (const badge of competition.badges) {
        await client.query(`
          INSERT INTO competition_badges (
            competition_id, name, description, image_url, rarity, criteria, points
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          competitionId,
          badge.name,
          badge.description,
          badge.imageUrl,
          badge.rarity,
          badge.criteria,
          badge.points
        ]);
      }

      // Insert validation rules
      for (const rule of competition.validationRules) {
        await client.query(`
          INSERT INTO validation_rules (
            competition_id, name, description, type, script, parameters, weight
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          competitionId,
          rule.name,
          rule.description,
          rule.type,
          rule.script,
          JSON.stringify(rule.parameters),
          rule.weight
        ]);
      }

      await client.query('COMMIT');

      // Return the created competition
      return await this.findById(competitionId);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create competition', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Competition> {
    const result = await this.db.query(`
      SELECT * FROM competitions WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Competition', id);
    }

    const competitionRow = result.rows[0];

    // Load related data
    const [requirements, rewards, badges, validationRules] = await Promise.all([
      this.loadRequirements(id),
      this.loadRewards(id),
      this.loadBadges(id),
      this.loadValidationRules(id)
    ]);

    return this.mapRowToCompetition(competitionRow, requirements, rewards, badges, validationRules);
  }

  async findAll(filters?: {
    type?: CompetitionType;
    status?: CompetitionStatus;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Competition[]> {
    let query = 'SELECT * FROM competitions WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.type) {
      query += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.tags && filters.tags.length > 0) {
      query += ` AND tags && $${paramIndex}`;
      params.push(filters.tags);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

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

    // Load related data for all competitions
    const competitions = await Promise.all(
      result.rows.map(async (row) => {
        const [requirements, rewards, badges, validationRules] = await Promise.all([
          this.loadRequirements(row.id),
          this.loadRewards(row.id),
          this.loadBadges(row.id),
          this.loadValidationRules(row.id)
        ]);

        return this.mapRowToCompetition(row, requirements, rewards, badges, validationRules);
      })
    );

    return competitions;
  }

  async update(id: string, updates: Partial<Competition>): Promise<Competition> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        params.push(updates.name);
        paramIndex++;
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        params.push(updates.description);
        paramIndex++;
      }

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        params.push(updates.status);
        paramIndex++;
      }

      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex}`);
        params.push(updates.tags);
        paramIndex++;
      }

      if (updates.maxParticipants !== undefined) {
        updateFields.push(`max_participants = $${paramIndex}`);
        params.push(updates.maxParticipants);
        paramIndex++;
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        params.push(id);

        const query = `
          UPDATE competitions 
          SET ${updateFields.join(', ')} 
          WHERE id = $${paramIndex}
        `;

        await client.query(query, params);
      }

      await client.query('COMMIT');

      return await this.findById(id);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update competition', { error, competitionId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.db.query(`
      DELETE FROM competitions WHERE id = $1
    `, [id]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Competition', id);
    }
  }

  async incrementParticipantCount(id: string): Promise<void> {
    await this.db.query(`
      UPDATE competitions 
      SET participant_count = participant_count + 1, updated_at = NOW()
      WHERE id = $1
    `, [id]);
  }

  async decrementParticipantCount(id: string): Promise<void> {
    await this.db.query(`
      UPDATE competitions 
      SET participant_count = GREATEST(participant_count - 1, 0), updated_at = NOW()
      WHERE id = $1
    `, [id]);
  }

  private async loadRequirements(competitionId: string): Promise<CompetitionRequirement[]> {
    const result = await this.db.query(`
      SELECT * FROM competition_requirements WHERE competition_id = $1 ORDER BY created_at
    `, [competitionId]);

    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      description: row.description,
      criteria: row.criteria,
      points: row.points,
      required: row.required,
      validationScript: row.validation_script
    }));
  }

  private async loadRewards(competitionId: string): Promise<CompetitionReward[]> {
    const result = await this.db.query(`
      SELECT * FROM competition_rewards WHERE competition_id = $1 ORDER BY created_at
    `, [competitionId]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      criteria: row.criteria,
      value: row.value,
      imageUrl: row.image_url,
      externalUrl: row.external_url
    }));
  }

  private async loadBadges(competitionId: string): Promise<CompetitionBadge[]> {
    const result = await this.db.query(`
      SELECT * FROM competition_badges WHERE competition_id = $1 ORDER BY created_at
    `, [competitionId]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      rarity: row.rarity,
      criteria: row.criteria,
      points: row.points
    }));
  }

  private async loadValidationRules(competitionId: string): Promise<ValidationRule[]> {
    const result = await this.db.query(`
      SELECT * FROM validation_rules WHERE competition_id = $1 ORDER BY created_at
    `, [competitionId]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      script: row.script,
      parameters: row.parameters,
      weight: parseFloat(row.weight)
    }));
  }

  private mapRowToCompetition(
    row: any,
    requirements: CompetitionRequirement[],
    rewards: CompetitionReward[],
    badges: CompetitionBadge[],
    validationRules: ValidationRule[]
  ): Competition {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      status: row.status,
      organizer: row.organizer,
      website: row.website,
      logoUrl: row.logo_url,
      bannerUrl: row.banner_url,
      startDate: row.start_date,
      endDate: row.end_date,
      registrationDeadline: row.registration_deadline,
      requirements,
      rewards,
      badges,
      externalId: row.external_id,
      apiEndpoint: row.api_endpoint,
      webhookUrl: row.webhook_url,
      validationRules,
      autoValidation: row.auto_validation,
      tags: row.tags || [],
      categories: row.categories || [],
      difficultyLevel: row.difficulty_level,
      participantCount: row.participant_count,
      maxParticipants: row.max_participants,
      rules: row.rules || [],
      eligibilityCriteria: row.eligibility_criteria || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }
}