import { Router } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// GamifyX Dashboard Data Aggregation Endpoint
router.get('/dashboard/data', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // This endpoint aggregates data from multiple services for the GamifyX dashboard
    // In a real implementation, you would make parallel requests to your microservices
    
    const dashboardData = {
      systemHealth: {
        score: 94,
        status: 'optimal',
        uptime: '99.97%',
        incidents: 2,
        responseTime: '245ms'
      },
      teamMembers: [
        {
          id: '1',
          name: 'Alex Chen',
          avatar: '',
          xp: 15420,
          level: 12,
          rank: 1,
          badges: [
            { id: '1', name: 'Quick Fix Hero', icon: '⚡', color: '#00FFFF' },
            { id: '2', name: 'Uptime Streak', icon: '🔥', color: '#FF0080' }
          ],
          streak: 15,
          status: 'online'
        },
        {
          id: '2',
          name: 'Sarah Kim',
          avatar: '',
          xp: 14890,
          level: 11,
          rank: 2,
          badges: [
            { id: '3', name: 'Security Guardian', icon: '🛡️', color: '#00FF88' }
          ],
          streak: 8,
          status: 'online'
        },
        {
          id: '3',
          name: 'Mike Rodriguez',
          avatar: '',
          xp: 13750,
          level: 10,
          rank: 3,
          badges: [
            { id: '4', name: 'Performance Optimizer', icon: '🚀', color: '#FFB800' }
          ],
          streak: 12,
          status: 'away'
        }
      ],
      incidents: [
        {
          id: '1',
          title: 'High Memory Usage Detected',
          severity: 'medium',
          confidence: 87,
          predictedAt: new Date().toISOString(),
          affectedSystems: ['api-gateway', 'user-service'],
          aiPrediction: true
        },
        {
          id: '2',
          title: 'Potential Database Bottleneck',
          severity: 'high',
          confidence: 92,
          predictedAt: new Date().toISOString(),
          affectedSystems: ['postgres-cluster'],
          aiPrediction: true
        }
      ],
      achievements: [
        {
          id: '1',
          title: 'Quick Fix Hero',
          description: 'Resolve 10 incidents in under 5 minutes',
          icon: '⚡',
          rarity: 'epic',
          progress: 8,
          maxProgress: 10,
          unlocked: false
        },
        {
          id: '2',
          title: 'Uptime Streak',
          description: 'Maintain 99.9% uptime for 30 days',
          icon: '🔥',
          rarity: 'legendary',
          progress: 25,
          maxProgress: 30,
          unlocked: false
        }
      ],
      metrics: [
        {
          id: '1',
          name: 'CPU Usage',
          value: 68,
          unit: '%',
          trend: 'stable',
          status: 'good'
        },
        {
          id: '2',
          name: 'Response Time',
          value: 245,
          unit: 'ms',
          trend: 'down',
          status: 'good'
        },
        {
          id: '3',
          name: 'Error Rate',
          value: 0.12,
          unit: '%',
          trend: 'up',
          status: 'warning'
        },
        {
          id: '4',
          name: 'Throughput',
          value: 1247,
          unit: 'req/s',
          trend: 'up',
          status: 'good'
        }
      ],
      aiInsights: [
        {
          id: '1',
          type: 'anomaly',
          message: 'Unusual traffic pattern detected in API Gateway',
          confidence: 89,
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          type: 'prediction',
          message: 'Database connection pool may reach capacity in 2 hours',
          confidence: 94,
          timestamp: new Date().toISOString()
        }
      ]
    };

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
      userId: req.user?.userId
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: 'An error occurred while aggregating dashboard data',
      timestamp: new Date().toISOString()
    });
  }
});

// Real-time metrics endpoint
router.get('/metrics/live', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const liveMetrics = {
      systemHealth: Math.floor(Math.random() * 10) + 90, // 90-99
      cpu: Math.floor(Math.random() * 20) + 60, // 60-80
      memory: Math.floor(Math.random() * 20) + 65, // 65-85
      responseTime: Math.floor(Math.random() * 100) + 200, // 200-300ms
      errorRate: Math.random() * 0.5, // 0-0.5%
      throughput: Math.floor(Math.random() * 500) + 1000, // 1000-1500 req/s
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: liveMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching live metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch live metrics',
      message: 'An error occurred while fetching real-time metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// User profile with gamification data
router.get('/user/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userProfile = {
      id: req.user?.userId,
      email: req.user?.email,
      role: req.user?.role,
      gamification: {
        xp: 15420,
        level: 12,
        rank: 1,
        badges: [
          { id: '1', name: 'Quick Fix Hero', icon: '⚡', color: '#00FFFF' },
          { id: '2', name: 'Uptime Streak', icon: '🔥', color: '#FF0080' }
        ],
        streak: 15,
        achievements: [
          {
            id: '1',
            title: 'First Login',
            description: 'Welcome to GamifyX!',
            unlocked: true,
            unlockedAt: new Date().toISOString()
          }
        ]
      },
      preferences: {
        theme: 'cyberpunk',
        notifications: true,
        dashboardLayout: 'default'
      }
    };

    res.json({
      success: true,
      data: userProfile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      message: 'An error occurred while fetching user profile data',
      timestamp: new Date().toISOString()
    });
  }
});

