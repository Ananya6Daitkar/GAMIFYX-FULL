import nodemailer from 'nodemailer';
import { Logger } from '../../utils/Logger';
import { NotificationTemplate } from '../../types/notification.types';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('EmailService');
    this.setupTransporter();
  }

  /**
   * Setup email transporter based on environment
   */
  private setupTransporter(): void {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // Use different transporter for development
    if (process.env.NODE_ENV === 'development') {
      this.transporter = nodemailer.createTransporter({
        host: 'localhost',
        port: 1025,
        ignoreTLS: true,
        auth: false
      });
    } else {
      this.transporter = nodemailer.createTransporter(emailConfig);
    }
  }

  /**
   * Send email notification
   */
  async send(notification: any): Promise<void> {
    try {
      const { recipients, template, data } = notification;
      
      // Render template with data
      const renderedSubject = this.renderTemplate(template.subject, data);
      const renderedBody = this.renderTemplate(template.body, data);

      // Send to each recipient
      const emailPromises = recipients.map(async (recipient: string) => {
        const mailOptions = {
          from: process.env.FROM_EMAIL || 'noreply@gamifyx-platform.com',
          to: recipient,
          subject: renderedSubject,
          html: this.wrapInEmailTemplate(renderedBody, template.name),
          text: this.htmlToText(renderedBody)
        };

        return this.transporter.sendMail(mailOptions);
      });

      await Promise.all(emailPromises);
      
      this.logger.info(`Email sent successfully to ${recipients.length} recipients`, {
        template: template.name,
        recipients: recipients.length
      });

    } catch (error) {
      this.logger.error('Failed to send email notification', error);
      throw error;
    }
  }

  /**
   * Render template with data using simple variable substitution
   */
  private renderTemplate(template: string, data: any): string {
    let rendered = template;
    
    // Replace variables in format {{variable.property}}
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    rendered = rendered.replace(variableRegex, (match, variable) => {
      const value = this.getNestedProperty(data, variable.trim());
      return value !== undefined ? String(value) : match;
    });

    return rendered;
  }

  /**
   * Get nested property from object using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Wrap email content in branded template
   */
  private wrapInEmailTemplate(content: string, templateName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GamifyX Notification</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .email-container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #00d4ff;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #00d4ff;
            text-decoration: none;
          }
          .cyberpunk-accent {
            background: linear-gradient(45deg, #00d4ff, #ff0080);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          h1, h2, h3 {
            color: #2c3e50;
          }
          h2 {
            border-left: 4px solid #00d4ff;
            padding-left: 15px;
          }
          .highlight {
            background-color: #e8f8ff;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #00d4ff;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(45deg, #00d4ff, #0099cc);
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
          ul {
            padding-left: 20px;
          }
          li {
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="logo">
              <span class="cyberpunk-accent">GamifyX</span>
            </div>
            <p>AIOps Learning Platform</p>
          </div>
          
          <div class="content">
            ${content}
          </div>
          
          <div class="highlight">
            <p><strong>💡 Quick Tip:</strong> Visit your dashboard to see real-time updates and track your progress!</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">
              Open Dashboard
            </a>
          </div>
          
          <div class="footer">
            <p>This notification was sent by GamifyX AIOps Learning Platform</p>
            <p>If you no longer wish to receive these notifications, you can update your preferences in your dashboard.</p>
            <p>&copy; 2024 GamifyX Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Convert HTML to plain text for email clients that don't support HTML
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.info('Email service connection verified');
      return true;
    } catch (error) {
      this.logger.error('Email service connection failed', error);
      return false;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(recipient: string): Promise<void> {
    const testNotification = {
      recipients: [recipient],
      template: {
        name: 'test_email',
        subject: '🧪 GamifyX Email Service Test',
        body: `
          <h2>🧪 Email Service Test</h2>
          <p>This is a test email to verify that the GamifyX notification system is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p>If you received this email, the notification system is functioning properly! ✅</p>
        `
      },
      data: {}
    };

    await this.send(testNotification);
  }
}