# Competition Notification and Reminder System

## Overview

The notification and reminder system provides comprehensive communication capabilities for the GamifyX competition platform, including automated reminders, motivational messages, and real-time notifications across multiple channels.

## Features

### 🔔 Multi-Channel Notifications
- **Email**: Rich HTML emails with branded templates
- **WebSocket**: Real-time browser notifications
- **Slack**: Integration with team communication
- **Push Notifications**: Mobile app notifications (planned)

### ⏰ Automated Reminders
- **Deadline Reminders**: 7-day, 3-day, 1-day, and hourly warnings
- **Progress Check**: Regular progress monitoring and encouragement
- **Inactivity Alerts**: Re-engagement for inactive participants
- **Milestone Celebrations**: Achievement recognition

### 💪 Motivational Messages
- **Encouragement**: Support for struggling participants
- **Celebration**: Recognition of achievements
- **Challenges**: Push participants to excel
- **Tips**: Educational content and best practices

### 📊 Smart Scheduling
- **Cron-based Scheduling**: Reliable recurring reminders
- **Custom Reminders**: One-off notifications for specific events
- **Time Zone Support**: Respect user preferences
- **Quiet Hours**: Avoid notifications during specified times

## Architecture

```
NotificationService
├── NotificationEngine (Core notification logic)
├── ReminderScheduler (Automated scheduling)
├── Channels/
│   ├── EmailService (SMTP integration)
│   ├── WebSocketService (Real-time notifications)
│   └── SlackService (Team communication)
└── Types/ (TypeScript definitions)
```

## Usage

### Basic Notification

```typescript
import { notificationService } from './notifications';

const engine = notificationService.getNotificationEngine();

// Send competition created notification
engine.emit('competition.created', competition);

// Send custom notification
await engine.sendNotification(
  ['user@example.com'],
  {
    name: 'custom_notification',
    subject: 'Important Update',
    body: 'Your notification content here'
  },
  { data: 'any additional data' },
  ['email', 'websocket']
);
```

### Motivational Messages

```typescript
// Send encouragement to struggling participant
await engine.sendMotivationalMessage(userId, {
  type: 'encouragement',
  progress: participantProgress,
  campaign: campaignData
});
```

### Custom Reminders

```typescript
const scheduler = notificationService.getReminderScheduler();

// Schedule custom reminder
await scheduler.scheduleCustomReminder(
  participantId,
  new Date('2024-12-01T10:00:00Z'),
  'Don\'t forget to submit your final contribution!',
  'deadline'
);
```

## Event Types

### Competition Events
- `competition.created` - New competition available
- `competition.updated` - Competition details changed
- `competition.ended` - Competition has concluded

### Campaign Events
- `campaign.created` - New class campaign created
- `campaign.started` - Campaign has begun
- `campaign.ended` - Campaign has concluded

### Participation Events
- `student.registered` - Student joined campaign
- `student.unregistered` - Student left campaign
- `progress.milestone` - Milestone achieved
- `achievement.unlocked` - New achievement earned

### Deadline Events
- `deadline.approaching` - Deadline reminder
- `deadline.passed` - Deadline has passed

## Notification Templates

### Competition Created
```html
<h2>🏆 New Competition Available!</h2>
<p>A new competition has been added to the platform:</p>
<h3>{{competition.name}}</h3>
<p>{{competition.description}}</p>
<p><strong>Platform:</strong> {{competition.platform}}</p>
<p><strong>Start Date:</strong> {{competition.startDate}}</p>
<p><strong>End Date:</strong> {{competition.endDate}}</p>
```

### Milestone Achieved
```html
<h2>🎉 Congratulations!</h2>
<p>You've reached a new milestone in {{campaign.name}}:</p>
<h3>{{milestone}}</h3>
<p><strong>Your Progress:</strong></p>
<ul>
  <li>Completed Tasks: {{progress.completedTasks}}/{{progress.totalTasks}}</li>
  <li>Quality Score: {{progress.qualityScore}}%</li>
  <li>Points Earned: {{progress.pointsEarned}}</li>
</ul>
```

