import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ExternalCompetitionBadges from '../ExternalCompetitionBadges';
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
      completedRequirements: ['req-1'],
      totalRequirements: 4,
      completionPercentage: 100,
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
        name: 'Hacktoberfest Badge',
        description: 'Completed Hacktoberfest challenge',
        points: 500,
        earnedAt: '2023-10-31T10:00:00Z',
        verified: true
      }
    ],
    submissions: [],
    totalScore: 500,
    rank: 10
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
          name: 'Hacktoberfest Badge',
          description: 'Completed the Hacktoberfest challenge',
          imageUrl: '/badges/hacktoberfest.png',
          rarity: 'epic' as const,
          criteria: 'Complete 4 valid pull requests',
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

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ExternalCompetitionBadges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompetitionApi.getUserParticipations.mockResolvedValue(mockParticipations);
    mockCompetitionApi.getCompetitions.mockResolvedValue(mockCompetitions);
  });

  it('renders loading state initially', () => {
    renderWithTheme(<ExternalCompetitionBadges userId="user-123" />);
    
    expect(screen.getByText('🏅 External Competition Badges')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders badges correctly', async () => {
    renderWithTheme(<ExternalCompetitionBadges userId="user-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Hacktoberfest Badge')).toBeInTheDocument();
      expect(screen.getByText('Hacktoberfest 2023')).toBeInTheDocument();
      expect(screen.getByText('EPIC')).toBeInTheDocument();
      expect(screen.getByText('500pts')).toBeInTheDocument();
      expect(screen.getByText('1 verified')).toBeInTheDocument();
    });
  });

  it('shows verification status correctly', async () => {
    renderWithTheme(<ExternalCompetitionBadges userId="user-123" showVerificationStatus={true} />);
    
    await waitFor(() => {
      // Should show verified icon for verified achievement
      const verifiedIcons = screen.getAllByTestId('VerifiedIcon');
      expect(verifiedIcons.length).toBeGreaterThan(0);
    });
  });

  it('opens badge detail dialog when badge is clicked', async () => {
    renderWithTheme(<ExternalCompetitionBadges userId="user-123" />);
    
    await waitFor(() => {
      const badgeElement = screen.getByText('Hacktoberfest Badge');
      fireEvent.click(badgeElement.closest('[role="button"]') || badgeElement);
    });

    await waitFor(() => {
      expect(screen.getByText('Completed the Hacktoberfest challenge')).toBeInTheDocument();
      expect(screen.getByText('500 points')).toBeInTheDocument();
      expect(screen.getByText('Competition Details:')).toBeInTheDocument();
      expect(screen.getByText('🎃 Hacktoberfest 2023')).toBeInTheDocument();
    });
  });

  it('handles empty state correctly', async () => {
    mockCompetitionApi.getUserParticipations.mockResolvedValue([]);
    mockCompetitionApi.getCompetitions.mockResolvedValue({ items: [] });

    renderWithTheme(<ExternalCompetitionBadges userId="user-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('No external badges earned yet')).toBeInTheDocument();
      expect(screen.getByText('Participate in competitions to earn verified badges!')).toBeInTheDocument();
    });
  });

  it('handles error state correctly', async () => {
    mockCompetitionApi.getUserParticipations.mockRejectedValue(new Error('Network Error'));

    renderWithTheme(<ExternalCompetitionBadges userId="user-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });

  it('respects maxBadges prop', async () => {
    // Create multiple badges
    const manyParticipations = Array.from({ length: 5 }, (_, i) => ({
      ...mockParticipations[0],
      id: `participation-${i}`,
      achievements: [{
        ...mockParticipations[0].achievements[0],
        id: `achievement-${i}`,
        name: `Badge ${i + 1}`
      }]
    }));

    mockCompetitionApi.getUserParticipations.mockResolvedValue(manyParticipations);

    renderWithTheme(<ExternalCompetitionBadges userId="user-123" maxBadges={3} />);
    
    await waitFor(() => {
      // Should only show 3 badges
      const badgeElements = screen.getAllByText(/Badge \d+/);
      expect(badgeElements.length).toBeLessThanOrEqual(3);
    });
  });

  it('shows correct rarity colors', async () => {
    const participationsWithDifferentRarities = [
      {
        ...mockParticipations[0],
        achievements: [{
          ...mockParticipations[0].achievements[0],
          name: 'Legendary Badge'
        }]
      }
    ];

    const competitionsWithDifferentRarities = {
      items: [{
        ...mockCompetitions.items[0],
        badges: [{
          ...mockCompetitions.items[0].badges[0],
          name: 'Legendary Badge',
          rarity: 'legendary' as const
        }]
      }]
    };

    mockCompetitionApi.getUserParticipations.mockResolvedValue(participationsWithDifferentRarities);
    mockCompetitionApi.getCompetitions.mockResolvedValue(competitionsWithDifferentRarities);

    renderWithTheme(<ExternalCompetitionBadges userId="user-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('LEGENDARY')).toBeInTheDocument();
    });
  });

  it('shows external links in badge dialog', async () => {
    renderWithTheme(<ExternalCompetitionBadges userId="user-123" />);
    
    await waitFor(() => {
      const badgeElement = screen.getByText('Hacktoberfest Badge');
      fireEvent.click(badgeElement.closest('[role="button"]') || badgeElement);
    });

    await waitFor(() => {
      expect(screen.getByText('View External')).toBeInTheDocument();
    });
  });

  it('calls API methods with correct parameters', async () => {
    renderWithTheme(<ExternalCompetitionBadges userId="user-123" />);
    
    await waitFor(() => {
      expect(mockCompetitionApi.getUserParticipations).toHaveBeenCalledTimes(1);
      expect(mockCompetitionApi.getCompetitions).toHaveBeenCalledWith({ limit: 100 });
    });
  });

  it('handles different competition types correctly', async () => {
    const githubParticipation = {
      ...mockParticipations[0],
      competitionId: 'github-competition'
    };

    const githubCompetition = {
      ...mockCompetitions.items[0],
      id: 'github-competition',
      name: 'GitHub Game Off',
      type: CompetitionType.GITHUB_GAME_OFF
    };

    mockCompetitionApi.getUserParticipations.mockResolvedValue([githubParticipation]);
    mockCompetitionApi.getCompetitions.mockResolvedValue({
      items: [githubCompetition]
    });

    renderWithTheme(<ExternalCompetitionBadges userId="user-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('GitHub Game Off')).toBeInTheDocument();
      // Should show game controller emoji for GitHub Game Off
      expect(screen.getByText('🎮')).toBeInTheDocument();
    });
  });
});