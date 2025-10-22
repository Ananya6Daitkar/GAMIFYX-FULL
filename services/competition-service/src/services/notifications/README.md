# Competition Notification System

A comprehensive notification and reminder system for competition management, providing multi-channel delivery, automated reminders, and motivational messaging to enhance student engagement.

## Overview

The notification system handles all communication aspects of the competition service, including:

- **Competition Lifecycle Notifications** - Start, end, registration deadlines
- **Progress Notifications** - Milestones, achievements, badges
- **Reminder System** - Automated deadline reminders and motivational messages
- **Multi-Channel Delivery** - Email, Slack, WebSocket, in-app, SMS, push notifications
- **Template Management** - Customizable notification templates
- **Analytics and Tracking** - Delivery rates, engagement metrics

## Architecture

### Core Components

1. **NotificationService** - Main service orchestrating all notifications
2. **Template Engine** - Manages notification templates and rendering
3. **Channel Adapters** - Handle delivery to different channels
4. **Reminder Scheduler** - Manages automated reminders and cron jobs
5. **Analytics Engine** - Tracks delivery and engagement metrics

### Notification Flow

```
Event Trigger → Rule Evaluation → Template Selection → Recipient Resolution → Channel Delivery → Analytics Tracking
```

## Features

### Multi-Channel Delivery

- **Email** - SMTP-based email delivery with HTML templates
- **Slack** - Webhook-based Slack notifications
- **WebSocket** - Real-time in-app notifications
- **In-App** - Persistent notification storage
- **SMS** - Twilio integration for urgent notifications
- **Push** - Firebase push notifications for mobile apps

### Notification Types

#### Competition Lifecycle
- `COMPETITION_CREATED` - New competition announcement
- `COMPETITION_STARTED` - Competition has begun
- `COMPETITION_ENDING_SOON` - Deadline approaching
- `COMPETITION_ENDED` - Competition completed

#### Registration
- `REGISTRATION_OPENED` - Registration is now open
- `REGISTRATION_REMINDER` - Reminder to register
- `REGISTRATION_DEADLINE_APPROACHING` - Deadline warning
- `REGISTRATION_CONFIRMED` - Registration successful

#### Progress & Achievements
- `MILESTONE_ACHIEVED` - Progress milestone reached
- `ACHIEVEMENT_UNLOCKED` - New achievement earned
- `BADGE_EARNED` - Badge awarded
- `PROGRESS_UPDATE` - General progress notification

#### Motivational
- `ENCOURAGEMENT_MESSAGE` - Motivational content
- `STREAK_REMINDER` - Activity streak notifications
- `LEADERBOARD_UPDATE` - Ranking changes
- `PEER_ACHIEVEMENT` - Peer accomplishments

### Template System

Templates support variable substitution and multiple formats:

```typescript
{
  id: 'competition-started',
  subject: '🚀 {{competitionName}} has started!',
  bodyTemplate: 'The competition "{{competitionName}}" has officially started! Join {{participantCount}} participants.',
  variables: ['competitionName', 'participantCount', 'competitionUrl'],
  channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  priority: NotificationPriority.NORMAL
}
```

### Reminder Scheduling

Automated reminders with flexible timing:

```typescript
{
  id: 'registration-reminder-7d',
  name: '7 days before registration deadline',
  triggerBefore: 7 * 24 * 60 * 60, // 7 days in seconds
  conditions: {
    onlyIfNotParticipating: true
  },
  channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  priority: NotificationPriority.NORMAL
}
```

## Usage

### Basic Notification

```typescript
import { NotificationService } from '@/services/NotificationService';
import { NotificationType, NotificationChannel, NotificationPriority } from '@/types/notifications';

const notificationService = new NotificationService(io);
await notificationService.initialize();

// Send notification to specific users
await notificationService.sendNotification(
  NotificationType.COMPETITION_STARTED,
  ['user1', 'user2', 'user3'],
  {
    competitionName: 'Hacktoberfest 2024',
    competitionUrl: 'https://gamifyx.com/competitions/hacktoberfest',
    participantCount: 150
  },
  {
    competitionId: 'hacktoberfest-2024',
    priority: NotificationPriority.NORMAL,
    channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP]
  }
);
```

### Competition-Wide Notifications

```typescript
// Notify all participants of a competition
await notificationService.sendCompetitionNotification(
  'hacktoberfest-2024',
  NotificationType.COMPETITION_ENDING_SOON,
  {
    hoursRemaining: 24,
    urgent: true
  }
);
```

### Motivational Messages

```typescript
// Send personalized motivational message
await notificationService.sendMotivationalMessage(
  'user123',
  'hacktoberfest-2024',
  'encouragement'
);
```

### Schedule Reminders

```typescript
// Set up automated reminders for a competition
await notificationService.scheduleCompetitionReminders('hacktoberfest-2024');
```

## Configuration

### Environment Variables

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_FROM=GamifyX <noreply@gamifyx.com>

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Push Notifications
FIREBASE_SERVER_KEY=your-firebase-server-key
FIREBASE_PROJECT_ID=your-firebase-project-id

