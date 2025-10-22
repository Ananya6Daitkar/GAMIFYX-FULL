# Competition Service

External competition integration service for the GamifyX platform, enabling students to participate in real-world coding competitions like Hacktoberfest, GitHub Game Off, and custom competitions.

## 🏆 Features

### Competition Management
- **Multiple Competition Types**: Hacktoberfest, GitHub Game Off, GitLab hackathons, custom competitions
- **Automated Validation**: Real-time validation of submissions using GitHub/GitLab webhooks
- **Progress Tracking**: Live progress monitoring with milestone detection
- **Leaderboards**: Real-time competitive rankings and achievements

### Campaign Management
- **Instructor-Led Campaigns**: Teachers can create campaigns for their classes
- **Student Invitations**: Bulk invitation system with notification management
- **Custom Requirements**: Add course-specific requirements to existing competitions
- **Progress Analytics**: Detailed analytics for instructors to track student engagement

### External Platform Integration
- **GitHub Integration**: Pull request tracking, issue management, repository monitoring
- **GitLab Integration**: Merge request validation, project contribution tracking
- **Webhook Processing**: Real-time event processing from external platforms
- **OAuth Authentication**: Secure connection to external platforms

### Real-Time Features
- **WebSocket Support**: Live updates for progress, achievements, and leaderboards
- **Push Notifications**: Instant notifications for milestones and deadlines
- **Live Analytics**: Real-time dashboard updates for instructors and students

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- GitHub/GitLab API access (optional)

### Installation

1. **Install dependencies**
   ```bash
   cd services/competition-service
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the service**
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3009`

## 📋 API Endpoints

### Competitions
- `GET /competitions` - List all competitions
- `GET /competitions/:id` - Get competition details
- `POST /competitions` - Create new competition (admin)
- `PUT /competitions/:id` - Update competition (admin)
- `DELETE /competitions/:id` - Delete competition (admin)

### Participations
- `POST /participations/register` - Register for competition
- `GET /participations/my-participations` - Get user's participations
- `GET /participations/:id` - Get participation details
- `POST /participations/:id/submit` - Submit entry for requirement
- `GET /participations/:id/submissions` - Get participation submissions
- `POST /participations/:id/withdraw` - Withdraw from competition

### Campaigns
- `POST /campaigns` - Create campaign (instructors)
- `GET /campaigns/my-campaigns` - Get instructor's campaigns
- `GET /campaigns/my-invitations` - Get student's invitations
- `GET /campaigns/:id` - Get campaign details
- `PUT /campaigns/:id` - Update campaign
- `POST /campaigns/:id/join` - Join campaign (students)
- `POST /campaigns/:id/leave` - Leave campaign (students)
- `GET /campaigns/:id/participants` - Get campaign participants
- `POST /campaigns/:id/invite` - Send invitations

### Analytics
- `GET /analytics/competitions/:id` - Competition analytics
- `GET /analytics/campaigns/:id` - Campaign analytics
- `GET /analytics/users/:userId/participation` - User participation analytics
- `GET /analytics/platform` - Platform-wide analytics (admin)
- `GET /analytics/leaderboard/:competitionId` - Competition leaderboard

### Webhooks
- `POST /webhooks/github` - GitHub webhook handler
- `POST /webhooks/gitlab` - GitLab webhook handler
- `POST /webhooks/custom/:competitionId` - Custom webhook handler

## 🔧 Configuration

### Environment Variables

```bash
# Core Configuration
NODE_ENV=development
PORT=3009
JWT_SECRET=your-jwt-secret

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=aiops_competitions
DB_USER=postgres
DB_PASSWORD=password

# External APIs
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITLAB_CLIENT_ID=your-gitlab-client-id
GITLAB_CLIENT_SECRET=your-gitlab-client-secret

# Monitoring
METRICS_PORT=9009
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
```

### Competition Types

#### Hacktoberfest
```json
{
  "type": "hacktoberfest",
  "requirements": [
    {
      "type": "pull_request",
      "description": "Submit 4 valid pull requests",
      "criteria": { "minPRs": 4, "mustBeApproved": true }
    }
  ]
}
```

#### GitHub Game Off
```json
{
  "type": "github_game_off",
  "requirements": [
    {
      "type": "repository",
      "description": "Create a game repository",
      "criteria": { "hasGameTag": true, "minCommits": 10 }
    }
  ]
}
```

## 🔌 External Platform Setup

### GitHub Integration

1. **Create GitHub App**
   - Go to GitHub Settings > Developer settings > GitHub Apps
   - Create new GitHub App with required permissions
   - Generate private key and client secret

2. **Configure Webhooks**
   ```bash
   # Webhook URL
   https://your-domain.com/webhooks/github
   
   # Events to subscribe to
   - pull_request
   - push
   - issues
   - pull_request_review
   ```

3. **Set Environment Variables**
   ```bash
   GITHUB_CLIENT_ID=your_app_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_WEBHOOK_SECRET=your_webhook_secret
   ```

### GitLab Integration

1. **Create GitLab Application**
   - Go to GitLab Settings > Applications
   - Create new application with required scopes

2. **Configure Webhooks**
   ```bash
   # Webhook URL
   https://your-domain.com/webhooks/gitlab
   
   # Events to subscribe to
   - Merge Request events
   - Push events
   - Issues events
   ```

## 📊 Monitoring

### Prometheus Metrics
- `competitions_total` - Total number of competitions
- `competition_operations_total` - Competition operations count
- `participations_total` - Total participations
- `submissions_total` - Total submissions
- `webhook_events_total` - Webhook events processed

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with dependencies
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

### Logging
- Structured JSON logging with correlation IDs
- OpenTelemetry distributed tracing
- Error tracking and alerting

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Coverage Report
```bash
npm run test:coverage
```

## 🚀 Deployment

### Docker
```bash
# Build image
docker build -t competition-service .

# Run container
docker run -p 3009:3009 competition-service
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: competition-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: competition-service
  template:
    metadata:
      labels:
        app: competition-service
    spec:
      containers:
      - name: competition-service
        image: competition-service:latest
        ports:
        - containerPort: 3009
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          value: "postgres"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3009
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3009
```

## 🔄 Development Workflow

### Adding New Competition Type

1. **Update Types**
   ```typescript
   // src/types/competition.ts
   export enum CompetitionType {
     // ... existing types
     NEW_COMPETITION = 'new_competition'
   }
   ```

2. **Create Validation Rules**
   ```typescript
   // src/services/CompetitionManager.ts
   private async createDefaultNewCompetition(): Promise<void> {
     // Implementation
   }
   ```

3. **Add Webhook Handler**
   ```typescript
   // src/routes/webhooks.ts
   async function handleNewCompetitionWebhook(payload: any) {
     // Implementation
   }
   ```

### Adding New External Platform

1. **Create API Adapter**
   ```typescript
   // src/services/adapters/NewPlatformAdapter.ts
   export class NewPlatformAdapter extends ExternalAPIAdapter {
     // Implementation
   }
   ```

2. **Add Webhook Route**
   ```typescript
   // src/routes/webhooks.ts
   router.post('/newplatform', async (req, res) => {
     // Implementation
   });
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and API documentation
- **Issues**: Create an issue in the repository
- **Discussions**: Join our Discord server for community support