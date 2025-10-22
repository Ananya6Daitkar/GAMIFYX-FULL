import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Logger } from '../../utils/Logger';
import { NotificationTemplate } from '../../types/notification.types';

export class WebSocketService {
  private io: SocketIOServer;
  private logger: Logger;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(httpServer?: HttpServer) {
    this.logger = new Logger('WebSocketService');
    
    if (httpServer) {
      this.setupSocketServer(httpServer);
    }
  }

  /**
   * Setup Socket.IO server
   */
  private setupSocketServer(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.logger.info('WebSocket server initialized');
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.logger.info(`Client connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', (data: { userId: string, token: string }) => {
        // TODO: Verify JWT token
        this.connectedUsers.set(data.userId, socket.id);
        socket.join(`user:${data.userId}`);
        
        this.logger.info(`User authenticated: ${data.userId} -> ${socket.id}`);
        
        socket.emit('authenticated', { 
          success: true, 
          message: 'Successfully authenticated for notifications' 
        });
      });

      // Handle joining competition rooms
      socket.on('join_competition', (competitionId: string) => {
        socket.join(`competition:${competitionId}`);
        this.logger.info(`Socket ${socket.id} joined competition room: ${competitionId}`);
      });

      // Handle joining campaign rooms
      socket.on('join_campaign', (campaignId: string) => {
        socket.join(`campaign:${campaignId}`);
        this.logger.info(`Socket ${socket.id} joined campaign room: ${campaignId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        // Remove user from connected users map
        for (const [userId, socketId] of this.connectedUsers.entries()) {
          if (socketId === socket.id) {
            this.connectedUsers.delete(userId);
            break;
          }
        }
        
        this.logger.info(`Client disconnected: ${socket.id}`);
      });

      // Handle notification acknowledgment
      socket.on('notification_ack', (notificationId: string) => {
        this.logger.info(`Notification acknowledged: ${notificationId} by ${socket.id}`);
      });
    });
  }

  /**
   * Broadcast notification to specific users
   */
  async send(notification: any): Promise<void> {
    try {
      if (!this.io) {
        this.logger.warn('WebSocket server not initialized, skipping notification');
        return;
      }

      const { recipients, template, data } = notification;
      
      // Render notification content
      const renderedNotification = {
        id: notification.id,
        type: template.name,
        title: this.renderTemplate(template.subject, data),
        message: this.renderTemplate(this.htmlToText(template.body), data),
        data: data,
        timestamp: new Date().toISOString(),
        priority: notification.priority || 'medium'
      };

      // Send to each recipient
      recipients.forEach((recipientEmail: string) => {
        // Find user ID by email (this would typically be done via database lookup)
        this.sendToUserByEmail(recipientEmail, renderedNotification);
      });

      this.logger.info(`WebSocket notification sent to ${recipients.length} recipients`, {
        template: template.name,
        notificationId: notification.id
      });

    } catch (error) {
      this.logger.error('Failed to send WebSocket notification', error);
      throw error;
    }
  }

  /**
   * Send notification to user by email (requires user lookup)
   */
  private async sendToUserByEmail(email: string, notification: any): Promise<void> {
    // TODO: Implement user lookup by email to get userId
    // For now, we'll broadcast to all connected clients
    this.io.emit('notification', notification);
  }

  /**
   * Send notification to specific user by ID
   */
  async sendToUser(userId: string, notification: any): Promise<void> {
    const socketId = this.connectedUsers.get(userId);
    
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
      this.logger.info(`Notification sent to user ${userId} via socket ${socketId}`);
    } else {
      // User not connected, store notification for later delivery
      this.io.to(`user:${userId}`).emit('notification', notification);
      this.logger.info(`Notification queued for offline user ${userId}`);
    }
  }

  /**
   * Broadcast to all users in a competition
   */
  async broadcastToCompetition(competitionId: string, notification: any): Promise<void> {
    this.io.to(`competition:${competitionId}`).emit('competition_update', notification);
    this.logger.info(`Broadcast sent to competition ${competitionId}`);
  }

  /**
   * Broadcast to all users in a campaign
   */
  async broadcastToCampaign(campaignId: string, notification: any): Promise<void> {
    this.io.to(`campaign:${campaignId}`).emit('campaign_update', notification);
    this.logger.info(`Broadcast sent to campaign ${campaignId}`);
  }

  /**
   * Broadcast to all connected users
   */
  async broadcast(notification: any): Promise<void> {
    const { template, data } = notification;
    
    const renderedNotification = {
      id: notification.id,
      type: template.name,
      title: this.renderTemplate(template.subject, data),
      message: this.renderTemplate(this.htmlToText(template.body), data),
      data: data,
      timestamp: new Date().toISOString(),
      priority: notification.priority || 'medium'
    };

    this.io.emit('global_notification', renderedNotification);
    this.logger.info('Global notification broadcasted to all connected users');
  }

  /**
   * Send real-time progress update
   */
  async sendProgressUpdate(userId: string, progress: any): Promise<void> {
    const notification = {
      type: 'progress_update',
      data: progress,
      timestamp: new Date().toISOString()
    };

    await this.sendToUser(userId, notification);
  }

  /**
   * Send achievement notification
   */
  async sendAchievementNotification(userId: string, achievement: any): Promise<void> {
    const notification = {
      type: 'achievement_unlocked',
      title: `🏆 Achievement Unlocked: ${achievement.name}`,
      message: achievement.description,
      data: achievement,
      timestamp: new Date().toISOString(),
      priority: 'high'
    };

    await this.sendToUser(userId, notification);
  }

  /**
   * Send leaderboard update
   */
  async sendLeaderboardUpdate(campaignId: string, leaderboard: any): Promise<void> {
    const notification = {
      type: 'leaderboard_update',
      data: leaderboard,
      timestamp: new Date().toISOString()
    };

    await this.broadcastToCampaign(campaignId, notification);
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
   * Get connection statistics
   */
  getConnectionStats(): { totalConnections: number, authenticatedUsers: number } {
    return {
      totalConnections: this.io ? this.io.sockets.sockets.size : 0,
      authenticatedUsers: this.connectedUsers.size
    };
  }

  /**
   * Get connected users
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}