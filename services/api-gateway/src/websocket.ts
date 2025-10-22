import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private redisClient: any;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/ws'
    });

    this.initializeRedis();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private async initializeRedis() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.redisClient.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
    });

    try {
      await this.redisClient.connect();
      console.log('✅ WebSocket Redis client connected');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
    }
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use((socket: any, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 User ${socket.userId} connected to WebSocket`);

      // Join user-specific room
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }

      // Join role-specific room
      if (socket.userRole) {
        socket.join(`role:${socket.userRole}`);
      }

      // Join general dashboard room
      socket.join('dashboard');

      // Handle dashboard subscription
      socket.on('subscribe:dashboard', (data) => {
        console.log(`📊 User ${socket.userId} subscribed to dashboard updates`);
        socket.join('dashboard:live');
        
        // Send initial dashboard data
        this.sendDashboardData(socket);
      });

      // Handle leaderboard subscription
      socket.on('subscribe:leaderboard', () => {
        console.log(`🏆 User ${socket.userId} subscribed to leaderboard updates`);
        socket.join('leaderboard:live');
      });

      // Handle metrics subscription
      socket.on('subscribe:metrics', () => {
        console.log(`📈 User ${socket.userId} subscribed to metrics updates`);
        socket.join('metrics:live');
      });

      // Handle achievement notifications
      socket.on('subscribe:achievements', () => {
        console.log(`🎯 User ${socket.userId} subscribed to achievement notifications`);
        socket.join('achievements:live');
      });

      // Handle GitHub PR subscriptions
      socket.on('subscribe:pr_updates', (data) => {
        console.log(`📊 User ${socket.userId} subscribed to PR updates`);
        socket.join('pr:live');
        
        // Join teacher-specific room if provided
        if (data.teacherId && socket.userRole === 'teacher') {
          socket.join(`teacher:${data.teacherId}`);
        }
        
        // Join student-specific room if provided
        if (data.studentId && socket.userRole === 'student') {
          socket.join(`student:${data.studentId}`);
        }
      });

      // Handle progress monitoring subscriptions
      socket.on('subscribe:progress_monitoring', (data) => {
        console.log(`📈 User ${socket.userId} subscribed to progress monitoring`);
        socket.join('progress:live');
        
        if (data.teacherId && socket.userRole === 'teacher') {
          socket.join(`teacher:${data.teacherId}`);
        }
      });

      // Handle sync status subscriptions
      socket.on('subscribe:sync_status', (data) => {
        console.log(`🔄 User ${socket.userId} subscribed to sync status`);
        socket.join('sync:live');
        
        if (data.teacherId && socket.userRole === 'teacher') {
          socket.join(`teacher:${data.teacherId}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 User ${socket.userId} disconnected: ${reason}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`❌ WebSocket error for user ${socket.userId}:`, error);
      });
    });
  }

  // Public methods for broadcasting updates
  public broadcastSystemHealth(healthData: any) {
    this.io.to('dashboard:live').emit('system:health:update', {
      timestamp: new Date().toISOString(),
      data: healthData
    });
  }

  public broadcastMetricsUpdate(metricsData: any) {
    this.io.to('metrics:live').emit('metrics:update', {
      timestamp: new Date().toISOString(),
      data: metricsData
    });
  }

  public broadcastLeaderboardUpdate(leaderboardData: any) {
    this.io.to('leaderboard:live').emit('leaderboard:update', {
      timestamp: new Date().toISOString(),
      data: leaderboardData
    });
  }

  public broadcastAchievementUnlocked(userId: string, achievement: any) {
    // Send to specific user
    this.io.to(`user:${userId}`).emit('achievement:unlocked', {
      timestamp: new Date().toISOString(),
      achievement
    });

    // Send to all dashboard subscribers for leaderboard updates
    this.io.to('dashboard:live').emit('achievement:global', {
      timestamp: new Date().toISOString(),
      userId,
      achievement
    });
  }

  public broadcastIncidentPrediction(incident: any) {
    this.io.to('dashboard:live').emit('incident:prediction', {
      timestamp: new Date().toISOString(),
      incident
    });
  }

  public broadcastAIInsight(insight: any) {
    this.io.to('dashboard:live').emit('ai:insight', {
      timestamp: new Date().toISOString(),
      insight
    });
  }

  public sendNotificationToUser(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', {
      timestamp: new Date().toISOString(),
      ...notification
    });
  }

  public sendNotificationToRole(role: string, notification: any) {
    this.io.to(`role:${role}`).emit('notification', {
      timestamp: new Date().toISOString(),
      ...notification
    });
  }

  private async sendDashboardData(socket: AuthenticatedSocket) {
    try {
      // This would typically fetch from your services
      // For now, sending mock data structure
      const dashboardData = {
        systemHealth: 94,
        activeUsers: await this.getActiveUsersCount(),
        recentAchievements: await this.getRecentAchievements(),
        currentMetrics: await this.getCurrentMetrics()
      };

      socket.emit('dashboard:initial', {
        timestamp: new Date().toISOString(),
        data: dashboardData
      });
    } catch (error) {
      console.error('Error sending dashboard data:', error);
    }
  }

  private async getActiveUsersCount(): Promise<number> {
    try {
      // Get count of connected users
      const sockets = await this.io.fetchSockets();
      return sockets.length;
    } catch (error) {
      console.error('Error getting active users count:', error);
      return 0;
    }
  }

  private async getRecentAchievements(): Promise<any[]> {
    try {
      // This would fetch from your gamification service
      // For now, returning mock data
      return [
        {
          id: '1',
          userId: 'user1',
          title: 'Quick Fix Hero',
          timestamp: new Date().toISOString()
        }
      ];
    } catch (error) {
      console.error('Error getting recent achievements:', error);
      return [];
    }
  }

  private async getCurrentMetrics(): Promise<any> {
    try {
      // This would fetch from your analytics service
      // For now, returning mock data
      return {
        cpu: 68,
        memory: 72,
        responseTime: 245,
        errorRate: 0.12
      };
    } catch (error) {
      console.error('Error getting current metrics:', error);
      return {};
    }
  }

  // GitHub PR real-time synchronization methods
  public broadcastPRUpdate(prData: any) {
    this.io.to('dashboard:live').emit('pr:update', {
      timestamp: new Date().toISOString(),
      data: prData
    });

    // Send to specific teacher if available
    if (prData.teacherId) {
      this.io.to(`teacher:${prData.teacherId}`).emit('pr:update', {
        timestamp: new Date().toISOString(),
        data: prData
      });
    }
  }

  public broadcastStudentPRCount(studentData: any) {
    this.io.to('dashboard:live').emit('student:pr:count', {
      timestamp: new Date().toISOString(),
      data: studentData
    });

    // Send to specific teacher
    if (studentData.teacherId) {
      this.io.to(`teacher:${studentData.teacherId}`).emit('student:pr:count', {
        timestamp: new Date().toISOString(),
        data: studentData
      });
    }
  }

  public broadcastClassPROverview(classData: any) {
    this.io.to('dashboard:live').emit('class:pr:overview', {
      timestamp: new Date().toISOString(),
      data: classData
    });

    // Send to specific teacher
    if (classData.teacherId) {
      this.io.to(`teacher:${classData.teacherId}`).emit('class:pr:overview', {
        timestamp: new Date().toISOString(),
        data: classData
      });
    }
  }

  public broadcastProgressAnalysis(analysisData: any) {
    this.io.to('dashboard:live').emit('progress:analysis', {
      timestamp: new Date().toISOString(),
      data: analysisData
    });

    // Send to specific teacher and student
    if (analysisData.teacherId) {
      this.io.to(`teacher:${analysisData.teacherId}`).emit('progress:analysis', {
        timestamp: new Date().toISOString(),
        data: analysisData
      });
    }

    if (analysisData.studentId) {
      this.io.to(`student:${analysisData.studentId}`).emit('progress:analysis', {
        timestamp: new Date().toISOString(),
        data: analysisData
      });
    }
  }

  public broadcastSyncStatus(syncData: any) {
    this.io.to('dashboard:live').emit('sync:status', {
      timestamp: new Date().toISOString(),
      data: syncData
    });

    // Send to specific teacher
    if (syncData.teacherId) {
      this.io.to(`teacher:${syncData.teacherId}`).emit('sync:status', {
        timestamp: new Date().toISOString(),
        data: syncData
      });
    }
  }

  // Enhanced GamifyX-specific broadcast methods
  public broadcastTeamUpdate(teamData: any) {
    this.io.to('dashboard:live').emit('team:update', {
      timestamp: new Date().toISOString(),
      data: teamData
    });
  }

  public broadcastBadgeEarned(userId: string, badge: any) {
    // Send to specific user
    this.io.to(`user:${userId}`).emit('badge:earned', {
      timestamp: new Date().toISOString(),
      badge
    });

    // Send to team members if applicable
    this.io.to('dashboard:live').emit('badge:global', {
      timestamp: new Date().toISOString(),
      userId,
      badge
    });
  }

  public broadcastLevelUp(userId: string, levelData: any) {
    this.io.to(`user:${userId}`).emit('level:up', {
      timestamp: new Date().toISOString(),
      ...levelData
    });

    // Celebrate with team
    this.io.to('dashboard:live').emit('level:celebration', {
      timestamp: new Date().toISOString(),
      userId,
      ...levelData
    });
  }

  public broadcastStreakUpdate(userId: string, streakData: any) {
    this.io.to(`user:${userId}`).emit('streak:update', {
      timestamp: new Date().toISOString(),
      ...streakData
    });
  }

  public broadcastChallengeUpdate(challengeData: any) {
    this.io.to('dashboard:live').emit('challenge:update', {
      timestamp: new Date().toISOString(),
      data: challengeData
    });
  }

  public broadcastSystemAlert(alert: any) {
    // Send to all users based on severity
    const room = alert.severity === 'critical' ? 'dashboard' : 'dashboard:live';
    this.io.to(room).emit('system:alert', {
      timestamp: new Date().toISOString(),
      alert
    });
  }

  public broadcastPerformancePrediction(prediction: any) {
    this.io.to('dashboard:live').emit('performance:prediction', {
      timestamp: new Date().toISOString(),
      prediction
    });
  }

  // Method to start periodic updates with enhanced GamifyX features
  public startPeriodicUpdates() {
    // Update system health every 5 seconds
    setInterval(() => {
      this.broadcastSystemHealth({
        score: Math.floor(Math.random() * 10) + 90, // 90-99
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    }, 5000);

    // Update metrics every 3 seconds
    setInterval(() => {
      this.broadcastMetricsUpdate({
        cpu: Math.floor(Math.random() * 20) + 60, // 60-80
        memory: Math.floor(Math.random() * 20) + 65, // 65-85
        responseTime: Math.floor(Math.random() * 100) + 200, // 200-300ms
        errorRate: Math.random() * 0.5, // 0-0.5%
        throughput: Math.floor(Math.random() * 500) + 1000 // 1000-1500 req/s
      });
    }, 3000);

    // Update leaderboard every 30 seconds
    setInterval(() => {
      this.broadcastLeaderboardUpdate({
        topPlayers: [
          { id: '1', name: 'Alex Chen', xp: 15420 + Math.floor(Math.random() * 100), level: 12 },
          { id: '2', name: 'Sarah Kim', xp: 14890 + Math.floor(Math.random() * 100), level: 11 },
          { id: '3', name: 'Mike Rodriguez', xp: 13750 + Math.floor(Math.random() * 100), level: 10 }
        ]
      });
    }, 30000);

    // Simulate random achievements every 2 minutes
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance
        const achievements = [
          { id: '1', title: 'Quick Fix Hero', icon: '⚡', rarity: 'epic' },
          { id: '2', title: 'Security Guardian', icon: '🛡️', rarity: 'rare' },
          { id: '3', title: 'Performance Optimizer', icon: '🚀', rarity: 'legendary' }
        ];
        const randomAchievement = achievements[Math.floor(Math.random() * achievements.length)];
        this.broadcastAchievementUnlocked('demo-user', randomAchievement);
      }
    }, 120000);

    // Simulate AI insights every 45 seconds
    setInterval(() => {
      const insights = [
        {
          id: Date.now().toString(),
          type: 'anomaly',
          message: 'Unusual traffic pattern detected in API Gateway',
          confidence: Math.floor(Math.random() * 20) + 80
        },
        {
          id: Date.now().toString(),
          type: 'prediction',
          message: 'Database connection pool may reach capacity soon',
          confidence: Math.floor(Math.random() * 15) + 85
        },
        {
          id: Date.now().toString(),
          type: 'optimization',
          message: 'Consider scaling up user-service instances',
          confidence: Math.floor(Math.random() * 10) + 90
        }
      ];
      const randomInsight = insights[Math.floor(Math.random() * insights.length)];
      this.broadcastAIInsight(randomInsight);
    }, 45000);

    // Simulate incident predictions every 3 minutes
    setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance
        const incidents = [
          {
            id: Date.now().toString(),
            title: 'High Memory Usage Predicted',
            severity: 'medium',
            confidence: Math.floor(Math.random() * 20) + 75,
            affectedSystems: ['api-gateway', 'user-service']
          },
          {
            id: Date.now().toString(),
            title: 'Database Performance Degradation',
            severity: 'high',
            confidence: Math.floor(Math.random() * 15) + 85,
            affectedSystems: ['postgres-cluster']
          }
        ];
        const randomIncident = incidents[Math.floor(Math.random() * incidents.length)];
        this.broadcastIncidentPrediction(randomIncident);
      }
    }, 180000);

    console.log('🔄 Started enhanced GamifyX periodic WebSocket updates');
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

export default WebSocketService;