# SMS (Optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Rate Limiting
NOTIFICATION_RATE_LIMIT_PER_HOUR=100
NOTIFICATION_RATE_LIMIT_PER_DAY=1000
NOTIFICATION_RETRY_ATTEMPTS=3
```

### User Preferences

Users can customize their notification preferences:

```typescript
interface NotificationPreferences {
  channels: {
    [NotificationChannel.EMAIL]: boolean;
    [NotificationChannel.SLACK]: boolean;
    [NotificationChannel.IN_APP]: boolean;
    [NotificationChannel.PUSH]: boolean;
  };
  types: {
    [NotificationType.COMPETITION_STARTED]: boolean;
    [NotificationType.MILESTONE_ACHIEVED]: boolean;
    [NotificationType.ENCOURAGEMENT_MESSAGE]: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: '22:00';
    end: '08:00';
    timezone: 'America/New_York';
  };
  frequency: {
    digest: 'daily' | 'weekly' | 'never';
    reminders: boolean;
    marketing: boolean;
  };
}
```

## Scheduled Jobs

The system runs several automated jobs:

### Daily Reminders (9:00 AM)
- Process scheduled reminders
- Check reminder conditions
- Send due notifications

### Hourly Processing
- Process scheduled notifications
- Retry failed deliveries
- Update analytics

### Deadline Monitoring (Every 15 minutes)
- Check competition deadlines
- Send approaching deadline notifications
- Update competition statuses

## Analytics and Monitoring

### Delivery Metrics
- Total notifications sent/delivered/failed
- Delivery rates by channel and type
- Average delivery times
- Failure reasons analysis

### Engagement Metrics
- Open rates (email)
- Click-through rates
- In-app notification interactions
- User preference changes

### Health Monitoring
```typescript
const health = await notificationService.healthCheck();
// Returns:
{
  status: 'healthy',
  initialized: true,
  emailConfigured: true,
  slackConfigured: true,
  activeRules: 15,
  activeSchedules: 8
}
```

## Template Customization

### Creating Custom Templates

```typescript
const customTemplate: NotificationTemplate = {
  id: 'custom-achievement',
  type: NotificationType.ACHIEVEMENT_UNLOCKED,
  name: 'Custom Achievement',
  subject: '🏆 {{userName}}, you unlocked {{achievementName}}!',
  bodyTemplate: `
    Congratulations {{userName}}!
    
    You've unlocked the "{{achievementName}}" achievement in {{competitionName}}.
    
    Achievement Details:
    - Points Earned: {{points}}
    - Rarity: {{rarity}}
    - Description: {{description}}
    
    Keep up the great work!
  `,
  htmlTemplate: `
    <h2>🏆 Achievement Unlocked!</h2>
    <p>Congratulations <strong>{{userName}}</strong>!</p>
    <div class="achievement-card">
      <h3>{{achievementName}}</h3>
      <p>{{description}}</p>
      <div class="achievement-stats">
        <span class="points">{{points}} points</span>
        <span class="rarity">{{rarity}}</span>
      </div>
    </div>
  `,
  variables: ['userName', 'achievementName', 'competitionName', 'points', 'rarity', 'description'],
  channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
  priority: NotificationPriority.HIGH,
  category: 'achievement',
  tags: ['achievement', 'gamification'],
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### Variable Substitution

Templates use `{{variableName}}` syntax for dynamic content:

- `{{userName}}` - Recipient's name
- `{{competitionName}}` - Competition title
- `{{progress}}` - Completion percentage
- `{{deadline}}` - Formatted deadline
- `{{achievementName}}` - Achievement title
- `{{points}}` - Points earned
- `{{rank}}` - Current ranking

## Error Handling

### Delivery Failures
- Automatic retry with exponential backoff
- Fallback to alternative channels
- Detailed error logging and tracking
- Dead letter queue for persistent failures

### Rate Limiting
- Per-channel rate limits
- User-specific rate limits
- Graceful degradation
- Priority-based queuing

### Validation
- Template validation
- Recipient validation
- Content sanitization
- Spam prevention

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=NotificationService
```

### Integration Tests
```bash
npm run test:notifications
```

### Mock Testing
The service includes comprehensive mock testing:
- Template rendering validation
- Channel delivery simulation
- Reminder scheduling verification
- Analytics calculation testing

## Performance Optimization

### Batching
- Bulk notification processing
- Batch template rendering
- Efficient database queries
- Parallel channel delivery

### Caching
- Template caching
- Recipient preference caching
- Analytics data caching
- Rate limit status caching

### Queue Management
- Priority-based processing
- Channel-specific queues
- Retry queue management
- Dead letter handling

## Security Considerations

### Data Privacy
- Minimal data collection
- Secure credential storage
- User consent management
- GDPR compliance features

### Content Security
- Template injection prevention
- Content sanitization
- Spam detection
- Abuse prevention

### Channel Security
- Webhook signature verification
- API key rotation
- Secure token storage
- Encrypted communications

## Troubleshooting

### Common Issues

**Email Delivery Failures**
- Check SMTP credentials
- Verify email server settings
- Check spam filters
- Validate recipient addresses

**Slack Notifications Not Working**
- Verify webhook URL
- Check Slack app permissions
- Validate message format
- Test webhook manually

**High Failure Rates**
- Check rate limits
- Verify recipient data
- Review template formatting
- Monitor service health

### Debug Mode
Enable detailed logging:
```env
LOG_LEVEL=debug
NOTIFICATION_DEBUG=true
```

### Health Endpoints
- `/health/notifications` - Overall notification health
- `/health/email` - Email service status
- `/health/slack` - Slack integration status
- `/analytics/notifications` - Delivery analytics

## Future Enhancements

### Planned Features
- A/B testing for templates
- Advanced segmentation
- Machine learning for optimal timing
- Rich media support
- Interactive notifications
- Voice notifications
- Chatbot integration

### Integration Roadmap
- Microsoft Teams support
- Discord integration
- WhatsApp Business API
- Telegram notifications
- In-app chat system
- Video call notifications