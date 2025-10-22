/**
 * Tests for ProgressOverview component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ProgressOverview from '../ProgressOverview';
import { UserGameProfile, ProgressData } from '../../../types';

const theme = createTheme();

const mockProfile: UserGameProfile = {
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
};

const mockProgressData: ProgressData[] = [
  {
    date: '2023-10-15',
    points: 100,
    level: 4,
    submissions: 2
  },
  {
    date: '2023-10-16',
    points: 150,
    level: 5,
    submissions: 3
  }
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ProgressOverview', () => {
  it('renders loading state when profile is null', () => {
    renderWithTheme(<ProgressOverview profile={null} progressData={[]} />);
    
    expect(screen.getByText('Loading progress...')).toBeInTheDocument();
  });

  it('displays user profile information correctly', () => {
    renderWithTheme(<ProgressOverview profile={mockProfile} progressData={mockProgressData} />);
    
    expect(screen.getByText('Level 5')).toBeInTheDocument();
    expect(screen.getByText('1,250 total points')).toBeInTheDocument();
    expect(screen.getByText('Progress to Level 6')).toBeInTheDocument();
    expect(screen.getByText('750 / 1000 XP')).toBeInTheDocument();
  });

  it('displays streak information', () => {
    renderWithTheme(<ProgressOverview profile={mockProfile} progressData={mockProgressData} />);
    
    expect(screen.getByText('7')).toBeInTheDocument(); // Current streak
    expect(screen.getByText('14')).toBeInTheDocument(); // Best streak
    expect(screen.getByText('#3')).toBeInTheDocument(); // Rank
  });

  it('calculates XP progress correctly', () => {
    renderWithTheme(<ProgressOverview profile={mockProfile} progressData={mockProgressData} />);
    
    expect(screen.getByText('250 XP needed for next level')).toBeInTheDocument();
  });

  it('displays progress chart when data is available', () => {
    renderWithTheme(<ProgressOverview profile={mockProfile} progressData={mockProgressData} />);
    
    expect(screen.getByText('30-Day Progress')).toBeInTheDocument();
  });

  it('shows streak status chips', () => {
    renderWithTheme(<ProgressOverview profile={mockProfile} progressData={mockProgressData} />);
    
    expect(screen.getByText('7 day streak')).toBeInTheDocument();
    expect(screen.getByText('Best: 14 days')).toBeInTheDocument();
  });

  it('handles zero values gracefully', () => {
    const zeroProfile: UserGameProfile = {
      ...mockProfile,
      level: 1,
      currentXp: 0,
      xpToNextLevel: 100,
      streaks: {
        current: 0,
        longest: 0,
        lastActivityDate: '2023-10-20T10:00:00Z'
      }
    };

    renderWithTheme(<ProgressOverview profile={zeroProfile} progressData={[]} />);
    
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('100 XP needed for next level')).toBeInTheDocument();
  });
});