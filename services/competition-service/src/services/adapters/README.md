# External API Adapters

This directory contains adapters for integrating with external platforms like GitHub, GitLab, and Hacktoberfest. The adapters provide a unified interface for fetching user contributions, validating submissions, and managing authentication across different platforms.

## Architecture

### Base Adapter Pattern

All adapters extend the `BaseExternalAPIAdapter` abstract class, which provides:

- Common configuration validation
- Error handling and rate limit management
- Health check functionality
- Standardized method signatures

### Adapter Interface

Each adapter implements the `IExternalAPIAdapter` interface:

```typescript
interface IExternalAPIAdapter {
  initialize(config: ExternalAPIConfig): Promise<void>;
  authenticate(userId: string, authCode?: string): Promise<AuthenticationResult>;
  validateProfile(username: string): Promise<ProfileValidationResult>;
  fetchContributions(username: string, startDate: Date, endDate: Date): Promise<ContributionData[]>;
  validateContribution(contribution: ContributionData, requirements: ValidationRequirements): Promise<ValidationResult>;
  getUserProfile(username: string): Promise<UserProfile>;
  healthCheck(): Promise<HealthCheckResult>;
  getRateLimit(): Promise<RateLimitInfo>;
}
```

## Available Adapters

### GitHubAdapter

Integrates with GitHub API v4 for:
- OAuth authentication
- Pull request fetching and validation
- Issue tracking
- Commit history analysis
- Repository information
- Hacktoberfest-specific validation

**Key Features:**
- Comprehensive PR validation with approval checking
- Repository topic analysis for Hacktoberfest participation
- Rate limit handling (5000 requests/hour)
- Webhook support for real-time updates

**Usage:**
```typescript
const githubAdapter = new GitHubAdapter();
await githubAdapter.initialize({
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  baseUrl: 'https://api.github.com',
  scopes: ['read:user', 'public_repo']
});

const contributions = await githubAdapter.fetchContributions('username', startDate, endDate);
```

### GitLabAdapter

Integrates with GitLab API v4 for:
- OAuth authentication
- Merge request tracking
- Issue management
- Commit analysis
- Project information

**Key Features:**
- Merge request validation with upvote tracking
- Project participation analysis
- Rate limit handling (varies by GitLab instance)
- Support for both GitLab.com and self-hosted instances

**Usage:**
```typescript
const gitlabAdapter = new GitLabAdapter();
await gitlabAdapter.initialize({
  clientId: process.env.GITLAB_CLIENT_ID,
  clientSecret: process.env.GITLAB_CLIENT_SECRET,
  baseUrl: 'https://gitlab.com/api/v4',
  scopes: ['read_user', 'read_api', 'read_repository']
});

const profile = await gitlabAdapter.getUserProfile('username');
```

### HacktoberfestAdapter

Specialized adapter extending GitHubAdapter for Hacktoberfest validation:
- Hacktoberfest-specific PR validation rules
- Spam detection and filtering
- Quality assessment scoring
- Leaderboard generation
- Progress tracking

**Key Features:**
- Validates PRs against official Hacktoberfest rules
- Checks for `hacktoberfest-accepted` labels
- Filters out spam and invalid contributions
- Provides comprehensive participation status
- Generates leaderboards and statistics

**Usage:**
```typescript
const hacktoberfestAdapter = new HacktoberfestAdapter(2024);
await hacktoberfestAdapter.initialize(githubConfig);

const status = await hacktoberfestAdapter.getHacktoberfestStatus('username');
const leaderboard = await hacktoberfestAdapter.getHacktoberfestLeaderboard(usernames);
```

## Configuration

### Environment Variables

```env
# GitHub Configuration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_TOKEN=your-github-personal-access-token

# GitLab Configuration
GITLAB_CLIENT_ID=your-gitlab-client-id
GITLAB_CLIENT_SECRET=your-gitlab-client-secret
GITLAB_TOKEN=your-gitlab-personal-access-token

# API Settings
API_REQUEST_TIMEOUT=10000
API_RETRY_ATTEMPTS=3
GITHUB_RATE_LIMIT_BUFFER=100
GITLAB_RATE_LIMIT_BUFFER=50
```

### OAuth Setup

#### GitHub OAuth App
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App with:
   - Application name: "GamifyX Competition Service"
   - Homepage URL: Your application URL
   - Authorization callback URL: `{your-domain}/auth/github/callback`

#### GitLab OAuth App
1. Go to GitLab User Settings > Applications
2. Create new application with:
   - Name: "GamifyX Competition Service"
   - Redirect URI: `{your-domain}/auth/gitlab/callback`
   - Scopes: `read_user`, `read_api`, `read_repository`

## Data Models

