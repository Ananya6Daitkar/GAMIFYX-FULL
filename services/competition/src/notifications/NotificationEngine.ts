import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { NotificationTemplate, NotificationChannel, NotificationPriority } from '../types/notification.types';
import { Competition, Campaign, Participation } from '../types/competition.types';
import { EmailService } from './channels/EmailService';
import { WebSocketService } from './channels/WebSocketService';
import { SlackService } from './channels/SlackService';
import { DatabaseService } from '../database/DatabaseService';

export class NotificationEngine extends EventEmitter {
  private logger: Logger;
  private emailService: EmailService;
  private webSocketService: WebSocketService;
  private slackService: SlackService;
  private databaseService: DatabaseService;
  private reminderIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.logger = new Logger('NotificationEngine');
    this.emailService = new EmailService();
    this.webSocketService = new WebSocketService();
    this.slackService = new SlackService();
    this.databaseService = new DatabaseService();
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for various competition events
   */
  private setupEventListeners(): void {
    this.on('competition.created', this.handleCompetitionCreated.bind(this));
    this.on('competition.updated', this.handleCompetitionUpdated.bind(this));
    this.on('campaign.created', this.handleCampaignCreated.bind(this));
    this.on('campaign.started', this.handleCampaignStarted.bind(this));
    this.on('student.registered', this.handleStudentRegistered.bind(this));
    this.on('progress.milestone', this.handleProgressMilestone.bind(this));
    this.on('deadline.approaching', this.handleDeadlineApproaching.bind(this));
    this.on('achievement.unlocked', this.handleAchievementUnlocked.bind(this));
  }

