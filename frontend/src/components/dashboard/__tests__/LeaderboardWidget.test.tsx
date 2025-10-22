/**
 * Tests for LeaderboardWidget component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LeaderboardWidget from '../LeaderboardWidget';
import { LeaderboardEntry } from '../../../types';

const theme = createTheme();

const mockLeaderboard: LeaderboardEntry[] = [
  {
    userId: 'user-1',
    username: 'Alice',
    totalPoints: 2500,
    level: 8,
    rank: 1,
    badges: 15,
    achievements: 12,
    streak: 10
  },
  {
    userId: 'user-2',
    username: 'Bob',
    totalPoints: 2200,
    level: 7,
    rank: 2,
    badges: 12,
    achievements: 10,
    streak: 5
  },
  {
    userId: 'user-3',
    username: 'Charlie',
    totalPoints: 1800,
    level: 6,
    rank: 3,
    badges: 8,
    achievements: 7,
    streak: 0
  }
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('LeaderboardWidget', () => {
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    mockOnRefresh.mockClear();
  });

  it('renders leaderboard entries correctly', () => {
    renderWithTheme(
      <LeaderboardWidget 
        leaderboard={mockLeaderboard}
        currentUserId="user-2"
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('highlights current user', () => {
    renderWithTheme(
      <LeaderboardWidget 
        leaderboard={mockLeaderboard}
        currentUserId="user-2"
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('displays user stats correctly', () => {
    renderWithTheme(
      <LeaderboardWidget 
        leaderboard={mockLeaderboard}
        currentUserId="user-1"
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(screen.getByText('2,500 pts')).toBeInTheDocument();
    expect(screen.getByText('Level 8')).toBeInTheDocument();
    expect(screen.getByText('15🏆')).toBeInTheDocument();
  });

  it('shows streak information when available', () => {
    renderWithTheme(
      <LeaderboardWidget 
        leaderboard={mockLeaderboard}
        currentUserId="user-1"
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(screen.getByText('10🔥')).toBeInTheDocument();
    expect(screen.getByText('5🔥')).toBeInTheDocument();
  });

  it('handles timeframe changes', () => {
    renderWithTheme(
      <LeaderboardWidget 
        leaderboard={mockLeaderboard}
        currentUserId="user-1"
        onRefresh={mockOnRefresh}
      />
    );
    
    const weeklyButton = screen.getByText('Weekly');
    fireEvent.click(weeklyButton);
    
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('calls refresh when refresh button is clicked', () => {
    renderWithTheme(
      <LeaderboardWidget 
        leaderboard={mockLeaderboard}
        currentUserId="user-1"
        onRefresh={mockOnRefresh}
      />
    );
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('displays empty state when no leaderboard data', () => {
    renderWithTheme(
      <LeaderboardWidget 
        leaderboard={[]}
        currentUserId="user-1"
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(screen.getByText('No leaderboard data available')).toBeInTheDocument();
  });

  it('shows summary statistics', () => {
    renderWithTheme(
      <LeaderboardWidget 
        leaderboard={mockLeaderboard}
        currentUserId="user-1"
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(screen.getByText('Showing top 3 of 3 students')).toBeInTheDocument();
  });

  it('displays current user position when not in top 10', () => {
    const extendedLeaderboard = [
      ...mockLeaderboard,
      ...Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i + 4}`,
        username: `User${i + 4}`,
        totalPoints: 1000 - i * 100,
        level: 5 - Math.floor(i / 2),
        rank: i + 4,
        badges: 5,
        achievements: 3,
        streak: 0
      })),
      {
        userId: 'current-user',
        username: 'CurrentUser',
        totalPoints: 500,
        level: 3,
        rank: 15,
        badges: 3,
        achievements: 2,
        streak: 1
      }
    ];

    renderWithTheme(
      <LeaderboardWidget 
        leaderboard={extendedLeaderboard}
        currentUserId="current-user"
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(screen.getByText('Your Position')).toBeInTheDocument();
  });
});