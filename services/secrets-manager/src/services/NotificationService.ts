import { RotationNotification } from '@/models/Secret';
import { logger } from '@/telemetry/logger';

export class NotificationService {
  private slackWebhookUrl?: string;
  private emailConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };

  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (process.env.EMAIL_HOST) {
      this.emailConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || '',
          pass: process.env.EMAIL_PASS || ''
        }
      };
    }
  }

  async sendRotationNotification(notification: RotationNotification): Promise<void> {
    try {
      // Send Slack notification
      if (this.slackWebhookUrl) {
        await this.sendSlackNotification(notification);
      }

      // Send email notification
      if (this.emailConfig) {
        await this.sendEmailNotification(notification);
      }

      // Log notification
      logger.info('Rotation notification sent', {
        secretPath: notification.secretPath,
        type: notification.type,
        recipients: notification.recipients
      });

    } catch (error) {
      logger.error('Failed to send rotation notification', { error, notification });
      throw error;
    }
  }

  private async sendSlackNotification(notification: RotationNotification): Promise<void> {
    try {
      const color = this.getNotificationColor(notification.type);
      const emoji = this.getNotificationEmoji(notification.type);
      
      const slackMessage = {
        text: `${emoji} Secret Rotation ${notification.type.toUpperCase()}`,
        attachments: [
          {
            color,
            fields: [
              {
                title: 'Secret Path',
                value: notification.secretPath,
                short: true
              },
              {
                title: 'Type',
                value: notification.type,
                short: true
              },
              {
                title: 'Message',
                value: notification.message,
                short: false
              }
            ],
            footer: 'AIOps Secrets Manager',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      if (notification.scheduledRotation) {
        slackMessage.attachments[0].fields.push({
          title: 'Scheduled Rotation',
          value: notification.scheduledRotation.toISOString(),
          short: true
        });
      }

      // In a real implementation, you would use a proper HTTP client
      // to send the message to Slack webhook
      logger.info('Slack notification would be sent', { slackMessage });

    } catch (error) {
      logger.error('Failed to send Slack notification', { error });
      throw error;
    }
  }

  private async sendEmailNotification(notification: RotationNotification): Promise<void> {
    try {
      const subject = `Secret Rotation ${notification.type.toUpperCase()}: ${notification.secretPath}`;
      
      const htmlBody = `
        <html>
          <body>
            <h2>Secret Rotation ${notification.type.toUpperCase()}</h2>
            <p><strong>Secret Path:</strong> ${notification.secretPath}</p>
            <p><strong>Message:</strong> ${notification.message}</p>
            ${notification.scheduledRotation ? 
              `<p><strong>Scheduled Rotation:</strong> ${notification.scheduledRotation.toISOString()}</p>` : 
              ''
            }
            <hr>
            <p><small>This is an automated message from AIOps Secrets Manager</small></p>
          </body>
        </html>
      `;

      // In a real implementation, you would use nodemailer or similar
      // to send the actual email
      logger.info('Email notification would be sent', {
        recipients: notification.recipients,
        subject,
        htmlBody
      });

    } catch (error) {
      logger.error('Failed to send email notification', { error });
      throw error;
    }
  }

  private getNotificationColor(type: string): string {
    switch (type) {
      case 'success':
        return 'good';
      case 'warning':
        return 'warning';
      case 'failure':
        return 'danger';
      default:
        return '#439FE0';
    }
  }

  private getNotificationEmoji(type: string): string {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'failure':
        return '❌';
      default:
        return '🔄';
    }
  }

  async sendSecurityAlert(alert: {
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    secretPath?: string;
    userId?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const emoji = this.getSeverityEmoji(alert.severity);
      const color = this.getSeverityColor(alert.severity);

      if (this.slackWebhookUrl) {
        const slackMessage = {
          text: `${emoji} SECURITY ALERT: ${alert.title}`,
          attachments: [
            {
              color,
              fields: [
                {
                  title: 'Severity',
                  value: alert.severity.toUpperCase(),
                  short: true
                },
                {
                  title: 'Message',
                  value: alert.message,
                  short: false
                }
              ],
              footer: 'AIOps Secrets Manager Security',
              ts: Math.floor(Date.now() / 1000)
            }
          ]
        };

        if (alert.secretPath) {
          slackMessage.attachments[0].fields.push({
            title: 'Secret Path',
            value: alert.secretPath,
            short: true
          });
        }

        if (alert.userId) {
          slackMessage.attachments[0].fields.push({
            title: 'User ID',
            value: alert.userId,
            short: true
          });
        }

        if (alert.ipAddress) {
          slackMessage.attachments[0].fields.push({
            title: 'IP Address',
            value: alert.ipAddress,
            short: true
          });
        }

        logger.info('Security alert would be sent to Slack', { slackMessage });
      }

      logger.info('Security alert processed', {
        title: alert.title,
        severity: alert.severity
      });

    } catch (error) {
      logger.error('Failed to send security alert', { error, alert });
      throw error;
    }
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#FF0000';
      case 'high':
        return '#FF6600';
      case 'medium':
        return '#FFCC00';
      case 'low':
        return '#0099FF';
      default:
        return '#CCCCCC';
    }
  }
}