  /**
   * Send notification through specified channels
   */
  async sendNotification(
    recipients: string[],
    template: NotificationTemplate,
    data: any,
    channels: NotificationChannel[] = ['email', 'websocket'],
    priority: NotificationPriority = 'medium'
  ): Promise<void> {
    try {
      const notification = {
        id: this.generateNotificationId(),
        recipients,
        template,
        data,
        channels,
        priority,
        timestamp: new Date(),
        status: 'pending'
      };

      // Store notification in database
      await this.databaseService.storeNotification(notification);

      // Send through each channel
      const promises = channels.map(channel => this.sendThroughChannel(channel, notification));
      await Promise.allSettled(promises);

      this.logger.info(`Notification sent to ${recipients.length} recipients`, {
        notificationId: notification.id,
        template: template.name,
        channels
      });

    } catch (error) {
      this.logger.error('Failed to send notification', error);
      throw error;
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendThroughChannel(channel: NotificationChannel, notification: any): Promise<void> {
    try {
      switch (channel) {
        case 'email':
          await this.emailService.send(notification);
          break;
        case 'websocket':
          await this.webSocketService.broadcast(notification);
          break;
        case 'slack':
          await this.slackService.send(notification);
          break;
        case 'push':
          // TODO: Implement push notification service
          this.logger.warn('Push notifications not yet implemented');
          break;
        default:
          this.logger.warn(`Unknown notification channel: ${channel}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send notification through ${channel}`, error);
    }
  }

  /**
   * Handle competition created event
   */
  private async handleCompetitionCreated(competition: Competition): Promise<void> {
    const template: NotificationTemplate = {
      name: 'competition_created',
      subject: 'New Competition Available: {{competition.name}}',
      body: `
        <h2>🏆 New Competition Available!</h2>
        <p>A new competition has been added to the platform:</p>
        <h3>{{competition.name}}</h3>
        <p>{{competition.description}}</p>
        <p><strong>Platform:</strong> {{competition.platform}}</p>
        <p><strong>Type:</strong> {{competition.type}}</p>
        <p><strong>Start Date:</strong> {{competition.startDate}}</p>
        <p><strong>End Date:</strong> {{competition.endDate}}</p>
        <p>Visit your dashboard to learn more and participate!</p>
      `,
      variables: ['competition']
    };

    // Notify all active students
    const activeStudents = await this.databaseService.getActiveStudents();
    const recipients = activeStudents.map(student => student.email);

    await this.sendNotification(recipients, template, { competition }, ['email', 'websocket']);
  }

  /**
   * Handle campaign created event
   */
  private async handleCampaignCreated(campaign: Campaign): Promise<void> {
    const template: NotificationTemplate = {
      name: 'campaign_created',
      subject: 'New Class Challenge: {{campaign.name}}',
      body: `
        <h2>📋 New Class Challenge Created!</h2>
        <p>Your instructor has created a new competition campaign:</p>
        <h3>{{campaign.name}}</h3>
        <p>{{campaign.description}}</p>
        <p><strong>Competition:</strong> {{competition.name}}</p>
        <p><strong>Start Date:</strong> {{campaign.startDate}}</p>
        <p><strong>End Date:</strong> {{campaign.endDate}}</p>
        <p><strong>Course Credit:</strong> {{campaign.requirements.gradingWeight}}% of final grade</p>
        <p>Register now to participate and earn course credit!</p>
      `,
      variables: ['campaign', 'competition']
    };

    // Get competition details
    const competition = await this.databaseService.getCompetitionById(campaign.competitionId);
    
    // Notify enrolled students
    const enrolledStudents = await this.databaseService.getEnrolledStudents(campaign.instructorId);
    const recipients = enrolledStudents.map(student => student.email);

    await this.sendNotification(recipients, template, { campaign, competition }, ['email', 'websocket']);
  }

  /**
   * Handle student registered for campaign
   */
  private async handleStudentRegistered(participation: Participation): Promise<void> {
    const template: NotificationTemplate = {
      name: 'registration_confirmation',
      subject: 'Registration Confirmed: {{campaign.name}}',
      body: `
        <h2>✅ Registration Confirmed!</h2>
        <p>You have successfully registered for:</p>
        <h3>{{campaign.name}}</h3>
        <p>{{campaign.description}}</p>
        <p><strong>Next Steps:</strong></p>
        <ul>
          <li>Connect your {{competition.platform}} account if not already connected</li>
          <li>Review the competition requirements</li>
          <li>Start participating to earn course credit</li>
        </ul>
        <p>Good luck! 🚀</p>
      `,
      variables: ['campaign', 'competition', 'student']
    };

    const campaign = await this.databaseService.getCampaignById(participation.campaignId);
    const competition = await this.databaseService.getCompetitionById(campaign.competitionId);
    const student = await this.databaseService.getUserById(participation.userId);

    await this.sendNotification(
      [student.email], 
      template, 
      { campaign, competition, student }, 
      ['email', 'websocket']
    );

    // Schedule reminder notifications
    this.scheduleReminders(participation);
  }

  /**
   * Handle progress milestone reached
   */
  private async handleProgressMilestone(data: { 
    participation: Participation, 
    milestone: string, 
    progress: any 
  }): Promise<void> {
    const { participation, milestone, progress } = data;
    
    const template: NotificationTemplate = {
      name: 'milestone_achieved',
      subject: '🎉 Milestone Achieved: {{milestone}}',
      body: `
        <h2>🎉 Congratulations!</h2>
        <p>You've reached a new milestone in {{campaign.name}}:</p>
        <h3>{{milestone}}</h3>
        <p><strong>Your Progress:</strong></p>
        <ul>
          <li>Completed Tasks: {{progress.completedTasks}}/{{progress.totalTasks}}</li>
          <li>Quality Score: {{progress.qualityScore}}%</li>
          <li>Points Earned: {{progress.pointsEarned}}</li>
        </ul>
        <p>Keep up the great work! 💪</p>
      `,
      variables: ['campaign', 'milestone', 'progress']
    };

    const campaign = await this.databaseService.getCampaignById(participation.campaignId);
    const student = await this.databaseService.getUserById(participation.userId);

    await this.sendNotification(
      [student.email], 
      template, 
      { campaign, milestone, progress }, 
      ['email', 'websocket', 'push'],
      'high'
    );
  }

  /**
   * Handle deadline approaching
   */
  private async handleDeadlineApproaching(data: {
    campaign: Campaign,
    daysRemaining: number,
    participants: Participation[]
  }): Promise<void> {
    const { campaign, daysRemaining, participants } = data;
    
    const urgencyLevel = daysRemaining <= 1 ? 'urgent' : daysRemaining <= 3 ? 'high' : 'medium';
    const emoji = daysRemaining <= 1 ? '🚨' : daysRemaining <= 3 ? '⏰' : '📅';
    
    const template: NotificationTemplate = {
      name: 'deadline_reminder',
      subject: `${emoji} Deadline Reminder: {{campaign.name}} ({{daysRemaining}} days left)`,
      body: `
        <h2>${emoji} Deadline Approaching!</h2>
        <p>This is a reminder that {{campaign.name}} ends in <strong>{{daysRemaining}} day(s)</strong>.</p>
        <h3>{{campaign.name}}</h3>
        <p><strong>End Date:</strong> {{campaign.endDate}}</p>
        <p><strong>Your Current Progress:</strong></p>
        <ul>
          <li>Completed: {{progress.completedTasks}}/{{progress.totalTasks}} tasks</li>
          <li>Status: {{progress.status}}</li>
        </ul>
        ${daysRemaining <= 1 ? 
          '<p><strong>⚠️ Final hours! Make sure to complete your participation before the deadline.</strong></p>' :
          '<p>Don\'t forget to complete your participation to earn course credit!</p>'
        }
      `,
      variables: ['campaign', 'daysRemaining', 'progress']
    };

    // Send personalized reminders to each participant
    for (const participation of participants) {
      const student = await this.databaseService.getUserById(participation.userId);
      const progress = await this.databaseService.getParticipationProgress(participation.id);
      
      await this.sendNotification(
        [student.email], 
        template, 
        { campaign, daysRemaining, progress }, 
        ['email', 'websocket', 'push'],
        urgencyLevel as NotificationPriority
      );
    }
  }

  /**
   * Handle achievement unlocked
   */
  private async handleAchievementUnlocked(data: {
    userId: string,
    achievement: any,
    campaign: Campaign
  }): Promise<void> {
    const { userId, achievement, campaign } = data;
    
    const template: NotificationTemplate = {
      name: 'achievement_unlocked',
      subject: '🏆 Achievement Unlocked: {{achievement.name}}',
      body: `
        <h2>🏆 Achievement Unlocked!</h2>
        <p>Congratulations! You've earned a new achievement:</p>
        <h3>{{achievement.name}}</h3>
        <p>{{achievement.description}}</p>
        <p><strong>Campaign:</strong> {{campaign.name}}</p>
        <p><strong>Points Earned:</strong> {{achievement.points}}</p>
        <p><strong>Badge:</strong> {{achievement.badge}}</p>
        <p>This achievement has been added to your profile. Great job! 🎉</p>
      `,
      variables: ['achievement', 'campaign']
    };

    const student = await this.databaseService.getUserById(userId);

    await this.sendNotification(
      [student.email], 
      template, 
      { achievement, campaign }, 
      ['email', 'websocket', 'push'],
      'high'
    );
  }

  /**
   * Schedule reminder notifications for a participation
   */
  private scheduleReminders(participation: Participation): void {
    const campaign = this.databaseService.getCampaignById(participation.campaignId);
    
    campaign.then(camp => {
      const endDate = new Date(camp.endDate);
      const now = new Date();
      
      // Schedule reminders at different intervals
      const reminderSchedule = [
        { days: 7, label: '1 week' },
        { days: 3, label: '3 days' },
        { days: 1, label: '1 day' },
        { hours: 6, label: '6 hours' },
        { hours: 1, label: '1 hour' }
      ];

      reminderSchedule.forEach(reminder => {
        let reminderTime: Date;
        
        if (reminder.days) {
          reminderTime = new Date(endDate.getTime() - (reminder.days * 24 * 60 * 60 * 1000));
        } else if (reminder.hours) {
          reminderTime = new Date(endDate.getTime() - (reminder.hours * 60 * 60 * 1000));
        }

        if (reminderTime > now) {
          const timeout = setTimeout(() => {
            this.emit('deadline.approaching', {
              campaign: camp,
              daysRemaining: reminder.days || 0,
              hoursRemaining: reminder.hours || 0,
              participants: [participation]
            });
          }, reminderTime.getTime() - now.getTime());

          const reminderId = `${participation.id}-${reminder.label}`;
          this.reminderIntervals.set(reminderId, timeout);
        }
      });
    });
  }

  /**
   * Send motivational messages based on progress
   */
  async sendMotivationalMessage(userId: string, context: {
    type: 'encouragement' | 'celebration' | 'challenge',
    progress?: any,
    campaign?: Campaign
  }): Promise<void> {
    const motivationalTemplates = {
      encouragement: {
        name: 'motivational_encouragement',
        subject: '💪 Keep Going! You\'re Making Progress',
        body: `
          <h2>💪 You're Doing Great!</h2>
          <p>We noticed you're working hard on {{campaign.name}}. Keep up the momentum!</p>
          <p><strong>Your Progress So Far:</strong></p>
          <ul>
            <li>Tasks Completed: {{progress.completedTasks}}</li>
            <li>Quality Score: {{progress.qualityScore}}%</li>
          </ul>
          <p>Remember: Every contribution counts, and you're building valuable skills!</p>
          <p>Need help? Check out our resources or reach out to your instructor.</p>
        `
      },
      celebration: {
        name: 'motivational_celebration',
        subject: '🎉 Amazing Work! You\'re Crushing It!',
        body: `
          <h2>🎉 Outstanding Performance!</h2>
          <p>Your work on {{campaign.name}} has been exceptional!</p>
          <p><strong>Your Achievements:</strong></p>
          <ul>
            <li>Quality Score: {{progress.qualityScore}}% (Excellent!)</li>
            <li>Consistency: {{progress.streak}} day streak</li>
            <li>Impact: {{progress.impact}} contributions</li>
          </ul>
          <p>You're setting a great example for your peers. Keep it up! 🌟</p>
        `
      },
      challenge: {
        name: 'motivational_challenge',
        subject: '🚀 Ready for the Next Challenge?',
        body: `
          <h2>🚀 Level Up Your Skills!</h2>
          <p>You've been making steady progress on {{campaign.name}}. Ready to push further?</p>
          <p><strong>Challenge Yourself:</strong></p>
          <ul>
            <li>Try tackling a more complex issue</li>
            <li>Contribute to a new repository</li>
            <li>Help review other contributors' work</li>
          </ul>
          <p>Growth happens outside your comfort zone. You've got this! 💪</p>
        `
      }
    };

    const template = motivationalTemplates[context.type];
    const student = await this.databaseService.getUserById(userId);

    await this.sendNotification(
      [student.email],
      template,
      context,
      ['email', 'websocket'],
      'low'
    );
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up scheduled reminders
   */
  cleanup(): void {
    this.reminderIntervals.forEach(timeout => clearTimeout(timeout));
    this.reminderIntervals.clear();
  }
}