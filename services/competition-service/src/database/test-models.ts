#!/usr/bin/env ts-node

/**
 * Test script for validating database models and CRUD operations
 * Run with: npm run test:models
 */

import { testConnection } from './connection';
import { repository } from './repositories';
import { migrator } from './migrator';
import { logger } from '@/telemetry/logger';
import { 
  CompetitionType, 
  CompetitionStatus, 
  ParticipationStatus,
  CampaignStatus 
} from '@/types/competition';

async function testDatabaseModels() {
  try {
    logger.info('Starting database model tests...');

    // Test database connection
    logger.info('Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    logger.info('✓ Database connection successful');

    // Check migration status
    logger.info('Checking migration status...');
    const migrationStatus = await migrator.status();
    logger.info(`✓ Migrations - Applied: ${migrationStatus.applied.length}, Pending: ${migrationStatus.pending.length}`);

    // Test Competition model
    logger.info('Testing Competition model...');
    const testCompetition = {
      name: 'Test Hacktoberfest 2024',
      description: 'A test competition for validating the database models',
      type: CompetitionType.HACKTOBERFEST,
      status: CompetitionStatus.UPCOMING,
      organizer: 'Test Organization',
      website: 'https://hacktoberfest.com',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-31'),
      registrationDeadline: new Date('2024-09-30'),
      requirements: [
        {
          id: 'req-1',
          type: 'pull_request' as const,
          description: 'Submit 4 quality pull requests',
          criteria: { minPRs: 4, quality: 'high' },
          points: 100,
          required: true
        }
      ],
      rewards: [
        {
          id: 'reward-1',
          name: 'Hacktoberfest T-Shirt',
          description: 'Official Hacktoberfest t-shirt',
          type: 'swag' as const,
          criteria: 'Complete 4 PRs',
          imageUrl: 'https://example.com/tshirt.png'
        }
      ],
      badges: [
        {
          id: 'badge-1',
          name: 'Hacktoberfest Participant',
          description: 'Participated in Hacktoberfest',
          imageUrl: 'https://example.com/badge.png',
          rarity: 'common' as const,
          criteria: 'Register for competition',
          points: 10
        }
      ],
      externalId: 'hacktoberfest-2024',
      validationRules: [
        {
          id: 'rule-1',
          name: 'PR Quality Check',
          description: 'Validate PR quality',
          type: 'github_pr' as const,
          script: 'validate_pr_quality',
          parameters: { minLines: 10 },
          weight: 1.0
        }
      ],
      autoValidation: true,
      tags: ['hacktoberfest', 'open-source'],
      categories: ['programming', 'community'],
      difficultyLevel: 'intermediate' as const,
      participantCount: 0,
      maxParticipants: 1000,
      rules: ['Be respectful', 'Follow guidelines'],
      eligibilityCriteria: ['GitHub account required'],
      createdBy: 'test-user-id'
    };

    const createdCompetition = await repository.competitions.create(testCompetition);
    logger.info(`✓ Competition created with ID: ${createdCompetition.id}`);

    // Test finding competition
    const foundCompetition = await repository.competitions.findById(createdCompetition.id);
    logger.info(`✓ Competition found: ${foundCompetition.name}`);

    // Test Participation model
    logger.info('Testing Participation model...');
    const testParticipation = {
      competitionId: createdCompetition.id,
      userId: 'test-user-123',
      status: ParticipationStatus.REGISTERED,
      registeredAt: new Date(),
      registrationData: { source: 'web', referrer: 'direct' },
      githubUsername: 'testuser',
      externalProfiles: [
        {
          platform: 'github' as const,
          username: 'testuser',
          profileUrl: 'https://github.com/testuser',
          verified: true,
          connectedAt: new Date()
        }
      ],
      progress: {
        completedRequirements: [],
        totalRequirements: 1,
        completionPercentage: 0,
        currentStreak: 0,
        longestStreak: 0,
        milestones: []
      },
      achievements: [],
      submissions: [],
      validationResults: [],
      totalScore: 0,
      tags: ['new-participant']
    };

    const createdParticipation = await repository.participations.create(testParticipation);
    logger.info(`✓ Participation created with ID: ${createdParticipation.id}`);

    // Test Campaign model
    logger.info('Testing Campaign model...');
    const testCampaign = {
      name: 'CS101 Hacktoberfest Campaign',
      description: 'Class campaign for CS101 students',
      status: CampaignStatus.DRAFT,
      instructorId: 'instructor-123',
      classId: 'cs101-fall-2024',
      competitionIds: [createdCompetition.id],
      invitedStudents: ['student-1', 'student-2'],
      participatingStudents: [],
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-31'),
      registrationDeadline: new Date('2024-09-30'),
      customRequirements: [],
      bonusPoints: 50,
      customBadges: [],
      participationRate: 0,
      completionRate: 0,
      averageScore: 0,
      notificationSettings: {
        enableEmailNotifications: true,
        enableSlackNotifications: false,
        enableInAppNotifications: true,
        reminderFrequency: 'weekly' as const,
        notificationTypes: []
      },
      announcementChannels: ['email', 'slack'],
      tags: ['cs101', 'fall-2024']
    };

    const createdCampaign = await repository.campaigns.create(testCampaign);
    logger.info(`✓ Campaign created with ID: ${createdCampaign.id}`);

    // Test updates
    logger.info('Testing model updates...');
    
    await repository.competitions.update(createdCompetition.id, {
      status: CompetitionStatus.ACTIVE,
      participantCount: 1
    });
    logger.info('✓ Competition updated');

    await repository.participations.updateProgress(createdParticipation.id, {
      totalScore: 25,
      completionPercentage: 25,
      currentStreak: 1
    });
    logger.info('✓ Participation progress updated');

    await repository.campaigns.update(createdCampaign.id, {
      status: CampaignStatus.ACTIVE,
      participationRate: 100
    });
    logger.info('✓ Campaign updated');

    // Test queries
    logger.info('Testing model queries...');
    
    const competitions = await repository.competitions.findAll({
      type: CompetitionType.HACKTOBERFEST,
      limit: 10
    });
    logger.info(`✓ Found ${competitions.length} competitions`);

    const userParticipations = await repository.participations.findByUser('test-user-123');
    logger.info(`✓ Found ${userParticipations.length} participations for user`);

    const instructorCampaigns = await repository.campaigns.findByInstructor('instructor-123');
    logger.info(`✓ Found ${instructorCampaigns.length} campaigns for instructor`);

    // Cleanup test data
    logger.info('Cleaning up test data...');
    await repository.participations.delete(createdParticipation.id);
    await repository.campaigns.delete(createdCampaign.id);
    await repository.competitions.delete(createdCompetition.id);
    logger.info('✓ Test data cleaned up');

    logger.info('🎉 All database model tests passed successfully!');

  } catch (error) {
    logger.error('Database model test failed', { error });
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDatabaseModels()
    .then(() => {
      logger.info('Database model tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database model tests failed', { error });
      process.exit(1);
    });
}

export { testDatabaseModels };