import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { AutomatedPRCountingService } from './automatedPRCountingService';
import { ProgressAnalysisEngine } from './progressAnalysisEngine';

export interface RealTimeEvent {
  type: 'pr_update' | 'progress_update' | 'alert' | 'sync_status' | 'analysis_complete';
  teacherId: string;
  studentId?: string;
  data: any;
  timestamp: Date;
}

export interface SocketUser {
  userId: string;
  role: 'teacher' | 'student';
  teacherId?: string;
  rooms: string[];
}

/**
 * Real-time Service for GitHub PR updates
 * Handles WebSocket connections and real-time event broadcasting
 */
export class RealTimeService {
  private static instance: RealTimeService;
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private automatedCountingService: AutomatedPRCountingService;
  private progressAnalysisEngine: ProgressAnalysisEngine;

  private constructor() {
    this.automatedCountingService = AutomatedPRCountingService.getInstance();
    this.progressAnalysisEngine = ProgressAnalysisEngine.getInstance();
  }

  public static getInstance(): RealTimeService {
    if (!RealTimeService.instance) {
      RealTimeService.instance = new RealTimeService();
    }
    return RealTimeService.instance;
  }

  /**
   * Initialize WebSocket server
   */
  public initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.setupRedisSubscriptions();
    
    logger.info('Real-time service initialized with WebSocket support');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data: { userId: string; role: 'teacher' | 'student'; teacherId?: string }) => {
        try {
          const { userId, role, teacherId } = data;
          
          const user: SocketUser = {
            userId,
            role,
            teacherId: role === 'teacher' ? userId : (teacherId || ''),
            rooms: []
          };

          this.connectedUsers.set(socket.id, user);

          // Join appropriate rooms
          if (role === 'teacher') {
            const teacherRoom = `teacher:${userId}`;
            socket.join(teacherRoom);
            user.rooms.push(teacherRoom);
            
            // Join class room for all students
            const classRoom = `class:${userId}`;
            socket.join(classRoom);
            user.rooms.push(classRoom);
          } else if (role === 'student' && teacherId) {
            const studentRoom = `student:${userId}`;
            socket.join(studentRoom);
            user.rooms.push(studentRoom);
            
            // Join teacher's class room
            const classRoom = `class:${teacherId}`;
            socket.join(classRoom);
            user.rooms.push(classRoom);
          }

          socket.emit('authenticated', { success: true, rooms: user.rooms });
          logger.info(`User authenticated: ${userId} (${role}) joined rooms: ${user.rooms.join(', ')}`);

        } catch (error) {
          logger.error('Authentication error:', error);
          socket.emit('authenticated', { success: false, error: 'Authentication failed' });
        }
      });

      // Handle subscription to specific events
      socket.on('subscribe', (data: { events: string[]; teacherId?: string; studentId?: string }) => {
        try {
          const { events, teacherId, studentId } = data;
          const user = this.connectedUsers.get(socket.id);
          
          if (!user) {
            socket.emit('subscription_error', { error: 'Not authenticated' });
            return;
          }

          // Subscribe to specific event types
          events.forEach(eventType => {
            const room = this.getEventRoom(eventType, teacherId, studentId);
            if (room) {
              socket.join(room);
              if (!user.rooms.includes(room)) {
                user.rooms.push(room);
              }
            }
          });

          socket.emit('subscribed', { events, rooms: user.rooms });
          logger.debug(`User ${user.userId} subscribed to events: ${events.join(', ')}`);

        } catch (error) {
          logger.error('Subscription error:', error);
          socket.emit('subscription_error', { error: 'Subscription failed' });
        }
      });

      // Handle manual PR sync request
      socket.on('sync_prs', async (data: { teacherId: string }) => {
        try {
          const user = this.connectedUsers.get(socket.id);
          
          if (!user || user.role !== 'teacher' || user.userId !== data.teacherId) {
            socket.emit('sync_error', { error: 'Unauthorized' });
            return;
          }

          // Trigger PR sync
          const job = await this.automatedCountingService.runCountingJob(data.teacherId);
          
          // Broadcast sync status
          this.broadcastEvent({
            type: 'sync_status',
            teacherId: data.teacherId,
            data: {
              status: job.status,
              studentsProcessed: job.studentsProcessed,
              prsFound: job.prsFound || 0,
              startedAt: job.startedAt,
              completedAt: job.completedAt
            },
            timestamp: new Date()
          });

        } catch (error) {
          logger.error('PR sync error:', error);
          socket.emit('sync_error', { error: 'Sync failed' });
        }
      });

      // Handle progress analysis request
      socket.on('analyze_progress', async (data: { teacherId: string; studentId: string }) => {
        try {
          const user = this.connectedUsers.get(socket.id);
          
          if (!user || user.role !== 'teacher' || user.userId !== data.teacherId) {
            socket.emit('analysis_error', { error: 'Unauthorized' });
            return;
          }

          // Trigger progress analysis
          const analysis = await this.progressAnalysisEngine.analyzeStudentProgress(
            data.studentId, 
            data.teacherId
          );
          
          if (analysis) {
            // Broadcast analysis complete
            this.broadcastEvent({
              type: 'analysis_complete',
              teacherId: data.teacherId,
              studentId: data.studentId,
              data: analysis,
              timestamp: new Date()
            });
          }

        } catch (error) {
          logger.error('Progress analysis error:', error);
          socket.emit('analysis_error', { error: 'Analysis failed' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          logger.info(`User disconnected: ${user.userId} (${user.role})`);
          this.connectedUsers.delete(socket.id);
        } else {
          logger.info(`Client disconnected: ${socket.id}`);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error:', error);
      });
    });

    // Handle server errors
    this.io.on('error', (error) => {
      logger.error('Socket.IO server error:', error);
    });
  }

  /**
   * Setup Redis subscriptions for cross-service events
   */
  private async setupRedisSubscriptions(): Promise<void> {
    try {
      // Subscribe to GitHub webhook events
      await db.subscribeToEvents('github_webhooks', (event) => {
        this.handleGitHubWebhookEvent(event);
      });

      // Subscribe to PR counting events
      await db.subscribeToEvents('pr_counting', (event) => {
        this.handlePRCountingEvent(event);
      });

      // Subscribe to progress analysis events
      await db.subscribeToEvents('progress_analysis', (event) => {
        this.handleProgressAnalysisEvent(event);
      });

      logger.info('Redis event subscriptions established');

    } catch (error) {
      logger.error('Failed to setup Redis subscriptions:', error);
    }
  }

  /**
   * Handle GitHub webhook events
   */
  private handleGitHubWebhookEvent(event: any): void {
    try {
      if (event.pull_request && event.repository) {
        const prEvent: RealTimeEvent = {
          type: 'pr_update',
          teacherId: event.teacherId || 'unknown',
          studentId: event.studentId,
          data: {
            action: event.action,
            pr: {
              number: event.pull_request.number,
              title: event.pull_request.title,
              state: event.pull_request.state,
              user: event.pull_request.user.login,
              repository: event.repository.full_name,
              url: event.pull_request.html_url
            }
          },
          timestamp: new Date()
        };

        this.broadcastEvent(prEvent);
      }
    } catch (error) {
      logger.error('Error handling GitHub webhook event:', error);
    }
  }

  /**
   * Handle PR counting events
   */
  private handlePRCountingEvent(event: any): void {
    try {
      const countingEvent: RealTimeEvent = {
        type: 'sync_status',
        teacherId: event.teacherId,
        data: {
          status: event.status,
          studentsProcessed: event.studentsProcessed,
          prsFound: event.prsFound,
          timestamp: event.timestamp
        },
        timestamp: new Date()
      };

      this.broadcastEvent(countingEvent);
    } catch (error) {
      logger.error('Error handling PR counting event:', error);
    }
  }

  /**
   * Handle progress analysis events
   */
  private handleProgressAnalysisEvent(event: any): void {
    try {
      const analysisEvent: RealTimeEvent = {
        type: 'progress_update',
        teacherId: event.teacherId,
        studentId: event.studentId,
        data: {
          progressScore: event.progressScore,
          trend: event.trend,
          riskLevel: event.riskLevel,
          insights: event.insights
        },
        timestamp: new Date()
      };

      this.broadcastEvent(analysisEvent);
    } catch (error) {
      logger.error('Error handling progress analysis event:', error);
    }
  }

  /**
   * Broadcast event to appropriate rooms
   */
  public broadcastEvent(event: RealTimeEvent): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast event');
      return;
    }

    try {
      // Determine target rooms based on event type and data
      const rooms = this.getTargetRooms(event);

      rooms.forEach(room => {
        this.io!.to(room).emit('realtime_event', event);
        logger.debug(`Broadcasted ${event.type} event to room: ${room}`);
      });

      // Store event for potential replay
      this.storeEvent(event);

    } catch (error) {
      logger.error('Error broadcasting event:', error);
    }
  }

  /**
   * Get target rooms for an event
   */
  private getTargetRooms(event: RealTimeEvent): string[] {
    const rooms: string[] = [];

    // Always include teacher room
    if (event.teacherId) {
      rooms.push(`teacher:${event.teacherId}`);
      rooms.push(`class:${event.teacherId}`);
    }

    // Include student room if specified
    if (event.studentId) {
      rooms.push(`student:${event.studentId}`);
    }

    // Add event-specific rooms
    const eventRoom = this.getEventRoom(event.type, event.teacherId, event.studentId);
    if (eventRoom && !rooms.includes(eventRoom)) {
      rooms.push(eventRoom);
    }

    return rooms;
  }

  /**
   * Get room name for specific event type
   */
  private getEventRoom(eventType: string, teacherId?: string, studentId?: string): string | null {
    switch (eventType) {
      case 'pr_update':
        return teacherId ? `pr_updates:${teacherId}` : null;
      case 'progress_update':
        return studentId ? `progress:${studentId}` : null;
      case 'sync_status':
        return teacherId ? `sync:${teacherId}` : null;
      case 'analysis_complete':
        return teacherId ? `analysis:${teacherId}` : null;
      default:
        return null;
    }
  }

  /**
   * Store event for replay/history
   */
  private async storeEvent(event: RealTimeEvent): Promise<void> {
    try {
      const cacheKey = `realtime_events:${event.teacherId}:${event.type}`;
      const eventData = {
        ...event,
        timestamp: event.timestamp.toISOString()
      };

      // Store in Redis with TTL of 1 hour
      await db.cacheSet(cacheKey, eventData, 3600);

    } catch (error) {
      logger.error('Error storing event:', error);
    }
  }

  /**
   * Get recent events for a teacher
   */
  public async getRecentEvents(teacherId: string, eventType?: string, limit: number = 50): Promise<RealTimeEvent[]> {
    try {
      const pattern = eventType 
        ? `realtime_events:${teacherId}:${eventType}`
        : `realtime_events:${teacherId}:*`;

      // This would need a more sophisticated implementation with Redis SCAN
      // For now, return empty array
      return [];

    } catch (error) {
      logger.error('Error getting recent events:', error);
      return [];
    }
  }

  /**
   * Send direct message to a specific user
   */
  public sendToUser(userId: string, event: RealTimeEvent): void {
    if (!this.io) return;

    // Find socket for user
    for (const [socketId, user] of this.connectedUsers) {
      if (user.userId === userId) {
        this.io.to(socketId).emit('realtime_event', event);
        logger.debug(`Sent direct message to user ${userId}`);
        break;
      }
    }
  }

  /**
   * Send message to all users in a teacher's class
   */
  public sendToClass(teacherId: string, event: RealTimeEvent): void {
    if (!this.io) return;

    const classRoom = `class:${teacherId}`;
    this.io.to(classRoom).emit('realtime_event', event);
    logger.debug(`Sent message to class: ${teacherId}`);
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    totalConnections: number;
    teachers: number;
    students: number;
    rooms: string[];
  } {
    const teachers = Array.from(this.connectedUsers.values()).filter(u => u.role === 'teacher').length;
    const students = Array.from(this.connectedUsers.values()).filter(u => u.role === 'student').length;
    const allRooms = new Set<string>();
    
    this.connectedUsers.forEach(user => {
      user.rooms.forEach(room => allRooms.add(room));
    });

    return {
      totalConnections: this.connectedUsers.size,
      teachers,
      students,
      rooms: Array.from(allRooms)
    };
  }

  /**
   * Shutdown the real-time service
   */
  public shutdown(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    this.connectedUsers.clear();
    logger.info('Real-time service shutdown complete');
  }
}