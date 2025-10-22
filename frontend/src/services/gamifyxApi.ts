import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  message?: string;
}

export interface DashboardData {
  systemHealth: {
    score: number;
    status: string;
    uptime: string;
    incidents: number;
    responseTime: string;
  };
  teamMembers: TeamMember[];
  incidents: Incident[];
  achievements: Achievement[];
  metrics: DevOpsMetric[];
  aiInsights: AIInsight[];
}

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  rank: number;
  badges: Badge[];
  streak: number;
  status: 'online' | 'away' | 'offline';
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  predictedAt: string;
  affectedSystems: string[];
  aiPrediction: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
}

export interface DevOpsMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

export interface AIInsight {
  id: string;
  type: 'anomaly' | 'prediction' | 'optimization';
  message: string;
  confidence: number;
  timestamp: string;
}

export interface StudentPrediction {
  userId: string;
  name: string;
  avatar: string;
  predictedPerformance: number;
  riskScore: number;
  confidence: number;
  factors: {
    submissionFrequency: number;
    codeQualityAvg: number;
    testCoverageAvg: number;
    feedbackImplementationRate: number;
    engagementScore: number;
  };
  recommendations: string[];
  timestamp: string;
  trend: 'improving' | 'declining' | 'stable';
}

export interface AIMetrics {
  feedbackGeneration: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    accuracyScore: number;
    implementationRate: number;
  };
  modelPrediction: {
    totalPredictions: number;
    averageConfidence: number;
    accuracyTrend: number[];
    driftScore: number;
    lastTrainingDate: string;
  };
  serviceHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    errorRate: number;
    responseTime: number;
  };
  optimizations: {
    id: string;
    type: 'performance' | 'accuracy' | 'efficiency';
    recommendation: string;
    impact: 'low' | 'medium' | 'high';
    priority: number;
  }[];
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  gamification: {
    xp: number;
    level: number;
    rank: number;
    badges: Badge[];
    streak: number;
    achievements: Achievement[];
  };
  preferences: {
    theme: string;
    notifications: boolean;
    dashboardLayout: string;
  };
}

export interface LiveMetrics {
  systemHealth: number;
  cpu: number;
  memory: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  timestamp: string;
}

class GamifyXApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: process.env['REACT_APP_API_URL'] || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    // Load token from localStorage
    this.loadToken();
  }

  private loadToken(): void {
    const token = localStorage.getItem('gamifyx_token');
    if (token) {
      this.token = token;
    }
  }

  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('gamifyx_token', token);
  }

  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('gamifyx_token');
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  // Authentication endpoints
  public async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    const response: AxiosResponse<ApiResponse<{ token: string; user: any }>> = await this.api.post('/auth/login', {
      email,
      password,
    });
    
    if (response.data.success && response.data.data.token) {
      this.setToken(response.data.data.token);
    }
    
    return response.data;
  }

  public async register(userData: { email: string; password: string; name: string; role?: string }): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/auth/register', userData);
    return response.data;
  }

  public async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearToken();
    }
  }

  // GamifyX Dashboard endpoints
  public async getDashboardData(): Promise<ApiResponse<DashboardData>> {
    try {
      const response: AxiosResponse<ApiResponse<DashboardData>> = await this.api.get('/gamifyx/dashboard/data');
      return response.data;
    } catch (error) {
      // Return mock data for development if API is not available
      if (process.env.NODE_ENV === 'development') {
        return this.getMockDashboardData();
      }
      throw error;
    }
  }

  public async getLiveMetrics(): Promise<ApiResponse<LiveMetrics>> {
    try {
      const response: AxiosResponse<ApiResponse<LiveMetrics>> = await this.api.get('/gamifyx/metrics/live');
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        return this.getMockLiveMetrics();
      }
      throw error;
    }
  }

  public async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    const response: AxiosResponse<ApiResponse<UserProfile>> = await this.api.get('/gamifyx/user/profile');
    return response.data;
  }

  public async unlockAchievement(achievementId: string): Promise<ApiResponse<Achievement>> {
    const response: AxiosResponse<ApiResponse<Achievement>> = await this.api.post('/gamifyx/achievements/unlock', {
      achievementId,
    });
    return response.data;
  }

  // Enhanced GamifyX endpoints
  public async updateUserPreferences(preferences: any): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put('/gamifyx/user/preferences', preferences);
    return response.data;
  }

  public async getTeamStats(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/gamifyx/team/stats');
    return response.data;
  }

  public async submitFeedback(feedbackData: any): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/gamifyx/feedback', feedbackData);
    return response.data;
  }

  public async getNotifications(): Promise<ApiResponse<any[]>> {
    const response: AxiosResponse<ApiResponse<any[]>> = await this.api.get('/gamifyx/notifications');
    return response.data;
  }

  public async markNotificationAsRead(notificationId: string): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put(`/gamifyx/notifications/${notificationId}/read`);
    return response.data;
  }

  // Mock data methods for development
  private getMockDashboardData(): ApiResponse<DashboardData> {
    return {
      success: true,
      data: {
        systemHealth: {
          score: 94,
          status: 'healthy',
          uptime: '99.9%',
          incidents: 2,
          responseTime: '245ms'
        },
        teamMembers: [
          {
            id: '1',
            name: 'Alex Chen',
            avatar: '/avatars/placeholder.svg',
            xp: 15420,
            level: 12,
            rank: 1,
            badges: [
              { id: '1', name: 'Quick Fix Hero', icon: '⚡', color: '#00FFFF' },
              { id: '2', name: 'Uptime Streak', icon: '🔥', color: '#FF0080' },
            ],
            streak: 15,
            status: 'online',
          },
          {
            id: '2',
            name: 'Sarah Kim',
            avatar: '/avatars/placeholder.svg',
            xp: 14890,
            level: 11,
            rank: 2,
            badges: [
              { id: '3', name: 'Security Guardian', icon: '🛡️', color: '#00FF88' },
            ],
            streak: 8,
            status: 'online',
          },
          {
            id: '3',
            name: 'Mike Rodriguez',
            avatar: '/avatars/placeholder.svg',
            xp: 13750,
            level: 10,
            rank: 3,
            badges: [
              { id: '4', name: 'Performance Optimizer', icon: '🚀', color: '#FFB800' },
            ],
            streak: 12,
            status: 'away',
          },
        ],
        incidents: [
          {
            id: '1',
            title: 'High Memory Usage Detected',
            severity: 'medium',
            confidence: 87,
            predictedAt: new Date().toISOString(),
            affectedSystems: ['api-gateway', 'user-service'],
            aiPrediction: true,
          },
          {
            id: '2',
            title: 'Potential Database Bottleneck',
            severity: 'high',
            confidence: 92,
            predictedAt: new Date().toISOString(),
            affectedSystems: ['postgres-cluster'],
            aiPrediction: true,
          },
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
            unlocked: false,
          },
          {
            id: '2',
            title: 'Uptime Streak',
            description: 'Maintain 99.9% uptime for 30 days',
            icon: '🔥',
            rarity: 'legendary',
            progress: 25,
            maxProgress: 30,
            unlocked: false,
          },
        ],
        metrics: [
          {
            id: '1',
            name: 'CPU Usage',
            value: 68,
            unit: '%',
            trend: 'stable',
            status: 'good',
          },
          {
            id: '2',
            name: 'Response Time',
            value: 245,
            unit: 'ms',
            trend: 'down',
            status: 'good',
          },
          {
            id: '3',
            name: 'Error Rate',
            value: 0.12,
            unit: '%',
            trend: 'up',
            status: 'warning',
          },
          {
            id: '4',
            name: 'Throughput',
            value: 1247,
            unit: 'req/s',
            trend: 'up',
            status: 'good',
          },
        ],
        aiInsights: [
          {
            id: '1',
            type: 'anomaly',
            message: 'Unusual traffic pattern detected in API Gateway',
            confidence: 89,
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            type: 'prediction',
            message: 'Database connection pool may reach capacity in 2 hours',
            confidence: 94,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      timestamp: new Date().toISOString(),
      message: 'Mock dashboard data loaded successfully'
    };
  }

  private getMockLiveMetrics(): ApiResponse<LiveMetrics> {
    return {
      success: true,
      data: {
        systemHealth: 94 + Math.random() * 6 - 3, // 91-97
        cpu: 65 + Math.random() * 10 - 5, // 60-70
        memory: 72 + Math.random() * 8 - 4, // 68-76
        responseTime: 240 + Math.random() * 20 - 10, // 230-250
        errorRate: 0.1 + Math.random() * 0.1, // 0.1-0.2
        throughput: 1200 + Math.random() * 100 - 50, // 1150-1250
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      message: 'Mock live metrics generated'
    };
  }

  private getMockPerformancePredictions(): ApiResponse<StudentPrediction[]> {
    const students = [
      { id: '1', name: 'Alex Chen', avatar: '/avatars/placeholder.svg' },
      { id: '2', name: 'Sarah Kim', avatar: '/avatars/placeholder.svg' },
      { id: '3', name: 'Mike Rodriguez', avatar: '/avatars/placeholder.svg' },
      { id: '4', name: 'Emma Johnson', avatar: '/avatars/placeholder.svg' },
      { id: '5', name: 'David Park', avatar: '/avatars/placeholder.svg' },
    ];

    const predictions: StudentPrediction[] = students.map((student, index) => {
      const basePerformance = 60 + Math.random() * 35; // 60-95
      const riskScore = Math.max(0, Math.min(1, (100 - basePerformance) / 100 + Math.random() * 0.3 - 0.15));
      
      return {
        userId: student.id,
        name: student.name,
        avatar: student.avatar,
        predictedPerformance: basePerformance,
        riskScore: riskScore,
        confidence: 75 + Math.random() * 20, // 75-95
        factors: {
          submissionFrequency: 0.3 + Math.random() * 0.7,
          codeQualityAvg: 0.4 + Math.random() * 0.6,
          testCoverageAvg: 0.2 + Math.random() * 0.8,
          feedbackImplementationRate: 0.3 + Math.random() * 0.7,
          engagementScore: 0.4 + Math.random() * 0.6,
        },
        recommendations: this.generateMockRecommendations(riskScore, basePerformance),
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Within last hour
        trend: ['improving', 'declining', 'stable'][Math.floor(Math.random() * 3)] as 'improving' | 'declining' | 'stable',
      };
    });

    return {
      success: true,
      data: predictions.sort((a, b) => b.predictedPerformance - a.predictedPerformance),
      timestamp: new Date().toISOString(),
      message: 'Mock performance predictions generated'
    };
  }

  private getMockStudentPrediction(userId: string): ApiResponse<StudentPrediction> {
    const predictions = this.getMockPerformancePredictions();
    const student = predictions.data.find(p => p.userId === userId) || predictions.data[0];
    
    return {
      success: true,
      data: student,
      timestamp: new Date().toISOString(),
      message: 'Mock student prediction generated'
    };
  }

  private generateMockRecommendations(riskScore: number, performance: number): string[] {
    const recommendations = [];
    
    if (riskScore > 0.7) {
      recommendations.push('Immediate intervention recommended - schedule mentor meeting');
      recommendations.push('Consider peer programming sessions for additional support');
    } else if (riskScore > 0.4) {
      recommendations.push('Monitor progress closely and provide additional resources');
    }
    
    if (performance < 60) {
      recommendations.push('Consider scheduling additional study sessions');
      recommendations.push('Review fundamental concepts before moving to advanced topics');
    } else if (performance < 80) {
      recommendations.push('Focus on consistent practice and code quality improvement');
    }
    
    // Add some random specific recommendations
    const specificRecs = [
      'Increase submission frequency to maintain learning momentum',
      'Focus on code quality - review best practices and style guides',
      'Improve test coverage - practice writing unit tests',
      'Pay more attention to feedback and implement suggested improvements',
      'Increase engagement - participate more in discussions and activities',
    ];
    
    const numSpecific = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numSpecific; i++) {
      const rec = specificRecs[Math.floor(Math.random() * specificRecs.length)];
      if (!recommendations.includes(rec)) {
        recommendations.push(rec);
      }
    }
    
    return recommendations.length > 0 ? recommendations : ['Continue current learning approach - performance looks good'];
  }

  private getMockAIMetrics(): ApiResponse<AIMetrics> {
    return {
      success: true,
      data: {
        feedbackGeneration: {
          totalRequests: 15420 + Math.floor(Math.random() * 1000),
          successRate: 94 + Math.random() * 5,
          averageResponseTime: 245 + Math.random() * 100,
          accuracyScore: 87 + Math.random() * 10,
          implementationRate: 73 + Math.random() * 15,
        },
        modelPrediction: {
          totalPredictions: 8750 + Math.floor(Math.random() * 500),
          averageConfidence: 82 + Math.random() * 15,
          accuracyTrend: [78, 81, 83, 85, 87, 89, 91],
          driftScore: Math.random() * 0.6,
          lastTrainingDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        serviceHealth: {
          status: this.getRandomHealthStatus(),
          uptime: 2592000 + Math.random() * 86400, // ~30 days + random hours
          cpuUsage: 35 + Math.random() * 40,
          memoryUsage: 45 + Math.random() * 35,
          errorRate: Math.random() * 3,
          responseTime: 180 + Math.random() * 120,
        },
        optimizations: this.generateMockOptimizations(),
      },
      timestamp: new Date().toISOString(),
      message: 'Mock AI metrics generated'
    };
  }

  private getRandomHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const rand = Math.random();
    if (rand < 0.7) return 'healthy';
    if (rand < 0.9) return 'warning';
    return 'critical';
  }

  private generateMockOptimizations() {
    const optimizations = [
      {
        id: '1',
        type: 'performance' as const,
        recommendation: 'Optimize model inference pipeline to reduce response time',
        impact: 'high' as const,
        priority: 9,
      },
      {
        id: '2',
        type: 'accuracy' as const,
        recommendation: 'Retrain model with recent student data to improve predictions',
        impact: 'medium' as const,
        priority: 7,
      },
      {
        id: '3',
        type: 'efficiency' as const,
        recommendation: 'Implement model caching to reduce computational overhead',
        impact: 'medium' as const,
        priority: 6,
      },
      {
        id: '4',
        type: 'performance' as const,
        recommendation: 'Scale up AI service instances during peak hours',
        impact: 'high' as const,
        priority: 8,
      },
      {
        id: '5',
        type: 'accuracy' as const,
        recommendation: 'Fine-tune hyperparameters based on recent performance data',
        impact: 'low' as const,
        priority: 4,
      },
    ];

    // Randomly return 0-3 optimizations
    const count = Math.floor(Math.random() * 4);
    return optimizations.slice(0, count).sort((a, b) => b.priority - a.priority);
  }

  // Leaderboard endpoints
  public async getLeaderboard(): Promise<ApiResponse<TeamMember[]>> {
    const response: AxiosResponse<ApiResponse<TeamMember[]>> = await this.api.get('/leaderboard');
    return response.data;
  }

  // Achievements endpoints
  public async getAchievements(): Promise<ApiResponse<Achievement[]>> {
    const response: AxiosResponse<ApiResponse<Achievement[]>> = await this.api.get('/achievements');
    return response.data;
  }

  // Metrics endpoints
  public async getSystemMetrics(): Promise<ApiResponse<DevOpsMetric[]>> {
    const response: AxiosResponse<ApiResponse<DevOpsMetric[]>> = await this.api.get('/metrics/system');
    return response.data;
  }

  public async getSystemHealth(): Promise<ApiResponse<{ score: number; status: string }>> {
    const response: AxiosResponse<ApiResponse<{ score: number; status: string }>> = await this.api.get('/health-score');
    return response.data;
  }

  // Incidents endpoints
  public async getIncidents(): Promise<ApiResponse<Incident[]>> {
    const response: AxiosResponse<ApiResponse<Incident[]>> = await this.api.get('/incidents');
    return response.data;
  }

  // AI Insights endpoints
  public async getAIInsights(): Promise<ApiResponse<AIInsight[]>> {
    const response: AxiosResponse<ApiResponse<AIInsight[]>> = await this.api.get('/ai-insights');
    return response.data;
  }

  // Performance Prediction endpoints
  public async getPerformancePredictions(): Promise<ApiResponse<StudentPrediction[]>> {
    try {
      const response: AxiosResponse<ApiResponse<StudentPrediction[]>> = await this.api.get('/ai-feedback/predictions/batch');
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        return this.getMockPerformancePredictions();
      }
      throw error;
    }
  }

  public async getStudentPrediction(userId: string): Promise<ApiResponse<StudentPrediction>> {
    try {
      const response: AxiosResponse<ApiResponse<StudentPrediction>> = await this.api.get(`/ai-feedback/predictions/${userId}`);
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        return this.getMockStudentPrediction(userId);
      }
      throw error;
    }
  }

  public async refreshPredictions(): Promise<ApiResponse<StudentPrediction[]>> {
    try {
      const response: AxiosResponse<ApiResponse<StudentPrediction[]>> = await this.api.post('/ai-feedback/predictions/refresh');
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        return this.getMockPerformancePredictions();
      }
      throw error;
    }
  }

  // AI Metrics endpoints
  public async getAIMetrics(): Promise<ApiResponse<AIMetrics>> {
    try {
      const response: AxiosResponse<ApiResponse<AIMetrics>> = await this.api.get('/ai-feedback/metrics');
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        return this.getMockAIMetrics();
      }
      throw error;
    }
  }

  public async refreshAIMetrics(): Promise<ApiResponse<AIMetrics>> {
    try {
      const response: AxiosResponse<ApiResponse<AIMetrics>> = await this.api.post('/ai-feedback/metrics/refresh');
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        return this.getMockAIMetrics();
      }
      throw error;
    }
  }

  // Error handling helper
  public handleApiError(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}

// Create singleton instance
export const gamifyxApi = new GamifyXApiService();
export default gamifyxApi;