/**
 * API service for communicating with backend services
 */

import axios, { AxiosInstance } from 'axios';
import {
  ApiResponse,
  User,
  UserGameProfile,
  Badge,
  Achievement,
  Submission,
  LeaderboardEntry,
  NotificationMessage,
  PerformanceMetric,
  RiskScore
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env['REACT_APP_API_URL'] || 'http://localhost:8080/api/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(username: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.api.post('/auth/login', { username, password });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
    localStorage.removeItem('authToken');
  }

  // User Profile
  async getUserProfile(userId: string): Promise<ApiResponse<UserGameProfile>> {
    const response = await this.api.get(`/gamification/user/${userId}/profile`);
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Badges
  async getUserBadges(userId: string): Promise<ApiResponse<{ badges: Badge[]; statistics: any }>> {
    const response = await this.api.get(`/gamification/user/${userId}/badges`);
    return response.data;
  }

  async getAllBadges(): Promise<ApiResponse<{ badges: Badge[]; total: number }>> {
    const response = await this.api.get('/gamification/badges');
    return response.data;
  }

  // Achievements
  async getUserAchievements(userId: string): Promise<ApiResponse<{ achievements: Achievement[]; totalAchievements: number }>> {
    const response = await this.api.get(`/gamification/user/${userId}/achievements`);
    return response.data;
  }

  // Submissions
  async getUserSubmissions(userId: string, limit = 10): Promise<ApiResponse<Submission[]>> {
    const response = await this.api.get(`/submissions/user/${userId}?limit=${limit}`);
    return response.data;
  }

  async getSubmissionDetails(submissionId: string): Promise<ApiResponse<Submission>> {
    const response = await this.api.get(`/submissions/${submissionId}`);
    return response.data;
  }

  // Leaderboard
  async getGlobalLeaderboard(timeframe = 'all_time', limit = 50): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[] }>> {
    const response = await this.api.get(`/gamification/leaderboard/global?timeframe=${timeframe}&limit=${limit}`);
    return response.data;
  }

  async getUserRank(userId: string, timeframe = 'all_time'): Promise<ApiResponse<{ rank: number; totalUsers: number; percentile: number }>> {
    const response = await this.api.get(`/gamification/leaderboard/rank/${userId}?timeframe=${timeframe}`);
    return response.data;
  }

  async getLeaderboardAroundUser(userId: string, range = 5): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[] }>> {
    const response = await this.api.get(`/gamification/leaderboard/around/${userId}?range=${range}`);
    return response.data;
  }

  // Notifications
  async getUserNotifications(userId: string, limit = 20): Promise<ApiResponse<{ notifications: NotificationMessage[]; unreadCount: number }>> {
    const response = await this.api.get(`/gamification/user/${userId}/notifications?limit=${limit}`);
    return response.data;
  }

  async markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/gamification/user/${userId}/notifications/read`, { notificationIds });
    return response.data;
  }

  // Performance Data
  async getUserPerformanceData(userId: string, timeframe = '30d'): Promise<ApiResponse<PerformanceMetric[]>> {
    const response = await this.api.get(`/analytics/performance/${userId}?timeframe=${timeframe}`);
    return response.data;
  }

  async getUserProgress(userId: string, timeframe = '30d'): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/gamification/user/${userId}/progress?timeframe=${timeframe}`);
    return response.data;
  }

  // Risk Score
  async getUserRiskScore(userId: string): Promise<ApiResponse<RiskScore>> {
    const response = await this.api.get(`/analytics/risk-score/${userId}?includeFactors=true&includeRecommendations=true`);
    return response.data;
  }

  // Points and Transactions
  async getUserPointTransactions(userId: string, limit = 10): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/gamification/points/transactions/${userId}?limit=${limit}`);
    return response.data;
  }

  async getUserPointSummary(userId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/gamification/points/summary/${userId}`);
    return response.data;
  }

  // Comparison
  async getUserComparison(userId: string, timeframe = 'all_time'): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/gamification/user/${userId}/compare?timeframe=${timeframe}`);
    return response.data;
  }

  // Feedback
  async rateFeedback(feedbackId: string, rating: number, comment?: string): Promise<ApiResponse<any>> {
    const response = await this.api.post('/ai-feedback/feedback/rate', {
      feedbackId,
      userId: this.getCurrentUserId(),
      rating,
      comment
    });
    return response.data;
  }

  // Teacher Dashboard APIs
  async getTeacherDashboardData(teacherId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/teacher/dashboard/${teacherId}`);
    return response.data;
  }

  async getClassMetrics(classId: string, timeframe = '30d'): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/teacher/class/${classId}/metrics?timeframe=${timeframe}`);
    return response.data;
  }

  async getStudentAnalytics(studentId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/teacher/student/${studentId}/analytics`);
    return response.data;
  }

  async createIntervention(intervention: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/teacher/interventions', intervention);
    return response.data;
  }

  async updateIntervention(interventionId: string, updates: any): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/teacher/interventions/${interventionId}`, updates);
    return response.data;
  }

  async getInterventions(teacherId: string, filters?: any): Promise<ApiResponse<any>> {
    const params = new URLSearchParams(filters);
    const response = await this.api.get(`/teacher/interventions?teacherId=${teacherId}&${params}`);
    return response.data;
  }

  async getTeacherAlerts(teacherId: string, status?: string): Promise<ApiResponse<any>> {
    const params = status ? `?status=${status}` : '';
    const response = await this.api.get(`/teacher/alerts${params}`);
    return response.data;
  }

  async acknowledgeAlert(alertId: string, note?: string): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/teacher/alerts/${alertId}/acknowledge`, { note });
    return response.data;
  }

  async resolveAlert(alertId: string, resolution: string): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/teacher/alerts/${alertId}/resolve`, { resolution });
    return response.data;
  }

  async snoozeAlert(alertId: string, duration: number): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/teacher/alerts/${alertId}/snooze`, { duration });
    return response.data;
  }

  async createAlertAction(alertId: string, action: any): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/teacher/alerts/${alertId}/actions`, action);
    return response.data;
  }

  async generateReport(template: any, parameters: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/teacher/reports/generate', { template, parameters });
    return response.data;
  }

  async getReportTemplates(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/teacher/reports/templates');
    return response.data;
  }

  async getGeneratedReports(teacherId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/teacher/reports?teacherId=${teacherId}`);
    return response.data;
  }

  async downloadReport(reportId: string): Promise<Blob> {
    const response = await this.api.get(`/teacher/reports/${reportId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async deleteReport(reportId: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/teacher/reports/${reportId}`);
    return response.data;
  }

  async getTeacherMetrics(teacherId: string, timeframe = '30d'): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/teacher/metrics/${teacherId}?timeframe=${timeframe}`);
    return response.data;
  }

  async submitTeacherMetrics(metricsData: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/analytics/teacher-metrics', metricsData);
    return response.data;
  }

  // AI-powered teacher recommendations
  async getTeacherRecommendations(teacherId: string, context?: any): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/ai-feedback/teacher/recommendations/${teacherId}`, context);
    return response.data;
  }

  async getInterventionSuggestions(studentId: string, riskFactors: any): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/ai-feedback/interventions/suggest`, { studentId, riskFactors });
    return response.data;
  }

  // Helper methods
  private getCurrentUserId(): string {
    // This would typically come from the auth context
    return localStorage.getItem('userId') || '';
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.api.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;  // G
itHub Integration API endpoints
  async getStudentPRStats(studentId: string, teacherId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/github/student-stats?studentId=${studentId}&teacherId=${teacherId}`);
    return response.data;
  }

  async getStudentPRs(studentId: string, teacherId: string, limit: number = 5): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/github/student-prs?studentId=${studentId}&teacherId=${teacherId}&limit=${limit}`);
    return response.data;
  }

  async getStudentInsights(studentId: string, teacherId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/github/student-insights?studentId=${studentId}&teacherId=${teacherId}`);
    return response.data;
  }

  async getClassPROverview(teacherId: string, timeframe: string = '30d'): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/github/class-overview?teacherId=${teacherId}&timeframe=${timeframe}`);
    return response.data;
  }

  async getClassPRTrends(teacherId: string, timeframe: string = '30d'): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/github/class-trends?teacherId=${teacherId}&timeframe=${timeframe}`);
    return response.data;
  }

  async saveGitHubToken(teacherId: string, token: string): Promise<ApiResponse<any>> {
    const response = await this.api.post('/github/token', { teacherId, token });
    return response.data;
  }

  async testGitHubConnection(teacherId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/github/test-connection?teacherId=${teacherId}`);
    return response.data;
  }

  async addMonitoredRepository(teacherId: string, repository: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/github/repositories', { teacherId, ...repository });
    return response.data;
  }

  async removeMonitoredRepository(teacherId: string, repositoryId: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/github/repositories/${repositoryId}?teacherId=${teacherId}`);
    return response.data;
  }

  async addStudentGitHubMapping(teacherId: string, mapping: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/github/student-mappings', { teacherId, ...mapping });
    return response.data;
  }

  async removeStudentGitHubMapping(teacherId: string, mappingId: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/github/student-mappings/${mappingId}?teacherId=${teacherId}`);
    return response.data;
  }

  async syncGitHubRepositories(teacherId: string): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/github/sync?teacherId=${teacherId}`);
    return response.data;
  }