### ContributionData
```typescript
interface ContributionData {
  id: string;
  type: 'pull_request' | 'commit' | 'issue' | 'review' | 'repository';
  title: string;
  description?: string;
  url: string;
  repositoryUrl: string;
  repositoryName: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'open' | 'closed' | 'merged' | 'draft';
  labels: string[];
  metadata: Record<string, any>;
}
```

### ValidationRequirements
```typescript
interface ValidationRequirements {
  minContributions?: number;
  requireApproval?: boolean;
  excludeLabels?: string[];
  includeLabels?: string[];
  minLinesChanged?: number;
  repositoryRequirements?: {
    mustBePublic?: boolean;
    mustHaveTopics?: string[];
    excludeOwn?: boolean;
  };
  timeframe?: {
    start: Date;
    end: Date;
  };
}
```

### ValidationResult
```typescript
interface ValidationResult {
  valid: boolean;
  score: number;
  maxScore: number;
  reasons: string[];
  metadata: Record<string, any>;
}
```

## Validation Rules

### GitHub Pull Request Validation
- **Base Score**: 50 points
- **Approval Bonus**: +30 points (if merged or approved)
- **Lines Changed**: +20 points (if meets minimum threshold)
- **Quality Indicators**: +10 points (good description, meaningful changes)
- **Spam Penalties**: -50 points (excluded labels, minimal changes)

### Hacktoberfest Validation
- **Base Requirements**: Must be a pull request created in October
- **Approval**: Must be merged, approved, or have `hacktoberfest-accepted` label
- **Quality Threshold**: 60% minimum score (higher than standard 50%)
- **Spam Detection**: Automatic disqualification for spam/invalid labels
- **Repository Participation**: Bonus points for repositories with `hacktoberfest` topic

### GitLab Merge Request Validation
- **Base Score**: 50 points
- **Upvote Bonus**: +30 points (positive community feedback)
- **Draft Penalty**: -10 points (draft merge requests)
- **Changes Bonus**: +15 points (file changes present)

## Error Handling

### Rate Limiting
- Automatic rate limit detection from response headers
- Configurable buffer thresholds
- Graceful degradation when limits approached
- Retry logic with exponential backoff

### API Errors
- Typed error classes for different failure scenarios
- Detailed error logging with context
- Fallback mechanisms for non-critical operations
- User-friendly error messages

### Network Issues
- Connection timeout handling
- Retry logic for transient failures
- Circuit breaker pattern for repeated failures
- Health check monitoring

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=adapters
```

### Integration Tests
```bash
npm run test:external-api
```

### Mock Testing
The adapters include comprehensive mock testing capabilities:
- Mock API responses for different scenarios
- Validation logic testing without API calls
- Error condition simulation
- Rate limit testing

## Performance Considerations

### Caching
- Response caching for frequently accessed data
- User profile caching with TTL
- Repository information caching
- Rate limit status caching

### Batch Operations
- Bulk contribution fetching
- Parallel validation processing
- Efficient pagination handling
- Request deduplication

### Rate Limit Management
- Intelligent request scheduling
- Priority-based request queuing
- Rate limit sharing across operations
- Proactive limit monitoring

## Security

### Authentication
- Secure OAuth token storage
- Token refresh handling
- Scope validation
- User consent management

### Data Privacy
- Minimal data collection
- Secure data transmission
- User data anonymization options
- GDPR compliance features

### API Security
- Request signing for webhooks
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Monitoring and Observability

### Metrics
- API request counts and latencies
- Success/failure rates
- Rate limit utilization
- Validation accuracy

### Logging
- Structured logging with correlation IDs
- Error tracking and alerting
- Performance monitoring
- Audit trail for sensitive operations

### Health Checks
- Adapter availability monitoring
- API endpoint health checks
- Rate limit status monitoring
- Configuration validation

## Extending the System

### Adding New Adapters
1. Extend `BaseExternalAPIAdapter`
2. Implement required interface methods
3. Add platform-specific validation logic
4. Include comprehensive tests
5. Update documentation

### Custom Validation Rules
1. Extend `ValidationRequirements` interface
2. Implement validation logic in adapter
3. Add scoring algorithms
4. Include test cases

### Webhook Integration
1. Implement webhook endpoints
2. Add signature verification
3. Process real-time events
4. Update cached data

## Troubleshooting

### Common Issues
- **Rate Limit Exceeded**: Check rate limit buffers and request patterns
- **Authentication Failed**: Verify OAuth credentials and scopes
- **Validation Errors**: Check contribution data format and requirements
- **Network Timeouts**: Adjust timeout settings and retry logic

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
```

### Health Check Endpoints
- `/health/external-apis` - Overall adapter health
- `/health/github` - GitHub adapter status
- `/health/gitlab` - GitLab adapter status
- `/health/hacktoberfest` - Hacktoberfest adapter status