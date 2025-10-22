# Competition Service - Service Layer

This directory contains the core business logic services for the Competition Service, implementing competition lifecycle management, external API integration, and real-time monitoring.

## Services Overview

### CompetitionManager

The `CompetitionManager` is the core service responsible for managing competition lifecycle, student registration, and competition operations.

#### Key Features

- **Competition Lifecycle Management**: Automatic status transitions from upcoming → active → completed
- **Student Registration**: Registration and unregistration with validation
- **Competition CRUD Operations**: Create, read, update, delete competitions
- **Statistics and Analytics**: Real-time competition metrics and participant statistics
- **Validation and Business Rules**: Comprehensive validation for all operations
- **Caching**: In-memory caching for performance optimization
- **Health Monitoring**: Service health checks and metrics

#### Usage Examples

```typescript
import { CompetitionManager } from '@/services/CompetitionManager';

// Initialize the service
const competitionManager = new CompetitionManager();
await competitionManager.initialize();

// Create a new competition
const competition = await competitionManager.createCompetition({
  name: 'Hacktoberfest 2024',
  description: 'Annual open source contribution event',
  type: CompetitionType.HACKTOBERFEST,
  startDate: '2024-10-01T00:00:00Z',
  endDate: '2024-10-31T23:59:59Z',
  requirements: [
    {
      type: 'pull_request',
      description: 'Submit 4 quality pull requests',
      criteria: { minPRs: 4 },
      points: 100,
      required: true
    }
  ],
  rewards: [
    {
      name: 'Hacktoberfest Badge',
      description: 'Completion badge',
      type: 'badge',
      criteria: 'Complete all requirements'
    }
  ],
  validationRules: [
    {
      name: 'PR Quality Check',
      description: 'Validate PR quality',
      type: 'github_pr',
      script: 'validatePR',
      parameters: { minLines: 10 },
      weight: 1
    }
  ]
}, 'instructor-id');

// Register a student
await competitionManager.registerStudent(competition.id, 'student-id', {
  githubUsername: 'student-github',
  additionalData: { source: 'class-invitation' }
});

// Get competition statistics
const stats = await competitionManager.getCompetitionStats(competition.id);
console.log(`Total participants: ${stats.totalParticipants}`);
console.log(`Average progress: ${stats.averageProgress}%`);

// Start competition (when start date is reached)
await competitionManager.startCompetition(competition.id);

// Complete competition (when end date is reached)
await competitionManager.completeCompetition(competition.id);
```

#### API Methods

##### Competition Management

- `createCompetition(request, createdBy)` - Create a new competition
- `getCompetition(id)` - Get competition by ID
- `getAllCompetitions(filters?)` - Get all competitions with optional filtering
- `updateCompetition(id, updates)` - Update competition details
- `deleteCompetition(id)` - Delete competition (with validation)
- `getActiveCompetitions()` - Get all active competitions
- `getCompetitionsByType(type)` - Get competitions by type

##### Student Management

- `registerStudent(competitionId, userId, data?)` - Register student for competition
- `unregisterStudent(competitionId, userId)` - Unregister student from competition

##### Competition Lifecycle

- `startCompetition(competitionId)` - Start a competition
- `completeCompetition(competitionId)` - Complete a competition

##### Analytics and Monitoring

- `getCompetitionStats(competitionId)` - Get detailed competition statistics
- `healthCheck()` - Service health status
- `getMetrics()` - Service metrics for monitoring

#### Validation Rules

The CompetitionManager enforces comprehensive validation:

**Competition Creation:**
- Name and description are required
- End date must be after start date
- Start date cannot be in the past
- At least one requirement must be defined

**Student Registration:**
- Competition must be accepting registrations (not completed/cancelled)
- Registration deadline must not have passed
- Participant limit must not be exceeded
- User cannot be already registered

**Status Transitions:**
- UPCOMING → ACTIVE, CANCELLED
- ACTIVE → COMPLETED, CANCELLED
- COMPLETED → (no transitions)
- CANCELLED → (no transitions)

**Competition Deletion:**
- No active participants
- Warning for completed participants (historical data)

