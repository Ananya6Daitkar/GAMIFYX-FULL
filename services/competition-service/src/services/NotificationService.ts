import { Server } from 'socket.io';
import axios from 'axios';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { logger } from '@/telemetry/logger';
import { repository } from '@/database/repositories';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationMessage,
  NotificationStatus,
  NotificationTemplate,
  NotificationRecipient,
  NotificationRule,
  ReminderSchedule,
  ReminderConfig,
  NotificationEvent,
  NotificationAnalytics,
  NotificationDeliveryAttempt
} from '@/types/notifications';

/**
 * Comprehensive Notification Service
 * Handles all competition-related notifications, reminders, and motivational messages
 */
export class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private templates: Map<string, NotificationTemplate> = new Map();
  private rules: Map<string, NotificationRule> = new Map();
  private reminderSchedules: Map<string, ReminderSchedule> = new Map();
  private initialized: boolean = false;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor(private io: Server) {}

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Notification Service...');

      // Initialize email transporter
      await this.initializeEmailTransporter();

      // Load notification templates
      await this.loadNotificationTemplates();

      // Load notification rules
      await this.loadNotificationRules();

      // Load reminder schedules
      await this.loadReminderSchedules();

      // Start cron jobs for scheduled notifications
      await this.startScheduledJobs();

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;
      logger.info('Notification Service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Notification Service', { error });
      throw error;
    }
  }

  private async initializeEmailTransporter(): Promise<void> {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Verify email configuration
      await this.emailTransporter.verify();
      logger.info('Email transporter initialized successfully');
    } else {
      logger.warn('Email configuration not provided, email notifications disabled');
    }
  }

  private async loadNotificationTemplates(): Promise<void> {
    // Load default templates
    const defaultTemplates = this.createDefaultTemplates();
    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    logger.info(`Loaded ${this.templates.size} notification templates`);
  }

  private async loadNotificationRules(): Promise<void> {
    // Load default rules
    const defaultRules = this.createDefaultRules();
    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    logger.info(`Loaded ${this.rules.size} notification rules`);
  }

  private async loadReminderSchedules(): Promise<void> {
    // Load active reminder schedules from database
    // This would typically load from a database table
    logger.info('Reminder schedules loaded');
  }

  private async startScheduledJobs(): Promise<void> {
    // Daily reminder check at 9 AM
    const dailyReminderJob = cron.schedule('0 9 * * *', async () => {
      await this.processDailyReminders();
    }, { scheduled: false });

    // Hourly notification processing
    const hourlyProcessingJob = cron.schedule('0 * * * *', async () => {
      await this.processScheduledNotifications();
    }, { scheduled: false });

    // Competition deadline checks every 15 minutes
    const deadlineCheckJob = cron.schedule('*/15 * * * *', async () => {
      await this.checkCompetitionDeadlines();
    }, { scheduled: false });

    this.cronJobs.set('daily-reminders', dailyReminderJob);
    this.cronJobs.set('hourly-processing', hourlyProcessingJob);
    this.cronJobs.set('deadline-checks', deadlineCheckJob);

    // Start all jobs
    this.cronJobs.forEach(job => job.start());

    logger.info('Scheduled notification jobs started');
  }

  private setupEventListeners(): void {
    // Listen for competition events
    this.io.on('connection', (socket) => {
      socket.on('subscribe-notifications', (userId: string) => {
        socket.join(`notifications-${userId}`);
        logger.debug('User subscribed to notifications', { userId, socketId: socket.id });
      });

      socket.on('unsubscribe-notifications', (userId: string) => {
        socket.leave(`notifications-${userId}`);
        logger.debug('User unsubscribed from notifications', { userId, socketId: socket.id });
      });
    });
  }

  /**
   * Send a notification to recipients
   */
  async sendNotification(
    type: NotificationType,
    recipients: string[],
    variables: Record<string, any> = {},
    options: {
      competitionId?: string;
      campaignId?: string;
      participationId?: string;
      priority?: NotificationPriority;
      channels?: NotificationChannel[];
      scheduledAt?: Date;
    } = {}
  ): Promise<string[]> {
    try {
      const template = this.getTemplateByType(type);
      if (!template) {
        throw new Error(`No template found for notification type: ${type}`);
      }

      const messageIds: string[] = [];

      for (const recipientId of recipients) {
        const recipient = await this.getRecipient(recipientId);
        if (!recipient) {
          logger.warn('Recipient not found', { recipientId });
          continue;
        }

        // Check recipient preferences
        if (!this.shouldSendNotification(recipient, type, options.channels || template.channels)) {
          logger.debug('Notification skipped due to recipient preferences', { recipientId, type });
          continue;
        }

        const message = await this.createNotificationMessage(
          template,
          recipient,
          variables,
          options
        );

        messageIds.push(message.id);

        if (options.scheduledAt) {
          await this.scheduleNotification(message);
        } else {
          await this.deliverNotification(message);
        }
      }

      return messageIds;

    } catch (error) {
      logger.error('Failed to send notification', { error, type, recipients: recipients.length });
      throw error;
    }
  }

  /**
   * Send competition-specific notifications
   */
  async sendCompetitionNotification(
    competitionId: string,
    type: NotificationType,
    variables: Record<string, any> = {}
  ): Promise<void> {
    try {
      const competition = await repository.competitions.findById(competitionId);
      if (!competition) {
        throw new Error(`Competition not found: ${competitionId}`);
      }

      // Get participants
      const participations = await repository.participations.findByCompetition(competitionId);
      const recipientIds = participations.map(p => p.userId);

      if (recipientIds.length === 0) {
        logger.info('No participants found for competition notification', { competitionId, type });
        return;
      }

      const competitionVariables = {
        ...variables,
        competitionName: competition.name,
        competitionDescription: competition.description,
        competitionUrl: `${process.env.FRONTEND_URL}/competitions/${competitionId}`,
        startDate: competition.startDate.toLocaleDateString(),
        endDate: competition.endDate.toLocaleDateString(),
        participantCount: competition.participantCount
      };

      await this.sendNotification(type, recipientIds, competitionVariables, {
        competitionId,
        priority: this.getNotificationPriority(type)
      });

      logger.info('Competition notification sent', {
        competitionId,
        type,
        recipients: recipientIds.length
      });

    } catch (error) {
      logger.error('Failed to send competition notification', { error, competitionId, type });
      throw error;
    }
  }

  /**
   * Send motivational messages based on user progress
   */
  async sendMotivationalMessage(
    userId: string,
    competitionId: string,
    messageType: 'encouragement' | 'streak' | 'milestone' | 'peer_achievement'
  ): Promise<void> {
    try {
      const participation = await repository.participations.findByUserAndCompetition(userId, competitionId);
      if (!participation) {
        return;
      }

      const competition = await repository.competitions.findById(competitionId);
      if (!competition) {
        return;
      }

      let notificationType: NotificationType;
      let variables: Record<string, any> = {
        userName: userId, // Would typically fetch user name
        competitionName: competition.name,
        progress: participation.progress.completionPercentage,
        currentStreak: participation.progress.currentStreak,
        totalScore: participation.totalScore
      };

      switch (messageType) {
        case 'encouragement':
          notificationType = NotificationType.ENCOURAGEMENT_MESSAGE;
          variables.encouragementMessage = this.generateEncouragementMessage(participation.progress.completionPercentage);
          break;
        case 'streak':
          notificationType = NotificationType.STREAK_REMINDER;
          variables.streakDays = participation.progress.currentStreak;
          break;
        case 'milestone':
          notificationType = NotificationType.MILESTONE_ACHIEVED;
          variables.milestone = this.getNextMilestone(participation.progress.completionPercentage);
          break;
        case 'peer_achievement':
          notificationType = NotificationType.PEER_ACHIEVEMENT;
          variables.peerAchievement = await this.getRecentPeerAchievement(competitionId, userId);
          break;
        default:
          return;
      }

      await this.sendNotification(notificationType, [userId], variables, {
        competitionId,
        priority: NotificationPriority.LOW
      });

    } catch (error) {
      logger.error('Failed to send motivational message', { error, userId, competitionId, messageType });
    }
  }

  /**
   * Create and schedule reminder for competition deadlines
   */
  async scheduleCompetitionReminders(competitionId: string): Promise<void> {
    try {
      const competition = await repository.competitions.findById(competitionId);
      if (!competition) {
        throw new Error(`Competition not found: ${competitionId}`);
      }

      const reminderSchedule: ReminderSchedule = {
        id: `competition-${competitionId}-reminders`,
        name: `${competition.name} Reminders`,
        type: 'competition',
        targetId: competitionId,
        targetType: 'competition',
        reminders: [
          {
            id: 'registration-reminder-7d',
            name: '7 days before registration deadline',
            templateId: 'registration-reminder',
            triggerBefore: 7 * 24 * 60 * 60, // 7 days in seconds
            channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
            priority: NotificationPriority.NORMAL,
            conditions: {
              onlyIfNotParticipating: true
            }
          },
          {
            id: 'registration-reminder-1d',
            name: '1 day before registration deadline',
            templateId: 'registration-deadline-approaching',
            triggerBefore: 24 * 60 * 60, // 1 day in seconds
            channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
            priority: NotificationPriority.HIGH,
            conditions: {
              onlyIfNotParticipating: true
            }
          },
          {
            id: 'competition-ending-3d',
            name: '3 days before competition ends',
            templateId: 'competition-ending-soon',
            triggerBefore: 3 * 24 * 60 * 60, // 3 days in seconds
            channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
            priority: NotificationPriority.NORMAL,
            conditions: {
              onlyIfNoProgress: false,
              minProgressThreshold: 25
            }
          },
          {
            id: 'competition-ending-1d',
            name: '1 day before competition ends',
            templateId: 'competition-ending-soon',
            triggerBefore: 24 * 60 * 60, // 1 day in seconds
            channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
            priority: NotificationPriority.HIGH
          }
        ],
        recipients: [],
        recipientQuery: {
          type: 'all',
          criteria: {}
        },
        active: true,
        completedReminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      };

      this.reminderSchedules.set(reminderSchedule.id, reminderSchedule);

      logger.info('Competition reminders scheduled', {
        competitionId,
        reminders: reminderSchedule.reminders.length
      });

    } catch (error) {
      logger.error('Failed to schedule competition reminders', { error, competitionId });
      throw error;
    }
  }

  /**
   * Process daily reminders
   */
  private async processDailyReminders(): Promise<void> {
    try {
      logger.info('Processing daily reminders...');

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const [scheduleId, schedule] of this.reminderSchedules) {
        if (!schedule.active) continue;

        for (const reminder of schedule.reminders) {
          if (schedule.completedReminders.includes(reminder.id)) continue;

          const shouldTrigger = await this.shouldTriggerReminder(schedule, reminder, now);
          if (shouldTrigger) {
            await this.triggerReminder(schedule, reminder);
            schedule.completedReminders.push(reminder.id);
          }
        }
      }

      logger.info('Daily reminders processing completed');

    } catch (error) {
      logger.error('Failed to process daily reminders', { error });
    }
  }

  /**
   * Check competition deadlines and send notifications
   */
  private async checkCompetitionDeadlines(): Promise<void> {
    try {
      const now = new Date();
      const competitions = await repository.competitions.findAll({
        status: 'active'
      });

      for (const competition of competitions) {
        // Check if competition is ending soon
        const timeUntilEnd = competition.endDate.getTime() - now.getTime();
        const hoursUntilEnd = timeUntilEnd / (1000 * 60 * 60);

        if (hoursUntilEnd <= 24 && hoursUntilEnd > 23) {
          // 24 hours before end
          await this.sendCompetitionNotification(
            competition.id,
            NotificationType.COMPETITION_ENDING_SOON,
            { hoursRemaining: Math.ceil(hoursUntilEnd) }
          );
        } else if (hoursUntilEnd <= 1 && hoursUntilEnd > 0) {
          // 1 hour before end
          await this.sendCompetitionNotification(
            competition.id,
            NotificationType.COMPETITION_ENDING_SOON,
            { hoursRemaining: 1, urgent: true }
          );
        }

        // Check registration deadline
        if (competition.registrationDeadline) {
          const timeUntilRegistrationEnd = competition.registrationDeadline.getTime() - now.getTime();
          const hoursUntilRegistrationEnd = timeUntilRegistrationEnd / (1000 * 60 * 60);

          if (hoursUntilRegistrationEnd <= 24 && hoursUntilRegistrationEnd > 23) {
            await this.sendCompetitionNotification(
              competition.id,
              NotificationType.REGISTRATION_DEADLINE_APPROACHING,
              { hoursRemaining: Math.ceil(hoursUntilRegistrationEnd) }
            );
          }
        }
      }

    } catch (error) {
      logger.error('Failed to check competition deadlines', { error });
    }
  }

  private async deliverNotification(message: NotificationMessage): Promise<void> {
    const deliveryPromises = message.channels.map(channel => 
      this.deliverToChannel(message, channel)
    );

    await Promise.allSettled(deliveryPromises);
  }

  private async deliverToChannel(
    message: NotificationMessage, 
    channel: NotificationChannel
  ): Promise<void> {
    const attempt: NotificationDeliveryAttempt = {
      id: `${message.id}-${channel}-${Date.now()}`,
      channel,
      attemptedAt: new Date(),
      status: 'failed'
    };

    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(message);
          break;
        case NotificationChannel.SLACK:
          await this.sendSlack(message);
          break;
        case NotificationChannel.WEBSOCKET:
          await this.sendWebSocket(message);
          break;
        case NotificationChannel.IN_APP:
          await this.sendInApp(message);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      attempt.status = 'success';
      attempt.deliveredAt = new Date();

    } catch (error) {
      attempt.error = error.message;
      logger.error('Failed to deliver notification', { 
        error, 
        messageId: message.id, 
        channel 
      });
    }

    message.deliveryAttempts.push(attempt);
  }

  private async sendEmail(message: NotificationMessage): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const recipient = await this.getRecipient(message.recipientId);
    if (!recipient?.email) {
      throw new Error('Recipient email not found');
    }

    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipient.email,
      subject: message.subject,
      text: message.body,
      html: message.htmlBody
    });
  }

  private async sendSlack(message: NotificationMessage): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) {
      throw new Error('Slack webhook URL not configured');
    }

    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: message.subject,
      attachments: [{
        color: this.getSlackColor(message.priority),
        text: message.body,
        ts: Math.floor(Date.now() / 1000)
      }]
    });
  }

  private async sendWebSocket(message: NotificationMessage): Promise<void> {
    this.io.to(`notifications-${message.recipientId}`).emit('notification', {
      id: message.id,
      type: message.type,
      subject: message.subject,
      body: message.body,
      priority: message.priority,
      timestamp: new Date(),
      metadata: message.metadata
    });
  }

  private async sendInApp(message: NotificationMessage): Promise<void> {
    // Store in-app notification in database for later retrieval
    // This would typically save to a notifications table
    logger.debug('In-app notification stored', { messageId: message.id });
  }

  // Helper methods
  private createDefaultTemplates(): NotificationTemplate[] {
    return [
      {
        id: 'competition-started',
        type: NotificationType.COMPETITION_STARTED,
        name: 'Competition Started',
        subject: '🚀 {{competitionName}} has started!',
        bodyTemplate: 'The competition "{{competitionName}}" has officially started! Join now and start contributing to earn points and badges.',
        variables: ['competitionName', 'competitionUrl', 'endDate'],
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: NotificationPriority.NORMAL,
        category: 'competition',
        tags: ['competition', 'start'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'registration-reminder',
        type: NotificationType.REGISTRATION_REMINDER,
        name: 'Registration Reminder',
        subject: '⏰ Don\'t miss out on {{competitionName}}!',
        bodyTemplate: 'Registration for "{{competitionName}}" is still open! Join {{participantCount}} other participants and start your journey.',
        variables: ['competitionName', 'competitionUrl', 'participantCount', 'registrationDeadline'],
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: NotificationPriority.NORMAL,
        category: 'registration',
        tags: ['registration', 'reminder'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'milestone-achieved',
        type: NotificationType.MILESTONE_ACHIEVED,
        name: 'Milestone Achieved',
        subject: '🎉 Congratulations! You\'ve reached a milestone!',
        bodyTemplate: 'Great job {{userName}}! You\'ve achieved {{milestone}} in {{competitionName}}. Keep up the excellent work!',
        variables: ['userName', 'milestone', 'competitionName', 'progress'],
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
        priority: NotificationPriority.HIGH,
        category: 'achievement',
        tags: ['milestone', 'achievement'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'encouragement-message',
        type: NotificationType.ENCOURAGEMENT_MESSAGE,
        name: 'Encouragement Message',
        subject: '💪 Keep going, {{userName}}!',
        bodyTemplate: '{{encouragementMessage}} You\'re {{progress}}% of the way there in {{competitionName}}!',
        variables: ['userName', 'encouragementMessage', 'progress', 'competitionName'],
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        priority: NotificationPriority.LOW,
        category: 'motivation',
        tags: ['encouragement', 'motivation'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  private createDefaultRules(): NotificationRule[] {
    return [
      {
        id: 'competition-start-notification',
        name: 'Competition Start Notification',
        description: 'Notify all users when a competition starts',
        active: true,
        trigger: {
          event: 'competition.started',
          conditions: {}
        },
        templateId: 'competition-started',
        recipientQuery: {
          type: 'user',
          criteria: { active: true }
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: NotificationPriority.NORMAL,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      }
    ];
  }

  // Additional helper methods would be implemented here...
  private getTemplateByType(type: NotificationType): NotificationTemplate | undefined {
    return Array.from(this.templates.values()).find(t => t.type === type);
  }

  private async getRecipient(recipientId: string): Promise<NotificationRecipient | null> {
    // This would typically fetch from user database
    return null;
  }

  private shouldSendNotification(
    recipient: NotificationRecipient, 
    type: NotificationType, 
    channels: NotificationChannel[]
  ): boolean {
    return recipient.preferences.types[type] && 
           channels.some(channel => recipient.preferences.channels[channel]);
  }

  private async createNotificationMessage(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    variables: Record<string, any>,
    options: any
  ): Promise<NotificationMessage> {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      templateId: template.id,
      recipientId: recipient.id,
      recipientType: recipient.type,
      subject: this.renderTemplate(template.subject, variables),
      body: this.renderTemplate(template.bodyTemplate, variables),
      htmlBody: template.htmlTemplate ? this.renderTemplate(template.htmlTemplate, variables) : undefined,
      channels: options.channels || template.channels,
      priority: options.priority || template.priority,
      scheduledAt: options.scheduledAt,
      competitionId: options.competitionId,
      campaignId: options.campaignId,
      participationId: options.participationId,
      variables,
      status: NotificationStatus.PENDING,
      deliveryAttempts: [],
      tags: template.tags,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  private getNotificationPriority(type: NotificationType): NotificationPriority {
    const highPriorityTypes = [
      NotificationType.COMPETITION_ENDING_SOON,
      NotificationType.REGISTRATION_DEADLINE_APPROACHING,
      NotificationType.MILESTONE_ACHIEVED
    ];

    return highPriorityTypes.includes(type) ? NotificationPriority.HIGH : NotificationPriority.NORMAL;
  }

  private generateEncouragementMessage(progress: number): string {
    const messages = [
      "You're doing great!",
      "Keep up the momentum!",
      "Every contribution counts!",
      "You're making excellent progress!",
      "Don't give up, you're almost there!"
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getNextMilestone(progress: number): string {
    if (progress < 25) return "25% completion";
    if (progress < 50) return "50% completion";
    if (progress < 75) return "75% completion";
    return "100% completion";
  }

  private async getRecentPeerAchievement(competitionId: string, userId: string): Promise<string> {
    // This would fetch recent achievements from other participants
    return "A peer just earned their first badge!";
  }

  private getSlackColor(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT: return 'danger';
      case NotificationPriority.HIGH: return 'warning';
      case NotificationPriority.NORMAL: return 'good';
      default: return '#36a64f';
    }
  }

  private async shouldTriggerReminder(
    schedule: ReminderSchedule, 
    reminder: ReminderConfig, 
    now: Date
  ): Promise<boolean> {
    // Implementation would check timing and conditions
    return false;
  }

  private async triggerReminder(schedule: ReminderSchedule, reminder: ReminderConfig): Promise<void> {
    // Implementation would trigger the reminder
    logger.info('Reminder triggered', { scheduleId: schedule.id, reminderId: reminder.id });
  }

  private async scheduleNotification(message: NotificationMessage): Promise<void> {
    // Implementation would schedule the notification for later delivery
    logger.info('Notification scheduled', { messageId: message.id, scheduledAt: message.scheduledAt });
  }

  private async processScheduledNotifications(): Promise<void> {
    // Implementation would process notifications scheduled for this hour
    logger.debug('Processing scheduled notifications...');
  }

  async healthCheck(): Promise<{ 
    status: string; 
    initialized: boolean;
    emailConfigured: boolean;
    slackConfigured: boolean;
    activeRules: number;
    activeSchedules: number;
  }> {
    return {
      status: this.initialized ? 'healthy' : 'initializing',
      initialized: this.initialized,
      emailConfigured: !!this.emailTransporter,
      slackConfigured: !!process.env.SLACK_WEBHOOK_URL,
      activeRules: Array.from(this.rules.values()).filter(r => r.active).length,
      activeSchedules: Array.from(this.reminderSchedules.values()).filter(s => s.active).length
    };
  }

  /**
   * Get notification analytics
   */
  async getAnalytics(startDate: Date, endDate: Date): Promise<NotificationAnalytics> {
    // Implementation would fetch analytics from database
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      deliveryRate: 0,
      byChannel: {} as any,
      byType: {} as any,
      byPriority: {} as any,
      timeline: [],
      topFailureReasons: []
    };
  }
}