import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CompetitionProfileSection from '../CompetitionProfileSection';
import { competitionApi } from '../../../services/competitionApi';
import { CompetitionType, ParticipationStatus } from '../../../types/competition';

// Mock the competition API
jest.mock('../../../services/competitionApi');
const mockCompetitionApi = competitionApi as jest.Mocked<typeof competitionApi>;

// Mock data
const mockParticipations = [
  {
    id: 'participation-1',
    competitionId: 'competition-1',
    userId: 'user-123',
    status: ParticipationStatus.COMPLETED,
    registeredAt: '2023-10-01T00:00:00Z',
    completedAt: '2023-10-31T23:59:59Z',
    githubUsername: 'testuser',
    progress: {
      completedRequirements: ['req-1', 'req-2'],
      totalRequirements: 4,
      completionPercentage: 50,
      currentStreak: 5,
      longestStreak: 10,
      lastActivityAt: '2023-10-30T12:00:00Z',
      milestones: []
    },
    achievements: [
      {
        id: 'achievement-1',
        competitionId: 'competition-1',
        requirementId: 'req-1',
        name: 'First Pull Request',
        description: 'Made your first pull request',
        points: 100,
        earnedAt: '2023-10-05T10:00:00Z',
        verified: true
      }
    ],
    submissions: [],
    totalScore: 100,
    rank: 15
  }
];

const mockCompetitions = {
  items: [
    {
      id: 'competition-1',
      name: 'Hacktoberfest 2023',
      description: 'Annual open source contribution event',
      type: CompetitionType.HACKTOBERFEST,
      status: 'completed' as const,
      organizer: 'DigitalOcean',
      website: 'https://hacktoberfest.com',
      startDate: '2023-10-01T00:00:00Z',
      endDate: '2023-10-31T23:59:59Z',
      requirements: [],
      rewards: [],
      badges: [
        {
          id: 'badge-1',
          name: 'Hacktoberfest Participant',
          description: 'Participated in Hacktoberfest',
          imageUrl: '/badges/hacktoberfest.png',
          rarity: 'common' as const,
          criteria: 'Complete 4 pull requests',
          points: 500
        }
      ],
      tags: ['open-source', 'hacktoberfest'],
      categories: ['programming'],
      difficultyLevel: 'intermediate' as const,
      participantCount: 1000,
      rules: [],
      eligibilityCriteria: [],
      createdAt: '2023-09-01T00:00:00Z',
      updatedAt: '2023-10-31T23:59:59Z'
    }
  ]
};

const mockActivity = [
  {
    id: 'activity-1',
    type: 'achievement' as const,
    competitionId: 'competition-1',
    competitionName: 'Hacktoberfest 2023',
    description: 'Earned First Pull Request achievement',
    points: 100,
    timestamp: '2023-10-05T10:00:00Z',
    metadata: {}
  }
];

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CompetitionProfileSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompetitionApi.getUserParticipations.mockResolvedValue(mockParticipations);
    mockCompetitionApi.getCompetitions.mockResolvedValue(mockCompetitions);
    mockCompetitionApi.getUserActivity.mockResolvedValue(mockActivity);
  });

  it('renders loading state initially', () => {
    renderWithTheme(<CompetitionProfileSection userId="user-123" />);
    
    expect(screen.getByText('🏆 Competition Profile')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders competition statistics correctly', async () => {
    renderWithTheme(<CompetitionProfileSection userId="user-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Total competitions
      expect(screen.getByText('100')).toBeInTheDocument(); // Total points
      expect(screen.getByText('1')).toBeInTheDocument(); // Total achievements
      expect(screen.getByText('1')).toBeInTheDocument(); // Verified achievements
      expect(screen.getByText('#15')).toBeInTheDocument(); // Best rank
    });
  });

  it('renders competition timeline', async () => {
    renderWithTheme(<CompetitionProfileSection userId="user-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('📅 Competition History')).toBeInTheDocument();
      expect(screen.getByText('Registered for Competition')).toBeInTheDocument();
      expect(screen.getByText('First Pull Request')).toBeInTheDocument();
      expect(screen.getByText('Competition Completed')).toBeInTheDocument();
    });
  });

  it('shows external platform connections', async () => {
    renderWithTheme(<CompetitionProfileSection userId="user-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('🔗 Connected Platforms:')).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
  });

  it('opens achievement dialog when achievement is clicked', async () => {
    renderWithTheme(<CompetitionProfileSection userId="user-123" />);
    
    await waitFor(() => {
      const achievementElement = screen.getByText('First Pull Request');
      fireEvent.click(achievementElement);
    });

    await waitFor(() => {
      expect(screen.getByText('Made your first pull request')).toBeInTheDocument();
      expect(screen.getByText('100 points')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  it('handles empty state correctly', async () => {
    mockCompetitionApi.getUserParticipations.mockResolvedValue([]);
    mockCompetitionApi.getCompetitions.mockResolvedValue({ items: [] });
    mockCompetitionApi.getUserActivity.mockResolvedValue([]);

    renderWithTheme(<CompetitionProfileSection userId="user-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Ready to compete? 🚀')).toBeInTheDocument();
      expect(screen.getByText('Join external competitions like Hacktoberfest to showcase your skills and earn achievements!')).toBeInTheDocument();
      expect(screen.getByText('Explore Competitions')).toBeInTheDocument();
    });
  });

  it('handles error state correctly', async () => {
    mockCompetitionApi.getUserParticipations.mockRejectedValue(new Error('API Error'));

    renderWithTheme(<CompetitionProfileSection userId="user-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('shows timeline expansion controls when there are many entries', async () => {
    // Create more timeline entries than the default limit
    const manyParticipations = Array.from({ length: 15 }, (_, i) => ({
      ...mockParticipations[0],
      id: `participation-${i}`,
      achievements: [{
        ...mockParticipations[0].achievements[0],
        id: `achievement-${i}`,
        earnedAt: `2023-10-${String(i + 1).padStart(2, '0')}T10:00:00Z`
      }]
    }));

    mockCompetitionApi.getUserParticipations.mockResolvedValue(manyParticipations);

    renderWithTheme(<CompetitionProfileSection userId="user-123" maxTimelineItems={5} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Show All \(\d+\)/)).toBeInTheDocument();
    });

    // Click to expand
    const showAllButton = screen.getByText(/Show All \(\d+\)/);
    fireEvent.click(showAllButton);

    await waitFor(() => {
      expect(screen.getByText('Show Less')).toBeInTheDocument();
    });
  });

  it('calls API methods with correct parameters', async () => {
    renderWithTheme(<CompetitionProfileSection userId="user-123" />);
    
    await waitFor(() => {
      expect(mockCompetitionApi.getUserParticipations).toHaveBeenCalledTimes(1);
      expect(mockCompetitionApi.getCompetitions).toHaveBeenCalledWith({ limit: 100 });
      expect(mockCompetitionApi.getUserActivity).toHaveBeenCalledWith(50);
    });
  });
});