#### Default Competitions

The service automatically creates default competitions on initialization:

1. **Hacktoberfest 2024**
   - Type: `HACKTOBERFEST`
   - Duration: October 1-31, 2024
   - Requirements: 4 quality pull requests
   - Validation: GitHub PR approval/merge validation

2. **GitHub Game Off 2024**
   - Type: `GITHUB_GAME_OFF`
   - Duration: November 1-30, 2024
   - Requirements: Create and submit a game
   - Validation: Repository and gameplay validation

3. **Open Source Contribution Challenge**
   - Type: `OPEN_SOURCE_CHALLENGE`
   - Duration: Year-long ongoing challenge
   - Requirements: Flexible contribution requirements
   - Validation: Contribution quality assessment

#### Lifecycle Monitoring

The service includes automatic lifecycle monitoring:

- **Periodic Checks**: Every minute, checks for competitions that should start or end
- **Auto-Start**: Automatically starts competitions when start date is reached
- **Auto-Complete**: Automatically completes competitions when end date is reached
- **Status Updates**: Updates participant statuses during transitions

#### Caching Strategy

- **In-Memory Cache**: Competitions are cached in memory for fast access
- **Cache Invalidation**: Cache is updated on database changes
- **Database Fallback**: Falls back to database if not in cache
- **Lazy Loading**: Competitions loaded on-demand from database

#### Error Handling

The service uses typed errors for different scenarios:

- `NotFoundError` - Competition or participation not found
- `ValidationError` - Business rule validation failures
- `CompetitionError` - General competition-related errors

#### Metrics and Monitoring

The service exposes metrics for monitoring:

```typescript
// Health check
const health = await competitionManager.healthCheck();
// Returns: { status, initialized, competitionsCount, activeCompetitions, upcomingCompetitions }

// Service metrics
const metrics = competitionManager.getMetrics();
// Returns: { totalCompetitions, competitionsByStatus, competitionsByType }
```

#### Testing

The service includes comprehensive testing:

- **Unit Tests**: `CompetitionManager.test.ts` - Mocked dependencies
- **Integration Tests**: `test-competition-manager.ts` - Real database operations

Run tests:
```bash
# Unit tests
npm test

# Integration tests
npm run test:competition-manager
```

### Future Services

The service layer is designed to be extended with additional services:

- **ExternalAPIManager** - GitHub/GitLab API integration
- **ProgressMonitor** - Real-time progress tracking
- **NotificationService** - Competition notifications
- **ValidationEngine** - Submission validation
- **AnalyticsService** - Advanced analytics and reporting

## Architecture Patterns

### Repository Pattern
Services use the repository pattern for data access, providing abstraction over database operations.

### Service Layer Pattern
Business logic is encapsulated in service classes, separate from controllers and data access.

### Observer Pattern
Services can emit events for cross-service communication and real-time updates.

### Strategy Pattern
Validation rules and external API adapters use strategy pattern for flexibility.

## Configuration

Services are configured through environment variables:

```env
# Competition Configuration
DEFAULT_COMPETITION_DURATION_DAYS=30
MAX_PARTICIPANTS_PER_COMPETITION=1000
AUTO_VALIDATION_ENABLED=true

# Lifecycle Monitoring
LIFECYCLE_CHECK_INTERVAL_MS=60000
AUTO_START_COMPETITIONS=true
AUTO_COMPLETE_COMPETITIONS=true

# Caching
ENABLE_COMPETITION_CACHE=true
CACHE_TTL_SECONDS=3600
```

## Performance Considerations

- **Caching**: In-memory caching reduces database load
- **Batch Operations**: Bulk operations for participant updates
- **Lazy Loading**: Load competitions on-demand
- **Connection Pooling**: Database connection pooling for scalability
- **Async Operations**: Non-blocking async/await patterns

## Security Considerations

- **Input Validation**: All inputs validated before processing
- **Authorization**: User permissions checked for operations
- **Data Sanitization**: User inputs sanitized to prevent injection
- **Audit Logging**: All operations logged for audit trail