/**
 * Competition API service for frontend-backend communication
 */

import { 
  Competition, 
  Participation, 
  Campaign,
  CompetitionDashboardData,
  CompetitionSearchParams,
  CompetitionRegistrationData,
  CompetitionRegistrationResponse,
  CompetitionApiResponse,
  CompetitionPaginatedResponse,
  CompetitionLeaderboardEntry,
  CompetitionActivity,
  ProgressTrackingData
} from '../types/competition';

const API_BASE_URL = process.env.REACT_APP_COMPETITION_API_URL || 'http://localhost:3009';

class CompetitionApiService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Competition CRUD operations
  async getCompetitions(params?: CompetitionSearchParams): Promise<CompetitionPaginatedResponse<Competition>> {
    const queryParams = new URLSearchParams();
    
    if (params?.query) queryParams.append('query', params.query);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    // Add filters
    if (params?.filters) {
      if (params.filters.type) {
        params.filters.type.forEach(type => queryParams.append('type', type));
      }
      if (params.filters.status) {
        params.filters.status.forEach(status => queryParams.append('status', status));
      }
      if (params.filters.difficultyLevel) {
        params.filters.difficultyLevel.forEach(level => queryParams.append('difficultyLevel', level));
      }
      if (params.filters.tags) {
        params.filters.tags.forEach(tag => queryParams.append('tags', tag));
      }
    }

    const endpoint = `/competitions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<CompetitionPaginatedResponse<Competition>>(endpoint);
  }

  async getCompetition(id: string): Promise<Competition> {
    return this.request<Competition>(`/competitions/${id}`);
  }

  async getFeaturedCompetitions(): Promise<Competition[]> {
    return this.request<Competition[]>('/competitions/featured');
  }

  async getActiveCompetitions(): Promise<Competition[]> {
    return this.request<Competition[]>('/competitions/active');
  }

  // Participation operations
  async registerForCompetition(data: CompetitionRegistrationData): Promise<CompetitionRegistrationResponse> {
    return this.request<CompetitionRegistrationResponse>('/participations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async unregisterFromCompetition(competitionId: string): Promise<void> {
    return this.request<void>(`/participations/competition/${competitionId}`, {
      method: 'DELETE',
    });
  }

  async getUserParticipations(): Promise<Participation[]> {
    return this.request<Participation[]>('/participations/user');
  }

  async getParticipation(participationId: string): Promise<Participation> {
    return this.request<Participation>(`/participations/${participationId}`);
  }

  async getCompetitionParticipations(competitionId: string): Promise<Participation[]> {
    return this.request<Participation[]>(`/participations/competition/${competitionId}`);
  }

  // Progress tracking
  async getProgressTracking(participationId: string): Promise<ProgressTrackingData> {
    return this.request<ProgressTrackingData>(`/participations/${participationId}/progress`);
  }

  async syncExternalProgress(participationId: string): Promise<void> {
    return this.request<void>(`/participations/${participationId}/sync`, {
      method: 'POST',
    });
  }

  // Dashboard data
  async getDashboardData(): Promise<CompetitionDashboardData> {
    return this.request<CompetitionDashboardData>('/dashboard');
  }

  async getUserStats(): Promise<any> {
    return this.request<any>('/dashboard/stats');
  }

  // Leaderboard
  async getGlobalLeaderboard(limit?: number): Promise<CompetitionLeaderboardEntry[]> {
    const endpoint = `/leaderboard/global${limit ? `?limit=${limit}` : ''}`;
    return this.request<CompetitionLeaderboardEntry[]>(endpoint);
  }

  async getCompetitionLeaderboard(competitionId: string, limit?: number): Promise<CompetitionLeaderboardEntry[]> {
    const endpoint = `/leaderboard/competition/${competitionId}${limit ? `?limit=${limit}` : ''}`;
    return this.request<CompetitionLeaderboardEntry[]>(endpoint);
  }

  // Activity feed
  async getUserActivity(limit?: number): Promise<CompetitionActivity[]> {
    const endpoint = `/activity/user${limit ? `?limit=${limit}` : ''}`;
    return this.request<CompetitionActivity[]>(endpoint);
  }

  async getCompetitionActivity(competitionId: string, limit?: number): Promise<CompetitionActivity[]> {
    const endpoint = `/activity/competition/${competitionId}${limit ? `?limit=${limit}` : ''}`;
    return this.request<CompetitionActivity[]>(endpoint);
  }

  // Submissions
  async submitEntry(participationId: string, data: {
    requirementId: string;
    type: string;
    title: string;
    description: string;
    url: string;
    repositoryUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return this.request<any>(`/participations/${participationId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSubmissions(participationId: string): Promise<any[]> {
    return this.request<any[]>(`/participations/${participationId}/submissions`);
  }

  // Campaigns (for instructors)
  async getCampaigns(): Promise<Campaign[]> {
    return this.request<Campaign[]>('/campaigns');
  }

  async createCampaign(data: any): Promise<Campaign> {
    return this.request<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCampaign(id: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${id}`);
  }

  async updateCampaign(id: string, data: any): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCampaign(id: string): Promise<void> {
    return this.request<void>(`/campaigns/${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getCompetitionAnalytics(competitionId: string): Promise<any> {
    return this.request<any>(`/analytics/competition/${competitionId}`);
  }

  async getUserAnalytics(): Promise<any> {
    return this.request<any>('/analytics/user');
  }

  // External platform integration
  async connectGitHub(code: string): Promise<any> {
    return this.request<any>('/auth/github', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async connectGitLab(code: string): Promise<any> {
    return this.request<any>('/auth/gitlab', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getExternalProfiles(): Promise<any[]> {
    return this.request<any[]>('/profiles/external');
  }

  // Hacktoberfest specific
  async getHacktoberfestStatus(username: string): Promise<any> {
    return this.request<any>(`/hacktoberfest/status/${username}`);
  }

  async getHacktoberfestLeaderboard(usernames: string[]): Promise<any[]> {
    return this.request<any[]>('/hacktoberfest/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ usernames }),
    });
  }

  // Notifications
  async getNotifications(): Promise<any[]> {
    return this.request<any[]>('/notifications');
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    return this.request<void>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async updateNotificationPreferences(preferences: any): Promise<void> {
    return this.request<void>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.request<any>('/health');
  }
}

export const competitionApi = new CompetitionApiService();
export default competitionApi;