/**
 * Notification service for sending alerts through various channels
 */

import axios from 'axios';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { NotificationChannel } from '../models';

export interface NotificationRequest {
  channel: NotificationChannel;
  recipients: string[];
  subject: string;
  message: string;
  data?: any;
  templateId?: string;
}

export interface WebhookPayload {
  alert: any;
  action: any;
  timestamp: Date;
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send notification through specified channel
   */
  public async sendNotification(request: NotificationRequest): Promise<void> {
    try {
      logger.info(`Sending notification via ${request.channel} to ${request.recipients.length} recipients`);

      switch (request.channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(request);
          break;
        case NotificationChannel.SLACK:
          await this.sendSlack(request);
          break;
        case NotificationChannel.IN_APP:
          await this.sendInApp(request);
          break;
        case NotificationChannel.SMS:
          await this.sendSMS(request);
          break;
        case NotificationChannel.WEBHOOK:
          await this.sendWebhook(request.recipients[0], request.data);
          break;
        default:
          logger.warn(`Unsupported notification channel: ${request.channel}`);
      }

    } catch (error) {
      logger.error(`Failed to send notification via ${request.channel}:`, error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(request: NotificationRequest): Promise<void> {
    // In a real implementation, this would integrate with an email service
    // like SendGrid, AWS SES, or similar
    
    logger.info(`EMAIL: ${request.subject}`);
    logger.info(`To: ${request.recipients.join(', ')}`);
    logger.info(`Message: ${request.message}`);

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(request: NotificationRequest): Promise<void> {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!slackWebhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return;
    }

    try {
      const payload = {
        text: request.subject,
        attachments: [
          {
            color: this.getSlackColor(request.data?.severity),
            fields: [
              {
                title: 'Message',
                value: request.message,
                short: false
              },
              {
                title: 'Recipients',
                value: request.recipients.join(', '),
                short: true
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true
              }
            ]
          }
        ]
      };

      await axios.post(slackWebhookUrl, payload);
      logger.info('Slack notification sent successfully');

    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
      throw error;
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(request: NotificationRequest): Promise<void> {
    try {
      // Store notification in database for in-app display
      for (const recipient of request.recipients) {
        await db.query(`
          INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          this.generateId(),
          recipient,
          'alert',
          request.subject,
          request.message,
          JSON.stringify(request.data || {}),
          new Date()
        ]);
      }

      // Publish real-time notification
      await db.publishEvent('notifications', {
        type: 'new_notification',
        recipients: request.recipients,
        subject: request.subject,
        message: request.message,
        data: request.data
      });

      logger.info('In-app notification sent successfully');

    } catch (error) {
      logger.error('Failed to send in-app notification:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(request: NotificationRequest): Promise<void> {
    // In a real implementation, this would integrate with an SMS service
    // like Twilio, AWS SNS, or similar
    
    logger.info(`SMS: ${request.message}`);
    logger.info(`To: ${request.recipients.join(', ')}`);

    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send webhook notification
   */
  public async sendWebhook(url: string, payload: any): Promise<void> {
    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AIOps-Analytics-Service/1.0'
        },
        timeout: 10000
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info(`Webhook sent successfully to ${url}`);
      } else {
        logger.warn(`Webhook returned status ${response.status} for ${url}`);
      }

    } catch (error) {
      logger.error(`Failed to send webhook to ${url}:`, error);
      throw error;
    }
  }

  /**
   * Send notification using template
   */
  public async sendTemplatedNotification(
    templateId: string,
    channel: NotificationChannel,
    recipients: string[],
    variables: Record<string, any>
  ): Promise<void> {
    try {
      // Get template
      const template = await this.getNotificationTemplate(templateId);
      
      if (!template) {
        throw new Error(`Notification template not found: ${templateId}`);
      }

      // Replace variables in template
      const subject = this.replaceVariables(template.subject, variables);
      const message = this.replaceVariables(template.body, variables);

      // Send notification
      await this.sendNotification({
        channel,
        recipients,
        subject,
        message,
        data: variables,
        templateId
      });

    } catch (error) {
      logger.error(`Failed to send templated notification:`, error);
      throw error;
    }
  }

  /**
   * Get notification template
   */
  private async getNotificationTemplate(templateId: string): Promise<any> {
    const result = await db.query(
      'SELECT * FROM notification_templates WHERE id = $1 AND is_active = true',
      [templateId]
    );

    return result.rows[0] || null;
  }

  /**
   * Replace variables in template
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Get Slack color based on severity
   */
  private getSlackColor(severity?: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return '#ffcc00';
      case 'low': return 'good';
      default: return '#cccccc';
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Get notification statistics
   */
  public async getNotificationStats(): Promise<{
    totalSent: number;
    byChannel: Record<string, number>;
    recentFailures: number;
  }> {
    // This would track notification statistics
    // For now, return placeholder data
    return {
      totalSent: 0,
      byChannel: {},
      recentFailures: 0
    };
  }
}