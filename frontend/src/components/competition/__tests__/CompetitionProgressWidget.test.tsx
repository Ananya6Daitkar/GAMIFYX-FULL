import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CompetitionProgressWidget from '../CompetitionProgressWidget';
import { competitionApi } from '../../../services/competitionApi';
import { CompetitionType, ParticipationStatus } from '../../../types/competition';

// Mock the competition API
jest.mock('../../../services/competitionApi');
const mockCompetitionApi = competitionApi as jest.Mocked<typeof competitionApi>;

// Mock data
const mockProgressData = {
  competitionId: 'competition-1',
  participationId: 'participation-1',
  requirements: [
    {
      requirementId: 'req-1',
      name: 'First Pull Request',
      description: 'Create your first pull request',
      type: 'pull_request' as const,
      required: true,
      completed: true,
      progress: 100,
      score: 100,
      maxScore: 100,
      submissions: [],
      lastUpdated: '2023-10-15T10:00:00Z'
    },
    {
      requirementId: 'req-2',
      name: 'Code Review',
      description: 'Review another contributor\'s code',
      type: 'review' as const,
      required: false,
      completed: false,
      progress: 60,
      score: 60,
      maxScore: 100,
      submissions: [],
      lastUpdated: '2023-10-16T10:00:00Z'
    }
  ],
  milestones: [
    {
      milestoneId: 'milestone-1',
      name: 'First Contribution',
      description: 'Make your first contribution to open source',
      criteria: 'Complete 1 pull request',
      points: 100,
      targetValue: 1,
      currentValue: 1,
      progress: 100,
      achieved: true,
      achievedAt: '2023-10-15T10:00:00Z'
    },
    {
      milestoneId: 'milestone-2',
      name: 'Active Contributor',
      description: 'Become an active contributor',
      criteria: 'Complete 4 pull requests',
      points: 500,
      targetValue: 4,
      currentValue: 1,
      progress: 25,
      achieved: false
    }
  ],
  timeline: [],
  predictions: []
};

const mockParticipation = {
  id: 'participation-1',
  competitionId: 'competition-1',
  userId: 'user-123',
  status: ParticipationStatus.ACTIVE,
  registeredAt: '2023-10-01T00:00:00Z',
  githubUsername: 'testuser',
  progress: {
    completedRequirements: ['req-1'],
    totalRequirements: 2,
    completionPercentage: 50,
    currentStreak: 5,
    longestStreak: 10,
    lastActivityAt: '2023-10-16T10:00:00Z',
    milestones: []
  },
  achievements: [],
  submissions: [],
  totalScore: 160,
  rank: 25
};

