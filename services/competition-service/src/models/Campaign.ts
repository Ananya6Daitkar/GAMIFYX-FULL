import { Pool } from 'pg';
import { logger } from '@/telemetry/logger';
import { 
  Campaign, 
  CampaignStatus,
  NotificationSettings,
  CompetitionRequirement,
  CompetitionBadge,
  NotFoundError,
  ValidationError
} from '@/types/competition';

export class CampaignModel {
  constructor(private db: Pool) {}

  async create(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Insert main campaign record
      const campaignResult = await client.query(`
        INSERT INTO campaigns (
          name, description, status, instructor_id, class_id, course_id,
          start_date, end_date, registration_deadline, max_participants, bonus_points,
          participation_rate, completion_rate, average_score, notification_settings,
          announcement_channels, tags, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `, [
        campaign.name,
        campaign.description,
        campaign.status,
        campaign.instructorId,
        campaign.classId,
        campaign.courseId,
        campaign.startDate,
        campaign.endDate,
        campaign.registrationDeadline,
        campaign.maxParticipants,
        campaign.bonusPoints,
        campaign.participationRate,
        campaign.completionRate,
        campaign.averageScore,
        JSON.stringify(campaign.notificationSettings),
        campaign.announcementChannels,
        campaign.tags,
        campaign.notes
      ]);

      const campaignId = campaignResult.rows[0].id;

      // Insert competition associations
      for (const competitionId of campaign.competitionIds) {
        await client.query(`
          INSERT INTO campaign_competitions (campaign_id, competition_id)
          VALUES ($1, $2)
        `, [campaignId, competitionId]);
      }

      // Insert student invitations
      for (const studentId of campaign.invitedStudents) {
        await client.query(`
          INSERT INTO campaign_invitations (campaign_id, student_id, expires_at)
          VALUES ($1, $2, $3)
        `, [campaignId, studentId, campaign.registrationDeadline]);
      }

      // Insert participating students
      for (const studentId of campaign.participatingStudents) {
        await client.query(`
          INSERT INTO campaign_participations (campaign_id, student_id)
          VALUES ($1, $2)
        `, [campaignId, studentId]);
      }

      // Insert custom requirements
      for (const requirement of campaign.customRequirements) {
        await client.query(`
          INSERT INTO campaign_requirements (
            campaign_id, type, description, criteria, points, required, validation_script
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          campaignId,
          requirement.type,
          requirement.description,
          JSON.stringify(requirement.criteria),
          requirement.points,
          requirement.required,
          requirement.validationScript
        ]);
      }

      // Insert custom badges
      for (const badge of campaign.customBadges) {
        await client.query(`
          INSERT INTO campaign_badges (
            campaign_id, name, description, image_url, rarity, criteria, points
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          campaignId,
          badge.name,
          badge.description,
          badge.imageUrl,
          badge.rarity,
          badge.criteria,
          badge.points
        ]);
      }

      await client.query('COMMIT');

      // Return the created campaign
      return await this.findById(campaignId);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create campaign', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Campaign> {
    const result = await this.db.query(`
      SELECT * FROM campaigns WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Campaign', id);
    }

    const campaignRow = result.rows[0];

    // Load related data
    const [competitionIds, invitedStudents, participatingStudents, customRequirements, customBadges] = await Promise.all([
      this.loadCompetitionIds(id),
      this.loadInvitedStudents(id),
      this.loadParticipatingStudents(id),
      this.loadCustomRequirements(id),
      this.loadCustomBadges(id)
    ]);

    return this.mapRowToCampaign(campaignRow, competitionIds, invitedStudents, participatingStudents, customRequirements, customBadges);
  }

  async findByInstructor(instructorId: string, filters?: {
    status?: CampaignStatus;
    classId?: string;
    courseId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Campaign[]> {
    let query = 'SELECT * FROM campaigns WHERE instructor_id = $1';
    const params: any[] = [instructorId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.classId) {
      query += ` AND class_id = $${paramIndex}`;
      params.push(filters.classId);
      paramIndex++;
    }

    if (filters?.courseId) {
      query += ` AND course_id = $${paramIndex}`;
      params.push(filters.courseId);
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

    // Load related data for all campaigns
    const campaigns = await Promise.all(
      result.rows.map(async (row) => {
        const [competitionIds, invitedStudents, participatingStudents, customRequirements, customBadges] = await Promise.all([
          this.loadCompetitionIds(row.id),
          this.loadInvitedStudents(row.id),
          this.loadParticipatingStudents(row.id),
          this.loadCustomRequirements(row.id),
          this.loadCustomBadges(row.id)
        ]);

        return this.mapRowToCampaign(row, competitionIds, invitedStudents, participatingStudents, customRequirements, customBadges);
      })
    );

    return campaigns;
  }

  async findByStudent(studentId: string, filters?: {
    status?: CampaignStatus;
    participationStatus?: 'invited' | 'participating';
    limit?: number;
    offset?: number;
  }): Promise<Campaign[]> {
    let query = `
      SELECT DISTINCT c.* FROM campaigns c
      LEFT JOIN campaign_invitations ci ON c.id = ci.campaign_id
      LEFT JOIN campaign_participations cp ON c.id = cp.campaign_id
      WHERE (ci.student_id = $1 OR cp.student_id = $1)
    `;
    const params: any[] = [studentId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.participationStatus === 'invited') {
      query += ` AND ci.student_id = $1 AND ci.status = 'invited'`;
    } else if (filters?.participationStatus === 'participating') {
      query += ` AND cp.student_id = $1 AND cp.status = 'active'`;
    }

    query += ' ORDER BY c.created_at DESC';

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

    // Load related data for all campaigns
    const campaigns = await Promise.all(
      result.rows.map(async (row) => {
        const [competitionIds, invitedStudents, participatingStudents, customRequirements, customBadges] = await Promise.all([
          this.loadCompetitionIds(row.id),
          this.loadInvitedStudents(row.id),
          this.loadParticipatingStudents(row.id),
          this.loadCustomRequirements(row.id),
          this.loadCustomBadges(row.id)
        ]);

        return this.mapRowToCampaign(row, competitionIds, invitedStudents, participatingStudents, customRequirements, customBadges);
      })
    );

    return campaigns;
  }

  async update(id: string, updates: Partial<Campaign>): Promise<Campaign> {
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

      if (updates.participationRate !== undefined) {
        updateFields.push(`participation_rate = $${paramIndex}`);
        params.push(updates.participationRate);
        paramIndex++;
      }

      if (updates.completionRate !== undefined) {
        updateFields.push(`completion_rate = $${paramIndex}`);
        params.push(updates.completionRate);
        paramIndex++;
      }

      if (updates.averageScore !== undefined) {
        updateFields.push(`average_score = $${paramIndex}`);
        params.push(updates.averageScore);
        paramIndex++;
      }

      if (updates.notificationSettings !== undefined) {
        updateFields.push(`notification_settings = $${paramIndex}`);
        params.push(JSON.stringify(updates.notificationSettings));
        paramIndex++;
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        params.push(id);

        const query = `
          UPDATE campaigns 
          SET ${updateFields.join(', ')} 
          WHERE id = $${paramIndex}
        `;

        await client.query(query, params);
      }

      await client.query('COMMIT');

      return await this.findById(id);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update campaign', { error, campaignId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async addStudent(campaignId: string, studentId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if student is already participating
      const existingResult = await client.query(`
        SELECT id FROM campaign_participations WHERE campaign_id = $1 AND student_id = $2
      `, [campaignId, studentId]);

      if (existingResult.rows.length > 0) {
        throw new ValidationError('Student is already participating in this campaign');
      }

      // Add student participation
      await client.query(`
        INSERT INTO campaign_participations (campaign_id, student_id)
        VALUES ($1, $2)
      `, [campaignId, studentId]);

      // Update invitation status if exists
      await client.query(`
        UPDATE campaign_invitations 
        SET status = 'accepted', responded_at = NOW()
        WHERE campaign_id = $1 AND student_id = $2
      `, [campaignId, studentId]);

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to add student to campaign', { error, campaignId, studentId });
      throw error;
    } finally {
      client.release();
    }
  }

  async removeStudent(campaignId: string, studentId: string): Promise<void> {
    const result = await this.db.query(`
      UPDATE campaign_participations 
      SET status = 'removed'
      WHERE campaign_id = $1 AND student_id = $2
    `, [campaignId, studentId]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Campaign participation', `${campaignId}-${studentId}`);
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.db.query(`
      DELETE FROM campaigns WHERE id = $1
    `, [id]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Campaign', id);
    }
  }

  private async loadCompetitionIds(campaignId: string): Promise<string[]> {
    const result = await this.db.query(`
      SELECT competition_id FROM campaign_competitions WHERE campaign_id = $1 ORDER BY added_at
    `, [campaignId]);

    return result.rows.map(row => row.competition_id);
  }

  private async loadInvitedStudents(campaignId: string): Promise<string[]> {
    const result = await this.db.query(`
      SELECT student_id FROM campaign_invitations WHERE campaign_id = $1 ORDER BY invited_at
    `, [campaignId]);

    return result.rows.map(row => row.student_id);
  }

  private async loadParticipatingStudents(campaignId: string): Promise<string[]> {
    const result = await this.db.query(`
      SELECT student_id FROM campaign_participations WHERE campaign_id = $1 AND status = 'active' ORDER BY joined_at
    `, [campaignId]);

    return result.rows.map(row => row.student_id);
  }

  private async loadCustomRequirements(campaignId: string): Promise<CompetitionRequirement[]> {
    const result = await this.db.query(`
      SELECT * FROM campaign_requirements WHERE campaign_id = $1 ORDER BY created_at
    `, [campaignId]);

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

  private async loadCustomBadges(campaignId: string): Promise<CompetitionBadge[]> {
    const result = await this.db.query(`
      SELECT * FROM campaign_badges WHERE campaign_id = $1 ORDER BY created_at
    `, [campaignId]);

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

  private mapRowToCampaign(
    row: any,
    competitionIds: string[],
    invitedStudents: string[],
    participatingStudents: string[],
    customRequirements: CompetitionRequirement[],
    customBadges: CompetitionBadge[]
  ): Campaign {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      instructorId: row.instructor_id,
      classId: row.class_id,
      courseId: row.course_id,
      competitionIds,
      invitedStudents,
      participatingStudents,
      maxParticipants: row.max_participants,
      startDate: row.start_date,
      endDate: row.end_date,
      registrationDeadline: row.registration_deadline,
      customRequirements,
      bonusPoints: row.bonus_points,
      customBadges,
      participationRate: parseFloat(row.participation_rate),
      completionRate: parseFloat(row.completion_rate),
      averageScore: parseFloat(row.average_score),
      notificationSettings: row.notification_settings,
      announcementChannels: row.announcement_channels || [],
      tags: row.tags || [],
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }
}