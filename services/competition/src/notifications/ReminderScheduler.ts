import cron from 'node-cron';
import { Logger } from '../utils/Logger';
import { NotificationEngine } from './NotificationEngine';
import { DatabaseService } from '../database/DatabaseService';
import { Campaign, Participation } from '../types/competition.types';
import { ReminderSchedule, MotivationalMessage } from '../types/notification.types';

export class ReminderScheduler {
  private logger: Logger;
  private notificationEngine: NotificationEngine;
  private databaseService: DatabaseService;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private motivationalMessages: MotivationalMessage[];

  constructor(notificationEngine: NotificationEngine) {
    this.logger = new Logger('ReminderScheduler');
    this.notificationEngine = notificationEngine;
    this.databaseService = new DatabaseService();
    this.motivationalMessages = this.loadMotivationalMessages();
    
    this.setupCronJobs();
  }

  /**
   * Setup recurring cron jobs for reminders
   */
  private setupCronJobs(): void {
    // Daily reminder check at 9 AM
    const dailyReminderTask = cron.schedule('0 9 * * *', async () => {
      await this.processDailyReminders();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    // Hourly deadline check
    const hourlyDeadlineTask = cron.schedule('0 * * * *', async () => {
      await this.processDeadlineReminders();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    // Weekly motivational messages on Monday at 10 AM
    const weeklyMotivationTask = cron.schedule('0 10 * * 1', async () => {
      await this.sendWeeklyMotivationalMessages();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    // Progress check every 3 days at 2 PM
    const progressCheckTask = cron.schedule('0 14 */3 * *', async () => {
      await this.sendProgressCheckReminders();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    // Start all tasks
    dailyReminderTask.start();
    hourlyDeadlineTask.start();
    weeklyMotivationTask.start();
    progressCheckTask.start();

    this.scheduledTasks.set('daily_reminders', dailyReminderTask);
    this.scheduledTasks.set('hourly_deadlines', hourlyDeadlineTask);
    this.scheduledTasks.set('weekly_motivation', weeklyMotivationTask);
    this.scheduledTasks.set('progress_check', progressCheckTask);

    this.logger.info('Reminder scheduler initialized with cron jobs');
  }

  /**
   * Process daily reminders for all active campaigns
   */
  private async processDailyReminders(): Promise<void> {
    try {
      this.logger.info('Processing daily reminders...');
      
      const activeCampaigns = await this.databaseService.getActiveCampaigns();
      
      for (const campaign of activeCampaigns) {
        await this.processCampaignReminders(campaign);
      }
      
      this.logger.info(`Processed daily reminders for ${activeCampaigns.length} campaigns`);
    } catch (error) {
      this.logger.error('Failed to process daily reminders', error);
    }
  }

  /**
   * Process reminders for a specific campaign
   */
  private async processCampaignReminders(campaign: Campaign): Promise<void> {
    const participants = await this.databaseService.getCampaignParticipants(campaign.id);
    const now = new Date();
    const endDate = new Date(campaign.endDate);
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Send different reminders based on time remaining
    if (daysUntilEnd === 7) {
      await this.sendWeeklyReminder(campaign, participants);
    } else if (daysUntilEnd === 3) {
      await this.sendThreeDayReminder(campaign, participants);
    } else if (daysUntilEnd === 1) {
      await this.sendFinalDayReminder(campaign, participants);
    }

    // Send progress-based reminders
    for (const participant of participants) {
      await this.checkParticipantProgress(campaign, participant);
    }
  }

  /**
   * Send weekly reminder (7 days before deadline)
   */
  private async sendWeeklyReminder(campaign: Campaign, participants: Participation[]): Promise<void> {
    this.notificationEngine.emit('deadline.approaching', {
      campaign,
      daysRemaining: 7,
      participants
    });

    this.logger.info(`Sent weekly reminder for campaign ${campaign.id} to ${participants.length} participants`);
  }

  /**
   * Send three-day reminder
   */
  private async sendThreeDayReminder(campaign: Campaign, participants: Participation[]): Promise<void> {
    this.notificationEngine.emit('deadline.approaching', {
      campaign,
      daysRemaining: 3,
      participants
    });

    this.logger.info(`Sent 3-day reminder for campaign ${campaign.id} to ${participants.length} participants`);
  }

  /**
   * Send final day reminder
   */
  private async sendFinalDayReminder(campaign: Campaign, participants: Participation[]): Promise<void> {
    this.notificationEngine.emit('deadline.approaching', {
      campaign,
      daysRemaining: 1,
      participants
    });

    this.logger.info(`Sent final day reminder for campaign ${campaign.id} to ${participants.length} participants`);
  }

  /**
   * Check individual participant progress and send appropriate reminders
   */
  private async checkParticipantProgress(campaign: Campaign, participant: Participation): Promise<void> {
    const progress = await this.databaseService.getParticipationProgress(participant.id);
    const lastActivity = new Date(progress.lastActivity || participant.joinedAt);
    const daysSinceActivity = Math.ceil((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    // Send inactivity reminder if no activity for 3+ days
    if (daysSinceActivity >= 3 && progress.status === 'active') {
      await this.sendInactivityReminder(participant, campaign, daysSinceActivity);
    }

    // Send encouragement if progress is low
    if (progress.completionPercentage < 25 && daysSinceActivity <= 2) {
      await this.sendEncouragementMessage(participant, campaign, progress);
    }

    // Send milestone celebration if significant progress made
    if (this.shouldCelebrateMilestone(progress)) {
      await this.sendMilestoneMessage(participant, campaign, progress);
    }
  }

  /**
   * Send inactivity reminder
   */
  private async sendInactivityReminder(
    participant: Participation, 
    campaign: Campaign, 
    daysSinceActivity: number
  ): Promise<void> {
    await this.notificationEngine.sendMotivationalMessage(participant.userId, {
      type: 'encouragement',
      campaign,
      progress: await this.databaseService.getParticipationProgress(participant.id)
    });

    this.logger.info(`Sent inactivity reminder to participant ${participant.userId} (${daysSinceActivity} days inactive)`);
  }

  /**
   * Send encouragement message
   */
  private async sendEncouragementMessage(
    participant: Participation,
    campaign: Campaign,
    progress: any
  ): Promise<void> {
    const message = this.selectMotivationalMessage('encouragement', progress);
    
    if (message) {
      await this.notificationEngine.sendMotivationalMessage(participant.userId, {
        type: 'encouragement',
        campaign,
        progress,
        customMessage: message.content
      });

      this.logger.info(`Sent encouragement message to participant ${participant.userId}`);
    }
  }

  /**
   * Send milestone celebration message
   */
  private async sendMilestoneMessage(
    participant: Participation,
    campaign: Campaign,
    progress: any
  ): Promise<void> {
    await this.notificationEngine.sendMotivationalMessage(participant.userId, {
      type: 'celebration',
      campaign,
      progress
    });

    this.logger.info(`Sent milestone celebration to participant ${participant.userId}`);
  }

  /**
   * Process deadline reminders (hourly check)
   */
  private async processDeadlineReminders(): Promise<void> {
    try {
      const now = new Date();
      const campaigns = await this.databaseService.getCampaignsEndingWithin(24); // Next 24 hours

      for (const campaign of campaigns) {
        const endDate = new Date(campaign.endDate);
        const hoursUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60));

        if (hoursUntilEnd === 6 || hoursUntilEnd === 1) {
          const participants = await this.databaseService.getCampaignParticipants(campaign.id);
          
          this.notificationEngine.emit('deadline.approaching', {
            campaign,
            hoursRemaining: hoursUntilEnd,
            participants
          });

          this.logger.info(`Sent ${hoursUntilEnd}-hour deadline reminder for campaign ${campaign.id}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process deadline reminders', error);
    }
  }

  /**
   * Send weekly motivational messages
   */
  private async sendWeeklyMotivationalMessages(): Promise<void> {
    try {
      this.logger.info('Sending weekly motivational messages...');
      
      const activeParticipants = await this.databaseService.getActiveParticipants();
      
      for (const participant of activeParticipants) {
        const progress = await this.databaseService.getParticipationProgress(participant.id);
        const campaign = await this.databaseService.getCampaignById(participant.campaignId);
        
        const message = this.selectMotivationalMessage('challenge', progress);
        
        if (message) {
          await this.notificationEngine.sendMotivationalMessage(participant.userId, {
            type: 'challenge',
            campaign,
            progress,
            customMessage: message.content
          });
        }
      }
      
      this.logger.info(`Sent weekly motivational messages to ${activeParticipants.length} participants`);
    } catch (error) {
      this.logger.error('Failed to send weekly motivational messages', error);
    }
  }

  /**
   * Send progress check reminders
   */
  private async sendProgressCheckReminders(): Promise<void> {
    try {
      this.logger.info('Sending progress check reminders...');
      
      const participants = await this.databaseService.getParticipantsNeedingProgressCheck();
      
      for (const participant of participants) {
        const progress = await this.databaseService.getParticipationProgress(participant.id);
        const campaign = await this.databaseService.getCampaignById(participant.campaignId);
        
        if (progress.completionPercentage < 50) {
          await this.notificationEngine.sendMotivationalMessage(participant.userId, {
            type: 'encouragement',
            campaign,
            progress
          });
        }
      }
      
      this.logger.info(`Sent progress check reminders to ${participants.length} participants`);
    } catch (error) {
      this.logger.error('Failed to send progress check reminders', error);
    }
  }

  /**
   * Schedule custom reminder for specific participant
   */
  async scheduleCustomReminder(
    participantId: string,
    reminderDate: Date,
    message: string,
    type: 'deadline' | 'progress' | 'motivation' = 'motivation'
  ): Promise<void> {
    const taskId = `custom_${participantId}_${Date.now()}`;
    const cronExpression = this.dateToCronExpression(reminderDate);
    
    const task = cron.schedule(cronExpression, async () => {
      const participant = await this.databaseService.getParticipationById(participantId);
      const campaign = await this.databaseService.getCampaignById(participant.campaignId);
      
      await this.notificationEngine.sendMotivationalMessage(participant.userId, {
        type: 'reminder',
        campaign,
        customMessage: message
      });
      
      // Remove task after execution
      this.scheduledTasks.delete(taskId);
      task.destroy();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.scheduledTasks.set(taskId, task);
    this.logger.info(`Scheduled custom reminder for participant ${participantId} at ${reminderDate}`);
  }

  /**
   * Load motivational messages from configuration
   */
  private loadMotivationalMessages(): MotivationalMessage[] {
    return [
      {
        type: 'encouragement',
        content: 'Every line of code you write is a step forward in your learning journey. Keep going! 💪',
        conditions: { progressRange: { min: 0, max: 50 } },
        frequency: 'on_event'
      },
      {
        type: 'encouragement',
        content: 'Remember, the best developers started exactly where you are now. Your persistence will pay off! 🌟',
        conditions: { progressRange: { min: 0, max: 30 } },
        frequency: 'weekly'
      },
      {
        type: 'celebration',
        content: 'Fantastic work! You\'re making excellent progress and your code quality is improving! 🎉',
        conditions: { progressRange: { min: 70, max: 100 } },
        frequency: 'on_event'
      },
      {
        type: 'challenge',
        content: 'Ready to level up? Try contributing to a project outside your comfort zone! 🚀',
        conditions: { progressRange: { min: 50, max: 80 }, streakLength: 3 },
        frequency: 'weekly'
      },
      {
        type: 'tip',
        content: 'Pro tip: Reading other developers\' code is one of the best ways to improve your own skills! 💡',
        conditions: { timeOfDay: ['morning'] },
        frequency: 'weekly'
      }
    ];
  }

  /**
   * Select appropriate motivational message based on conditions
   */
  private selectMotivationalMessage(type: string, progress: any): MotivationalMessage | null {
    const messages = this.motivationalMessages.filter(msg => 
      msg.type === type && this.messageMatchesConditions(msg, progress)
    );
    
    return messages.length > 0 ? messages[Math.floor(Math.random() * messages.length)] : null;
  }

  /**
   * Check if message matches current conditions
   */
  private messageMatchesConditions(message: MotivationalMessage, progress: any): boolean {
    const { conditions } = message;
    
    if (conditions.progressRange) {
      const percentage = progress.completionPercentage || 0;
      if (percentage < conditions.progressRange.min || percentage > conditions.progressRange.max) {
        return false;
      }
    }
    
    if (conditions.streakLength && progress.streak < conditions.streakLength) {
      return false;
    }
    
    if (conditions.timeOfDay) {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      if (!conditions.timeOfDay.includes(timeOfDay)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if milestone should be celebrated
   */
  private shouldCelebrateMilestone(progress: any): boolean {
    const milestones = [25, 50, 75, 90, 100];
    const currentPercentage = progress.completionPercentage || 0;
    const lastCelebrated = progress.lastMilestoneCelebrated || 0;
    
    return milestones.some(milestone => 
      currentPercentage >= milestone && lastCelebrated < milestone
    );
  }

  /**
   * Convert Date to cron expression
   */
  private dateToCronExpression(date: Date): string {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    return `${minute} ${hour} ${day} ${month} *`;
  }

  /**
   * Stop all scheduled tasks
   */
  stopAllTasks(): void {
    this.scheduledTasks.forEach(task => task.destroy());
    this.scheduledTasks.clear();
    this.logger.info('All reminder tasks stopped');
  }

  /**
   * Get scheduler statistics
   */
  getStats(): { activeTasks: number, taskNames: string[] } {
    return {
      activeTasks: this.scheduledTasks.size,
      taskNames: Array.from(this.scheduledTasks.keys())
    };
  }
}