## Configuration

### Environment Variables

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@gamifyx-platform.com

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Frontend URL for links
FRONTEND_URL=http://localhost:3000
```

### Notification Preferences

Users can configure their notification preferences:

```typescript
interface NotificationPreferences {
  emailEnabled: boolean;
  websocketEnabled: boolean;
  slackEnabled: boolean;
  quietHours?: {
    start: "22:00";
    end: "08:00";
    timezone: "UTC";
  };
  categories: {
    competitions: boolean;
    campaigns: boolean;
    achievements: boolean;
    deadlines: boolean;
    progress: boolean;
    motivational: boolean;
  };
}
```

## Reminder Schedule

### Daily Reminders (9:00 AM UTC)
- Check all active campaigns
- Send appropriate deadline reminders
- Process progress-based notifications

### Hourly Deadline Checks
- Monitor campaigns ending within 24 hours
- Send 6-hour and 1-hour final warnings

### Weekly Motivational Messages (Monday 10:00 AM UTC)
- Send challenge messages to active participants
- Encourage continued participation

### Progress Checks (Every 3 days at 2:00 PM UTC)
- Review participant progress
- Send encouragement to those falling behind

## Motivational Message Types

### Encouragement
- For participants with low progress (< 50%)
- For inactive participants (3+ days)
- Supportive and motivating tone

### Celebration
- For significant milestones (25%, 50%, 75%, 100%)
- For high-quality contributions
- Congratulatory and proud tone

### Challenge
- For consistent participants
- For those ready to level up
- Inspiring and ambitious tone

### Tips
- Educational content
- Best practices
- Skill development advice

## Monitoring and Analytics

### Notification Metrics
- Delivery rates by channel
- Open rates (email)
- Click-through rates
- User engagement patterns

### Performance Monitoring
- Notification processing time
- Queue depth and throughput
- Error rates and retry logic
- Channel availability

## Error Handling

### Retry Logic
- Exponential backoff for failed deliveries
- Maximum retry attempts per channel
- Dead letter queue for persistent failures

### Fallback Channels
- Email fallback for WebSocket failures
- Multiple SMTP servers for redundancy
- Graceful degradation when services unavailable

## Security Considerations

### Data Protection
- No sensitive data in notification content
- Secure token handling for external services
- Encrypted communication channels

### Rate Limiting
- Per-user notification limits
- Channel-specific rate limiting
- Abuse prevention mechanisms

### Authentication
- JWT token validation for WebSocket
- OAuth for external service integration
- Secure credential storage

## Testing

### Unit Tests
```bash
npm test -- --grep "NotificationEngine"
npm test -- --grep "ReminderScheduler"
```

### Integration Tests
```bash
npm test -- --grep "Email Integration"
npm test -- --grep "WebSocket Integration"
```

### Manual Testing
```typescript
// Send test email
const emailService = new EmailService();
await emailService.sendTestEmail('test@example.com');

// Send test Slack message
const slackService = new SlackService();
await slackService.sendTestMessage('#general');
```

## Deployment

### Docker Configuration
```dockerfile
# Add to competition service Dockerfile
RUN npm install nodemailer @slack/web-api node-cron
```

### Environment Setup
```yaml
# docker-compose.yml
services:
  competition-service:
    environment:
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
```

## Future Enhancements

### Planned Features
- Push notification support for mobile apps
- SMS notifications for urgent reminders
- Advanced template editor for instructors
- A/B testing for notification effectiveness
- Machine learning for optimal timing
- Integration with calendar systems

### Performance Improvements
- Message queuing with Redis
- Batch processing for bulk notifications
- Caching for frequently used templates
- Database optimization for large user bases

## Support

For issues or questions about the notification system:

1. Check the logs for error messages
2. Verify environment configuration
3. Test individual channels separately
4. Review notification preferences
5. Contact the development team

## Contributing

When adding new notification types:

1. Define the event in notification.types.ts
2. Create appropriate templates
3. Add event handlers to NotificationEngine
4. Update documentation and tests
5. Consider localization needs