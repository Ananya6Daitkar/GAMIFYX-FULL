import { WebClient } from '@slack/web-api';
import { Logger } from '../../utils/Logger';
import { NotificationTemplate } from '../../types/notification.types';

export class SlackService {
  private client: WebClient;
  private logger: Logger;
  private enabled: boolean;

  constructor() {
    this.logger = new Logger('SlackService');
    this.enabled = !!process.env.SLACK_BOT_TOKEN;
    
    if (this.enabled) {
      this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
      this.logger.info('Slack service initialized');
    } else {
      this.logger.warn('Slack service disabled - no bot token provided');
    }
  }

  /**
   * Send Slack notification
   */
  async send(notification: any): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Slack service not enabled, skipping notification');
      return;
    }

    try {
      const { recipients, template, data } = notification;
      
      // Render notification content
      const title = this.renderTemplate(template.subject, data);
      const message = this.renderTemplate(this.htmlToText(template.body), data);
      
      // Create Slack blocks for rich formatting
      const blocks = this.createSlackBlocks(title, message, template.name, data);

      // Send to each recipient (assuming recipients are Slack user IDs or channels)
      const promises = recipients.map(async (recipient: string) => {
        return this.sendSlackMessage(recipient, blocks, title);
      });

      await Promise.all(promises);
      
      this.logger.info(`Slack notification sent to ${recipients.length} recipients`, {
        template: template.name
      });

    } catch (error) {
      this.logger.error('Failed to send Slack notification', error);
      throw error;
    }
  }

  /**
   * Send Slack message to user or channel
   */
  private async sendSlackMessage(recipient: string, blocks: any[], fallbackText: string): Promise<void> {
    try {
      // Determine if recipient is a channel (starts with #) or user ID
      const channel = recipient.startsWith('#') ? recipient : recipient;
      
      await this.client.chat.postMessage({
        channel,
        blocks,
        text: fallbackText, // Fallback for notifications
        username: 'GamifyX Bot',
        icon_emoji: ':robot_face:'
      });

      this.logger.info(`Slack message sent to ${recipient}`);
    } catch (error) {
      this.logger.error(`Failed to send Slack message to ${recipient}`, error);
    }
  }

  /**
   * Create Slack blocks for rich message formatting
   */
  private createSlackBlocks(title: string, message: string, templateName: string, data: any): any[] {
    const blocks: any[] = [];

    // Header block with emoji based on notification type
    const emoji = this.getEmojiForTemplate(templateName);
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${title}`,
        emoji: true
      }
    });

    // Main message block
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: this.formatMessageForSlack(message)
      }
    });

    // Add context-specific blocks based on template
    switch (templateName) {
      case 'competition_created':
        if (data.competition) {
          blocks.push(this.createCompetitionInfoBlock(data.competition));
        }
        break;
      
      case 'campaign_created':
        if (data.campaign) {
          blocks.push(this.createCampaignInfoBlock(data.campaign));
        }
        break;
      
      case 'milestone_achieved':
        if (data.progress) {
          blocks.push(this.createProgressBlock(data.progress));
        }
        break;
      
      case 'deadline_reminder':
        if (data.campaign && data.daysRemaining !== undefined) {
          blocks.push(this.createDeadlineBlock(data.campaign, data.daysRemaining));
        }
        break;
    }

    // Action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Open Dashboard',
            emoji: true
          },
          url: process.env.FRONTEND_URL || 'http://localhost:3000',
          action_id: 'open_dashboard'
        }
      ]
    });

    // Footer
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🤖 Sent by GamifyX AIOps Learning Platform | ${new Date().toLocaleString()}`
        }
      ]
    });

    return blocks;
  }

  /**
   * Create competition info block
   */
  private createCompetitionInfoBlock(competition: any): any {
    return {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Platform:*\n${competition.platform}`
        },
        {
          type: 'mrkdwn',
          text: `*Type:*\n${competition.type}`
        },
        {
          type: 'mrkdwn',
          text: `*Start Date:*\n${new Date(competition.startDate).toLocaleDateString()}`
        },
        {
          type: 'mrkdwn',
          text: `*End Date:*\n${new Date(competition.endDate).toLocaleDateString()}`
        }
      ]
    };
  }

  /**
   * Create campaign info block
   */
  private createCampaignInfoBlock(campaign: any): any {
    return {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Start Date:*\n${new Date(campaign.startDate).toLocaleDateString()}`
        },
        {
          type: 'mrkdwn',
          text: `*End Date:*\n${new Date(campaign.endDate).toLocaleDateString()}`
        },
        {
          type: 'mrkdwn',
          text: `*Course Credit:*\n${campaign.requirements?.gradingWeight || 0}%`
        },
        {
          type: 'mrkdwn',
          text: `*Participants:*\n${campaign.participants?.length || 0} students`
        }
      ]
    };
  }

  /**
   * Create progress block
   */
  private createProgressBlock(progress: any): any {
    const completionPercentage = progress.totalTasks > 0 
      ? Math.round((progress.completedTasks / progress.totalTasks) * 100)
      : 0;

    return {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Progress:*\n${progress.completedTasks}/${progress.totalTasks} tasks (${completionPercentage}%)`
        },
        {
          type: 'mrkdwn',
          text: `*Quality Score:*\n${progress.qualityScore}%`
        },
        {
          type: 'mrkdwn',
          text: `*Points Earned:*\n${progress.pointsEarned || 0}`
        },
        {
          type: 'mrkdwn',
          text: `*Status:*\n${progress.status || 'Active'}`
        }
      ]
    };
  }

  /**
   * Create deadline reminder block
   */
  private createDeadlineBlock(campaign: any, daysRemaining: number): any {
    const urgency = daysRemaining <= 1 ? ':rotating_light:' : daysRemaining <= 3 ? ':warning:' : ':calendar:';
    
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${urgency} *${daysRemaining} day(s) remaining* until ${campaign.name} ends on ${new Date(campaign.endDate).toLocaleDateString()}`
      }
    };
  }

  /**
   * Get emoji for notification template
   */
  private getEmojiForTemplate(templateName: string): string {
    const emojiMap: { [key: string]: string } = {
      'competition_created': '🏆',
      'campaign_created': '📋',
      'registration_confirmation': '✅',
      'milestone_achieved': '🎉',
      'deadline_reminder': '⏰',
      'achievement_unlocked': '🏅',
      'motivational_encouragement': '💪',
      'motivational_celebration': '🌟',
      'motivational_challenge': '🚀'
    };

    return emojiMap[templateName] || '🔔';
  }

  /**
   * Format message for Slack markdown
   */
  private formatMessageForSlack(message: string): string {
    return message
      .replace(/\*\*(.*?)\*\*/g, '*$1*') // Convert **bold** to *bold*
      .replace(/<li>(.*?)<\/li>/g, '• $1') // Convert list items
      .replace(/<ul>|<\/ul>/g, '') // Remove ul tags
      .replace(/<p>(.*?)<\/p>/g, '$1\n') // Convert paragraphs
      .replace(/<h3>(.*?)<\/h3>/g, '*$1*\n') // Convert h3 to bold
      .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
      .replace(/\n\s*\n/g, '\n') // Remove extra newlines
      .trim();
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Render template with data
   */
  private renderTemplate(template: string, data: any): string {
    let rendered = template;
    
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    rendered = rendered.replace(variableRegex, (match, variable) => {
      const value = this.getNestedProperty(data, variable.trim());
      return value !== undefined ? String(value) : match;
    });

    return rendered;
  }

  /**
   * Get nested property from object
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Send test message to verify Slack integration
   */
  async sendTestMessage(channel: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('Slack service not enabled');
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🧪 GamifyX Slack Integration Test',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'This is a test message to verify that the GamifyX Slack integration is working correctly.'
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🤖 Test sent at ${new Date().toISOString()}`
          }
        ]
      }
    ];

    await this.sendSlackMessage(channel, blocks, 'GamifyX Slack Integration Test');
  }

  /**
   * Get Slack workspace info
   */
  async getWorkspaceInfo(): Promise<any> {
    if (!this.enabled) {
      return null;
    }

    try {
      const result = await this.client.team.info();
      return result.team;
    } catch (error) {
      this.logger.error('Failed to get Slack workspace info', error);
      return null;
    }
  }
}