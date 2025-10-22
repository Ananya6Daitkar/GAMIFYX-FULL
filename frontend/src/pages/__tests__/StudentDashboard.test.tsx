/**
 * Tests for StudentDashboard page
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import StudentDashboard from '../StudentDashboard';
import * as apiService from '../../services/api';

const theme = createTheme();

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    getUserProfile: jest.fn(),
    getUserBadges: jest.fn(),
    getUserAchievements: jest.fn(),
    getUserSubmissions: jest.fn(),
    getGlobalLeaderboard: jest.fn(),
    getUserNotifications: jest.fn(),
    getUserPerformanceData: jest.fn(),
    getUserProgress: jest.fn(),
    getUserRiskScore: jest.fn(),
    markNotificationsAsRead: jest.fn()
  }
}));

// Mock the WebSocket service
jest.mock('../../services/websocket', () => ({
  webSocketService: {
    on: jest.fn(),
    off: jest.fn(),
    isConnected: jest.fn(() => true),
    disconnect: jest.fn(),
    requestNotificationPermission: jest.fn()
  }
}));

const mockApiResponses = {
  profile: {
    data: {
      userId: 'user-123',
      totalPoints: 1250,
      level: 5,
      currentXp: 750,
      xpToNextLevel: 1000,
      streaks: {
        current: 7,
        longest: 14,
        lastActivityDate: '2023-10-20T10:00:00Z'
      },
      leaderboardRank: 3,
      createdAt: '2023-09-01T00:00:00Z',
      updatedAt: '2023-10-20T10:00:00Z'
    }
  },
  badges: {
    data: {
      badges: [
        {
          id: 'badge-1',
          name: 'First Submission',
          description: 'Completed your first code submission',
          iconUrl: '/icons/first-submission.png',
          category: 'milestone',
          rarity: 'common',
          points: 50,
          earnedAt: '2023-10-15T10:00:00Z'
        }
      ]
    }
  },
  achievements: {
    data: {
      achievements: [
        {
          id: 'achievement-1',
          name: 'Quick Learner',
          description: 'Completed 5 assignments in one week',
          category: 'consistency',
          points: 100,
          earnedAt: '2023-10-18T12:00:00Z'
        }
      ]
    }
  },
  submissions: {
    data: [
      {
        id: 'submission-1',
        userId: 'user-123',
        title: 'React Component',
        description: 'Built a reusable React component',
        codeQualityScore: 85,
        completionTime: 3600,
        testCoverage: 90,
        securityScore: 95,
        overallScore: 88,
        feedback: [],
        submittedAt: '2023-10-20T09:00:00Z',
        status: 'completed'
      }
    ]
  },
  leaderboard: {
    data: {
      leaderboard: [
        {
          userId: 'user-1',
          username: 'Alice',
          totalPoints: 2500,
          level: 8,
          rank: 1,
          badges: 15,
          achievements: 12,
          streak: 10
        }
      ]
    }
  },
  notifications: {
    data: {
      notifications: [
        {
          id: 'notif-1',
          type: 'badge',
          title: 'New Badge Earned!',
          message: 'You earned the First Submission badge',
          isRead: false,
          createdAt: '2023-10-20T10:00:00Z'
        }
      ]
    }
  },
  performance: { data: [] },
  progress: { data: { dailyProgress: [] } },
  riskScore: { data: null }
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('StudentDashboard', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    (apiService.apiService.getUserProfile as jest.Mock).mockResolvedValue(mockApiResponses.profile);
    (apiService.apiService.getUserBadges as jest.Mock).mockResolvedValue(mockApiResponses.badges);
    (apiService.apiService.getUserAchievements as jest.Mock).mockResolvedValue(mockApiResponses.achievements);
    (apiService.apiService.getUserSubmissions as jest.Mock).mockResolvedValue(mockApiResponses.submissions);
    (apiService.apiService.getGlobalLeaderboard as jest.Mock).mockResolvedValue(mockApiResponses.leaderboard);
    (apiService.apiService.getUserNotifications as jest.Mock).mockResolvedValue(mockApiResponses.notifications);
    (apiService.apiService.getUserPerformanceData as jest.Mock).mockResolvedValue(mockApiResponses.performance);
    (apiService.apiService.getUserProgress as jest.Mock).mockResolvedValue(mockApiResponses.progress);
    (apiService.apiService.getUserRiskScore as jest.Mock).mockResolvedValue(mockApiResponses.riskScore);
  });

  it('shows loading state initially', () => {
    renderWithProviders(<StudentDashboard />);
    
    expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument();
  });

  it('loads and displays dashboard data', async () => {
    renderWithProviders(<StudentDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome back! 👋')).toBeInTheDocument();
    });

    expect(screen.getByText('Level 5 • 1,250 points')).toBeInTheDocument();
  });

  it('displays quick stats cards', async () => {
    renderWithProviders(<StudentDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Current Level')).toBeInTheDocument();
      expect(screen.getByText('Badges Earned')).toBeInTheDocument();
      expect(screen.getByText('Submissions')).toBeInTheDocument();
      expect(screen.getByText('Rank')).toBeInTheDocument();
    });
  });

  it('shows correct stats values', async () => {
    renderWithProviders(<StudentDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Level
      expect(screen.getByText('1')).toBeInTheDocument(); // Badges count
      expect(screen.getByText('#3')).toBeInTheDocument(); // Rank
    });
  });

  it('renders navigation tabs', async () => {
    renderWithProviders(<StudentDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('Badges & Achievements')).toBeInTheDocument();
      expect(screen.getByText('Submissions')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (apiService.apiService.getUserProfile as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<StudentDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data. Please try again.')).toBeInTheDocument();
    });
  });

  it('calls all required API endpoints', async () => {
    renderWithProviders(<StudentDashboard />);
    
    await waitFor(() => {
      expect(apiService.apiService.getUserProfile).toHaveBeenCalledWith('user-123');
      expect(apiService.apiService.getUserBadges).toHaveBeenCalledWith('user-123');
      expect(apiService.apiService.getUserAchievements).toHaveBeenCalledWith('user-123');
      expect(apiService.apiService.getUserSubmissions).toHaveBeenCalledWith('user-123', 10);
      expect(apiService.apiService.getGlobalLeaderboard).toHaveBeenCalledWith('all_time', 20);
      expect(apiService.apiService.getUserNotifications).toHaveBeenCalledWith('user-123', 10);
      expect(apiService.apiService.getUserPerformanceData).toHaveBeenCalledWith('user-123', '30d');
      expect(apiService.apiService.getUserProgress).toHaveBeenCalledWith('user-123', '30d');
      expect(apiService.apiService.getUserRiskScore).toHaveBeenCalledWith('user-123');
    });
  });

  it('renders performance monitor', async () => {
    renderWithProviders(<StudentDashboard />);
    
    await waitFor(() => {
      // Performance monitor should be rendered (it shows a score chip)
      expect(screen.getByText(/\d+/)).toBeInTheDocument();
    });
  });

  it('renders real-time updates component', async () => {
    renderWithProviders(<StudentDashboard />);
    
    await waitFor(() => {
      // Real-time updates component should be rendered
      expect(document.querySelector('[data-testid="real-time-updates"]') || 
             screen.queryByText(/connected|disconnected|connecting/)).toBeTruthy();
    });
  });
});