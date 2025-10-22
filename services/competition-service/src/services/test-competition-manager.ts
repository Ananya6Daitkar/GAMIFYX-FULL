#!/usr/bin/env ts-node

/**
 * Integration test script for CompetitionManager
 * Tests the complete competition lifecycle with real database operations
 */

import { CompetitionManager } from './CompetitionManager';
import { testConnection } from '@/database/connection';
import { migrator } from '@/database/migrator';
import { logger } from '@/telemetry/logger';
import { 
  CompetitionType, 
  CompetitionStatus,
  CreateCompetitionRequest 
} from '@/types/competition';

async function testCompetitionManager() {
  try {
    logger.info('Starting CompetitionManager integration tests...');

    // Test database connection
    logger.info('Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    logger.info('✓ Database connection successful');

    // Run migrations
    logger.info('Running database migrations...');
    await migrator.migrate();
    logger.info('✓ Database migrations completed');

    // Initialize CompetitionManager
    logger.info('Initializing CompetitionManager...');
    const competitionManager = new CompetitionManager();
    await competitionManager.initialize();
    logger.info('✓ CompetitionManager initialized');

    // Test health check
    logger.info('Testing health check...');
    const health = await competitionManager.healthCheck();
    logger.info('✓ Health check passed', { health });

    // Test metrics
    logger.info('Testing metrics...');
    const metrics = competitionManager.getMetrics();
    logger.info('✓ Metrics retrieved', { metrics });

    // Test competition creation
    logger.info('Testing competition creation...');
    const testCompetitionRequest: CreateCompetitionRequest = {
      name: 'Test Integration Competition',
      description: 'A test competition for integration testing',
      type: CompetitionType.CUSTOM_COMPETITION,
      startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 7 * 86400000).toISOString(), // Next week
      requirements: [
        {
          type: 'pull_request',
          description: 'Submit a test pull request',
          criteria: { minPRs: 1 },
          points: 50,
          required: true
        }
      ],
      rewards: [
        {
          name: 'Test Badge',
          description: 'Badge for completing test',
          type: 'badge',
          criteria: 'Complete requirements'
        }
      ],
      validationRules: [
        {
          name: 'Test Validation',
          description: 'Test validation rule',
          type: 'custom',
          script: 'testValidation',
          parameters: { test: true },
          weight: 1
        }
      ],
      tags: ['test', 'integration'],
      categories: ['Testing'],
      difficultyLevel: 'beginner'
    };

    const createdCompetition = await competitionManager.createCompetition(
      testCompetitionRequest, 
      'test-user'
    );
    logger.info('✓ Competition created', { 
      competitionId: createdCompetition.id,
      name: createdCompetition.name
    });

    // Test getting competition
    logger.info('Testing competition retrieval...');
    const retrievedCompetition = await competitionManager.getCompetition(createdCompetition.id);
    if (!retrievedCompetition) {
      throw new Error('Failed to retrieve created competition');
    }
    logger.info('✓ Competition retrieved', { name: retrievedCompetition.name });

    // Test getting all competitions
    logger.info('Testing competition listing...');
    const allCompetitions = await competitionManager.getAllCompetitions();
    logger.info('✓ Competitions listed', { count: allCompetitions.length });

    // Test filtering competitions
    logger.info('Testing competition filtering...');
    const customCompetitions = await competitionManager.getCompetitionsByType(
      CompetitionType.CUSTOM_COMPETITION
    );
    logger.info('✓ Competitions filtered', { count: customCompetitions.length });

    // Test student registration
    logger.info('Testing student registration...');
    await competitionManager.registerStudent(createdCompetition.id, 'test-student-1', {
      githubUsername: 'teststudent1',
      additionalData: { source: 'integration-test' }
    });
    logger.info('✓ Student registered');

    // Test duplicate registration prevention
    logger.info('Testing duplicate registration prevention...');
    try {
      await competitionManager.registerStudent(createdCompetition.id, 'test-student-1');
      throw new Error('Should have prevented duplicate registration');
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        logger.info('✓ Duplicate registration prevented');
      } else {
        throw error;
      }
    }

    // Test competition statistics
    logger.info('Testing competition statistics...');
    const stats = await competitionManager.getCompetitionStats(createdCompetition.id);
    logger.info('✓ Competition statistics retrieved', { stats });

    // Test competition update
    logger.info('Testing competition update...');
    const updatedCompetition = await competitionManager.updateCompetition(
      createdCompetition.id,
      {
        name: 'Updated Test Competition',
        tags: ['test', 'integration', 'updated']
      }
    );
    logger.info('✓ Competition updated', { name: updatedCompetition.name });

    // Test starting competition (change start date to now)
    logger.info('Testing competition start...');
    await competitionManager.updateCompetition(createdCompetition.id, {
      status: CompetitionStatus.UPCOMING // Ensure it's in correct state
    });
    
    // Update start date to now to allow starting
    const competitionToStart = await competitionManager.updateCompetition(
      createdCompetition.id,
      { startDate: new Date() }
    );
    
    const startedCompetition = await competitionManager.startCompetition(createdCompetition.id);
    logger.info('✓ Competition started', { status: startedCompetition.status });

    // Test student unregistration
    logger.info('Testing student unregistration...');
    await competitionManager.unregisterStudent(createdCompetition.id, 'test-student-1');
    logger.info('✓ Student unregistered');

    // Test competition completion
    logger.info('Testing competition completion...');
    const completedCompetition = await competitionManager.completeCompetition(createdCompetition.id);
    logger.info('✓ Competition completed', { status: completedCompetition.status });

    // Test competition deletion
    logger.info('Testing competition deletion...');
    await competitionManager.deleteCompetition(createdCompetition.id);
    logger.info('✓ Competition deleted');

    // Verify deletion
    const deletedCompetition = await competitionManager.getCompetition(createdCompetition.id);
    if (deletedCompetition) {
      throw new Error('Competition should have been deleted');
    }
    logger.info('✓ Competition deletion verified');

    // Final health check
    logger.info('Final health check...');
    const finalHealth = await competitionManager.healthCheck();
    logger.info('✓ Final health check passed', { health: finalHealth });

    logger.info('🎉 All CompetitionManager integration tests passed successfully!');

  } catch (error) {
    logger.error('CompetitionManager integration test failed', { error });
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCompetitionManager()
    .then(() => {
      logger.info('CompetitionManager integration tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('CompetitionManager integration tests failed', { error });
      process.exit(1);
    });
}

export { testCompetitionManager };