const mockCompetition = {
  id: 'competition-1',
  name: 'Hacktoberfest 2023',
  description: 'Annual open source contribution event',
  type: CompetitionType.HACKTOBERFEST,
  status: 'active' as const,
  organizer: 'DigitalOcean',
  website: 'https://hacktoberfest.com',
  startDate: '2023-10-01T00:00:00Z',
  endDate: '2023-10-31T23:59:59Z',
  requirements: [],
  rewards: [],
  badges: [],
  tags: ['open-source'],
  categories: ['programming'],
  difficultyLevel: 'intermediate' as const,
  participantCount: 1000,
  rules: [],
  eligibilityCriteria: [],
  createdAt: '2023-09-01T00:00:00Z',
  updatedAt: '2023-10-16T10:00:00Z'
};

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CompetitionProgressWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompetitionApi.getProgressTracking.mockResolvedValue(mockProgressData);
    mockCompetitionApi.getParticipation.mockResolvedValue(mockParticipation);
    mockCompetitionApi.getCompetition.mockResolvedValue(mockCompetition);
  });

  it('renders loading state initially', () => {
    renderWithTheme(<CompetitionProgressWidget participationId="participation-1" />);
    
    expect(screen.getByText('Competition Progress')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders progress data correctly', async () => {
    renderWithTheme(<CompetitionProgressWidget participationId="participation-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Hacktoberfest 2023')).toBeInTheDocument();
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument(); // Overall progress
      expect(screen.getByText('1/2')).toBeInTheDocument(); // Requirements completed
      expect(screen.getByText('160')).toBeInTheDocument(); // Points earned
      expect(screen.getByText('5')).toBeInTheDocument(); // Current streak
      expect(screen.getByText('1/2')).toBeInTheDocument(); // Milestones achieved
    });
  });

  it('shows requirements progress when enabled', async () => {
    renderWithTheme(
      <CompetitionProgressWidget 
        participationId="participation-1" 
        showRequirements={true}
        compact={false}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('📋 Requirements Progress')).toBeInTheDocument();
      expect(screen.getByText('First Pull Request')).toBeInTheDocument();
      expect(screen.getByText('Code Review')).toBeInTheDocument();
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });

  it('shows milestones timeline when enabled', async () => {
    renderWithTheme(
      <CompetitionProgressWidget 
        participationId="participation-1" 
        showMilestones={true}
        compact={false}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('🎯 Milestones')).toBeInTheDocument();
      expect(screen.getByText('First Contribution')).toBeInTheDocument();
      expect(screen.getByText('Active Contributor')).toBeInTheDocument();
      expect(screen.getByText('Achieved')).toBeInTheDocument();
    });
  });

  it('handles milestone click and opens dialog', async () => {
    renderWithTheme(
      <CompetitionProgressWidget 
        participationId="participation-1" 
        showMilestones={true}
        compact={false}
      />
    );
    
    await waitFor(() => {
      const milestoneElement = screen.getByText('Active Contributor');
      fireEvent.click(milestoneElement);
    });

    await waitFor(() => {
      expect(screen.getByText('Become an active contributor')).toBeInTheDocument();
      expect(screen.getByText('Progress Details:')).toBeInTheDocument();
      expect(screen.getByText('Current: 1 / 4')).toBeInTheDocument();
      expect(screen.getByText('Completion: 25%')).toBeInTheDocument();
    });
  });

  it('handles sync progress action', async () => {
    mockCompetitionApi.syncExternalProgress.mockResolvedValue();
    
    renderWithTheme(<CompetitionProgressWidget participationId="participation-1" />);
    
    await waitFor(() => {
      const syncButton = screen.getByLabelText('Sync external progress');
      fireEvent.click(syncButton);
    });

    expect(mockCompetitionApi.syncExternalProgress).toHaveBeenCalledWith('participation-1');
  });

  it('handles auto-refresh toggle', async () => {
    renderWithTheme(<CompetitionProgressWidget participationId="participation-1" />);
    
    await waitFor(() => {
      const autoRefreshButton = screen.getByLabelText('Auto-refresh');
      fireEvent.click(autoRefreshButton);
    });

    // Should toggle the auto-refresh state
    expect(autoRefreshButton).toBeInTheDocument();
  });

  it('renders compact mode correctly', async () => {
    renderWithTheme(
      <CompetitionProgressWidget 
        participationId="participation-1" 
        compact={true}
        showRequirements={false}
        showMilestones={false}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Hacktoberfest 2023')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      // Should not show detailed sections in compact mode
      expect(screen.queryByText('📋 Requirements Progress')).not.toBeInTheDocument();
      expect(screen.queryByText('🎯 Milestones')).not.toBeInTheDocument();
    });
  });

  it('handles error state correctly', async () => {
    mockCompetitionApi.getProgressTracking.mockRejectedValue(new Error('Network Error'));

    renderWithTheme(<CompetitionProgressWidget participationId="participation-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('calculates progress statistics correctly', async () => {
    renderWithTheme(<CompetitionProgressWidget participationId="participation-1" />);
    
    await waitFor(() => {
      // Should show correct completion percentage
      expect(screen.getByText('50%')).toBeInTheDocument();
      
      // Should show correct requirements ratio
      expect(screen.getByText('1/2')).toBeInTheDocument();
      
      // Should show correct points
      expect(screen.getByText('160')).toBeInTheDocument();
      
      // Should show correct streak
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('shows competition type icon correctly', async () => {
    renderWithTheme(<CompetitionProgressWidget participationId="participation-1" />);
    
    await waitFor(() => {
      // Should show Hacktoberfest pumpkin emoji
      expect(screen.getByText('🎃')).toBeInTheDocument();
    });
  });

  it('calls API methods with correct parameters', async () => {
    renderWithTheme(<CompetitionProgressWidget participationId="participation-1" />);
    
    await waitFor(() => {
      expect(mockCompetitionApi.getProgressTracking).toHaveBeenCalledWith('participation-1');
      expect(mockCompetitionApi.getParticipation).toHaveBeenCalledWith('participation-1');
      expect(mockCompetitionApi.getCompetition).toHaveBeenCalledWith('competition-1');
    });
  });
});