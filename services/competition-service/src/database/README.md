# Competition Service Database

This directory contains the database layer for the Competition Service, including models, migrations, and connection management.

## Overview

The database layer implements a repository pattern with the following components:

- **Connection Management**: PostgreSQL connection pooling and configuration
- **Models**: TypeScript models for Competition, Participation, and Campaign entities
- **Migrations**: SQL migration scripts for database schema management
- **Repositories**: Unified CRUD operations and transaction management

## Database Schema

### Core Tables

1. **competitions** - External competitions (Hacktoberfest, GitHub Game Off, etc.)
2. **participations** - Student participation in competitions
3. **campaigns** - Instructor-led competition campaigns for classes
4. **competition_requirements** - Requirements for each competition
5. **competition_rewards** - Rewards and recognition for competitions
6. **competition_badges** - Badges that can be earned
7. **validation_rules** - Rules for validating submissions
8. **achievements** - Student achievements in competitions
9. **submissions** - Student submissions for competition requirements
10. **external_profiles** - Student profiles on external platforms (GitHub, GitLab)

### Supporting Tables

- **evidence** - Evidence for achievements
- **validation_results** - Results of validation rule execution
- **review_comments** - Manual review comments on submissions
- **milestones** - Progress milestones for participations
- **campaign_competitions** - Many-to-many relationship between campaigns and competitions
- **campaign_invitations** - Student invitations to campaigns
- **campaign_participations** - Student participation in campaigns
- **campaign_requirements** - Custom requirements for campaigns
- **campaign_badges** - Custom badges for campaigns
- **campaign_notifications** - Notification management for campaigns
- **campaign_analytics** - Cached analytics data for campaigns

## Usage

### Database Connection

```typescript
import { testConnection, closeConnection } from '@/database/connection';
import { repository } from '@/database/repositories';

// Test connection
const connected = await testConnection();

// Use repository
const competitions = await repository.competitions.findAll();

// Close connection
await closeConnection();
```

### Models

```typescript
import { repository } from '@/database/repositories';

// Create a competition
const competition = await repository.competitions.create({
  name: 'Hacktoberfest 2024',
  description: 'Annual open source contribution event',
  type: CompetitionType.HACKTOBERFEST,
  // ... other fields
});

// Create a participation
const participation = await repository.participations.create({
  competitionId: competition.id,
  userId: 'user-123',
  status: ParticipationStatus.REGISTERED,
  // ... other fields
});

// Create a campaign
const campaign = await repository.campaigns.create({
  name: 'CS101 Hacktoberfest Campaign',
  instructorId: 'instructor-123',
  competitionIds: [competition.id],
  // ... other fields
});
```

### Migrations

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration (limited support)
npm run migrate:rollback
```

### Testing

```bash
# Test database models and CRUD operations
npm run test:models
```

## Environment Variables

Required environment variables for database connection:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=competition_service
DB_USER=postgres
DB_PASSWORD=password
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

## Migration Files

Migration files are located in `src/database/migrations/` and follow the naming convention:
`{number}_{description}.sql`

Example: `001_create_competitions_table.sql`

### Current Migrations

1. **001_create_competitions_table.sql** - Creates competitions and related tables
2. **002_create_participations_table.sql** - Creates participations and related tables  
3. **003_create_campaigns_table.sql** - Creates campaigns and related tables

## Data Models

### Competition

Represents external competitions like Hacktoberfest, GitHub Game Off, etc.

**Key Features:**
- Multiple competition types (Hacktoberfest, GitHub Game Off, GitLab Hackathon, Custom)
- Flexible requirements system with validation rules
- Reward and badge system
- External API integration support
- Automatic validation capabilities

### Participation

Represents a student's participation in a competition.

**Key Features:**
- Progress tracking with completion percentage and streaks
- Achievement system with evidence collection
- Submission management with validation results
- External profile connections (GitHub, GitLab)
- Milestone tracking

### Campaign

Represents instructor-led competition campaigns for classes.

**Key Features:**
- Multi-competition support
- Student invitation and participation management
- Custom requirements and badges
- Notification system integration
- Analytics and progress tracking

## Repository Pattern

The repository pattern provides a unified interface for database operations:

```typescript
// Transaction support
await repository.transaction(async (client) => {
  const competition = await repository.competitions.create(competitionData);
  const campaign = await repository.campaigns.create({
    ...campaignData,
    competitionIds: [competition.id]
  });
  return { competition, campaign };
});

// Health checks
const health = await repository.healthCheck();

// Statistics
const stats = await repository.getStats();
```

## Error Handling

The database layer includes comprehensive error handling:

- **NotFoundError** - When entities are not found
- **ValidationError** - When data validation fails
- **Database connection errors** - Connection and query failures
- **Transaction rollback** - Automatic rollback on errors

## Performance Considerations

- Connection pooling with configurable pool size
- Indexed columns for common queries
- Efficient JOIN operations for related data loading
- Prepared statements for security and performance
- Transaction management for data consistency

## Security

- Parameterized queries to prevent SQL injection
- Connection encryption support
- Role-based access control ready
- Audit trail with created_at/updated_at timestamps
- Input validation at model level