// Trigger achievement unlock (for testing)
router.post('/achievements/unlock', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { achievementId } = req.body;
    
    // In a real implementation, this would validate and unlock the achievement
    const achievement = {
      id: achievementId,
      title: 'Quick Fix Hero',
      description: 'Resolve 10 incidents in under 5 minutes',
      icon: '⚡',
      rarity: 'epic',
      unlockedAt: new Date().toISOString()
    };

    // Here you would broadcast the achievement via WebSocket
    // wsService.broadcastAchievementUnlocked(req.user.userId, achievement);

    res.json({
      success: true,
      message: 'Achievement unlocked successfully',
      data: achievement,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error unlocking achievement:', error);
    res.status(500).json({
      error: 'Failed to unlock achievement',
      message: 'An error occurred while unlocking the achievement',
      timestamp: new Date().toISOString()
    });
  }
});

// Update user preferences
router.put('/user/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const preferences = req.body;
    
    // In a real implementation, this would update user preferences in the database
    res.json({
      success: true,
      message: 'User preferences updated successfully',
      data: preferences,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      error: 'Failed to update user preferences',
      message: 'An error occurred while updating preferences',
      timestamp: new Date().toISOString()
    });
  }
});

// Get team statistics
router.get('/team/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const teamStats = {
      totalMembers: 3,
      activeMembers: 2,
      averageLevel: 11,
      totalXP: 44060,
      teamRank: 1,
      completedChallenges: 25,
      ongoingChallenges: 3,
      teamAchievements: [
        { id: '1', name: 'Team Player', description: 'Complete 10 team challenges' },
        { id: '2', name: 'Collaboration Master', description: 'Help 5 team members' }
      ]
    };

    res.json({
      success: true,
      data: teamStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({
      error: 'Failed to fetch team stats',
      message: 'An error occurred while fetching team statistics',
      timestamp: new Date().toISOString()
    });
  }
});

// Submit feedback
router.post('/feedback', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const feedbackData = req.body;
    
    // In a real implementation, this would store feedback in the database
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: Date.now().toString(),
        ...feedbackData,
        submittedAt: new Date().toISOString(),
        userId: req.user?.userId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      error: 'Failed to submit feedback',
      message: 'An error occurred while submitting feedback',
      timestamp: new Date().toISOString()
    });
  }
});

// Get user notifications
router.get('/notifications', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = [
      {
        id: '1',
        type: 'achievement',
        title: 'New Achievement Unlocked!',
        message: 'You earned the "Quick Fix Hero" badge',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high'
      },
      {
        id: '2',
        type: 'system',
        title: 'System Update',
        message: 'New features available in the dashboard',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        priority: 'medium'
      },
      {
        id: '3',
        type: 'team',
        title: 'Team Challenge',
        message: 'Your team is leading in the weekly challenge!',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: true,
        priority: 'low'
      }
    ];

    res.json({
      success: true,
      data: notifications,
      unreadCount: notifications.filter(n => !n.read).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      message: 'An error occurred while fetching notifications',
      timestamp: new Date().toISOString()
    });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, this would update the notification in the database
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { id, read: true },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: 'An error occurred while updating notification',
      timestamp: new Date().toISOString()
    });
  }
});

// Get system health summary
router.get('/health/summary', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const healthSummary = {
      overall: 'healthy',
      score: 94,
      services: {
        'api-gateway': { status: 'healthy', responseTime: 45 },
        'user-service': { status: 'healthy', responseTime: 32 },
        'gamification-service': { status: 'healthy', responseTime: 28 },
        'analytics-service': { status: 'warning', responseTime: 156 },
        'ai-feedback-service': { status: 'healthy', responseTime: 89 }
      },
      alerts: [
        {
          id: '1',
          service: 'analytics-service',
          message: 'Response time above threshold',
          severity: 'warning',
          timestamp: new Date().toISOString()
        }
      ],
      uptime: '99.97%',
      lastIncident: new Date(Date.now() - 86400000).toISOString()
    };

    res.json({
      success: true,
      data: healthSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching health summary:', error);
    res.status(500).json({
      error: 'Failed to fetch health summary',
      message: 'An error occurred while fetching system health',
      timestamp: new Date().toISOString()
    });
  }
});

// Get performance analytics
router.get('/analytics/performance', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    // Generate mock performance data based on timeframe
    const dataPoints = timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : 30;
    const performanceData = Array.from({ length: dataPoints }, (_, i) => ({
      timestamp: new Date(Date.now() - (dataPoints - i) * 3600000).toISOString(),
      cpu: Math.random() * 20 + 60,
      memory: Math.random() * 20 + 65,
      responseTime: Math.random() * 100 + 200,
      throughput: Math.random() * 500 + 1000,
      errorRate: Math.random() * 0.5
    }));

    res.json({
      success: true,
      data: {
        timeframe,
        dataPoints: performanceData,
        summary: {
          avgCpu: performanceData.reduce((sum, d) => sum + d.cpu, 0) / dataPoints,
          avgMemory: performanceData.reduce((sum, d) => sum + d.memory, 0) / dataPoints,
          avgResponseTime: performanceData.reduce((sum, d) => sum + d.responseTime, 0) / dataPoints,
          avgThroughput: performanceData.reduce((sum, d) => sum + d.throughput, 0) / dataPoints,
          avgErrorRate: performanceData.reduce((sum, d) => sum + d.errorRate, 0) / dataPoints
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch performance analytics',
      message: 'An error occurred while fetching analytics data',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;