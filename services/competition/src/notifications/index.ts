import { NotificationEngine } from './NotificationEngine';
import { ReminderScheduler } from './ReminderScheduler';
import { EmailService } from './channels/EmailService';
import { WebSocketService } from './channels/WebSocketService';
import { SlackService } from './channels/SlackService';
import { Logger } from '../utils/Logger';

export class NotificationService {
  private notificationEngine: NotificationEngine;
  private reminderScheduler: ReminderScheduler;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('NotificationService');
    this.notificationEngine = new NotificationEngine();
    this.reminderScheduler = new ReminderScheduler(this.notificationEngine);
    
    this.logger.info('Notification service initialized');
  }

  /**
   * Get notification engine instance
   */
  getNotificationEngine(): NotificationEngine {
    return this.notificationEngine;
  }

  /**
   * Get reminder scheduler instance
   */
  getReminderScheduler(): ReminderScheduler {
    return this.reminderScheduler;
  }

  /**
   * Initialize notification service with HTTP server for WebSocket
   */
  initialize(httpServer?: any): void {
    // Initialize WebSocket service with HTTP server if provided
    if (httpServer) {
      const webSocketService = new WebSocketService(httpServer);
      this.logger.info('WebSocket service initialized with HTTP server');
    }
  }

  /**
   * Shutdown notification service
   */
  shutdown(): void {
    this.reminderScheduler.stopAllTasks();
    this.notificationEngine.cleanup();
    this.logger.info('Notification service shutdown complete');
  }
}

// Export all notification-related classes and types
export { NotificationEngine } from './NotificationEngine';
export { ReminderScheduler } from './ReminderScheduler';
export { EmailService } from './channels/EmailService';
export { WebSocketService } from './channels/WebSocketService';
export { SlackService } from './channels/SlackService';
export * from '../types/notification.types';

// Create singleton instance
export const notificationService = new NotificationService();